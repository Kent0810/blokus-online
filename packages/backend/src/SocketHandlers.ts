import { Server, Socket } from 'socket.io';
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
import { RoomManager } from './RoomManager';
import { GameSession } from './GameSession';
import { logger } from './utils/logger';

export class SocketHandlers {
  private readonly sessions: Map<string, GameSession>;

  private readonly roomManager: RoomManager;

  constructor(private readonly io: Server) {
    this.sessions = new Map<string, GameSession>();
    this.roomManager = new RoomManager();
  }

  public initialize() {
    this.io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      this.registerHandlers(socket);
    });
  }

  private registerHandlers(socket: Socket) {
    // ── join_queue (feature: Quick Play) ────────────────────────────────────────────────────────────── :check-mark:
    socket.on('join_queue', ({ name, mode }: JoinQueuePayload) => {
      try {
        const entry = this.roomManager.joinQueue(socket.id, name, mode);

        if (!entry) {
          socket.emit('queued', {});
          logger.info(`Socket ${socket.id} queued for ${mode}P`);

          return;
        }

        const { socketToPlayerId, room } = entry;

        // Match found — put everyone in the socket room and notify
        for (const [socketId, playerId] of socketToPlayerId) {
          // Socket.IO always creates a default namespace called io.sockets for convenience.
          const namespace = this.io.of('/');

          const socket = namespace.sockets.get(socketId);

          if (socket) {
            socket.join(room.id); // After the room algorithm successfully created a room, route the player sockets together

            socket.emit('match_found', {
              roomId: room.id,
              code: room.code,
              playerId,
            });

            socket.emit('room_update', this.roomManager.toPayload(entry));
          }
        }

        logger.info(`Match found for ${mode}P, room ${entry.room.id}`);
      } catch (e) {
        this.sendError(socket, (e as Error).message);
      }
    });

    // ── create_room ──────────────────────────────────────────────────────────────
    socket.on('create_room', ({ name, mode, turnTimeLimit }: CreateRoomPayload) => {
      try {
        logger.info(
          `Socket ${socket.id} is creating a room with name: ${name}, mode: ${mode}, turnTimeLimit: ${turnTimeLimit}`,
        );

        const entry = this.roomManager.createRoom(socket.id, name, mode, turnTimeLimit);
        const creatorPlayerId = entry.socketToPlayerId.get(socket.id)!;

        socket.join(entry.room.id);
        socket.emit('match_found', {
          roomId: entry.room.id,
          code: entry.room.code,
          playerId: creatorPlayerId,
        });

        socket.emit('room_update', this.roomManager.toPayload(entry));

        logger.info(`Room ${entry.room.code} created by ${name}`);
      } catch (e) {
        this.sendError(socket, (e as Error).message);
      }
    });

    // ── join_room ────────────────────────────────────────────────────────────────
    socket.on('join_room', ({ name, code }: JoinRoomPayload) => {
      try {
        const entry = this.roomManager.joinRoom(socket.id, name, code);
        const joinerPlayerId = entry.socketToPlayerId.get(socket.id)!;

        socket.join(entry.room.id);
        this.io.to(entry.room.id).emit('room_update', this.roomManager.toPayload(entry));

        socket.emit('match_found', {
          roomId: entry.room.id,
          code: entry.room.code,
          playerId: joinerPlayerId,
        });

        logger.info(`${name} joined room ${code}`);
      } catch (e) {
        this.sendError(socket, (e as Error).message);
      }
    });

    // ── player_ready ─────────────────────────────────────────────────────────────
    socket.on('player_ready', ({ roomId }: PlayerReadyPayload) => {
      try {
        const entry = this.roomManager.setReady(socket.id, roomId);

        this.io.to(roomId).emit('room_update', this.roomManager.toPayload(entry));

        if (this.roomManager.allReady(entry)) {
          this.roomManager.startGame(entry);

          const session = new GameSession(
            entry.players,
            entry.socketToPlayerId,
            entry.turnTimeLimit,
            roomId,
            this.io,
          );

          // Append the session to a lists of sessions
          this.sessions.set(roomId, session);

          session.start();

          logger.info(`Game started in room ${roomId}`);
        }
      } catch (e) {
        this.sendError(socket, (e as Error).message);
      }
    });

    // ── submit_move ──────────────────────────────────────────────────────────────
    socket.on('submit_move', ({ roomId, move }: SubmitMovePayload) => {
      try {
        const session = this.sessions.get(roomId);

        if (!session) {
          throw new Error('No active game in this room.');
        }

        session.submitMove(socket.id, move);
      } catch (e) {
        this.sendError(socket, (e as Error).message);
      }
    });

    // ── rematch_vote ─────────────────────────────────────────────────────────────
    socket.on('rematch_vote', ({ roomId }: RematchVotePayload) => {
      try {
        const { entry, allVoted } = this.roomManager.voteRematch(socket.id, roomId);

        this.io.to(roomId).emit('room_update', this.roomManager.toPayload(entry));

        if (allVoted) {
          const oldSession = this.sessions.get(roomId);
          oldSession?.destroy();

          this.roomManager.resetForRematch(entry);

          const session = GameSession.forRematch(oldSession!, entry.turnTimeLimit, this.io);
          this.sessions.set(roomId, session);

          session.start();

          logger.info(`Rematch started in room ${roomId}`);
        }
      } catch (e) {
        this.sendError(socket, (e as Error).message);
      }
    });

    // ── chat ─────────────────────────────────────────────────────────────────────
    socket.on('chat', ({ roomId, text }: ChatPayload) => {
      try {
        const entry = this.roomManager.getRoom(roomId);

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

        this.io.to(roomId).emit('chat_update', { message });
      } catch {
        // ignore chat errors silently
      }
    });

    // ── leave_room ───────────────────────────────────────────────────────────────
    socket.on('leave_room', ({ roomId }: LeaveRoomPayload) => {
      socket.leave(roomId);

      const session = this.sessions.get(roomId);
      session?.destroy();

      this.sessions.delete(roomId);

      this.roomManager.deleteRoom(roomId);

      logger.info(`Socket ${socket.id} left room ${roomId}`);
    });

    // ── disconnect ───────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const { entry, playerId } = this.roomManager.removeSocket(socket.id);
      if (!entry || !playerId) return;

      const session = this.sessions.get(entry.room.id);
      session?.playerDisconnected(playerId);

      logger.info(`Player ${playerId} disconnected from room ${entry.room.id}`);
    });
  }

  private sendError(socket: Socket, message: string, code = 'ERR') {
    socket.emit('error', { message, code });
  }
}
