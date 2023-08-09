import { Writable } from 'node:stream';
import { Container } from 'inversify';
import { Argv } from 'yargs';
import Yargs from 'yargs/yargs';

import { ArgvBuilder } from './internal/argv';
import { createDefaultContainer } from './internal/container';
import { writeln } from './internal/stream';
import { Command, CommandStatic } from './command';
import { defualtErrorHandler, ErrorHandler } from './error';
import * as ID from './id';

interface CLIOptions {
  container?: Container;
  yargs?: Argv;
  onError?: ErrorHandler;
}

export class CLI {
  container: Container;
  yargs: Argv;

  private isInit: boolean = false;
  private onError: ErrorHandler;

  constructor({
    container = createDefaultContainer(),
    yargs = Yargs().help(),
    onError = defualtErrorHandler,
  }: CLIOptions = {}) {
    this.container = container;
    this.yargs = yargs;
    this.onError = onError;
  }

  register<T extends CommandStatic>(command: T) {
    return this.container.bind<T>(ID.Command).toConstantValue(command);
  }

  async run(processArgs: string[]): Promise<number> {
    const stdout = await this.container.getAsync<Writable>(ID.Stdout);
    const stderr = await this.container.getAsync<Writable>(ID.Stderr);

    await this.init();

    return new Promise<number>((resolve) => {
      this.yargs.parse(processArgs, {}, (error, argv, output) => {
        if (error != null) {
          resolve(this.onError(error, { stdout, stderr }));
        } else if (output !== '') {
          writeln(stdout, output);
          resolve(0);
        } else {
          const exitCode = argv['$?'];
          resolve(exitCode != null ? Number(exitCode) : 0);
        }
      });
    });
  }

  private async init() {
    if (this.isInit) {
      return;
    }

    const commands = await this.container.getAllAsync<CommandStatic>(ID.Command);

    ArgvBuilder.from(commands).build(this.yargs, async (Command, args) => {
      const container = this.container.createChild();

      container.bind(CLI).toConstantValue(this);
      container.bind(ID.Argv).toConstantValue(this.yargs);
      container.bind(ID.Args).toConstantValue(args);
      container.bind(Command).toSelf();

      const command = await container.getAsync<Command>(Command);
      const commandResult = await command.execute();

      args['$?'] = commandResult ?? 0;
    });

    this.isInit = true;
  }
}
