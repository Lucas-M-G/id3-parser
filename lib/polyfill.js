"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function polyfill() {
    // https://tc39.github.io/ecma262/#sec-%typedarray%.prototype.slice
    if (typeof Uint8Array === 'function' && !Uint8Array.prototype.slice) {
        Object.defineProperty(Uint8Array.prototype, 'slice', {
            value: Array.prototype.slice,
        });
    }
}
exports.default = polyfill;
