import { Writable } from 'node:stream';
import { Container } from 'inversify';
import { Argv } from 'yargs';
import Yargs from 'yargs/yargs';

import { createDefaultContainer } from './internal/container';
import { writeln } from './internal/stream';
import { Command, CommandStatic } from './command';
import * as ID from './id';

interface CLIOptions {
  container?: Container;
  yargs?: Argv;
}

export class CLI {
  container: Container;
  yargs: Argv;

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

    for (const Command of await this.container.getAllAsync<CommandStatic>(ID.Command)) {
      this.yargs.command(
        Command.command,
        Command.description,
        (y) => Command.options(y),
        async (args) => {
          const commandContainer = this.container.createChild();

          commandContainer.bind(CLI).toConstantValue(this);
          commandContainer.bind(ID.Argv).toConstantValue(this.yargs);
          commandContainer.bind(ID.Args).toConstantValue(args);
          commandContainer.bind(Command).toSelf();

          const command = await commandContainer.getAsync<Command>(Command);
          const commandResult = await command.execute();

          args['$?'] = commandResult;
        },
      );
    }

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
}
