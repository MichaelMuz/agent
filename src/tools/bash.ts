import {
  type AgentTool,
  type AgentToolResult,
  type AgentToolUpdateCallback,
} from '@earendil-works/pi-agent-core';
import { Type } from '@earendil-works/pi-ai';

const bashInputSchema = Type.Object({
  command: Type.String({ description: 'Bash command to execute' }),
});

const bash = async (
  _toolCallId: string,
  params: { command: string },
  signal?: AbortSignal,
  _onUpdate?: AgentToolUpdateCallback<undefined>
): Promise<AgentToolResult<undefined>> => {
  const proc = Bun.spawn(['bash', '-c', params.command], {
    // We we will never use stdin, we are literally starting bash, we must interleave out and err like a real terminal
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
    ...(signal ? { signal } : {}),
  });

  const sink: Uint8Array<ArrayBuffer>[] = [];

  const drain = async (reader: ReadableStream<Uint8Array<ArrayBuffer>>) => {
    for await (const chunk of reader) {
      sink.push(chunk);
    }
  };
  await Promise.all([drain(proc.stdout), drain(proc.stderr)]);
  const text = new TextDecoder().decode(Buffer.concat(sink));
  return {
    content: [{ type: 'text', text: text }],
    details: undefined,
  };
};

export const bashTool: AgentTool<typeof bashInputSchema, undefined> = {
  label: 'bash',
  name: 'bash',
  description: 'calls `bash -c` with given command directly',
  parameters: bashInputSchema,
  execute: bash,
};
