import { type UserIO } from './loop.ts';
import { createInterface } from 'node:readline/promises';

const rl = createInterface({ input: process.stdin, output: process.stdout });

export const terminalIO: UserIO = {
  getUserInput: async (signal: AbortSignal) =>
    await rl.question('> ', { signal }),
  pushModelOutput: (output: string) => {
    console.log(output);
    // suspicious shape? Did I make wrong interface?
    return Promise.resolve();
  },
};
