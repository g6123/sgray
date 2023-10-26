import { Writable } from 'node:stream';

export class CLIError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1,
  ) {
    super(message);
  }
}

export type ErrorHandler = (error: {}, context: ErrorHandlerContext) => number | Promise<number>;

export interface ErrorHandlerContext {
  stdout: Writable;
  stderr: Writable;
}

export const defualtErrorHandler: ErrorHandler = (error: { message?: string; exitCode?: number }, { stderr }) => {
  if (error.message != null) {
    stderr.write(error.message);
    stderr.write('\n');
  }

  return error.exitCode ?? 1;
};
