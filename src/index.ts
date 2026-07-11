import { Agent } from '@earendil-works/pi-agent-core';
import { getBuiltinModel } from '@earendil-works/pi-ai/providers/all';
import { initAuth, getFreshOauth } from './env-context.ts';

await initAuth();

const agent = new Agent({
  // Initial state
  initialState: {
    systemPrompt:
      'You are currently in an experimental agentic harness. Respond mostly with anything you notice or friction you feel given the provided env.',
    model: getBuiltinModel('openai-codex', 'gpt-5.4-mini'),
    thinkingLevel: 'medium',
    tools: [],
    messages: [],
  },

  // Convert AgentMessage[] to LLM Message[] (required for custom message types)
  convertToLlm: (messages) => {
    console.debug('convertToLlm — messages:', messages);
    // copied from unexported defaultConvertToLlm;
    return messages.filter(
      (message) =>
        message.role === 'user' ||
        message.role === 'assistant' ||
        message.role === 'toolResult'
    );
  },

  // Transform context before convertToLlm (for pruning, compaction)
  transformContext: async (messages, abortSignal) => {
    console.debug(
      'transformContext — messages:',
      messages,
      'signal:',
      abortSignal
    );
    return messages;
  },

  // Steering mode: "one-at-a-time" (default) or "all"
  steeringMode: 'all',

  // Follow-up mode: "one-at-a-time" (default) or "all"
  followUpMode: 'one-at-a-time',

  // Custom stream function (for proxy backends) - not useful to me right now
  // streamFn: streamProxy,

  // Session ID for provider caching
  sessionId: crypto.randomUUID(),

  // Dynamic API key resolution (for expiring OAuth tokens)
  getApiKey: getFreshOauth,

  // Tool execution mode: "parallel" (default) or "sequential"
  toolExecution: 'parallel',

  // Preflight each tool call after args are validated. Can block execution.
  beforeToolCall: async ({ toolCall, args, context }) => {
    console.debug(
      'beforeToolCall — call:',
      toolCall,
      'args:',
      args,
      'context:',
      context
    );
    // can also optionally block the tool call with some reason
    return {};
  },

  // Postprocess each tool result before final tool events are emitted.
  afterToolCall: async ({ toolCall, result, isError, context }) => {
    console.debug(
      'afterToolCall — call:',
      toolCall,
      'result:',
      result,
      'isError:',
      isError,
      'context:',
      context
    );
    // overwrite none of the passed args
    return {};
  },
});

agent.subscribe((event) => {
  if (event.type == 'message_end') {
    console.debug('message_end:', event.message);
  }
});
agent.prompt('Hello, how are you doing?');
