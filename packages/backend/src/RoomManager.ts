import type { Player, Room } from '@blockus/shared';

// Internal room state stored in memory
export interface RoomEntry {
  room: Room;
  players: Player[]; // ordered, matches room.playerIds
  socketToPlayerId: Map<string, string>; // socketId → Player.id
  playerIdToSocket: Map<string, string>; // Player.id → socketId
  rematchVotes: Set<string>; // playerIds who voted rematch
  turnTimeLimit: number;
}

type QueueEntry = { socketId: string; name: string };

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export class RoomManager {
  private rooms = new Map<string, RoomEntry>();
  private socketToRoom = new Map<string, string>(); // socketId → roomId
  private queues = new Map<number, QueueEntry[]>(); // mode (2|4) → queue

  createRoom(
    socketId: string,
    name: string,
    maxPlayers: 2 | 3 | 4,
    turnTimeLimit: number,
  ): RoomEntry {
    const playerId = `p-${generateId()}`;
    const roomId = `r-${generateId()}`;
    const code = generateCode();

    const player: Player = {
      id: playerId,
      name,
      color: 'blue',
      remainingPieces: [],
      score: 0,
      connected: true,
      isBot: false,
    };

    const room: Room = {
      id: roomId,
      code,
      hostId: playerId,
      status: 'lobby',
      maxPlayers,
      isPublic: false,
      gameState: null,
      playerIds: [playerId],
      readyPlayerIds: [],
      createdAt: Date.now(),
    };

    const entry: RoomEntry = {
      room,
      players: [player],
      socketToPlayerId: new Map([[socketId, playerId]]),
      playerIdToSocket: new Map([[playerId, socketId]]),
      rematchVotes: new Set(),
      turnTimeLimit,
    };

    this.rooms.set(roomId, entry);
    this.socketToRoom.set(socketId, roomId);
    return entry;
  }

  joinRoom(socketId: string, name: string, code: string): RoomEntry {
    const entry = [...this.rooms.values()].find(
      (e) => e.room.code === code && e.room.status === 'lobby',
    );
    if (!entry) throw new Error('Room not found or already started.');
    if (entry.room.playerIds.length >= entry.room.maxPlayers)
      throw new Error('Room is full.');
    if (entry.socketToPlayerId.has(socketId))
      throw new Error('Already in this room.');

    const COLORS = ['blue', 'yellow', 'red', 'green'] as const;
    const usedColors = new Set(entry.players.map((p) => p.color));
    const color = COLORS.find((c) => !usedColors.has(c))!;

    const playerId = `p-${generateId()}`;
    const player: Player = {
      id: playerId,
      name,
      color,
      remainingPieces: [],
      score: 0,
      connected: true,
      isBot: false,
    };

    entry.players.push(player);
    entry.room.playerIds.push(playerId);
    entry.socketToPlayerId.set(socketId, playerId);
    entry.playerIdToSocket.set(playerId, socketId);
    this.socketToRoom.set(socketId, entry.room.id);

    return entry;
  }

  joinQueue(socketId: string, name: string, mode: 2 | 3 | 4): RoomEntry | null {
    const queue = this.queues.get(mode) ?? [];
    // Don't add duplicates
    if (!queue.find((e) => e.socketId === socketId)) {
      queue.push({ socketId, name });
      this.queues.set(mode, queue);
    }

    if (queue.length >= mode) {
      const matched = queue.splice(0, mode);
      this.queues.set(mode, queue);

      // Create room with first player as host
      const [host, ...rest] = matched;
      const entry = this.createRoom(host.socketId, host.name, mode, 60);
      entry.room.isPublic = true;

      // Join remaining players
      for (const p of rest) {
        this.joinRoom(p.socketId, p.name, entry.room.code);
      }

      return entry;
    }

    return null; // still waiting
  }

  leaveQueue(socketId: string) {
    for (const [mode, queue] of this.queues.entries()) {
      const idx = queue.findIndex((e) => e.socketId === socketId);
      if (idx !== -1) {
        queue.splice(idx, 1);
        this.queues.set(mode, queue);
        return;
      }
    }
  }

  setReady(socketId: string, roomId: string): RoomEntry {
    const entry = this.getRoom(roomId);
    const playerId = entry.socketToPlayerId.get(socketId);
    if (!playerId) throw new Error('Not in this room.');
    if (!entry.room.readyPlayerIds.includes(playerId)) {
      entry.room.readyPlayerIds.push(playerId);
    }
    return entry;
  }

  allReady(entry: RoomEntry): boolean {
    return (
      entry.room.playerIds.length >= 2 &&
      entry.room.playerIds.length === entry.room.maxPlayers &&
      entry.room.playerIds.every((id) => entry.room.readyPlayerIds.includes(id))
    );
  }

  startGame(entry: RoomEntry) {
    entry.room.status = 'in_game';
  }

  voteRematch(socketId: string, roomId: string): { entry: RoomEntry; allVoted: boolean } {
    const entry = this.getRoom(roomId);
    const playerId = entry.socketToPlayerId.get(socketId);
    if (!playerId) throw new Error('Not in this room.');
    entry.rematchVotes.add(playerId);
    const allVoted = entry.room.playerIds.every((id) => entry.rematchVotes.has(id));
    return { entry, allVoted };
  }

  resetForRematch(entry: RoomEntry) {
    entry.room.status = 'lobby';
    entry.room.readyPlayerIds = [];
    entry.rematchVotes = new Set();
    // Reset player scores/pieces — GameSession handles the real state
  }

  removeSocket(socketId: string): { entry: RoomEntry | null; playerId: string | null } {
    this.leaveQueue(socketId);
    const roomId = this.socketToRoom.get(socketId);
    this.socketToRoom.delete(socketId);

    if (!roomId) return { entry: null, playerId: null };

    const entry = this.rooms.get(roomId);
    if (!entry) return { entry: null, playerId: null };

    const playerId = entry.socketToPlayerId.get(socketId) ?? null;
    // Don't delete the player — allow reconnect. Just mark disconnected.
    return { entry, playerId };
  }

  reconnect(socketId: string, oldSocketId: string): RoomEntry | null {
    const roomId = this.socketToRoom.get(oldSocketId);
    if (!roomId) return null;
    const entry = this.rooms.get(roomId);
    if (!entry) return null;

    const playerId = entry.socketToPlayerId.get(oldSocketId);
    if (!playerId) return null;

    // Remap socket
    entry.socketToPlayerId.delete(oldSocketId);
    entry.socketToPlayerId.set(socketId, playerId);
    entry.playerIdToSocket.set(playerId, socketId);
    this.socketToRoom.delete(oldSocketId);
    this.socketToRoom.set(socketId, roomId);
    return entry;
  }

  getRoomForSocket(socketId: string): RoomEntry | null {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;
    return this.rooms.get(roomId) ?? null;
  }

  getRoom(roomId: string): RoomEntry {
    const entry = this.rooms.get(roomId);
    if (!entry) throw new Error('Room not found.');
    return entry;
  }

  deleteRoom(roomId: string) {
    const entry = this.rooms.get(roomId);
    if (entry) {
      for (const socketId of entry.socketToPlayerId.keys()) {
        this.socketToRoom.delete(socketId);
      }
      this.rooms.delete(roomId);
    }
  }
}
