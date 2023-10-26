import commander, { Command as SubCommand } from 'commander';

import { CommandStatic } from './command';

export type ProgramInit = () => commander.Command;

interface CommandNode {
  name?: string;
  command?: CommandStatic;
  children: Record<string, CommandNode>;
}

export class ProgramBuilder {
  private store: Record<string, CommandNode> = {};

  constructor(private init: ProgramInit) {}

  private addNode(path: string[], name: string, node: CommandNode) {
    let parent = this.store;

    for (const name of path) {
      let parentNode = parent[name];

      if (parentNode == null) {
        parentNode = parent[name] = { name, children: {} };
      }

      parent = parentNode.children;
    }

    if (parent[name] != null) {
      throw new Error(`command conflicts: "${path.join(' ')}"`);
    }

    parent[name] = node;
    return this;
  }

  add(Command: CommandStatic) {
    return this.addNode(Command.path ?? [], Command.command, {
      name: Command.command,
      command: Command,
      children: {},
    });
  }

  build(handle: (command: CommandStatic, argv: {}) => Promise<void>) {
    function build({ name, command, children }: CommandNode, cmd = new SubCommand(name)) {
      if (command != null) {
        cmd.description(command.description);
        command.options?.(cmd);
        cmd.action((...input) => handle(command, parseActionArgs(input)));
      } else {
        for (const child of Object.values(children)) {
          cmd.addCommand(build(child));
        }
      }

      return cmd.exitOverride();
    }

    return build({ children: this.store }, this.init());
  }

  static from(init: ProgramInit, commands: CommandStatic[]) {
    const instance = new this(init);

    for (const command of commands) {
      instance.add(command);
    }

    return instance;
  }
}

function parseActionArgs(input: any[]): {} {
  const cmd: commander.Command = input.at(-1);
  const argv = input[cmd.registeredArguments.length];
  const args = cmd.registeredArguments.reduce<Record<string, unknown>>((acc, arg, index) => {
    acc[arg.name()] = input[index];
    return acc;
  }, {});
  const globalArgs = cmd.optsWithGlobals();
  return { ...globalArgs, ...args, ...argv };
}
