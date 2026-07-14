// import { initAuth } from './env-context.ts';
// import { agent } from './agent.ts';
// import { terminalIO } from './terminal-io.ts';
// import { Loop } from './loop.ts';
import { bot } from './telegram.ts';

// const controller = new AbortController();
// process.on('SIGINT', () => {
//   controller.abort();
// });

// await initAuth();
// const loop = new Loop(terminalIO, agent);
// await loop.start(controller.signal);

bot.start();
