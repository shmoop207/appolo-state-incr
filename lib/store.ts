import {DefaultOptions, IOptions} from "./IOptions";
import {EventDispatcher} from "appolo-event-dispatcher";
import {Client} from "./client";
import {IEventOptions} from "appolo-event-dispatcher/lib/IEventOptions";


export class Store extends EventDispatcher {

    private _client: Client;
    private readonly _options: IOptions;


    constructor(private initialState: number, options: IOptions) {

        super();

        this._options = Object.assign({}, DefaultOptions, options);


        this._client = new Client(initialState, this._options);
    }

    public async initialize(): Promise<void> {
        await this._client.connect();

        this._client.on("stateChanged", this._onStateChanged, this);
        this._client.on("publishEvent", this._onPublish, this);

    }

    private _onStateChanged(state: number) {
        this.fireEvent("stateChanged", state)
    }

    private _onPublish(message: { name: string, data: any }) {
        this.fireEvent(message.name, message.data);

    }

    public get state(): Promise<number> {
        return this._client.state();
    }


    public get stateSync(): number {
        return this._client.stateSync();
    }


    public once(event: string, fn?: (...args: any[]) => any, scope?: any, options: IEventOptions = {}): Promise<number> {
        return super.once(event, fn, scope, options) as  Promise<number>
    }


    public async increment(increment: number = 1, expire?: number): Promise<number> {
        let value = await this._client.incr(increment, expire || this._options.expire);

        return value;
    }

    public async set(value: number = 1, expire?: number): Promise<number> {
        await this._client.set(value, expire || this._options.expire);

        return value;
    }


    public async reset(value?: number) {

        if (value) {
            this.initialState = value;
        }

        await this._client.reset(this.initialState)

    }

    public async publish(name: string, data: any) {
        await this._client.publish(name, data)
    }

    public async quit() {
        this.removeAllListeners();
        await this._client.quit();


    }

}