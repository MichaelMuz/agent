import { initAuth } from './env-context.ts';
import { agent } from './agent.ts';
import { terminalIO } from './terminal-io.ts';
import { Loop } from './loop.ts';

await initAuth();
const loop = new Loop(terminalIO, agent);
loop.start();
