import { initAuth } from './env-context.ts';
import { agent } from './agent.ts';
// import { terminalIO } from './terminal-io.ts';
import { Loop } from './loop.ts';
import { loadTelegramEnv, TelegramIO } from './telegram-io.ts';

const controller = new AbortController();
process.on('SIGINT', () => {
  controller.abort();
});

await initAuth();

const telegramEnv = loadTelegramEnv();
const telegramIO = new TelegramIO(...telegramEnv);

const loop = new Loop(telegramIO, agent);
await loop.start(controller.signal);
