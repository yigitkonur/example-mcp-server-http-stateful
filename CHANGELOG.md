# Changelog

## 2026-02-21 - Major Rewrite for Upcoming TypeScript SDK v2

- Replaced legacy v1-style implementation with a full v2-oriented architecture.
- Migrated runtime to `@modelcontextprotocol/server` + `@modelcontextprotocol/node` primitives.
- Rebuilt around stateful Streamable HTTP lifecycle (`POST`/`GET`/`DELETE /mcp`).
- Added scaffold creator CLI and reusable starter templates.
- Added vendored official v2 pre-release package artifacts for reproducible installs.
- Added CI-aligned validation flow (check + build + smoke).

## 2026-02-21 - Documentation Reorganization

- Rewrote root `README.md` for clearer structure and stronger v2 context.
- Rebuilt docs as a professional linked set with a central hub:
  - `docs/README.md`
  - `docs/getting-started.md`
  - `docs/scaffold-cli.md`
  - `docs/v2-sdk-notes.md`
  - `docs/http-stateful-v2-deep-dive.md`
  - `docs/testing-and-validation.md`
- Standardized navigation, linking, and verification guidance across docs.
