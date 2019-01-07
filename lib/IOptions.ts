import Redis = require("ioredis");

export interface IOptions {
    expire?: number
    redis?: string
    name: string
    db?: number
    redisClient?: Redis.Redis
    redisPubSub?: Redis.Redis
    initial?: number
    cache?: boolean
    cacheTime?: number
    cacheItems?: number
}

export let DefaultOptions: Partial<IOptions> = {
    expire: 0,
    db: 0,
    initial: 0,
    cache: true,
    cacheTime: 60 * 1000,
    cacheItems: 10000

}


export let IncrDefaults = {
    name: "default",
    value: 0,
    expire: 0
}