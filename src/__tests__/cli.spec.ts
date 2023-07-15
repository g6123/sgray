import { Writable } from 'node:stream';
import { expect, test } from '@jest/globals';
import { inject, injectable } from 'inversify';
import { memfs } from 'memfs';

import { CLI } from '../cli';
import { Command, CommandArgs, options } from '../command';
import { Args, Stdout } from '../id';
import { end } from '../internal/stream';

interface PrintArgs extends CommandArgs {
  message: string;
}

@injectable()
class PrintCommand implements Command {
  static command = 'print';
  static description = 'this command prints message';

  static options = options<PrintArgs>((y) =>
    y.option('message', {
      type: 'string',
      alias: 'm',
      default: 'hi',
    }),
  );

  @inject(Args)
  private args: PrintArgs;

  @inject(Stdout)
  private stdout: Writable;

  async execute() {
    this.stdout.write(`${this.args.message}\n`);
  }
}

test('simple print command ', async () => {
  // Given
  const { fs } = memfs();
  const cli = new CLI();
  cli.container.rebind<Writable>(Stdout).toConstantValue(fs.createWriteStream('/stdout')).onDeactivation(end);
  cli.register(PrintCommand);

  // When
  const exitCode = await cli.run(['print', '-m', 'hello']);
  await cli.container.unbindAllAsync();

  // Then
  const output = await fs.promises.readFile('/stdout', { encoding: 'utf-8' });
  expect(exitCode).toEqual(0);
  expect(output).toEqual('hello\n');
});
