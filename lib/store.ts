import {DefaultOptions, IncrDefaults, IOptions} from "./IOptions";
import {EventDispatcher} from "appolo-event-dispatcher";
import {Client} from "./client";
import {IEventOptions} from "appolo-event-dispatcher/lib/IEventOptions";


export class Store extends EventDispatcher {

    private _client: Client;
    private readonly _options: IOptions;


    constructor(options: IOptions) {

        super();

        this._options = Object.assign({}, DefaultOptions, options);
        this._client = new Client(this._options);
    }

    public async initialize(): Promise<void> {
        await this._client.connect();

        this._client.on("stateChanged", this._onStateChanged, this);
        this._client.on("publishEvent", this._onPublish, this);

    }

    private _onStateChanged(state: number, name: string) {
        this.fireEvent("stateChanged", state,name)
    }

    private _onPublish(message: { name: string, data: any }) {
        this.fireEvent(message.name, message.data);

    }

    public async state(name: string = IncrDefaults.name): Promise<number> {
        let result = await this._client.state(name);

        return result;
    }

    public once(event: string, fn?: (...args: any[]) => any, scope?: any, options: IEventOptions = {}): Promise<[number,string]> {
        return super.once(event, fn, scope, options) as  Promise<[number,string]>
    }

    public async increment(name?: string | number, increment?: number, expire?: number): Promise<number> {

        let params = this._getParams(name, increment, expire);

        let value = await this._client.incr(params.name, params.value, params.expire);

        return value;
    }

    private _getParams(name: string | number, value: number, expire: number): { name: string, value: number, expire: number } {
        if (typeof name !== 'string') {
            expire = value;
            value = name as number;
            name = IncrDefaults.name;

        }

        name = name || IncrDefaults.name;
        value = value === undefined ? 1 : value;
        expire = expire || 0;

        return {name, value, expire}
    }

    public async set(value?: number, expire?: number): Promise<number>
    public async set(name?: string | number , value?: number , expire?: number): Promise<number> {
        let params = this._getParams(name, value, expire);

        await this._client.set(params.name, params.value, params.expire);

        return value;
    }


    public async reset(name: string = IncrDefaults.name) {

        await this._client.reset(name);

    }

    public async publish(name: string, data: any) {
        await this._client.publish(name, data)
    }

    public async quit() {
        this.removeAllListeners();
        await this._client.quit();


    }

}