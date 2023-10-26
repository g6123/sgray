import { Writable } from 'node:stream';
import { CommanderError, createCommand as createProgram } from 'commander';
import { Container } from 'inversify';

import { Command, CommandStatic } from './command';
import { createContainer } from './container';
import { defualtErrorHandler, ErrorHandler } from './error';
import * as ID from './id';
import { ProgramBuilder, ProgramInit } from './program';

interface CLIOptions {
  container?: Container;
  program?: ProgramInit;
  onError?: ErrorHandler;
}

export class CLI {
  container: Container;
  program: ProgramInit;
  onError: ErrorHandler;

  constructor({
    container = createContainer(),
    program = createProgram,
    onError = defualtErrorHandler,
  }: CLIOptions = {}) {
    this.container = container;
    this.program = program;
    this.onError = onError;
  }

  register<T extends CommandStatic>(command: T) {
    return this.container.bind<T>(ID.Command).toConstantValue(command);
  }

  async run(processArgv: string[]) {
    const stdout = await this.container.getAsync<Writable>(ID.Stdout);
    const stderr = await this.container.getAsync<Writable>(ID.Stderr);
    const commands = await this.container.getAllAsync<CommandStatic>(ID.Command);

    const program = ProgramBuilder.from(this.program, commands).build(async (Command, argv) => {
      const container = this.container.createChild();

      container.bind(CLI).toConstantValue(this);
      container.bind(ID.Argv).toConstantValue(argv);
      container.bind(Command).toSelf();

      const command = await container.getAsync<Command>(Command);
      return command.execute();
    });

    try {
      await program.parseAsync(processArgv, { from: 'user' });
      return 0;
    } catch (error) {
      if (error instanceof CommanderError) {
        return error.exitCode;
      }

      return this.onError(error as {}, { stdout, stderr });
    }
  }

  clone() {
    return new CLI(this);
  }
}
