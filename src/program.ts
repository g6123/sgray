import commander, { Command as SubCommand } from 'commander';

import { CommandStatic } from './command';

export type ProgramInit = () => commander.Command;

interface CommandNode {
  name: string;
  command: CommandStatic | null;
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
        parentNode = parent[name] = { name, command: null, children: {} };
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
    function addCommand(parent: commander.Command, { name, command: Command, children }: CommandNode) {
      if (Command != null) {
        const c = new SubCommand(Command.command).description(Command.description);
        Command.options?.(c);
        c.action((...ctx) => {
          const argv = ctx[c.registeredArguments.length];
          const args = c.registeredArguments.reduce<Record<string, unknown>>((acc, arg, index) => {
            acc[arg.name()] = ctx[index];
            return acc;
          }, {});
          return handle(Command, { ...argv, ...args });
        });
        parent.addCommand(c, { isDefault: Command.default });
      } else {
        const c = parent.command(name);
        Object.values(children).forEach((child) => addCommand(c, child));
      }
    }

    const program = this.init();
    Object.values(this.store).forEach((child) => addCommand(program, child));
    return program;
  }

  static from(init: ProgramInit, commands: CommandStatic[]) {
    const instance = new this(init);

    for (const command of commands) {
      instance.add(command);
    }

    return instance;
  }
}
