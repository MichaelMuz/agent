import { Agent, type AgentEvent } from '@earendil-works/pi-agent-core';
import { assertUnreachable, checkUnion } from './utils';
import { debug } from './logger';
import type { UserMessage } from '@earendil-works/pi-ai';
// the loop will own:
// a UserIO that will accept the model output and provide user input
// an agent that it will call the interface of with the given client io

export type UserIO = {
  getUserInput: () => Promise<string>;
  pushModelOutput: (output: string) => Promise<void>;
};

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
  userIO: UserIO;
  agent: Agent;
  constructor(userIO: UserIO, agent: Agent) {
    this.userIO = userIO;
    this.agent = agent;
  }

  private modelOut(event: AgentEvent, _signal: AbortSignal): void {
    if (event.type === 'agent_end') {
      const lastAssistantMessage = event.messages.at(-1);
      if (lastAssistantMessage?.role !== 'assistant') {
        debug(
          `Last message is of type ${lastAssistantMessage?.role} rather than of type assistant at event agent_end, likely an abort. Skipping`
        );
        return;
      }

      const textContent = lastAssistantMessage.content.at(-1);
      if (textContent?.type !== 'text') {
        debug(
          `Last content in assistant message is of type ${textContent?.type} rather than of type text at event agent_end, likely an abort. Skipping`
        );
        return;
      }

      this.userIO.pushModelOutput(textContent.text);
    }
  }

  private async userIn(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      const userInput = (await this.userIO.getUserInput()).trim();

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
          `Invalid user command ${commandWord}, expected one of ${validCommands}. Skipping`
        );
        continue;
      }
      if (
        message.length === 0 &&
        (command === null || doesCommandNeedMsg[command])
      ) {
        debug(
          `User gave empty message for command ${commandWord}, message: ${message}. Skipping.`
        );
        continue;
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
          this.agent.prompt(userMessage);
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
  }

  async start(signal: AbortSignal): Promise<void> {
    const unsubscribe = this.agent.subscribe((event, abort) =>
      this.modelOut(event, abort)
    );
    await this.userIn(signal);
    // prob don't need an exit or
    unsubscribe();
  }
}
