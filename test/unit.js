"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const index_1 = require("../index");
let should = chai.should();
function delay(time) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}
const RedisConn = process.env.REDIS;
let RedisParams = {
    expire: 100 * 1000,
    redis: RedisConn,
    name: "test"
};
describe("State", () => {
    let store;
    beforeEach(async () => {
        store = new index_1.Store(RedisParams);
        await store.initialize();
        await store.reset();
    });
    afterEach(async () => {
        await store.quit();
    });
    it("Should  incr state", async () => {
        (await store.increment(2.3)).should.be.eq(2.3);
        (await store.state()).should.be.eq(2.3);
    });
    it("Should  init state", async () => {
        (await store.state()).should.be.eq(0);
    });
    it("Should  with reset state", async () => {
        await store.increment(2.6);
        await store.reset();
        await store.increment(2.3);
        (await store.state()).should.be.eq(2.3);
    });
    it("Should increment concurrent", async () => {
        let store2 = new index_1.Store(RedisParams);
        let store3 = new index_1.Store(RedisParams);
        await Promise.all([store2.initialize(), store3.initialize()]);
        await Promise.all([
            store.increment(1), store3.increment(2), store2.increment(3)
        ]);
        await delay(500);
        (await store.state()).should.be.eq(6);
        await Promise.all([store2.quit(), store3.quit()]);
    });
    it("Should increment concurrent expire", async () => {
        let store2 = new index_1.Store(Object.assign({}, RedisParams, { initial: 1 }));
        let store3 = new index_1.Store(Object.assign({}, RedisParams, { initial: 1 }));
        await Promise.all([store2.initialize(), store3.initialize()]);
        await Promise.all([
            store.increment(1, 100), store3.increment(2, 100), store2.increment(3, 100)
        ]);
        await delay(1000);
        (await store2.state()).should.be.eq(1);
        await Promise.all([store2.quit(), store3.quit()]);
    });
    it("Should fire event on 2 stores state change", async () => {
        let store2 = new index_1.Store(RedisParams);
        await Promise.all([store2.initialize()]);
        store.increment(1);
        let [state] = await store2.once("stateChanged");
        state.should.be.eq(1);
        (await store2.state()).should.be.eq(1);
        await store.reset();
        await Promise.all([store2.quit()]);
    });
    it("Should set and increment", async () => {
        let store2 = new index_1.Store(RedisParams);
        await Promise.all([store2.initialize()]);
        store.set(2);
        await delay(300);
        (await store2.state()).should.be.eq(2);
        store2.increment(1);
        await delay(300);
        (await store2.state()).should.be.eq(3);
        await Promise.all([store2.quit()]);
    });
    it("Should fire event on 2 stores with diff names", async () => {
        let store2 = new index_1.Store(RedisParams);
        await Promise.all([store2.initialize()]);
        await store.reset("aa");
        store.increment("aa", 1);
        let [state, name] = await store2.once("stateChanged");
        state.should.be.eq(1);
        name.should.be.eq("aa");
        (await store2.state()).should.be.eq(0);
        (await store2.state("aa")).should.be.eq(1);
        (await store2.state("aa")).should.be.eq(1);
        await Promise.all([store2.quit()]);
    });
});
//# sourceMappingURL=unit.js.map