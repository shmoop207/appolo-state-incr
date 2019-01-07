import Redis = require("ioredis");

export interface IOptions {
    expire?: number
    redis?: string
    name: string
    db?: number
    redisClient?: Redis.Redis
    redisPubSub?: Redis.Redis
    initial?:number
}

export let DefaultOptions: Partial<IOptions> = {
    expire: 0,
    db: 0,
    initial:0
}

export interface IncrOptions {
    name?: string,
    value: number,
    expire?: number,
    initial?: number
}

export let IncrDefaults:IncrOptions  = {
    name:"default",
    value: 0,
    expire: 0
}