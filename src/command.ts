import commander from 'commander';

export interface CommandStatic {
  new (...args: any[]): Command;

  path?: string[];
  default?: boolean;
  command: string;
  description: string;
  options?: (c: commander.Command) => commander.Command;
}

export interface Command {
  execute(): Promise<void> | void;
}

export const options = (fn: (c: commander.Command) => commander.Command) => (c: commander.Command) => fn(c);
