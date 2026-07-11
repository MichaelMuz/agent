import { Agent } from '@earendil-works/pi-agent-core';
import { getBuiltinModel } from '@earendil-works/pi-ai/providers/all';
import {
  getOAuthApiKey,
  loginOpenAICodexDeviceCode,
  type OAuthCredentials,
} from '@earendil-works/pi-ai/oauth';

const OPENAI_CODEX = 'openai-codex';
const CREDENTIALS_PATH = '.oauth-credentials.json';

async function loadCredentials(): Promise<Record<string, OAuthCredentials>> {
  const file = Bun.file(CREDENTIALS_PATH);
  if (!(await file.exists())) return {};
  const parsed: unknown = await file.json();
  // shallow boundary check; trusting our own file's shape for now
  if (parsed === null || typeof parsed !== 'object') return {};
  return parsed as Record<string, OAuthCredentials>;
}

async function saveCredentials(
  creds: Record<string, OAuthCredentials>
): Promise<void> {
  await Bun.write(CREDENTIALS_PATH, JSON.stringify(creds, null, 2));
}

const credentials = await loadCredentials();
if (!credentials[OPENAI_CODEX]) {
  credentials[OPENAI_CODEX] = await loginOpenAICodexDeviceCode({
    onDeviceCode: (info) => {
      console.log(
        `Open ${info.verificationUri} and enter code ${info.userCode} (expires in ${info.expiresInSeconds}s)`
      );
    },
  });
  await saveCredentials(credentials);
}

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
    // getOAuthApiKey refreshes an expired token; persist the rotation
    credentials[provider] = result.newCredentials;
    await saveCredentials(credentials);
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
