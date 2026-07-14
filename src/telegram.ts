import { Bot } from 'grammy';
import { assert } from './utils';

const telegramBotToken = process.env['TELEGRAM_BOT_TOKEN'];
assert(telegramBotToken !== undefined, 'unpopulated TELEGRAM_BOT_TOKEN');

export const bot = new Bot(telegramBotToken);

bot.on('message', async (ctx) => {
  console.log(
    `${ctx.from.first_name} wrote ${
      // this could have been a voice message that is why we check if it has a text property
      'text' in ctx.message ? ctx.message.text : ''
    }`
  );
});
