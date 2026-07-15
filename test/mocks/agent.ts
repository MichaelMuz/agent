import { Agent, type AgentOptions } from '@earendil-works/pi-agent-core';
import { getBuiltinModel } from '@earendil-works/pi-ai/providers/all';
import {
  createAssistantMessageEventStream,
  fauxAssistantMessage,
} from '@earendil-works/pi-ai';

type StreamFn = NonNullable<AgentOptions['streamFn']>;

/**
 * A stand-in for the model's network call: ignores its input and returns "0",
 * "1", "2", etc. One plain-text assistant message per invocation. The counter is
 * per-factory, so each agent starts fresh at "0".
 *
 * In pi the Model is just a descriptor; behavior lives here, in the streamFn.
 */
export function createCountingStreamFn(): StreamFn {
  let next = 0;
  return () => {
    const message = fauxAssistantMessage(String(next++));
    const stream = createAssistantMessageEventStream();
    // No deltas needed: the loop drains the stream, sees `done`, and takes the
    // final message from result().
    stream.push({ type: 'done', reason: 'stop', message });
    stream.end(message);
    return stream;
  };
}

/**
 * A real Agent running the real loop, with only the model's network call
 * replaced by {@link createCountingStreamFn}. Everything else like steering,
 * follow-up draining, the event stream is genuine.
 */
export function makeMockModelAgent(): Agent {
  return new Agent({
    initialState: {
      systemPrompt: '',
      model: getBuiltinModel('openai-codex', 'gpt-5.4-mini'),
      messages: [],
    },
    streamFn: createCountingStreamFn(),
  });
}
