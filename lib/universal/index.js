"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../index");
var helpers_1 = require("./helpers");
function getGlobal() {
    var g;
    if (typeof window === 'object' && window.window === window) {
        g = window;
    }
    else if (typeof global === 'object' && global.global === global) {
        g = global;
    }
    else {
        // Get global.
        (0, eval)('this.__GLOBAL__ = this;');
        g = __GLOBAL__;
    }
    return g;
}
var GLOBAL = getGlobal();
if (!GLOBAL.Promise) {
    // tslint:disable-next-line:no-var-requires
    GLOBAL.Promise = require('promise-a-plus');
}
function uParse(bytes) {
    var promise;
    if (GLOBAL.File && bytes instanceof GLOBAL.File) {
        promise = helpers_1.convertFileToBuffer(bytes);
    }
    else if (typeof bytes === 'string') {
        promise = GLOBAL.XMLHttpRequest
            ? helpers_1.fetchFileAsBuffer(bytes)
            : Promise.reject('only browser side support argument as string.');
    }
    else {
        promise = Promise.resolve(bytes);
    }
    return promise.then(function (arr) {
        if (!arr || !arr.length) {
            throw new Error('invalid argument, or no enough data.');
        }
        return index_1.parse(arr);
    }).then(function (res) {
        if (res === false) {
            throw new Error('invalid binary bytes to parse.');
        }
        return res;
    });
}
exports.default = uParse;
