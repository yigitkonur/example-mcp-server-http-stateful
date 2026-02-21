# MCP HTTP Stateful Boilerplate (TypeScript SDK v2)

Learning-first boilerplate for building **stateful MCP servers over Streamable HTTP** with official MCP TypeScript SDK v2 pre-release primitives.

## Changelog (Latest First)

### 2026-02-21 - Major Rewrite for Upcoming TypeScript SDK v2

- Migrated from legacy v1-style code to v2 server/node primitives.
- Rebuilt runtime around stateful Streamable HTTP lifecycle (`POST`/`GET`/`DELETE /mcp`).
- Added scaffold creator CLI and starter templates.
- Added full documentation set and protocol/testing guides.
- Kept installs reproducible with vendored official v2 pre-release tarballs.

Full history: `CHANGELOG.md`.

## What This Repository Provides

- runnable reference server (`src/`)
- scaffold creator CLI (`mcp-http-stateful-starter`)
- project templates (`templates/http-stateful/`)
- docs for setup, architecture, v2 migration context, and verification (`docs/`)

## SDK v2 Context

This project targets MCP TypeScript SDK **v2 pre-release** (`main` branch in the official SDK repository).

Key v2 shifts reflected here:

- package split (`server`/`client`/`core` model)
- Node HTTP transport via `NodeStreamableHTTPServerTransport`
- registration APIs (`registerTool`, `registerResource`, `registerPrompt`)
- server-side SDK auth exports removed (auth should be external middleware)
- server-side SSE transport removed (Streamable HTTP is the path)

Official references:

- SDK repo: <https://github.com/modelcontextprotocol/typescript-sdk>
- migration guide: <https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration.md>
- server guide: <https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md>

## Quick Start

```bash
npm install
npm run dev
```

Default endpoints:

- MCP: `http://127.0.0.1:1453/mcp`
- health: `http://127.0.0.1:1453/health`
- sessions: `http://127.0.0.1:1453/sessions`

## Scaffold Creator CLI

Generate a new starter project:

```bash
npm run create -- init my-mcp-app
```

or from built output:

```bash
node dist/cli/index.js init my-mcp-app
```

Common options:

```bash
npm run create -- init my-mcp-app --force
npm run create -- init my-mcp-app --dir ./playground
npm run create -- init my-mcp-app --sdk registry
```

- default mode is `--sdk vendored` (recommended for reproducibility)
- `--sdk registry` uses `2.0.0-alpha.0` package versions directly

## Documentation

Start here: `docs/README.md`

- setup and local run: `docs/getting-started.md`
- scaffold usage: `docs/scaffold-cli.md`
- v2 notes and limitations: `docs/v2-sdk-notes.md`
- protocol behavior: `docs/http-stateful-v2-deep-dive.md`
- test/verification framework: `docs/testing-and-validation.md`

## v2 Packaging Strategy

Because v2 is pre-release, this project vendors official package tarballs:

- `vendor/mcp-sdk-v2/modelcontextprotocol-server-2.0.0-alpha.0.tgz`
- `vendor/mcp-sdk-v2/modelcontextprotocol-node-2.0.0-alpha.0.tgz`

Pinned source commit: `c4ee360aac7afd2964785abac379a290d0c9847a` (SDK main, 2026-02-20).

## Validation Commands

- `npm run check` - typecheck + lint + format check
- `npm run build` - compile TypeScript
- `npm run smoke` - end-to-end MCP smoke test
- `npm run ci` - check + build + smoke

## License

MIT
