# sgray

[Yargs](https://yargs.js.org/), [inversified](https://inversify.io/).

`sgray` provides a DI/IoC mechanism for CLI applications with Yargs and InversifyJS.

## Installation

Install `sgray` and its peer dependencies.

```shell
yarn add sgray yargs inversify reflect-metadata
pnpm add sgray yargs inversify reflect-metadata
npm install --save sgray yargs inversify reflect-metadata
```

InversifyJS requires the `experimentalDecorators`, `emitDecoratorMetadata` and `lib` compilation options in your `tsconfig.json` file. You can also refer to their [installation guide](https://github.com/inversify/InversifyJS/blob/master/wiki/installation.md).

```json5
// tsconfig.json
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
import { Args, CLI, Command, CommandArgs, options } from 'sgray';
import { hideBin } from 'yargs/helpers';

interface GreetArgs extends CommandArgs {
  message: string;
}

@injectable()
class GreetCommand implements Command {
  static command = 'greet';
  static description = 'prints greeting message';
  static options = options<GreetArgs>((y) => y.option('message', { type: 'string', alias: 'm', default: 'hi' }));

  @inject(Args)
  private args: GreetArgs;

  async execute() {
    console.log(this.args.message);
  }
}

const cli = new CLI();
cli.register(GreetCommand);
cli.run(hideBin(process.argv)).then(exit);
```
