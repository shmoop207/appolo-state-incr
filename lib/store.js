"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IOptions_1 = require("./IOptions");
const appolo_event_dispatcher_1 = require("appolo-event-dispatcher");
const client_1 = require("./client");
class Store extends appolo_event_dispatcher_1.EventDispatcher {
    constructor(options) {
        super();
        this._options = Object.assign({}, IOptions_1.DefaultOptions, options);
        this._client = new client_1.Client(this._options);
    }
    async initialize() {
        await this._client.connect();
        this._client.on("stateChanged", this._onStateChanged, this);
        this._client.on("publishEvent", this._onPublish, this);
    }
    _onStateChanged(state, name) {
        this.fireEvent("stateChanged", state, name);
    }
    _onPublish(message) {
        this.fireEvent(message.name, message.data);
    }
    async state(name = IOptions_1.IncrDefaults.name) {
        let result = await this._client.state(name);
        return result;
    }
    once(event, fn, scope, options = {}) {
        return super.once(event, fn, scope, options);
    }
    async increment(name, increment, expire) {
        let params = this._getParams(name, increment, expire);
        let value = await this._client.incr(params.name, params.value, params.expire);
        return value;
    }
    _getParams(name, value, expire) {
        if (typeof name !== 'string') {
            expire = value;
            value = name;
            name = IOptions_1.IncrDefaults.name;
        }
        name = name || IOptions_1.IncrDefaults.name;
        value = value === undefined ? 1 : value;
        expire = expire || 0;
        return { name, value, expire };
    }
    async set(name, value, expire) {
        let params = this._getParams(name, value, expire);
        await this._client.set(params.name, params.value, params.expire);
        return value;
    }
    async reset(name = IOptions_1.IncrDefaults.name) {
        await this._client.reset(name);
    }
    async publish(name, data) {
        await this._client.publish(name, data);
    }
    async quit() {
        this.removeAllListeners();
        await this._client.quit();
    }
}
exports.Store = Store;
//# sourceMappingURL=store.js.map