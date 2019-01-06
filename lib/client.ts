import Redis = require("ioredis");
import path = require("path");
import fs = require("fs");
import _ = require("lodash");
import {IOptions} from "./IOptions";
import {EventDispatcher} from "appolo-event-dispatcher";

const {promisify} = require('util');

export class Client extends EventDispatcher {

    private _client: Redis.Redis;
    private _sub: Redis.Redis;

    private _state: number;

    private _interval = null;


    private readonly Scripts = [{
        name: "incr", args: 1
    }, {
        name: "reset", args: 1
    }, {
        name: "set", args: 1
    }];

    private readonly _expireEventName: string;
    private readonly _publishStateEventName: string;
    private readonly _publishEventName: string;
    private readonly _keyName: string;

    constructor(private _initialState: number, private _options: IOptions) {
        super();

        this._expireEventName = `__keyevent@${this._options.db}__:expired`;
        this._publishStateEventName = `incr_state_${this._options.name}`;
        this._publishEventName = `incr_publish_${this._options.name}`;
        this._keyName = `incr_{${this._options.name}}`
    }


    public async connect(): Promise<void> {

        let params = {enableReadyCheck: true, lazyConnect: true, keepAlive: 1000};

        this._client = this._options.redisClient || new Redis(this._options.redis, params);
        this._sub = this._options.redisPubSub || new Redis(this._options.redis, params);

        await this.loadScripts();

        this._client.on("reconnecting", this._onConnectionClose.bind(this));
        this._client.on("close", this._onConnectionClose.bind(this));
        this._client.on("end", this._onConnectionClose.bind(this));
        this._client.on("connect", this._onConnectionOpen.bind(this));

        let connectPromises = [];

        if (!this._options.redisClient) {
            connectPromises.push(this._client.connect())
        }

        if (!this._options.redisPubSub) {
            connectPromises.push(this._sub.connect())
        }

        if (connectPromises.length) {
            await Promise.all(connectPromises);
        }

        this._client.config("SET", "notify-keyspace-events", "Ex");


        this._sub.subscribe(this._publishStateEventName);
        this._sub.subscribe(this._expireEventName);
        this._sub.subscribe(this._publishEventName);

        this._sub.on("message", this._onMessage.bind(this));

        this._state = await this.state();

    }

    private _onConnectionClose() {

    }

    private async _onConnectionOpen() {
    }

    private async loadScripts() {

        await Promise.all(_.map(this.Scripts, async script => {
            let lua = await promisify(fs.readFile)(path.resolve(__dirname, "lua", `${script.name}.lua`), {encoding: "UTF8"});
            this._client.defineCommand(script.name, {numberOfKeys: script.args, lua: lua});
        }));

    }


    public async incr(incr: number, expire: number): Promise<number> {


        let value = await (this._client as any).incr(this._options.name, incr, this._initialState, expire || 0);

        value = parseFloat(value);

        this._refreshState(value);

        return value;
    }


    public stateSync(): number {

        return this._state
    }


    public async state(): Promise<number> {

        let value = await (this._client as any).get(this._keyName);

        if (!value) {
            value = this._initialState;
        }

        value = parseFloat(value);

        this._refreshState(value);

        return value
    }

    public async set(value: number, expire: number = 0): Promise<number> {

        await (this._client as any).set(this._options.name, value, expire);

        this._refreshState(value);

        return value
    }

    public async publish(name: string, data: number) {

        let dto = {
            name: name,
            data: data
        }

        await this._client.publish(`incr_publish_${this._options.name}`, JSON.stringify(dto))
    }


    private _onMessage(channel: string, message: string) {
        switch (channel) {
            case this._publishStateEventName:
                this._handleState(message);
                break;
            case this._expireEventName:
                this._handleExpire(message);
                break;
            case this._publishEventName:
                this._handlePublish(message);
                break;
        }
    }

    private _handleState(message: string) {

        this._refreshState(parseFloat(message))

    }

    private _handleExpire(message: string) {

        if (message == this._keyName) {
            this._refreshState(this._initialState);
        }
    }

    private async _refreshState(newState?: number) {

        try {
            clearTimeout(this._interval);

            let oldState = this._state;

            if (newState) {
                this._state = newState
            } else {
                this._state = await this.state()
            }

            if (oldState != this._state) {
                process.nextTick(() => this.fireEvent("stateChanged", this._state))
            }

            this._interval = setTimeout(() => this._refreshState(), 10 * 1000)
        } catch (e) {

        }
    }

    private _handlePublish(message: string) {
        let dto: { name: string, data: any } = JSON.parse(message);

        this.fireEvent("publishEvent", dto)

    }

    public async reset(state: number) {
        this._initialState = this._state = state || this._initialState;

        await (this._client as any).reset(this._options.name, this._initialState);
    }


    public async quit() {
        clearTimeout(this._interval);
        this._client.removeAllListeners();
        this.removeAllListeners();
        await Promise.all([this._client.quit(), this._sub.quit()]);
    }

}