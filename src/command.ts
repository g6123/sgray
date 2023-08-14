import { Argv } from 'yargs';

export interface CommandStatic<Args extends CommandArgs = CommandArgs> {
  new (...args: any[]): Command;

  path?: string[];
  command: string;
  description: string;
  options: (y: Argv<CommandArgs>) => Argv<Args>;
}

export interface CommandArgs {
  '$?'?: CommandResult;
  '$!'?: unknown;
}

export type CommandResult = number | void;

export interface Command {
  execute(): Promise<CommandResult> | CommandResult;
}

export const options =
  <Args extends CommandArgs>(fn: (y: Argv<CommandArgs>) => Argv<any> = (y) => y) =>
  (y: Argv<CommandArgs>): Argv<Args> =>
    fn(y);
