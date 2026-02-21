# HTTP Stateful v2 Deep Dive

This guide describes the protocol-level behavior implemented by this repository.

## Changelog Context

Current behavior reflects the `2026-02-21` v2 major rewrite (see `../CHANGELOG.md`).

## Transport and Session Model

- transport class: `NodeStreamableHTTPServerTransport`
- mode: stateful (`sessionIdGenerator` enabled)
- lifecycle endpoints:
  - `POST /mcp`
  - `GET /mcp`
  - `DELETE /mcp`

## Session Lifecycle

1. Client sends `initialize` over `POST /mcp` without `Mcp-Session-Id`.
2. Server creates runtime state and binds a transport instance.
3. Response includes `Mcp-Session-Id`.
4. Client reuses that session ID for subsequent requests.

## Resumability Model

Resumability is enabled with an in-memory `EventStore` implementation:

- SSE events are stored with event IDs.
- Client can reconnect using `Last-Event-Id`.
- Server replays missed events after the anchor ID.

## Endpoint Expectations

### `POST /mcp`

- JSON-RPC payload.
- initialize allowed without session header.
- follow-up requests require `Mcp-Session-Id`.

### `GET /mcp`

- opens SSE stream.
- requires `Mcp-Session-Id`.
- optional `Last-Event-Id` for replay.

### `DELETE /mcp`

- closes active session and transport state.

## Why In-Memory Stores Here

This is a learning boilerplate, so session and event storage are intentionally simple and local.

For production-grade deployments, replace with durable storage strategies.

## Source Code Pointers

- `src/http/createHttpApp.ts`
- `src/state/sessionRegistry.ts`
- `src/state/inMemoryEventStore.ts`
- `src/mcp/createLearningServer.ts`
