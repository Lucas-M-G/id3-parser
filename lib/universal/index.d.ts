import { IBytes, IID3Tag } from '../interface';
export default function uParse(bytes: IBytes | File | string): Promise<IID3Tag>;
