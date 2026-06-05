import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { logger } from './utils/logger';
import { SocketHandlers } from './SocketHandlers';
import { Server } from 'socket.io';

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? '*';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

const httpServer = createServer(app);

httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info(`Blockus backend listening on http://0.0.0.0:${PORT}`);
  logger.info(`Clients on the same network can connect via your local IP:${PORT}`);
});

const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
  pingInterval: 10_000,
  pingTimeout: 5_000,
});

const socketHandler = new SocketHandlers(io);

socketHandler.initialize();
