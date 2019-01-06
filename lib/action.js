"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
function action(name) {
    return function (target, propertyKey, descriptor) {
        let methodName = "value";
        let method = descriptor[methodName];
        descriptor[methodName] = async function () {
            let result = method.apply(this, arguments);
            if (result instanceof Promise) {
                result = await result;
            }
            let state = await this.state;
            this.publish(name || propertyKey, state);
            return result;
        };
    };
}
exports.action = action;
//# sourceMappingURL=action.js.map