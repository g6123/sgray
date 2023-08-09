export class CLIError extends Error {
  constructor(
    message: string,
    public exitCode?: number,
  ) {
    super(message);
  }
}
