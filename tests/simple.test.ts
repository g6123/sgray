import { Writable } from 'node:stream';
import { inject, injectable } from 'inversify';
import { memfs } from 'memfs';
import { expect, test } from 'vitest';

import { CLI } from '../src/cli';
import { Command, CommandArgs, options } from '../src/command';
import { Args, Stdout } from '../src/id';
import { end } from '../src/internal/stream';

interface PrintArgs extends CommandArgs {
  message: string;
}

@injectable()
class PrintCommand implements Command {
  static command = 'print';
  static description = 'this command prints message';
  static options = options<PrintArgs>((y) => y.option('message', { type: 'string', alias: 'm', default: 'hi' }));

  @inject(Stdout)
  private stdout: Writable;

  @inject(Args)
  private args: PrintArgs;

  async execute() {
    this.stdout.write(`${this.args.message}\n`);
  }
}

test('simple command ', async () => {
  // Given
  const { fs } = memfs();
  const cli = new CLI();
  cli.container.rebind<Writable>(Stdout).toConstantValue(fs.createWriteStream('/stdout')).onDeactivation(end);
  cli.register(PrintCommand);

  // When
  const exitCode = await cli.run(['print', '-m', 'hello']);
  await cli.container.unbindAllAsync();

  // Then
  expect(exitCode).toEqual(0);

  const stdout = await fs.promises.readFile('/stdout', { encoding: 'utf-8' });
  expect(stdout).toEqual('hello\n');
});
