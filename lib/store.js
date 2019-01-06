"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IOptions_1 = require("./IOptions");
const appolo_event_dispatcher_1 = require("appolo-event-dispatcher");
const client_1 = require("./client");
class Store extends appolo_event_dispatcher_1.EventDispatcher {
    constructor(initialState, options) {
        super();
        this.initialState = initialState;
        this._options = Object.assign({}, IOptions_1.DefaultOptions, options);
        this._client = new client_1.Client(initialState, this._options);
    }
    async initialize() {
        await this._client.connect();
        this._client.on("stateChanged", this._onStateChanged, this);
        this._client.on("publishEvent", this._onPublish, this);
    }
    _onStateChanged(state) {
        this.fireEvent("stateChanged", state);
    }
    _onPublish(message) {
        this.fireEvent(message.name, message.data);
    }
    get state() {
        return this._client.state();
    }
    get stateSync() {
        return this._client.stateSync();
    }
    once(event, fn, scope, options = {}) {
        return super.once(event, fn, scope, options);
    }
    async increment(increment = 1, expire) {
        let value = await this._client.incr(increment, expire || this._options.expire);
        return value;
    }
    async set(value = 1, expire) {
        await this._client.set(value, expire || this._options.expire);
        return value;
    }
    async reset(value) {
        if (value) {
            this.initialState = value;
        }
        await this._client.reset(this.initialState);
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