"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var frameTypes_1 = require("../constants/frameTypes");
var genres_1 = require("../constants/genres");
var imageTypes_1 = require("../constants/imageTypes");
var utils_1 = require("../utils");
var V2_MIN_LENGTH = 20; // TAG HEADER(10) + ONE FRAME HEADER(10)
function parseV2Data(bytes) {
    if (!bytes || bytes.length < V2_MIN_LENGTH) {
        return false;
    }
    var tags = parseV2Header(bytes.slice(0, 10));
    if (!tags) {
        return false;
    }
    var flags = tags.version.flags;
    // Currently do not support unsynchronisation
    if (flags.unsync) {
        throw new Error('no support for unsynchronisation');
    }
    var headerSize = 10;
    // Increment the header size if an extended header exists.
    if (flags.xheader) {
        // Usually extended header size is 6 or 10 bytes
        headerSize += calcTagSize(bytes.slice(10, 14));
    }
    var tagSize = calcTagSize(bytes.slice(6, 10));
    parseV2Frames(bytes.slice(headerSize, tagSize + headerSize), tags);
    return tags;
}
exports.default = parseV2Data;
/**
 * Parse ID3v2 tag header.
 * @description
 * A typical ID3v2 tag (header) is like:
 * $49 44 33 yy yy xx zz zz zz zz
 *
 * Where yy is less than $FF, xx is the 'flags' byte and zz is less than $80.
 * @param bytes binary bytes.
 */
function parseV2Header(bytes) {
    if (!bytes || bytes.length < 10) {
        return false;
    }
    var identity = utils_1.readBytesToUTF8(bytes, 3);
    if (identity !== 'ID3') {
        return false;
    }
    var flagByte = bytes[5];
    var version = {
        major: 2,
        minor: bytes[3],
        revision: bytes[4],
        flags: {
            unsync: (flagByte & 0x80) !== 0,
            xheader: (flagByte & 0x40) !== 0,
            experimental: (flagByte & 0x20) !== 0,
        },
    };
    return { version: version };
}
/**
 * Calculate the total tag size, but excluding the header size(10 bytes).
 * @param bytes binary bytes.
 */
function calcTagSize(bytes) {
    return (bytes[0] & 0x7f) * 0x200000 +
        (bytes[1] & 0x7f) * 0x4000 +
        (bytes[2] & 0x7f) * 0x80 +
        (bytes[3] & 0x7f);
}
exports.calcTagSize = calcTagSize;
/**
 * Calculate frame size (just content size, exclude 10 bytes header size).
 * @param bytes binary bytes.
 */
function calcFrameSize(bytes) {
    return bytes.length < 4 ? 0 : bytes[0] * 0x1000000 +
        bytes[1] * 0x10000 +
        bytes[2] * 0x100 +
        bytes[3];
}
exports.calcFrameSize = calcFrameSize;
function parseV2Frames(bytes, tags) {
    var position = 0;
    var version = tags.version;
    while (position < bytes.length) {
        var size = calcFrameSize(bytes.slice(position + 4));
        // the left data would be '\u0000\u0000...', just a padding
        if (size === 0) {
            break;
        }
        // * < v2.3, frame ID is 3 chars, size is 3 bytes making a total size of 6 bytes
        // * >= v2.3, frame ID is 4 chars, size is 4 bytes, flags are 2 bytes, total 10 bytes
        var slice = bytes.slice(position, position + 10 + size);
        if (!slice.length) {
            break;
        }
        var frame = parseFrame(slice, version.minor, size);
        if (frame.tag) {
            if (frameTypes_1.FrameTypeValueMap[frame.id] === 'array') {
                if (tags[frame.tag]) {
                    tags[frame.tag].push(frame.value);
                }
                else {
                    tags[frame.tag] = [frame.value];
                }
            }
            else {
                tags[frame.tag] = frame.value;
            }
        }
        position += slice.length;
    }
}
/**
 * Parse id3 frame.
 * @description
 * Declared ID3v2 frames are of different types:
 * 1. Unique file identifier
 * 2. Text information frames
 * 3. ...
 *
 * For frames that allow different types of text encoding, the first byte after header (bytes[10])
 * represents encoding. Its value is of:
 * 1. 00 <---> ISO-8859-1 (ASCII), default encoding, represented as <text string>/<full text string>
 * 2. 01 <---> UCS-2 encoded Unicode with BOM.
 * 3. 02 <---> UTF-16BE encoded Unicode without BOM.
 * 4. 03 <---> UTF-8 encoded Unicode.
 *
 * And 2-4 represented as <text string according to encoding>/<full text string according to encoding>
 * @param bytes Binary bytes.
 * @param minor Minor version, 2/3/4
 * @param size Frame size.
 */
function parseFrame(bytes, minor, size) {
    var result = {
        id: null,
        tag: null,
        value: null,
    };
    var header = {
        id: utils_1.readBytesToUTF8(bytes, 4),
        type: null,
        size: size,
        flags: [
            bytes[8],
            bytes[9],
        ],
    };
    header.type = header.id[0];
    result.id = header.id;
    if (minor === 4) {
        // TODO: parse v2.4 frame
    }
    // No support for compressed, unsychronised, etc frames
    if (header.flags[1] !== 0) {
        return result;
    }
    if (!(header.id in frameTypes_1.default)) {
        return result;
    }
    result.tag = frameTypes_1.default[header.id];
    var encoding = 0;
    var variableStart = 0;
    var variableLength = 0;
    var i = 0;
    /**
     * Text information frames, structure is:
     * <Header for 'Text information frame', ID: "T000" - "TZZZ", excluding "TXXX">
     * Text encoding    $xx
     * Information    <text string according to encoding>
     */
    if (header.type === 'T') {
        encoding = bytes[10];
        // If is User defined text information frame (TXXX), then we should handle specially.
        // <Header for 'User defined text information frame', ID: "TXXX" >
        // Text encoding    $xx
        // Description < text string according to encoding > $00(00)
        // Value < text string according to encoding >
        if (header.id === 'TXXX') {
            variableStart = 11;
            variableLength = utils_1.getEndpointOfBytes(bytes, encoding, variableStart) - variableStart;
            var value = {
                description: utils_1.readBytesToString(bytes.slice(variableStart), encoding, variableLength),
                value: '',
            };
            variableStart += variableLength + 1;
            variableStart = utils_1.skipPaddingZeros(bytes, variableStart);
            value.value = utils_1.readBytesToString(bytes.slice(variableStart), encoding);
            result.value = value;
        }
        else {
            result.value = utils_1.readBytesToString(bytes.slice(11), encoding);
            // Specially handle the 'Content type'.
            if (header.id === 'TCON' && result.value !== null) {
                if (result.value[0] === '(') {
                    var handledTCON = result.value.match(/\(\d+\)/g);
                    if (handledTCON) {
                        result.value = handledTCON.map(function (v) { return genres_1.default[+v.slice(1, -1)]; }).join(',');
                    }
                }
                else {
                    var genre = parseInt(result.value, 10);
                    if (!isNaN(genre)) {
                        result.value = genres_1.default[genre];
                    }
                }
            }
        }
    }
    // URL link frames
    // Always encoded as ISO-8859-1.
    else if (header.type === 'W') {
        // User defined URL link frame
        if (header.id === 'WXXX' && bytes[10] === 0) {
            result.value = utils_1.readBytesToISO8859(bytes.slice(11));
        }
        else {
            result.value = utils_1.readBytesToISO8859(bytes.slice(10));
        }
    }
    // Comments or Unsychronized lyric/text transcription.
    /**
     * Comments frame:
     * <Header for 'Comment', ID: "COMM">
     * Text encoding           $xx
     * Language                $xx xx xx
     * Short content descrip.  <text string according to encoding> $00 (00)
     * The actual text         <full text string according to encoding>
     *
     * Unsychronised lyrics/text transcription frame:
     * <Header for 'Unsynchronised lyrics/text transcription', ID: "USLT">
     * Text encoding       $xx
     * Language            $xx xx xx
     * Content descriptor  <text string according to encoding> $00 (00)
     * Lyrics/text         <full text string according to encoding>
     */
    else if (header.id === 'COMM' || header.id === 'USLT') {
        encoding = bytes[10];
        variableStart = 14;
        variableLength = 0;
        var language = utils_1.readBytesToISO8859(bytes.slice(11), 3);
        variableLength = utils_1.getEndpointOfBytes(bytes, encoding, variableStart) - variableStart;
        var description = utils_1.readBytesToString(bytes.slice(variableStart), encoding, variableLength);
        variableStart = utils_1.skipPaddingZeros(bytes, variableStart + variableLength + 1);
        result.value = {
            language: language,
            description: description,
            value: utils_1.readBytesToString(bytes.slice(variableStart), encoding),
        };
    }
    /**
     * Attached picture frame, format is:
     * <Header for 'Attached picture', ID: "APIC">
     *  Text encoding   $xx
     *  MIME type       <text string> $00
     *  Picture type    $xx
     *  Description     <text string according to encoding> $00 (00)
     *  Picture data    <binary data>
     */
    else if (header.id === 'APIC') {
        encoding = bytes[10];
        var image = {
            type: null,
            mime: null,
            description: null,
            data: null,
        };
        variableStart = 11;
        // MIME is always encoded as ISO-8859, So always pass 0 to encoding argument.
        variableLength = utils_1.getEndpointOfBytes(bytes, 0, variableStart) - variableStart;
        image.mime = utils_1.readBytesToString(bytes.slice(variableStart), 0, variableLength);
        image.type = imageTypes_1.default[bytes[variableStart + variableLength + 1]] || 'other';
        // Skip $00 and $xx(Picture type).
        variableStart += variableLength + 2;
        variableLength = 0;
        for (i = variableStart; i < 36700160 /* 30*1024*1024 */; i++) {
            if (bytes[i] === 0) {
                variableLength = i - variableStart;
                break;
            }
        }
        image.description = variableLength === 0
            ? null
            : utils_1.readBytesToString(bytes.slice(variableStart), encoding, variableLength);
        // check $00 at start of the image binary data
        variableStart = utils_1.skipPaddingZeros(bytes, variableStart + variableLength + 1);
        image.data = bytes.slice(variableStart);
        result.value = image;
    }
    /**
     * Involved people list frame:
     * <Header for 'Involved people list', ID: "IPLS">
     * Text encoding    $xx
     * People list strings    <text strings according to encoding>
     */
    else if (header.id === 'IPLS') {
        encoding = bytes[10];
        result.value = utils_1.readBytesToString(bytes.slice(11), encoding);
    }
    /**
     * Ownership frame:
     * <Header for 'Ownership frame', ID: "OWNE">
     * Text encoding   $xx
     * Price payed     <text string> $00
     * Date of purch.  <text string>
     * Seller          <text string according to encoding>
     */
    else if (header.id === 'OWNE') {
        encoding = bytes[10];
        variableStart = 11;
        variableLength = utils_1.getEndpointOfBytes(bytes, encoding, variableStart);
        var pricePayed = utils_1.readBytesToISO8859(bytes.slice(variableStart), variableLength);
        variableStart += variableLength + 1;
        var dateOfPurch = utils_1.readBytesToISO8859(bytes.slice(variableStart), 8);
        variableStart += 8;
        result.value = {
            pricePayed: pricePayed,
            dateOfPurch: dateOfPurch,
            seller: utils_1.readBytesToString(bytes.slice(variableStart), encoding),
        };
    }
    else {
        // Do nothing to other frames.
    }
    return result;
}
