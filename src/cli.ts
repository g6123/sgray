import { Writable } from 'node:stream';
import { Container } from 'inversify';
import { Argv } from 'yargs';
import Yargs from 'yargs/yargs';

import { ArgvBuilder } from './internal/argv';
import { createDefaultContainer } from './internal/container';
import { writeln } from './internal/stream';
import { Command, CommandStatic } from './command';
import { CLIError } from './error';
import * as ID from './id';

interface CLIOptions {
  container?: Container;
  yargs?: Argv;
}

export class CLI {
  container: Container;
  yargs: Argv;

  private isInit: boolean = false;

  constructor({ container = createDefaultContainer(), yargs = Yargs().help() }: CLIOptions = {}) {
    this.container = container;
    this.yargs = yargs;
  }

  register(...commands: CommandStatic[]) {
    for (const Command of commands) {
      this.container.bind(ID.Command).toConstantValue(Command);
    }

    return this;
  }

  async run(processArgs: string[]): Promise<number> {
    const stderr = await this.container.getAsync<Writable>(ID.Stderr);

    await this.init();

    return new Promise<number>((resolve) => {
      this.yargs.parse(processArgs, {}, (error, argv, output) => {
        if (error != null) {
          writeln(stderr, error.message);
          resolve(1);
        } else if (output !== '') {
          writeln(stderr, output);
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

      const stderr = await container.getAsync<Writable>(ID.Stderr);
      const command = await container.getAsync<Command>(Command);

      try {
        args['$?'] = await command.execute();
      } catch (error) {
        if (error instanceof CLIError) {
          args['$?'] = error.exitCode ?? 1;
          stderr.write(error.message);
          stderr.write('\n');
          return;
        }

        throw error;
      }
    });

    this.isInit = true;
  }
}
