import type { Server, Socket } from 'socket.io';
import type {
  ChatMessage,
  ChatPayload,
  CreateRoomPayload,
  JoinQueuePayload,
  JoinRoomPayload,
  LeaveRoomPayload,
  PlayerReadyPayload,
  RematchVotePayload,
  SubmitMovePayload,
} from '@blockus/shared';
import type { RoomManager } from './RoomManager';
import { GameSession } from './GameSession';
import { logger } from './logger';

// roomId → active GameSession
const sessions = new Map<string, GameSession>();

function roomPayload(entry: ReturnType<RoomManager['getRoom']>) {
  const { room, players } = entry;
  const { gameState: _gs, ...roomWithoutState } = room;
  return { room: roomWithoutState, players };
}

function sendError(socket: Socket, message: string, code = 'ERR') {
  socket.emit('error', { message, code });
}

export function registerHandlers(io: Server, roomManager: RoomManager, socket: Socket) {
  // ── join_queue ──────────────────────────────────────────────────────────────
  socket.on('join_queue', ({ name, mode }: JoinQueuePayload) => {
    try {
      const entry = roomManager.joinQueue(socket.id, name, mode);
      if (!entry) {
        socket.emit('queued', {});
        logger.info(`Socket ${socket.id} queued for ${mode}P`);
        return;
      }
      // Match found — put everyone in the socket room and notify
      for (const [sockId, pId] of entry.socketToPlayerId) {
        const s = io.sockets.sockets.get(sockId);
        if (s) {
          s.join(entry.room.id);
          s.emit('match_found', { roomId: entry.room.id, code: entry.room.code, playerId: pId });
          s.emit('room_update', roomPayload(entry));
        }
      }
      logger.info(`Match found for ${mode}P, room ${entry.room.id}`);
    } catch (e) {
      sendError(socket, (e as Error).message);
    }
  });

  // ── create_room ──────────────────────────────────────────────────────────────
  socket.on('create_room', ({ name, maxPlayers, turnTimeLimit }: CreateRoomPayload) => {
    try {
      const entry = roomManager.createRoom(socket.id, name, maxPlayers, turnTimeLimit);
      const creatorPlayerId = entry.socketToPlayerId.get(socket.id)!;
      socket.join(entry.room.id);
      socket.emit('match_found', { roomId: entry.room.id, code: entry.room.code, playerId: creatorPlayerId });
      socket.emit('room_update', roomPayload(entry));
      logger.info(`Room ${entry.room.code} created by ${name}`);
    } catch (e) {
      sendError(socket, (e as Error).message);
    }
  });

  // ── join_room ────────────────────────────────────────────────────────────────
  socket.on('join_room', ({ name, code }: JoinRoomPayload) => {
    try {
      const entry = roomManager.joinRoom(socket.id, name, code);
      const joinerPlayerId = entry.socketToPlayerId.get(socket.id)!;
      socket.join(entry.room.id);
      io.to(entry.room.id).emit('room_update', roomPayload(entry));
      socket.emit('match_found', { roomId: entry.room.id, code: entry.room.code, playerId: joinerPlayerId });
      logger.info(`${name} joined room ${code}`);
    } catch (e) {
      sendError(socket, (e as Error).message);
    }
  });

  // ── player_ready ─────────────────────────────────────────────────────────────
  socket.on('player_ready', ({ roomId }: PlayerReadyPayload) => {
    try {
      const entry = roomManager.setReady(socket.id, roomId);
      io.to(roomId).emit('room_update', roomPayload(entry));

      if (roomManager.allReady(entry)) {
        roomManager.startGame(entry);
        const session = new GameSession(
          entry.players,
          entry.socketToPlayerId,
          entry.turnTimeLimit,
          roomId,
          io,
        );
        sessions.set(roomId, session);
        session.start();
        logger.info(`Game started in room ${roomId}`);
      }
    } catch (e) {
      sendError(socket, (e as Error).message);
    }
  });

  // ── submit_move ──────────────────────────────────────────────────────────────
  socket.on('submit_move', ({ roomId, move }: SubmitMovePayload) => {
    try {
      const session = sessions.get(roomId);
      if (!session) throw new Error('No active game in this room.');
      session.submitMove(socket.id, move);
    } catch (e) {
      sendError(socket, (e as Error).message);
    }
  });

  // ── rematch_vote ─────────────────────────────────────────────────────────────
  socket.on('rematch_vote', ({ roomId }: RematchVotePayload) => {
    try {
      const { entry, allVoted } = roomManager.voteRematch(socket.id, roomId);
      io.to(roomId).emit('room_update', roomPayload(entry));

      if (allVoted) {
        const oldSession = sessions.get(roomId);
        oldSession?.destroy();

        roomManager.resetForRematch(entry);
        const session = GameSession.forRematch(oldSession!, entry.turnTimeLimit, io);
        sessions.set(roomId, session);
        session.start();
        logger.info(`Rematch started in room ${roomId}`);
      }
    } catch (e) {
      sendError(socket, (e as Error).message);
    }
  });

  // ── chat ─────────────────────────────────────────────────────────────────────
  socket.on('chat', ({ roomId, text }: ChatPayload) => {
    try {
      const entry = roomManager.getRoom(roomId);
      const playerId = entry.socketToPlayerId.get(socket.id);
      if (!playerId) return;
      const player = entry.players.find((p) => p.id === playerId);
      if (!player) return;
      const message: ChatMessage = {
        playerId: player.id,
        playerName: player.name,
        playerColor: player.color,
        text: text.slice(0, 200),
        timestamp: Date.now(),
      };
      io.to(roomId).emit('chat_update', { message });
    } catch {
      // ignore chat errors silently
    }
  });

  // ── leave_room ───────────────────────────────────────────────────────────────
  socket.on('leave_room', ({ roomId }: LeaveRoomPayload) => {
    socket.leave(roomId);
    const session = sessions.get(roomId);
    session?.destroy();
    sessions.delete(roomId);
    roomManager.deleteRoom(roomId);
    logger.info(`Socket ${socket.id} left room ${roomId}`);
  });

  // ── disconnect ───────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const { entry, playerId } = roomManager.removeSocket(socket.id);
    if (!entry || !playerId) return;

    const session = sessions.get(entry.room.id);
    session?.playerDisconnected(playerId);
    logger.info(`Player ${playerId} disconnected from room ${entry.room.id}`);
  });
}
