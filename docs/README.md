# Documentation Hub

This folder contains the official documentation for `example-mcp-server-http-stateful` after the SDK v2 rewrite.

## Changelog (Latest First)

### 2026-02-21 - Major Rewrite for Upcoming TypeScript SDK v2

- moved from v1-style implementation to v2 primitives
- introduced scaffold creator CLI and templates
- added comprehensive docs for setup, architecture, and validation

See full history in `../CHANGELOG.md`.

## Recommended Reading Order

1. `docs/getting-started.md`
   Install, run, and verify the root project quickly.
2. `docs/scaffold-cli.md`
   Generate new projects and understand CLI options.
3. `docs/v2-sdk-notes.md`
   Understand v2-specific behavior and limitations.
4. `docs/http-stateful-v2-deep-dive.md`
   Review protocol lifecycle and stateful transport details.
5. `docs/testing-and-validation.md`
   Run full verification using `mcp-cli` plus direct protocol checks.

## Intended Audience

- **New users**: start with `getting-started`.
- **Teams adopting this boilerplate**: read `scaffold-cli` + `v2-sdk-notes`.
- **Maintainers**: read `deep-dive` + `testing-and-validation` before changing transport/session logic.
