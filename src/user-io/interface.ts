import { assertUnreachable } from '../helpers/utils';
import { TelegramIO, loadTelegramEnv } from './telegram';
import { TerminalIO } from './terminal';

export type UserIO = {
  subscribe(listener: (message: string) => Promise<void>): () => void;
  sendMessage(message: string, signal: AbortSignal): Promise<void>;
};

export function makeUserIO(kind: 'terminal' | 'telegram') {
  switch (kind) {
    case 'terminal':
      return new TerminalIO();
    case 'telegram':
      return new TelegramIO(...loadTelegramEnv());
    default:
      assertUnreachable(kind);
  }
}
