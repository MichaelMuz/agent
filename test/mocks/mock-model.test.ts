import { describe, expect, test } from 'bun:test';
import { makeMockModelAgent } from './agent.ts';

describe('makeMockModelAgent', () => {
  test('emits an incrementing counter through the real agent loop', async () => {
    const agent = makeMockModelAgent();
    const outputs: string[] = [];
    const unsubscribe = agent.subscribe((event) => {
      if (event.type === 'turn_end' && event.message.role === 'assistant') {
        const last = event.message.content.at(-1);
        if (last?.type === 'text') outputs.push(last.text);
      }
    });

    await agent.prompt('hi');
    await agent.prompt('again');
    unsubscribe();

    expect(outputs).toEqual(['0', '1']);
  });
});
