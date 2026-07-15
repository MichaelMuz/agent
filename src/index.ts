import { initAuth } from './agent/provider-auth.ts';
import { agent } from './agent/agent.ts';
// import { TerminalIO } from './user-io/terminal.ts';
import { Loop } from './loop.ts';
import { loadTelegramEnv, TelegramIO } from './user-io/telegram.ts';

const controller = new AbortController();
process.on('SIGINT', () => {
  controller.abort();
});

await initAuth();

const telegramEnv = loadTelegramEnv();
const telegramIO = new TelegramIO(...telegramEnv);

const loop = new Loop(telegramIO, agent);
await loop.start(controller.signal);
