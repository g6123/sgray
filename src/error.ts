import { Writable } from 'node:stream';

export class CLIError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1,
  ) {
    super(message);
  }
}

export type ErrorHandler = (error: unknown, context: ErrorHandlerContext) => number;

export interface ErrorHandlerContext {
  stdout: Writable;
  stderr: Writable;
}

export const defualtErrorHandler: ErrorHandler = (error, { stderr }) => {
  const message = (error as any).message;

  if (message != null) {
    stderr.write(message);
    stderr.write('\n');
  }

  if (error instanceof CLIError) {
    return error.exitCode;
  }

  return 1;
};
