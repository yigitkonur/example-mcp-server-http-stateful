# Scaffold Creator CLI

The repository ships a built-in project scaffolder:

- command name: `mcp-stateful-starter`
- implementation: `src/cli/index.ts`

## Generate a Project

From source scripts:

```bash
npm run create -- init my-mcp-app
```

From compiled CLI:

```bash
node dist/cli/index.js init my-mcp-app
```

CLI help:

```bash
node dist/cli/index.js --help
```

## Options

- `--force`
  Allow generation in a non-empty target directory.
- `--dir <path>`
  Set base output directory for the project folder.
- `--sdk vendored|registry`
  Select SDK dependency strategy.

## SDK Modes

### `vendored` (default, recommended)

Copies vendored tarballs into generated project:

- `modelcontextprotocol-server-2.0.0-alpha.0.tgz`
- `modelcontextprotocol-node-2.0.0-alpha.0.tgz`

Use when you want deterministic installs during v2 pre-release.

### `registry`

Writes direct semver dependencies (`2.0.0-alpha.0`) for `@modelcontextprotocol/server` and `@modelcontextprotocol/node`.

Use only if your npm environment resolves those pre-release packages.

## Generated Structure (Expected)

- `src/index.ts`
- `package.json`
- `tsconfig.json`
- `.env.example`
- `README.md`
- optional `vendor/mcp-sdk-v2/` (vendored mode)

## Validation Checklist for Generated Project

1. `npm install`
2. `npm run typecheck`
3. `npm run build`
4. run server and check `GET /health`

See `docs/testing-and-validation.md` for a full verification sequence.
