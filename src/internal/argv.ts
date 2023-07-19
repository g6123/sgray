import { ArgumentsCamelCase, Argv } from 'yargs';

import { CommandArgs, CommandStatic } from '../command';

type ArgvHandler<Args> = (command: CommandStatic, args: ArgumentsCamelCase<Args>) => Promise<void>;

interface ArgvNode {
  command: CommandStatic | null;
  children: Record<string, ArgvNode>;
}

export class ArgvBuilder {
  private store: Record<string, ArgvNode> = {};

  add(path: string[], name: string, node: ArgvNode) {
    let target = this.store;

    for (const name of path) {
      let parentNode = target[name];

      if (parentNode == null) {
        parentNode = target[name] = { command: null, children: {} };
      }

      target = parentNode.children;
    }

    if (target[name] != null) {
      throw new Error(`command conflicts: "${path.join(' ')}"`);
    }

    target[name] = node;
  }

  build(yargs: Argv, handle: ArgvHandler<CommandArgs>, store = this.store) {
    for (const [name, { command, children }] of Object.entries(store)) {
      if (command != null) {
        yargs.command(command.command, command.description, command.options, (args) => handle(command, args));
      } else {
        yargs.command(name, '', (y) => this.build(y, handle, children));
      }
    }
  }

  static from(commands: CommandStatic[]) {
    const instance = new this();

    for (const command of commands) {
      const path = command.path ?? [];
      const [name] = command.command.split(' ', 2) as [string, ...string[]];
      instance.add(path, name, { command, children: {} });
    }

    return instance;
  }
}
