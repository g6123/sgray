import { Writable } from 'node:stream';
import { inject, injectable } from 'inversify';
import { memfs } from 'memfs';
import { expect, test } from 'vitest';

import { Argv, CLI, Command, options, Stdout } from '../src';
import { end } from './stream';

interface PrintArgv {
  message: string;
}

@injectable()
class NestedPrintCommand implements Command {
  static path = ['nested'];
  static command = 'print';
  static description = 'this command prints message';
  static options = options((c) => c.option('-m, --message <msg>', 'message to print', 'hi'));

  @inject(Stdout)
  private stdout: Writable;

  @inject(Argv)
  private args: PrintArgv;

  async execute() {
    this.stdout.write(`${this.args.message}\n`);
  }
}

test('nested command ', async () => {
  // Given
  const { fs } = memfs();
  const cli = new CLI();
  cli.container.rebind<Writable>(Stdout).toConstantValue(fs.createWriteStream('/stdout')).onDeactivation(end);
  cli.register(NestedPrintCommand);

  // When
  const exitCode = await cli.run(['nested', 'print', '-m', 'hello']);
  await cli.container.unbindAllAsync();

  // Then
  expect(exitCode).toEqual(0);

  const stdout = await fs.promises.readFile('/stdout', { encoding: 'utf-8' });
  expect(stdout).toEqual('hello\n');
});
