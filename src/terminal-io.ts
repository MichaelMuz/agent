import type { Interface } from 'node:readline';
import { cursorTo, clearLine } from 'node:readline';
import { createInterface } from 'node:readline/promises';

export class terminalIO {
  rl: Interface;
  constructor() {
    this.rl = createInterface({ input: process.stdin, output: process.stdout });
  }

  subscribe(listener: (message: string) => void): () => void {
    const controller = new AbortController();
    this.rl.question('> ', { signal: controller.signal }, (userInput) => {
      listener(userInput);
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
