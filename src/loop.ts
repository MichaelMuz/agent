import type { Agent, AgentEvent } from '@earendil-works/pi-agent-core';
import { assertUnreachable, checkUnion } from './utils';
import { debug } from './logger';
import type { TelegramIO } from './telegram-io';
import type { UserMessage } from '@earendil-works/pi-ai';

// This loop is the connector between the agent and the user interface
// it subscribes to messages they both push in and requires an method to push messages out

const validCommands = ['queue', 'steer', 'stop', 'clear', 'exit'] as const;
type Command = (typeof validCommands)[number];
const doesCommandNeedMsg: Record<Command, boolean> = {
  queue: true,
  steer: true,
  stop: false,
  clear: false,
  exit: false,
};

export class Loop {
  userIO: TelegramIO;
  agent: Agent;
  constructor(userIO: TelegramIO, agent: Agent) {
    this.userIO = userIO;
    this.agent = agent;
  }

  private async handleModelOut(
    event: AgentEvent,
    signal: AbortSignal
  ): Promise<void> {
    if (event.type === 'agent_end') {
      const lastAssistantMessage = event.messages.at(-1);
      if (lastAssistantMessage?.role !== 'assistant') {
        debug(
          `Last message is of type ${String(lastAssistantMessage?.role)} rather than of type assistant at event agent_end, likely an abort. Skipping`
        );
        return;
      }

      const textContent = lastAssistantMessage.content.at(-1);
      if (textContent?.type !== 'text') {
        debug(
          `Last content in assistant message is of type ${String(textContent?.type)} rather than of type text at event agent_end, likely an abort. Skipping`
        );
        return;
      }

      await this.userIO.sendMessage(textContent.text, signal);
    }
  }

  private async handleUserIn(
    userInput: string,
    // not used now but eventually can race the awaits we do on the agent so we can stop early
    _signal: AbortSignal
  ): Promise<void> {
    const sep = ' ';
    const splitByWord = userInput.split(sep);

    const firstWord = splitByWord[0];
    const startWithCommandChar = firstWord?.at(0) === '/';
    const commandWord = firstWord?.slice(1);
    const message = startWithCommandChar
      ? splitByWord.slice(1).join(sep)
      : userInput;
    const isValidCommand = checkUnion(commandWord, validCommands);
    const command: Command | null = isValidCommand ? commandWord : null;

    if (startWithCommandChar && command === null) {
      debug(
        `Invalid user command ${String(commandWord)}, expected one of ${validCommands.join(', ')}. Skipping`
      );
      return;
    }
    if (
      message.length === 0 &&
      (command === null || doesCommandNeedMsg[command])
    ) {
      debug(
        `User gave empty message for command ${String(commandWord)}, message: ${message}. Skipping.`
      );
      return;
    }

    const userMessage: UserMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    switch (command) {
      case null:
        this.agent.abort();
        await this.agent.waitForIdle();
        // Don't know how to handle a failure here yet
        void this.agent.prompt(userMessage);
        break;
      case 'queue':
        this.agent.followUp(userMessage);
        break;
      case 'steer':
        this.agent.steer(userMessage);
        break;
      case 'clear':
        this.agent.reset();
        break;
      case 'stop':
        this.agent.abort();
        await this.agent.waitForIdle();
        break;
      case 'exit':
        this.agent.abort();
        return;
      default:
        assertUnreachable(command);
    }
  }

  async start(signal: AbortSignal): Promise<void> {
    const agentUnsubscribe = this.agent.subscribe((event, abort) =>
      this.handleModelOut(event, abort)
    );
    const telegramUnsubscribe = this.userIO.subscribe((message) =>
      // asymmetry here in that the signal is from us not the subscribe callback
      // that is bc we are the only aborters for now so skip wiring a new controller/signal through here into telegram
      this.handleUserIn(message, signal)
    );

    await new Promise<void>((resolve) => {
      signal.addEventListener(
        'abort',
        () => {
          resolve();
        },
        { once: true }
      );
    });
    agentUnsubscribe();
    telegramUnsubscribe();
  }
}
