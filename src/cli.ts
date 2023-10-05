import { Writable } from 'node:stream';
import { Container } from 'inversify';
import { Argv } from 'yargs';

import { ArgvBuilder, createDefaultArgv } from './internal/argv';
import { createDefaultContainer } from './internal/container';
import { writeln } from './internal/stream';
import { Command, CommandStatic } from './command';
import { defualtErrorHandler, ErrorHandler } from './error';
import * as ID from './id';

interface CLIOptions {
  container?: Container;
  yargs?: () => Argv;
  onError?: ErrorHandler;
}

export class CLI {
  container: Container;

  private createYargs: () => Argv;
  private onError: ErrorHandler;

  constructor({
    container = createDefaultContainer(),
    yargs = createDefaultArgv,
    onError = defualtErrorHandler,
  }: CLIOptions = {}) {
    this.container = container;
    this.createYargs = yargs;
    this.onError = onError;
  }

  register<T extends CommandStatic>(command: T) {
    return this.container.bind<T>(ID.Command).toConstantValue(command);
  }

  async run(processArgs: string[]): Promise<number> {
    const yargs = this.createYargs();
    const commands = await this.container.getAllAsync<CommandStatic>(ID.Command);

    ArgvBuilder.from(commands).build(yargs, async (Command, args) => {
      const container = this.container.createChild();

      container.bind(CLI).toConstantValue(this);
      container.bind(ID.Argv).toConstantValue(yargs);
      container.bind(ID.Args).toConstantValue(args);
      container.bind(Command).toSelf();

      const command = await container.getAsync<Command>(Command);

      try {
        args['$?'] = await command.execute();
      } catch (error) {
        args['$!'] = error;
      }
    });

    const stdout = await this.container.getAsync<Writable>(ID.Stdout);
    const stderr = await this.container.getAsync<Writable>(ID.Stderr);

    return new Promise<number>((resolve) => {
      yargs.parse(processArgs, {}, (yargsError, argv, yargsOutput) => {
        const error = yargsError ?? argv['$!'];

        if (error != null) {
          resolve(this.onError(error, { stdout, stderr }));
          return;
        }

        if (yargsOutput !== '') {
          writeln(stdout, yargsOutput);
          resolve(0);
          return;
        }

        resolve(argv['$?'] != null ? Number(argv['$?']) : 0);
      });
    });
  }

  clone() {
    return new CLI({
      container: this.container,
      yargs: this.createYargs,
      onError: this.onError,
    });
  }
}
