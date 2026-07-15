import { Bot } from 'grammy';
import { assert } from './utils';

export function loadTelegramEnv() {
  const telegramBotToken = process.env['TELEGRAM_BOT_TOKEN'];
  assert(telegramBotToken !== undefined, 'unpopulated TELEGRAM_BOT_TOKEN');

  const telegramChatId = process.env['TELEGRAM_CHAT_ID'];
  assert(telegramChatId !== undefined, 'unpopulated TELEGRAM_CHAT_ID');

  return [telegramBotToken, telegramChatId] as const;
}

export class TelegramIO {
  telegramBotToken: string;
  telegramChatId: string;
  telegram: Bot;
  constructor(telegramBotToken: string, telegramChatId: string) {
    this.telegramBotToken = telegramBotToken;
    this.telegramChatId = telegramChatId;
    this.telegram = new Bot(telegramBotToken);
  }

  subscribe(listener: (message: string) => Promise<void>): () => void {
    this.telegram.on('message', async (ctx) => {
      assert('text' in ctx.message, 'Can only handle text messages for now');
      await listener(ctx.message.text);
    });
    // Don't know how to handle a failure here yet
    void this.telegram.start();
    return () => {
      void this.telegram.stop();
    };
  }

  async sendMessage(message: string, signal: AbortSignal): Promise<void> {
    await this.telegram.api.sendMessage(
      this.telegramChatId,
      message,
      undefined,
      // they use some weird old import of a signal so just cast it, same shape
      signal as Parameters<typeof this.telegram.api.sendMessage>[3]
    );
  }
}
