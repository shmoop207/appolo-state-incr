"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Redis = require("ioredis");
const path = require("path");
const fs = require("fs");
const appolo_event_dispatcher_1 = require("appolo-event-dispatcher");
const index_1 = require("appolo-cache/index");
const { promisify } = require('util');
class Client extends appolo_event_dispatcher_1.EventDispatcher {
    constructor(_options) {
        super();
        this._options = _options;
        this._interval = null;
        this.Scripts = [{
                name: "state_incr", args: 2
            }, {
                name: "state_reset", args: 2
            }, {
                name: "state_set", args: 2
            }];
        this._expireEventName = `__keyevent@${this._options.db}__:expired`;
        this._publishStateEventName = `incr_state_${this._options.name}`;
        this._publishEventName = `incr_publish_${this._options.name}`;
        this._keyName = `incr_{${this._options.name}}`;
        this._cache = new index_1.Cache({ maxSize: 10000, maxAge: 60 * 1000 });
    }
    async connect() {
        let params = { enableReadyCheck: true, lazyConnect: true, keepAlive: 1000 };
        this._client = this._options.redisClient || new Redis(this._options.redis, params);
        this._sub = this._options.redisPubSub || new Redis(this._options.redis, params);
        await this.loadScripts();
        if (!this._options.redisClient) {
            this._client.on("reconnecting", this._onConnectionClose.bind(this));
            this._client.on("close", this._onConnectionClose.bind(this));
            this._client.on("end", this._onConnectionClose.bind(this));
            this._client.on("connect", this._onConnectionOpen.bind(this));
        }
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
    }
    _onConnectionClose() {
    }
    async _onConnectionOpen() {
    }
    async loadScripts() {
        await Promise.all(this.Scripts.map(async (script) => {
            let lua = await promisify(fs.readFile)(path.resolve(__dirname, "lua", `${script.name}.lua`), { encoding: "UTF8" });
            this._client.defineCommand(script.name, { numberOfKeys: script.args, lua: lua });
        }));
    }
    async incr(name, increment, expire) {
        let [, value] = await this._client.state_incr(this._options.name, name, increment, this._options.initial, expire || this._options.expire || 0);
        value = parseFloat(value);
        this._refreshState(name, value);
        return value;
    }
    async state(name) {
        let value;
        let result = this._cache.get(name);
        if (result) {
            value = result.value;
        }
        else {
            let tempValue = await this._client.get(`${this._keyName}:${name}`);
            value = parseFloat(tempValue);
            value = isNaN(value) ? this._options.initial : value;
        }
        this._refreshState(name, value);
        return value;
    }
    async set(name, value, expire) {
        await this._client.state_set(this._options.name, name, value, expire || this._options.expire || 0);
        this._refreshState(name, value);
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
        let [name, value] = message.split("##");
        this._refreshState(name, parseFloat(value));
    }
    _handleExpire(message) {
        let [, key, name] = message.split(":");
        if (key == this._options.name && this._cache.get(name)) {
            this._refreshState(name, this._options.initial);
        }
    }
    async _refreshState(name, value) {
        try {
            let old = this._cache.get(name);
            let oldValue = old ? old.value : this._options.initial;
            this._cache.set(name, { value });
            if (oldValue != value) {
                process.nextTick(() => this.fireEvent("stateChanged", value, name));
            }
        }
        catch (e) {
        }
    }
    _handlePublish(message) {
        let dto = JSON.parse(message);
        this.fireEvent("publishEvent", dto);
    }
    async reset(name) {
        await this._client.state_reset(this._options.name, name, this._options.initial);
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