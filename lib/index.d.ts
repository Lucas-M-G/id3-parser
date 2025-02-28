import { IBytes, IID3Tag } from './interface';
import parseV1Tag from './parsers/v1parser';
import parseV2Tag from './parsers/v2parser';
declare function parse(bytes: IBytes): false | IID3Tag;
export { parseV1Tag, parseV2Tag, parse, };
