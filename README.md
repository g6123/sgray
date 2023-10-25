# sgray

[Commander.js](https://github.com/tj/commander.js), [inversified](https://inversify.io/).

`sgray` provides a DI/IoC mechanism for CLI applications with Commander.js and InversifyJS.

## Installation

Install `sgray` and its peer dependencies.

```shell
yarn add sgray inversify reflect-metadata
pnpm add sgray inversify reflect-metadata
npm install --save sgray inversify reflect-metadata
```

InversifyJS requires the `experimentalDecorators`, `emitDecoratorMetadata` and `lib` compilation options in your `tsconfig.json` file.
You can also refer to their [installation guide](https://github.com/inversify/InversifyJS/blob/master/wiki/installation.md).

```json
{
  "compilerOptions": {
    "types": ["node", "reflect-metadata"],
    "strictPropertyInitialization": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Example

```typescript
import 'reflect-metadata';

import { exit } from 'node:process';
import { inject, injectable } from 'inversify';
import { Argv, CLI, Command, CommandArgv, options } from 'sgray';

interface GreetArgv {
  message: string;
}

@injectable()
class GreetCommand implements Command {
  static command = 'greet';
  static description = 'prints greeting message';
  static options = options((c) => c.option('-m, --message <string>', 'message to print'));

  @inject(Argv)
  private argv: GreetArgv;

  async execute() {
    console.log(this.argv.message);
  }
}

const cli = new CLI();
cli.register(GreetCommand);
cli.run(process.argv.slice(2)).then(exit);
```
