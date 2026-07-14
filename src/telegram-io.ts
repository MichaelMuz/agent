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

  // idk how we want abort to act here just cancel everything in flight?

  subscribe(listener: (message: string) => void) {
    this.telegram.on('message', async (ctx) => {
      assert('text' in ctx.message, 'Can only handle text messages for now');
      listener(ctx.message.text);
    });

    return () => {
      this.telegram.stop;
    };
  }

  async sendMessage(message: string) {
    return this.telegram.api.sendMessage(this.telegramChatId, message);
  }

  start() {
    this.telegram.start();
  }
}

// export const telegramIO = {
//   pushUserInput: async (signal: AbortSignal) => {
//     return '';
//   },
//   pushModelOutput: (output: string) => {
//     telegram.api.sendMessage(output);
//   },
// };
