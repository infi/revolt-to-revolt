// https://gist.github.com/udayvunnam/a58c2a1c3044853c9d9efdc3c74e559e/f30c5ee44dcf93f9db2a73e76b650405f87393ad/

class Node {
    key: string
    value: any
    next: any
    prev: any

    constructor(key: string, value: any, next: any = null, prev: any = null) {
        this.key = key
        this.value = value
        this.next = next
        this.prev = prev
    }
}

export class LRU<T> {
    size: number
    limit: number
    head: any | null
    tail: any | null
    cacheMap: Record<any, any>

    constructor(limit = 10) {
        this.size = 0
        this.limit = limit
        this.head = null
        this.tail = null
        this.cacheMap = {}
    }

    write(key: any, value: T) {
        const existingNode = this.cacheMap[key]
        if (existingNode) {
            this.detach(existingNode);
            this.size--;
        } else if (this.size === this.limit) {
            delete this.cacheMap[this.tail!.key];
            this.detach(this.tail);
            this.size--;
        }

        // Write to head of LinkedList
        if (!this.head) {
            this.head = this.tail = new Node(key, value);
        } else {
            const node = new Node(key, value, this.head);
            this.head.prev = node;
            this.head = node;
        }

        // update cacheMap with LinkedList key and Node reference
        this.cacheMap[key] = this.head;
        this.size++;
    }

    read(key: any): T {
        const existingNode = this.cacheMap[key];
        if (existingNode) {
            const value = existingNode.value;
            // Make the node as new Head of LinkedList if not already
            if (this.head !== existingNode) {
                // write will automatically remove the node from it's position and make it a new head i.e most used
                this.write(key, value);
            }
            return value as T
        }

        console.log(`Item not available in cache for key ${key}`)
        return null as any as T
    }

    detach(node: any) {
        if (node.prev !== null) {
            node.prev.next = node.next;
        } else {
            this.head = node.next;
        }

        if (node.next !== null) {
            node.next.prev = node.prev;
        } else {
            this.tail = node.prev;
        }
    }

    clear() {
        this.head = null;
        this.tail = null;
        this.size = 0;
        this.cacheMap = {};
    }

    // Invokes the callback function with every node of the chain and the index of the node.
    forEach<T>(fn: (node: T, counter: number) => any) {
        let node = this.head;
        let counter = 0;
        while (node) {
            fn(node, counter);
            node = node.next;
            counter++;
        }
    }

    has(key: any) {
        return !!this.cacheMap[key];
    }

    // To iterate over LRU with a 'for...of' loop
    *[Symbol.iterator]() {
        let node = this.head;
        while (node) {
            yield node;
            node = node.next;
        }
    }
}