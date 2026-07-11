import { Agent } from '@earendil-works/pi-agent-core';
import { getBuiltinModel } from '@earendil-works/pi-ai/providers/all';
import {
  getOAuthApiKey,
  loginOpenAICodexDeviceCode,
  type OAuthCredentials,
} from '@earendil-works/pi-ai/oauth';

const OPENAI_CODEX = 'openai-codex';

// One-time headless login. Persist these later; for now we re-login every run.
const credentials: Record<string, OAuthCredentials> = {};
credentials[OPENAI_CODEX] = await loginOpenAICodexDeviceCode({
  onDeviceCode: (info) => {
    console.log(
      `Open ${info.verificationUri} and enter code ${info.userCode} (expires in ${info.expiresInSeconds}s)`
    );
  },
});

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
    console.debug(`Asked to convert ${messages}`);
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
      `Asked to convert ${messages} with the abort signal ${abortSignal}`
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
  getApiKey: async (provider) => {
    if (provider !== OPENAI_CODEX) return undefined;
    const result = await getOAuthApiKey(provider, credentials);
    if (!result) return undefined;
    // getOAuthApiKey refreshes an expired token; keep the map current
    credentials[provider] = result.newCredentials;
    return result.apiKey;
  },

  // Tool execution mode: "parallel" (default) or "sequential"
  toolExecution: 'parallel',

  // Preflight each tool call after args are validated. Can block execution.
  beforeToolCall: async ({ toolCall, args, context }) => {
    console.debug(
      `Before tool call ${toolCall} with args ${args} and context ${context}`
    );
    // can also optionally block the tool call with some reason
    return {};
  },

  // Postprocess each tool result before final tool events are emitted.
  afterToolCall: async ({ toolCall, result, isError, context }) => {
    console.debug(
      `after tool call ${toolCall} with result ${result}, isError ${isError} and context ${context}`
    );
    // overwrite none of the passed args
    return {};
  },
});
