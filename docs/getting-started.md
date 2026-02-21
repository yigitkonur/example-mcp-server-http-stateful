# Getting Started

## 1. Prerequisites

- Node.js 20+
- npm

## 2. Install and Run

```bash
npm install
npm run dev
```

## 3. Default Endpoints

- `POST /mcp` - JSON-RPC requests (initialize + normal operations)
- `GET /mcp` - SSE stream endpoint
- `DELETE /mcp` - explicit session termination
- `GET /health` - service health
- `GET /sessions` - active session summaries

Base URL by default: `http://127.0.0.1:1453`

## 4. Environment Variables

See `.env.example`:

- `PORT`, `HOST`
- `SESSION_TTL_MS`, `CLEANUP_INTERVAL_MS`
- `EVENT_MAX_AGE_MS`, `EVENT_MAX_COUNT`
- `CORS_ORIGIN`
- `ALLOWED_HOSTS`

## 5. Local Verification

```bash
npm run check
npm run build
npm run smoke
```

or run all in one command:

```bash
npm run ci
```

## Next

- For project generation: `docs/scaffold-cli.md`
- For protocol details: `docs/http-stateful-v2-deep-dive.md`
- For full test framework: `docs/testing-and-validation.md`
