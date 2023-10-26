import { Writable } from 'node:stream';
import { inject, injectable } from 'inversify';
import { memfs } from 'memfs';
import { expect, test } from 'vitest';

import { Argv, CLI, Command, options, Stdout } from '../src';
import { end } from './stream';

interface PrintArgv {
  message: string;
  times: number;
}

@injectable()
class PrintCommand implements Command {
  static command = 'print';
  static description = 'this command prints message';

  static options = options((cmd) =>
    cmd.argument('[message]', 'message to print', 'hi').option('-t, --times <num>', 'print repeatedly', Number, 1),
  );

  @inject(Stdout)
  private stdout: Writable;

  @inject(Argv)
  private argv: PrintArgv;

  async execute() {
    for (let i = 0; i < this.argv.times; i++) {
      this.stdout.write(`${this.argv.message}\n`);
    }
  }
}

test('simple command ', async () => {
  // Given
  const { fs } = memfs();
  const cli = new CLI();
  cli.container.rebind<Writable>(Stdout).toConstantValue(fs.createWriteStream('/stdout')).onDeactivation(end);
  cli.register(PrintCommand);

  // When
  const exitCode = await cli.run(['print', '-t', '3', 'hello']);
  await cli.container.unbindAllAsync();

  // Then
  expect(exitCode).toEqual(0);

  const stdout = await fs.promises.readFile('/stdout', { encoding: 'utf-8' });
  expect(stdout).toEqual(['hello', 'hello', 'hello', ''].join('\n'));
});
