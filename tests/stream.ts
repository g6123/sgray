import { Writable } from 'node:stream';

export const end = (stream: Writable) =>
  new Promise<void>((resolve) => {
    stream.end(resolve);
  });
