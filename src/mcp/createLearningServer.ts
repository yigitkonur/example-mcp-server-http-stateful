import {
  McpServer,
  ResourceTemplate,
  type CallToolResult,
  type GetPromptResult,
} from '@modelcontextprotocol/server';
import * as z from 'zod/v4';

import type { SessionModel } from '../state/sessionRegistry.js';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createLearningServer(session: SessionModel): McpServer {
  const server = new McpServer(
    {
      name: 'example-mcp-stateful',
      version: '2.0.0-alpha.0',
    },
    {
      capabilities: {
        logging: {},
      },
    },
  );

  server.registerTool(
    'add_note',
    {
      title: 'Add Session Note',
      description: 'Stores a note in the current MCP session.',
      inputSchema: z.object({
        note: z.string().min(1).max(500).describe('The note text to store in this session.'),
      }),
    },
    async ({ note }, ctx): Promise<CallToolResult> => {
      const trimmed = note.trim();
      session.notes.unshift(trimmed);
      session.notes = session.notes.slice(0, 50);

      await ctx.mcpReq.log('info', `Stored session note (${session.notes.length} total).`);

      return {
        content: [
          {
            type: 'text',
            text: `Saved note #${session.notes.length}: ${trimmed}`,
          },
        ],
      };
    },
  );

  server.registerTool(
    'list_notes',
    {
      title: 'List Session Notes',
      description: 'Returns all notes currently saved in this session.',
      inputSchema: z.object({}),
      outputSchema: z.object({
        notes: z.array(z.string()),
      }),
    },
    async (): Promise<CallToolResult> => {
      const output = { notes: session.notes };
      return {
        content: [
          {
            type: 'text',
            text:
              session.notes.length === 0
                ? 'No notes in this session yet.'
                : session.notes.map((item, index) => `${index + 1}. ${item}`).join('\n'),
          },
        ],
        structuredContent: output,
      };
    },
  );

  server.registerTool(
    'simulate_work',
    {
      title: 'Simulate Long Work',
      description:
        'Sends periodic MCP log notifications to show streaming behavior and resumability.',
      inputSchema: z.object({
        steps: z.number().int().min(1).max(20).default(5),
        delayMs: z.number().int().min(50).max(2000).default(250),
        closeSseAfterStep: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe(
            'Optional: closes the SSE stream at this step (requires resumability support).',
          ),
      }),
    },
    async ({ steps, delayMs, closeSseAfterStep }, ctx): Promise<CallToolResult> => {
      for (let step = 1; step <= steps; step += 1) {
        await sleep(delayMs);
        await ctx.mcpReq.log('info', `simulate_work progress: ${step}/${steps}`);

        if (closeSseAfterStep === step) {
          ctx.http?.closeSSE?.();
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `simulate_work finished in ${steps} steps.`,
          },
        ],
      };
    },
  );

  server.registerResource(
    'session-overview',
    'session://overview',
    {
      title: 'Session Overview',
      description: 'Basic state metadata for the current server-side session.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              sessionId: session.id,
              createdAt: session.createdAt,
              lastActivity: session.lastActivity,
              requestCount: session.requestCount,
              noteCount: session.notes.length,
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerResource(
    'session-note',
    new ResourceTemplate('session://notes/{index}', {
      list: async () => ({
        resources: session.notes.map((_, index) => ({
          uri: `session://notes/${index}`,
          name: `Note ${index + 1}`,
        })),
      }),
    }),
    {
      title: 'Session Note',
      description: 'Read one stored note by index.',
      mimeType: 'text/plain',
    },
    async (uri, variables) => {
      const indexValue = variables['index'];
      const index = Number.parseInt(String(indexValue), 10);

      if (Number.isNaN(index) || index < 0 || index >= session.notes.length) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/plain',
              text: `No note found at index ${String(indexValue)}.`,
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/plain',
            text: session.notes[index] ?? '',
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'study-notes',
    {
      title: 'Study Session Notes',
      description: 'Creates a reusable prompt from notes stored in this MCP session.',
      argsSchema: z.object({
        objective: z
          .string()
          .min(1)
          .default('Summarize the notes and extract practical next actions.'),
      }),
    },
    async ({ objective }): Promise<GetPromptResult> => {
      const notesBlock =
        session.notes.length > 0
          ? session.notes.map((note, idx) => `${idx + 1}. ${note}`).join('\n')
          : 'No notes available yet.';

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Objective: ${objective}\n\nSession Notes:\n${notesBlock}`,
            },
          },
        ],
      };
    },
  );

  return server;
}
