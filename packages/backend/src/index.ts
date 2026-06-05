import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './RoomManager';
import { registerHandlers } from './socketHandlers';
import { logger } from './logger';

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

const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const roomManager = new RoomManager();

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  registerHandlers(io, roomManager, socket);
});

httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info(`Blockus backend listening on http://0.0.0.0:${PORT}`);
  logger.info(`Clients on the same network can connect via your local IP:${PORT}`);
});
