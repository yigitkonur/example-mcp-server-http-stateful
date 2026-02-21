import { createServer } from 'node:http';

import { loadConfig } from './config.js';
import { createHttpApp } from './http/createHttpApp.js';

const config = loadConfig();
const { app, shutdown, sessions } = createHttpApp(config);

const server = createServer(app);

server.listen(config.port, config.host, () => {
  console.log(
    `MCP HTTP Stateful server listening on http://${config.host}:${String(config.port)} (active sessions: ${String(
      sessions.count(),
    )})`,
  );
});

const stop = async (signal: NodeJS.Signals): Promise<void> => {
  console.log(`Received ${signal}. Shutting down...`);

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  await shutdown();
  console.log('Shutdown complete.');
  process.exit(0);
};

process.on('SIGINT', () => {
  void stop('SIGINT');
});

process.on('SIGTERM', () => {
  void stop('SIGTERM');
});
