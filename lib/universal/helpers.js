"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function convertFileToBuffer(file) {
    var reader = new FileReader();
    var fulfill;
    var refuse;
    var promise = new Promise(function (resolve, reject) {
        fulfill = resolve;
        refuse = reject;
    });
    reader.onload = function () { return fulfill(new Uint8Array(reader.result)); };
    reader.onerror = function (e) { return refuse(e); };
    reader.readAsArrayBuffer(file);
    return promise;
}
exports.convertFileToBuffer = convertFileToBuffer;
function fetchFileAsBuffer(url) {
    if (!url) {
        throw new Error('Argument should be valid url string.');
    }
    var fulfill;
    var refuse;
    var promise = new Promise(function (resolve, reject) {
        fulfill = resolve;
        refuse = reject;
    });
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.onload = function () {
        if (request.response) {
            fulfill(new Uint8Array(request.response));
        }
        else {
            refuse('Empty response or other exceptions.');
        }
    };
    request.onerror = function (e) { return refuse(e); };
    request.send();
    return promise;
}
exports.fetchFileAsBuffer = fetchFileAsBuffer;
