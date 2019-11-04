"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var v1parser_1 = require("./parsers/v1parser");
exports.parseV1Tag = v1parser_1.default;
var v2parser_1 = require("./parsers/v2parser");
exports.parseV2Tag = v2parser_1.default;
var polyfill_1 = require("./polyfill");
polyfill_1.default(); // do polyfill.
function parse(bytes) {
    var v1data = v1parser_1.default(bytes);
    var v2data = v2parser_1.default(bytes);
    if (!v2data && !v1data) {
        return false;
    }
    var defaultValue = { version: false };
    var _a = v2data || defaultValue, v2 = _a.version, v2meta = __rest(_a, ["version"]);
    var _b = v1data || defaultValue, v1 = _b.version, v1meta = __rest(_b, ["version"]);
    var result = __assign({ version: {
            v1: v1,
            v2: v2,
        } }, v1meta, v2meta);
    /* tslint:disable:no-any */
    if (v1meta.comments) {
        result.comments = [{
                value: v1meta.comments,
            }].concat((v2meta && v2meta.comments) ? v2meta.comments : []);
    }
    /* tslint:enable:no-any */
    return result;
}
exports.parse = parse;
