import chai = require("chai");
import {action, IOptions, Store} from "../index"

let should = chai.should();

function delay(time) {
    return new Promise((resolve,) => {
        setTimeout(resolve, time)
    })
}

const RedisConn = process.env.REDIS;

let RedisParams = {
    expire: 10 * 1000,
    redis: RedisConn,
    name: "test"
}

describe("State", () => {

    let store: Store;

    beforeEach(async () => {
        store = new Store(0, RedisParams)

        await store.initialize();

        await store.reset();
    });

    afterEach(async () => {
        await store.quit();
    });

    it("Should  incr state", async () => {

        (await store.increment(2.3)).should.be.eq(2.3);
        store.stateSync.should.be.eq(2.3);
    });

    it("Should  init state", async () => {

        (await store.state).should.be.eq(0);
        store.stateSync.should.be.eq(0);
    });

    it("Should  with reset state", async () => {

        await store.reset(1.1);
        await store.increment(2.3);


        (await store.state).should.be.eq(3.4);
        store.stateSync.should.be.eq(3.4);
    });

    it("Should increment concurrent", async () => {

        let store2 = new Store(0, RedisParams);
        let store3 = new Store(0, RedisParams);

        await Promise.all([store2.initialize(), store3.initialize()]);


        await Promise.all([
            store.increment(1), store3.increment(2), store2.increment(3)]);

        await delay(100);

        // (await store.state).should.be.eq(6);
        store.stateSync.should.be.eq(6);

        await Promise.all([store2.quit(), store3.quit()]);


    });


    it("Should increment concurrent expire", async () => {

        let store2 = new Store(1, RedisParams);
        let store3 = new Store(1, RedisParams);

        await store.reset(1);

        await Promise.all([store2.initialize(), store3.initialize()]);


        await Promise.all([
            store.increment(1, 100), store3.increment(2, 100), store2.increment(3, 100)]);

        await delay(1000);

        store.stateSync.should.be.eq(1);


        (await store.state).should.be.eq(1);

        await Promise.all([store2.quit(), store3.quit()]);


    });

    it("Should fire event on 2 stores state change", async () => {

        let store2 = new Store(0, RedisParams);

        await Promise.all([store2.initialize()]);

        store.increment(1);

        let state = await store2.once("stateChanged");

        state.should.be.eq(1);

        store2.stateSync.should.be.eq(1);

        await store.reset();

    });

    it("Should fire action event", async () => {

        class TempStore extends Store {

            constructor(options: IOptions) {
                super(1, options)
            }

            @action()
            async setCounter(value) {
                await this.increment(value);
            }
        }

        let store = new TempStore(RedisParams);

        await store.initialize();


        store.setCounter(5);

        let state = await store.once("setCounter");

        state.should.be.eq(6);

    });

    it("Should set and increment", async () => {

        let store2 = new Store(0, RedisParams);

        await Promise.all([store2.initialize()]);

        store.set(2);

        await delay(300);

        store2.stateSync.should.be.eq(2);

        store2.increment(1);

        await delay(300);

        store.stateSync.should.be.eq(3);



        await Promise.all([store2.quit()]);
    });

});

