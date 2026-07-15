export type UserIO = {
  subscribe(listener: (message: string) => Promise<void>): () => void;
  sendMessage(message: string, signal: AbortSignal): Promise<void>;
};
