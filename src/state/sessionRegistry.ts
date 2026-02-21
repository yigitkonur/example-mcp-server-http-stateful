import type { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import type { McpServer } from '@modelcontextprotocol/server';

export interface SessionModel {
  id: string;
  createdAt: number;
  lastActivity: number;
  requestCount: number;
  notes: string[];
}

export interface SessionRuntime {
  session: SessionModel;
  server: McpServer;
  transport: NodeStreamableHTTPServerTransport;
}

export interface SessionSummary {
  id: string;
  createdAt: number;
  lastActivity: number;
  requestCount: number;
  noteCount: number;
}

export class SessionRegistry {
  private readonly sessions = new Map<string, SessionRuntime>();

  constructor(private readonly sessionTtlMs: number) {}

  set(runtime: SessionRuntime): void {
    this.sessions.set(runtime.session.id, runtime);
  }

  get(sessionId: string): SessionRuntime | undefined {
    return this.sessions.get(sessionId);
  }

  count(): number {
    return this.sessions.size;
  }

  touch(sessionId: string): void {
    const runtime = this.sessions.get(sessionId);
    if (!runtime) {
      return;
    }

    runtime.session.lastActivity = Date.now();
    runtime.session.requestCount += 1;
  }

  summaries(): SessionSummary[] {
    return [...this.sessions.values()].map((runtime) => ({
      id: runtime.session.id,
      createdAt: runtime.session.createdAt,
      lastActivity: runtime.session.lastActivity,
      requestCount: runtime.session.requestCount,
      noteCount: runtime.session.notes.length,
    }));
  }

  async remove(sessionId: string): Promise<void> {
    const runtime = this.sessions.get(sessionId);
    if (!runtime) {
      return;
    }

    this.sessions.delete(sessionId);
    await this.closeRuntime(runtime);
  }

  async closeExpired(now: number = Date.now()): Promise<string[]> {
    const expired = [...this.sessions.values()]
      .filter((runtime) => now - runtime.session.lastActivity > this.sessionTtlMs)
      .map((runtime) => runtime.session.id);

    for (const sessionId of expired) {
      await this.remove(sessionId);
    }

    return expired;
  }

  async closeAll(): Promise<void> {
    for (const sessionId of [...this.sessions.keys()]) {
      await this.remove(sessionId);
    }
  }

  private async closeRuntime(runtime: SessionRuntime): Promise<void> {
    runtime.transport.onclose = undefined;

    await Promise.allSettled([runtime.transport.close(), runtime.server.close()]);
  }
}
