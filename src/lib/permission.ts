import { ServerPermission } from "revolt.js"
import { Member } from "revolt.js/dist/maps/Members"

// https://github.com/janderedev/automod/blob/master/bot/src/bot/util.ts
export const hasPerm = (member: Member, perm: keyof typeof ServerPermission) => {
    const p = ServerPermission[perm];
    if (member.server?.owner == member.user?._id) return true;

    const userPerm = member.roles?.map(id => member.server?.roles?.[id]?.permissions?.[0])
        .reduce((sum?: number, cur?: number) => sum! | cur!, member.server?.default_permissions[0]) ?? 0;

    return !!(userPerm & p);
}