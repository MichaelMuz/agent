import { describe, expect, test } from 'bun:test';
import { FakeUserIO } from './mocks/userIO';

describe('Loop', () => {
  test('FakeUserIO carries input to a subscriber and captures output', async () => {
    const io = new FakeUserIO();
    const received: string[] = [];
    io.subscribe((msg) => {
      received.push(msg);
      return Promise.resolve();
    });

    await io.emit('hi');
    await io.sendMessage('yo', new AbortController().signal);

    expect(received).toEqual(['hi']);
    expect(io.sent).toEqual(['yo']);
  });

  // TODO — input routing (a fake agent via a Pick<Agent, ...> port covers these):
  //   - plain message aborts the run, waits for idle, then prompts
  //   - /queue calls followUp with the message
  //   - /steer calls steer with the message
  //   - /stop aborts and waits for idle without prompting
  //   - unknown /command is skipped
  //   - empty message for a command that needs one is skipped
  //
  // TODO — output delivery (needs the REAL Agent + a fake model for real events;
  // this is the one that would have caught the agent_end/.at(-1) bug):
  //   - every assistant turn reaches the user, including queued follow-ups
});
