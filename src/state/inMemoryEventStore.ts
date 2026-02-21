import type { EventStore, JSONRPCMessage } from '@modelcontextprotocol/server';

interface StoredEvent {
  streamId: string;
  message: JSONRPCMessage;
  createdAt: number;
}

interface InMemoryEventStoreOptions {
  maxCount: number;
  maxAgeMs: number;
}

/**
 * In-memory EventStore for Streamable HTTP resumability.
 *
 * This is intentionally simple and deterministic for learning. For production,
 * replace with Redis or another durable store.
 */
export class InMemoryEventStore implements EventStore {
  private readonly eventsById = new Map<string, StoredEvent>();
  private readonly eventIdsByStream = new Map<string, string[]>();
  private sequence = 0;

  constructor(private readonly options: InMemoryEventStoreOptions) {}

  async storeEvent(streamId: string, message: JSONRPCMessage): Promise<string> {
    const eventId = this.nextEventId();
    const stored: StoredEvent = {
      streamId,
      message,
      createdAt: Date.now(),
    };

    this.eventsById.set(eventId, stored);

    const streamEvents = this.eventIdsByStream.get(streamId) ?? [];
    streamEvents.push(eventId);
    this.eventIdsByStream.set(streamId, streamEvents);

    this.prune();
    return eventId;
  }

  async getStreamIdForEventId(eventId: string): Promise<string | undefined> {
    return this.eventsById.get(eventId)?.streamId;
  }

  async replayEventsAfter(
    lastEventId: string,
    {
      send,
    }: {
      send: (eventId: string, message: JSONRPCMessage) => Promise<void>;
    },
  ): Promise<string> {
    const anchorEvent = this.eventsById.get(lastEventId);
    if (!anchorEvent) {
      throw new Error(`Cannot resume from unknown event id: ${lastEventId}`);
    }

    const streamEvents = this.eventIdsByStream.get(anchorEvent.streamId) ?? [];
    const anchorIndex = streamEvents.indexOf(lastEventId);
    if (anchorIndex === -1) {
      throw new Error(`Cannot resume from expired event id: ${lastEventId}`);
    }

    for (const eventId of streamEvents.slice(anchorIndex + 1)) {
      const event = this.eventsById.get(eventId);
      if (event) {
        await send(eventId, event.message);
      }
    }

    return anchorEvent.streamId;
  }

  private nextEventId(): string {
    this.sequence += 1;
    return `${Date.now()}-${this.sequence.toString(36)}`;
  }

  private prune(): void {
    const cutoff = Date.now() - this.options.maxAgeMs;

    for (const [eventId, event] of this.eventsById) {
      if (event.createdAt >= cutoff) {
        break;
      }

      this.deleteEvent(eventId, event.streamId);
    }

    while (this.eventsById.size > this.options.maxCount) {
      const first = this.eventsById.entries().next().value as [string, StoredEvent] | undefined;
      if (!first) {
        break;
      }
      const [eventId, event] = first;
      this.deleteEvent(eventId, event.streamId);
    }
  }

  private deleteEvent(eventId: string, streamId: string): void {
    this.eventsById.delete(eventId);

    const streamEvents = this.eventIdsByStream.get(streamId);
    if (!streamEvents) {
      return;
    }

    const filtered = streamEvents.filter((id) => id !== eventId);
    if (filtered.length === 0) {
      this.eventIdsByStream.delete(streamId);
      return;
    }

    this.eventIdsByStream.set(streamId, filtered);
  }
}
