import type { UserIO } from '../../src/user-io/interface.ts';

/**
 * Captures everything the loop sends to the user and lets a test drive input by
 * calling the subscribed listener directly, no real terminal or Telegram.
 */
export class FakeUserIO implements UserIO {
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
