import { initAuth } from './agent/provider-auth.ts';
import { agent } from './agent/agent.ts';
import { Loop } from './loop.ts';
import { makeUserIO } from './user-io/interface.ts';

const controller = new AbortController();
process.on('SIGINT', () => {
  controller.abort();
});

await initAuth();
const userIO = makeUserIO('telegram');
const loop = new Loop(userIO, agent);
await loop.start(controller.signal);
