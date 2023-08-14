import { Writable } from 'node:stream';
import { inject, injectable } from 'inversify';
import { memfs } from 'memfs';
import { describe, expect, test } from 'vitest';

import { CLI } from '../src/cli';
import { Command, options } from '../src/command';
import { CLIError } from '../src/error';
import { Args, Stderr } from '../src/id';
import { end } from '../src/internal/stream';

@injectable()
class UnknownErrorCommand implements Command {
  static command = 'error';
  static description = 'this command fails with unknown error';
  static options = options();

  async execute() {
    throw new Error('unknown error');
  }
}

test('unknown error', async () => {
  // Given
  const { fs } = memfs();
  const cli = new CLI();
  cli.container.rebind<Writable>(Stderr).toConstantValue(fs.createWriteStream('/stderr')).onDeactivation(end);
  cli.register(UnknownErrorCommand);

  // When
  const exitCode = await cli.run(['error']);
  await cli.container.unbindAllAsync();

  // Then
  expect(exitCode).toEqual(1);

  const stderr = await fs.promises.readFile('/stderr', { encoding: 'utf-8' });
  expect(stderr).toEqual('unknown error\n');
});

@injectable()
class CLIErrorCommand implements Command {
  static command = 'error';
  static description = 'this command fails with known CLI error';
  static options = options((y) => y.option('exitCode', { type: 'number' }));

  @inject(Args) private args: { exitCode?: number };

  async execute() {
    throw new CLIError('known error', this.args.exitCode);
  }
}

describe('cli error', () => {
  test.each([{ exitCode: undefined }, { exitCode: 42 }])('with exit code = $exitCode', async (given) => {
    // Given
    const { fs } = memfs();
    const cli = new CLI();
    cli.container.rebind<Writable>(Stderr).toConstantValue(fs.createWriteStream('/stderr')).onDeactivation(end);
    cli.register(CLIErrorCommand);

    // When
    const exitCode = await cli.run(
      ['error'].concat(given.exitCode == null ? [] : ['--exit-code', `${given.exitCode}`]),
    );
    await cli.container.unbindAllAsync();

    // Then
    expect(exitCode).toEqual(given.exitCode ?? 1);

    const stderr = await fs.promises.readFile('/stderr', { encoding: 'utf-8' });
    expect(stderr).toEqual('known error\n');
  });
});
