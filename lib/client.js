"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Redis = require("ioredis");
const path = require("path");
const fs = require("fs");
const _ = require("lodash");
const appolo_event_dispatcher_1 = require("appolo-event-dispatcher");
const { promisify } = require('util');
class Client extends appolo_event_dispatcher_1.EventDispatcher {
    constructor(_initialState, _options) {
        super();
        this._initialState = _initialState;
        this._options = _options;
        this._interval = null;
        this.Scripts = [{
                name: "incr", args: 1
            }, {
                name: "reset", args: 1
            }, {
                name: "set", args: 1
            }];
        this._expireEventName = `__keyevent@${this._options.db}__:expired`;
        this._publishStateEventName = `incr_state_${this._options.name}`;
        this._publishEventName = `incr_publish_${this._options.name}`;
        this._keyName = `incr_{${this._options.name}}`;
    }
    async connect() {
        let params = { enableReadyCheck: true, lazyConnect: true, keepAlive: 1000 };
        this._client = this._options.redisClient || new Redis(this._options.redis, params);
        this._sub = this._options.redisPubSub || new Redis(this._options.redis, params);
        await this.loadScripts();
        this._client.on("reconnecting", this._onConnectionClose.bind(this));
        this._client.on("close", this._onConnectionClose.bind(this));
        this._client.on("end", this._onConnectionClose.bind(this));
        this._client.on("connect", this._onConnectionOpen.bind(this));
        let connectPromises = [];
        if (!this._options.redisClient) {
            connectPromises.push(this._client.connect());
        }
        if (!this._options.redisPubSub) {
            connectPromises.push(this._sub.connect());
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
    _onConnectionClose() {
    }
    async _onConnectionOpen() {
    }
    async loadScripts() {
        await Promise.all(_.map(this.Scripts, async (script) => {
            let lua = await promisify(fs.readFile)(path.resolve(__dirname, "lua", `${script.name}.lua`), { encoding: "UTF8" });
            this._client.defineCommand(script.name, { numberOfKeys: script.args, lua: lua });
        }));
    }
    async incr(incr, expire) {
        let value = await this._client.incr(this._options.name, incr, this._initialState, expire || 0);
        value = parseFloat(value);
        this._refreshState(value);
        return value;
    }
    stateSync() {
        return this._state;
    }
    async state() {
        let value = await this._client.get(this._keyName);
        if (!value) {
            value = this._initialState;
        }
        value = parseFloat(value);
        this._refreshState(value);
        return value;
    }
    async set(value, expire = 0) {
        await this._client.set(this._options.name, value, expire);
        this._refreshState(value);
        return value;
    }
    async publish(name, data) {
        let dto = {
            name: name,
            data: data
        };
        await this._client.publish(`incr_publish_${this._options.name}`, JSON.stringify(dto));
    }
    _onMessage(channel, message) {
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
    _handleState(message) {
        this._refreshState(parseFloat(message));
    }
    _handleExpire(message) {
        if (message == this._keyName) {
            this._refreshState(this._initialState);
        }
    }
    async _refreshState(newState) {
        try {
            clearTimeout(this._interval);
            let oldState = this._state;
            if (newState) {
                this._state = newState;
            }
            else {
                this._state = await this.state();
            }
            if (oldState != this._state) {
                process.nextTick(() => this.fireEvent("stateChanged", this._state));
            }
            this._interval = setTimeout(() => this._refreshState(), 10 * 1000);
        }
        catch (e) {
        }
    }
    _handlePublish(message) {
        let dto = JSON.parse(message);
        this.fireEvent("publishEvent", dto);
    }
    async reset(state) {
        this._initialState = this._state = state || this._initialState;
        await this._client.reset(this._options.name, this._initialState);
    }
    async quit() {
        clearTimeout(this._interval);
        this._client.removeAllListeners();
        this.removeAllListeners();
        await Promise.all([this._client.quit(), this._sub.quit()]);
    }
}
exports.Client = Client;
//# sourceMappingURL=client.js.map