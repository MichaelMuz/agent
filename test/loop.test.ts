import { describe, expect, test } from 'bun:test';
import type { UserIO } from '../src/user-io/interface.ts';

/**
 * Captures everything the loop sends to the user and lets a test drive input by
 * calling the subscribed listener directly, no real terminal or Telegram.
 */
class FakeUserIO implements UserIO {
  readonly sent: string[] = [];
  private listener: ((message: string) => Promise<void>) | null = null;

  subscribe(listener: (message: string) => Promise<void>): () => void {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }

  sendMessage(message: string, _signal: AbortSignal): Promise<void> {
    this.sent.push(message);
    return Promise.resolve();
  }

  /** Simulate the user typing a line. */
  async emit(message: string): Promise<void> {
    if (this.listener === null)
      throw new Error('emit called before subscribe or after subscribe');
    await this.listener(message);
  }
}

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
