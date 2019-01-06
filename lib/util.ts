import * as _ from 'lodash'

export class Util {
    public static  delay(time) {
        return new Promise((resolve,) => {
            setTimeout(resolve, time)
        })
    }

    public static arrayConcat  (objValue:any, srcValue:any) {
        if (_.isArray(objValue)) {
            return objValue.concat(srcValue);
        }
    }
}

