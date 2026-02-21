import { spawn } from 'node:child_process';
import process from 'node:process';

const port = Number.parseInt(process.env.PORT ?? '1453', 10);
const host = process.env.HOST ?? '127.0.0.1';
const baseUrl = `http://${host}:${port}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(url, timeoutMs = 10_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // server is still booting
    }

    await wait(250);
  }

  throw new Error('Server did not become healthy in time.');
}

function parseSseJsonPayload(rawText) {
  const dataLines = rawText
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice('data: '.length).trim())
    .filter(Boolean);

  if (dataLines.length === 0) {
    throw new Error(`No SSE data lines found. Raw body:\n${rawText}`);
  }

  return JSON.parse(dataLines[dataLines.length - 1]);
}

async function postMcp(body, sessionId) {
  const headers = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
  };

  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  const response = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  return { response, text };
}

async function run() {
  const child = spawn('node', ['dist/index.js'], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: host,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));

  try {
    await waitForHealth(baseUrl);

    const initializeRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: {
          name: 'smoke-client',
          version: '0.0.0',
        },
      },
    };

    const initResult = await postMcp(initializeRequest);
    if (!initResult.response.ok) {
      throw new Error(`Initialize failed: ${initResult.response.status} ${initResult.text}`);
    }

    const sessionId = initResult.response.headers.get('mcp-session-id');
    if (!sessionId) {
      throw new Error('Initialize response did not include mcp-session-id header.');
    }

    const initPayload = parseSseJsonPayload(initResult.text);
    if (initPayload?.error) {
      throw new Error(`Initialize JSON-RPC error: ${JSON.stringify(initPayload.error)}`);
    }

    const addNoteRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'add_note',
        arguments: {
          note: 'smoke-test-note',
        },
      },
    };

    const addNoteResult = await postMcp(addNoteRequest, sessionId);
    if (!addNoteResult.response.ok) {
      throw new Error(`tools/call failed: ${addNoteResult.response.status} ${addNoteResult.text}`);
    }

    const toolPayload = parseSseJsonPayload(addNoteResult.text);
    if (toolPayload?.error) {
      throw new Error(`Tool call JSON-RPC error: ${JSON.stringify(toolPayload.error)}`);
    }

    const health = await fetch(`${baseUrl}/health`);
    const healthBody = await health.json();
    if (!health.ok || healthBody.ok !== true) {
      throw new Error(`Health check failed after tool call: ${JSON.stringify(healthBody)}`);
    }

    const deleteResult = await fetch(`${baseUrl}/mcp`, {
      method: 'DELETE',
      headers: {
        'Mcp-Session-Id': sessionId,
      },
    });

    if (!deleteResult.ok) {
      const deleteText = await deleteResult.text();
      throw new Error(`DELETE failed: ${deleteResult.status} ${deleteText}`);
    }

    console.log('Smoke test passed.');
  } finally {
    child.kill('SIGTERM');
    await wait(500);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
