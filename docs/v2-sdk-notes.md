# SDK v2 Notes and Limitations

## Current Target

This boilerplate targets MCP TypeScript SDK v2 pre-release APIs from the official SDK `main` branch.

## v2 Concepts Used in This Repository

- `@modelcontextprotocol/server` for server primitives
- `@modelcontextprotocol/node` for Node HTTP transport adapter
- stateful transport via `NodeStreamableHTTPServerTransport`
- explicit registration APIs:
  - `registerTool`
  - `registerResource`
  - `registerPrompt`

## Deliberate Non-Usage (Compared to Older Patterns)

- no monolithic `@modelcontextprotocol/sdk` imports
- no server-side SDK auth helpers
- no server-side SSE transport implementation path

## Practical Limitation: Package Availability

Because v2 is pre-release, package availability may vary by environment.

To keep this project reproducible, dependencies default to vendored official tarballs under:

- `vendor/mcp-sdk-v2/`

## Migration Mindset

If you're migrating from v1-style code, expect to update:

- imports and package names
- transport initialization model
- handler registration style
- context usage within handlers

## Official References

- SDK repository: <https://github.com/modelcontextprotocol/typescript-sdk>
- migration guide: <https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration.md>
- server guide: <https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md>
