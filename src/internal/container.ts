import { Container, interfaces } from 'inversify';

import { Stderr, Stdin, Stdout } from '../id';

export function createDefaultContainer(options?: interfaces.ContainerOptions) {
  const container = new Container(options);
  container.bind(Stdout).toConstantValue(process.stdout);
  container.bind(Stderr).toConstantValue(process.stderr);
  container.bind(Stdin).toConstantValue(process.stdin);
  return container;
}
