import { Agent } from '@earendil-works/pi-agent-core';
import { getBuiltinModel } from '@earendil-works/pi-ai/providers/all';
import { getFreshOauth } from './env-context.ts';
import { bashTool } from './tools.ts';

const systemPrompt = `\
You are currently in an experimental agentic harness. Respond mostly with anything you notice or friction you feel given the provided env.
`;

export const agent = new Agent({
  // Initial state
  initialState: {
    systemPrompt,
    model: getBuiltinModel('openai-codex', 'gpt-5.4-mini'),
    thinkingLevel: 'medium',
    tools: [bashTool],
    messages: [],
  },

  steeringMode: 'all',
  sessionId: crypto.randomUUID(),
  getApiKey: getFreshOauth,
});
