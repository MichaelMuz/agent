import { type UserIO } from './loop.ts';
import { createInterface } from 'node:readline/promises';

const rl = createInterface({ input: process.stdin, output: process.stdout });

export const terminalIO: UserIO = {
  getUserInput: async () => await rl.question('> '),
  pushModelOutput: async (output: string) => console.log(output),
};
