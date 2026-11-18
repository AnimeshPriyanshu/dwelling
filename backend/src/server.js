import { createServer } from 'node:http';
import { Server } from 'socket.io';
import app from './app.js';
import { env } from './config/env.js';
import { validateEnv } from './config/validateEnv.js';
import { connectCache } from './cache/index.js';
import { registerSocketHandlers } from './sockets/index.js';

// Validate required environment variables early
validateEnv();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: env.clientOrigin },
});

registerSocketHandlers(io);
await connectCache();

httpServer.listen(env.port, () => {
  console.info(`Dwelling API listening on port ${env.port}`);
});
