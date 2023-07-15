import { Writable } from 'node:stream';

export const writeln = (stream: Writable, data: string | Uint8Array) => {
  stream.write(data);
  stream.write('\n');
};

export const end = (stream: Writable) =>
  new Promise<void>((resolve) => {
    stream.end(resolve);
  });
