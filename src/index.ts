import { initAuth } from './env-context.ts';
import { agent } from './agent.ts';
await initAuth();

agent.subscribe((event) => {
  if (event.type == 'message_end') {
    console.debug('message_end:', event.message);
  }
});
await agent.prompt('Hello, how are you doing?');
