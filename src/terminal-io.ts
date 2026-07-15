import type { Interface } from 'node:readline/promises';
import { cursorTo, clearLine } from 'node:readline';
import { createInterface } from 'node:readline/promises';
import { error } from './logger';

export class terminalIO {
  rl: Interface;
  constructor() {
    this.rl = createInterface({ input: process.stdin, output: process.stdout });
  }

  subscribe(listener: (message: string) => Promise<void>): () => void {
    const controller = new AbortController();

    (async (signal: AbortSignal) => {
      while (!signal.aborted) {
        const userInput = await this.rl
          .question('> ', { signal })
          .catch((e: unknown) => {
            if (e instanceof Error && e.name === 'AbortError') return null;
            throw e;
          });

        if (userInput === null) {
          break;
        }

        await listener(userInput);
      }
    })(controller.signal).catch((e: unknown) => {
      error('User input loop failed. Error:', e);
    });

    return () => {
      controller.abort();
    };
  }

  sendMessage(message: string, _signal: AbortSignal): Promise<void> {
    cursorTo(process.stdout, 0);
    clearLine(process.stdout, 0);
    console.log(message);
    this.rl.prompt(true);
    return Promise.resolve();
  }
}
