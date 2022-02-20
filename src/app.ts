import { Client } from "revolt.js"
import { config } from "dotenv"
import { LRU } from "./lib/lru.js"
import { Message } from "revolt.js/dist/maps/Messages"
import { MongoClient, ObjectId } from "mongodb"
import { Channel } from "revolt.js/dist/maps/Channels"

type DBChannel = {
    _id: ObjectId,
    from: string,
    to: string,
    createdBy: string
}

const PREFIX = "rtr:"

config()

const mongo = (await new MongoClient(process.env.MONGO_URL!).connect()).db("revolt-to-revolt")

const messages = new LRU<string>(250)

const commands: Record<string, (m: Message, a: string[]) => any> = {
    help: (message, _) => {
        message.reply(`Available commands are:\n\`${Object.keys(commands).join("`, `")}\``)
    },
    add: async (message, args) => {
        const [from, to] = args
        if (!from || !to) {
            message.reply("Usage: `:add [from channel (channel ID)] [to channel (channel ID)]`")
            return
        }

        let fromCh
        let toCh
        try {
            fromCh = await client.channels.fetch(from)
            toCh = await client.channels.fetch(to)
        } catch (e) {
            return
        }

        if (!fromCh || !toCh) {
            message.reply("Usage: `:add [from channel (channel ID)] [to channel (channel ID)]` (Invalid channel ID)")
            return
        }

        const insertThis: Omit<DBChannel, "_id"> = {
            createdBy: message.author_id,
            from,
            to
        }

        await mongo.collection("channels").insertOne(insertThis)
        message.reply(`Link from \`${fromCh.name}\` to \`${toCh.name}\` created`)
    }
}

const handleCommand = async (message: Message) => {
    const args = (message.content as string).split(/ +/)
    const cmd = (args.shift() ?? "").replace(PREFIX, "")

    if (!Object.keys(commands).includes(cmd)) return

    commands[cmd](message, args)
}

const handleBridge = async (message: Message) => {
    const bridgedChannels = await mongo.collection("channels").find<DBChannel>({ from: message.channel?._id }).toArray()

    bridgedChannels.forEach(async channel => {
        if (channel.from === channel.to)
            return

        let channelFrom: Channel
        let channelTo: Channel

        try {
            channelFrom = await client.channels.fetch(channel.from)
            channelTo = await client.channels.fetch(channel.to)
        } catch (e) {

            return
        }

        const replyText = (await Promise.all((message.reply_ids ?? []).map(async id => {
            const msg = await client.messages.get(id)
            if (!msg) return ""
            return `> ${msg.author?.username}: ${msg.content}  \n  \n`
        }))).join("\n")
        const attachments = message.attachments?.length ? "\n" + message.attachments?.map((x, i) => (
            `[Attachment #${i}](https://autumn.revolt.chat/${x.tag}/${x._id})`
        )).join("\n") : ""

        const authorName = `${message.member?.nickname ??
            message.author?.username} [from ${channelFrom.name} in ${channelFrom.server?.name}]`
        const messageContent = !!message.author?.bot
            ? `$\\scriptsize\\color{gray}\\textsf{[bot]}$ ${message.content}`
            : message.content

        let sendableObject: any = {
            content: `${replyText}${messageContent}${attachments}`,
            masquerade: {
                name: authorName,
                avatar: message.author?.generateAvatarURL({ max_side: 512 })
            },
        }

        try {
            console.log(sendableObject)
            const sent = await channelTo.sendMessage(sendableObject)

            if (!sent._id) return
            messages.write(message._id, sent._id)
        } catch (e) { }
    })
}

const client = new Client()

client.on("message", (message) => {
    if (message.author?._id === client.user?._id) return
    if (typeof message?.content !== "string") return

    const isCommand = (message.content as string).startsWith(PREFIX)

    if (isCommand) {
        handleCommand(message)
    } else {
        handleBridge(message)
    }
})

client.on("ready", () => {
    console.log("ready")
})

client.loginBot(process.env.TOKEN!)