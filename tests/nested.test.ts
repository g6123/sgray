import { Writable } from 'node:stream';
import { inject, injectable } from 'inversify';
import { memfs } from 'memfs';
import { expect, test } from 'vitest';

import { CLI } from '../src/cli';
import { Command, options } from '../src/command';
import { Stdout } from '../src/id';
import { end } from '../src/internal/stream';

@injectable()
class FooCommand implements Command {
  static path = ['nested'];
  static command = 'foo';
  static description = 'this is foo command';
  static options = options();

  @inject(Stdout)
  private stdout: Writable;

  async execute() {
    this.stdout.write('foo\n');
  }
}

@injectable()
class BarCommand implements Command {
  static path = ['nested'];
  static command = 'bar';
  static description = 'this is bar command';
  static options = options();

  @inject(Stdout)
  private stdout: Writable;

  async execute() {
    this.stdout.write('bar\n');
  }
}

test('nested command ', async () => {
  // Given
  const { fs } = memfs();
  const cli = new CLI();
  cli.container.rebind<Writable>(Stdout).toConstantValue(fs.createWriteStream('/stdout')).onDeactivation(end);
  cli.register(FooCommand, BarCommand);

  // When
  await cli.run(['nested', '--help']);

  const foo = await cli.run(['nested', 'foo']);
  const bar = await cli.run(['nested', 'bar']);
  await cli.container.unbindAllAsync();

  // Then
  const output = await fs.promises.readFile('/stdout', { encoding: 'utf-8' });
  expect(foo).toEqual(0);
  expect(bar).toEqual(0);
  expect(output).toEqual('foo\nbar\n');
});
