import Redis = require("ioredis");

export interface IOptions {
    expire?: number
    redis?: string
    name: string
    db?: number
    redisClient?: Redis.Redis
    redisPubSub?: Redis.Redis
}

export let DefaultOptions: Partial<IOptions> = {
    expire: 0,
    db:0
}
