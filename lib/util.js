"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
class Util {
    static delay(time) {
        return new Promise((resolve) => {
            setTimeout(resolve, time);
        });
    }
    static arrayConcat(objValue, srcValue) {
        if (_.isArray(objValue)) {
            return objValue.concat(srcValue);
        }
    }
}
exports.Util = Util;
//# sourceMappingURL=util.js.map