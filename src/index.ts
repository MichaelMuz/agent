import { initAuth } from './env-context.ts';
import { agent } from './agent.ts';

await initAuth();

await agent.prompt('Hello, how are you doing?');
