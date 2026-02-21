import { randomUUID } from 'node:crypto';

import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import {
  isInitializeRequest,
  localhostAllowedHostnames,
  validateHostHeader,
} from '@modelcontextprotocol/server';
import cors from 'cors';
import express from 'express';
import type { Request, Response } from 'express';

import type { AppConfig } from '../config.js';
import { createLearningServer } from '../mcp/createLearningServer.js';
import { InMemoryEventStore } from '../state/inMemoryEventStore.js';
import {
  SessionRegistry,
  type SessionModel,
  type SessionRuntime,
  type SessionSummary,
} from '../state/sessionRegistry.js';

interface CreateHttpAppResult {
  app: express.Express;
  sessions: SessionRegistry;
  shutdown: () => Promise<void>;
}

interface ErrorBody {
  code: number;
  message: string;
}

function getHeaderString(headerValue: string | string[] | undefined): string | undefined {
  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }

  return headerValue;
}

function sendJsonRpcError(response: Response, status: number, error: ErrorBody): void {
  response.status(status).json({
    jsonrpc: '2.0',
    error,
    id: null,
  });
}

function asyncRoute(
  handler: (request: Request, response: Response) => Promise<void>,
): (request: Request, response: Response) => void {
  return (request, response) => {
    void handler(request, response);
  };
}

export function createHttpApp(config: AppConfig): CreateHttpAppResult {
  const app = express();
  const sessions = new SessionRegistry(config.sessionTtlMs);

  const allowedHosts = config.allowedHosts ?? localhostAllowedHostnames();

  app.use(
    cors({
      origin: config.corsOrigin,
      exposedHeaders: ['Mcp-Session-Id', 'Last-Event-Id', 'Mcp-Protocol-Version'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));

  app.use((request, response, next) => {
    const result = validateHostHeader(request.headers.host, allowedHosts);
    if (result.ok) {
      next();
      return;
    }

    sendJsonRpcError(response, 403, {
      code: -32000,
      message: result.message,
    });
  });

  app.post(
    '/mcp',
    asyncRoute(async (request, response) => {
      try {
        const sessionId = getHeaderString(request.headers['mcp-session-id']);

        if (sessionId) {
          const runtime = sessions.get(sessionId);
          if (!runtime) {
            sendJsonRpcError(response, 404, {
              code: -32001,
              message: `Session not found: ${sessionId}`,
            });
            return;
          }

          sessions.touch(sessionId);
          await runtime.transport.handleRequest(request, response, request.body);
          return;
        }

        if (!isInitializeRequest(request.body)) {
          sendJsonRpcError(response, 400, {
            code: -32000,
            message:
              'Missing Mcp-Session-Id. Send an initialize request without a session header first.',
          });
          return;
        }

        const runtime = createRuntime(config, sessions);
        sessions.set(runtime);
        sessions.touch(runtime.session.id);

        await runtime.server.connect(runtime.transport);

        try {
          await runtime.transport.handleRequest(request, response, request.body);
        } catch (error) {
          await sessions.remove(runtime.session.id);
          throw error;
        }
      } catch (error) {
        console.error('Failed to process POST /mcp:', error);
        if (!response.headersSent) {
          sendJsonRpcError(response, 500, {
            code: -32603,
            message: 'Internal server error',
          });
        }
      }
    }),
  );

  app.get(
    '/mcp',
    asyncRoute(async (request, response) => {
      try {
        const sessionId = getHeaderString(request.headers['mcp-session-id']);

        if (!sessionId) {
          sendJsonRpcError(response, 400, {
            code: -32000,
            message: 'Missing Mcp-Session-Id header.',
          });
          return;
        }

        const runtime = sessions.get(sessionId);
        if (!runtime) {
          sendJsonRpcError(response, 404, {
            code: -32001,
            message: `Session not found: ${sessionId}`,
          });
          return;
        }

        sessions.touch(sessionId);
        await runtime.transport.handleRequest(request, response);
      } catch (error) {
        console.error('Failed to process GET /mcp:', error);
        if (!response.headersSent) {
          sendJsonRpcError(response, 500, {
            code: -32603,
            message: 'Internal server error',
          });
        }
      }
    }),
  );

  app.delete(
    '/mcp',
    asyncRoute(async (request, response) => {
      try {
        const sessionId = getHeaderString(request.headers['mcp-session-id']);

        if (!sessionId) {
          sendJsonRpcError(response, 400, {
            code: -32000,
            message: 'Missing Mcp-Session-Id header.',
          });
          return;
        }

        const runtime = sessions.get(sessionId);
        if (!runtime) {
          sendJsonRpcError(response, 404, {
            code: -32001,
            message: `Session not found: ${sessionId}`,
          });
          return;
        }

        await runtime.transport.handleRequest(request, response);
      } catch (error) {
        console.error('Failed to process DELETE /mcp:', error);
        if (!response.headersSent) {
          sendJsonRpcError(response, 500, {
            code: -32603,
            message: 'Internal server error',
          });
        }
      }
    }),
  );

  app.get('/health', (_request, response) => {
    response.json({
      ok: true,
      activeSessions: sessions.count(),
      mode: 'stateful-streamable-http',
      sdk: 'official-v2-pre-release',
    });
  });

  app.get('/sessions', (_request, response) => {
    const data: SessionSummary[] = sessions.summaries();
    response.json({
      activeSessions: sessions.count(),
      sessions: data,
    });
  });

  const cleanupTimer = setInterval(() => {
    void sessions.closeExpired().then((expired) => {
      if (expired.length > 0) {
        console.log(`Cleaned ${expired.length} expired sessions.`);
      }
    });
  }, config.cleanupIntervalMs);
  cleanupTimer.unref();

  return {
    app,
    sessions,
    shutdown: async () => {
      clearInterval(cleanupTimer);
      await sessions.closeAll();
    },
  };
}

function createRuntime(config: AppConfig, sessions: SessionRegistry): SessionRuntime {
  const id = randomUUID();
  const now = Date.now();

  const session: SessionModel = {
    id,
    createdAt: now,
    lastActivity: now,
    requestCount: 0,
    notes: [],
  };

  const eventStore = new InMemoryEventStore({
    maxCount: config.eventMaxCount,
    maxAgeMs: config.eventMaxAgeMs,
  });

  const server = createLearningServer(session);

  const transport = new NodeStreamableHTTPServerTransport({
    sessionIdGenerator: () => id,
    eventStore,
    onsessionclosed: async (closedId) => {
      await sessions.remove(closedId);
    },
  });

  return {
    session,
    server,
    transport,
  };
}
