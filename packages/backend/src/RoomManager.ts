import type { GameVariant, Player, Room } from '@blockus/shared';

// Internal room state stored in memory
export interface RoomEntry {
  room: Room;
  players: Player[]; // ordered, matches room.playerIds
  socketToPlayerId: Map<string, string>; // socketId → Player.id
  playerIdToSocket: Map<string, string>; // Player.id → socketId
  rematchVotes: Set<string>; // playerIds who voted rematch
  turnTimeLimit: number;
  variant: GameVariant;
}

type QueueEntry = { socketId: string; name: string; variant: GameVariant };

export class RoomManager {
  private rooms = new Map<string, RoomEntry>();
  private socketToRoom = new Map<string, string>(); // socketId → roomId

  /*
    Using internal queue for now

    -> Meaning if the server restarts — queue is gone. If you run two server instances — they have separate queues and players will never match across them.

    1. Redis (most common for this)
      Player A → Server 1 → Redis Queue
      Player B → Server 2 → Redis Queue → match found → notify both servers

    2. Message Queue (BullMQ / RabbitMQ)
      BullMQ sits on top of Redis, gives you job queues with retries, priorities, delays
      Overkill for matchmaking but useful if you add things like ranked matching, skill-based pairing, or timeout handling
   */
  private queues = new Map<number, QueueEntry[]>(); // maxPlayers (2|3|4) → queue

  createRoom(
    socketId: string,
    name: string,
    maxPlayers: 2 | 3 | 4,
    turnTimeLimit: number = 120,
    variant: GameVariant = 'standard',
  ): RoomEntry {
    const playerId = `p-${this.generateId()}`;
    const roomId = `r-${this.generateId()}`;
    const code = this.generateCode();

    const host: Player = {
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
      players: [host],
      socketToPlayerId: new Map([[socketId, playerId]]),
      playerIdToSocket: new Map([[playerId, socketId]]),
      rematchVotes: new Set(),
      turnTimeLimit,
      variant,
    };

    this.rooms.set(roomId, entry);
    this.socketToRoom.set(socketId, roomId);

    return entry;
  }

  // NEXT: TRY TO UNDERSTAND ME
  joinRoom(socketId: string, name: string, code: string): RoomEntry {
    const entry = [...this.rooms.values()].find(
      (e) => e.room.code === code && e.room.status === 'lobby',
    );
    if (!entry) throw new Error('Room not found or already started.');
    if (entry.room.playerIds.length >= entry.room.maxPlayers) throw new Error('Room is full.');
    if (entry.socketToPlayerId.has(socketId)) throw new Error('Already in this room.');

    const COLORS = ['blue', 'yellow', 'red', 'green'] as const;
    const usedColors = new Set(entry.players.map((p) => p.color));
    const color = COLORS.find((c) => !usedColors.has(c))!;

    const playerId = `p-${this.generateId()}`;
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

  joinQueue(
    socketId: string,
    name: string,
    maxPlayers: 2 | 3 | 4,
    variant: GameVariant = 'standard',
  ): RoomEntry | null {
    const queue = this.queues.get(maxPlayers) ?? [];

    const isDuplicated = queue.find((e) => e.socketId === socketId);

    // Don't add duplicates
    if (!isDuplicated) {
      queue.push({ socketId, name, variant });
      this.queues.set(maxPlayers, queue);
    }

    if (queue.length >= maxPlayers) {
      // Take out the first `maxPlayers` players from the queue
      const matched = queue.splice(0, maxPlayers);

      this.queues.set(maxPlayers, queue);

      // Create room with first player as host; host's variant wins
      const [host, ...rest] = matched;
      const entry = this.createRoom(host.socketId, host.name, maxPlayers, 120, host.variant);
      entry.room.isPublic = true;

      // Join remaining players
      for (const player of rest) {
        this.joinRoom(player.socketId, player.name, entry.room.code);
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

  /*
    Strip away game state for payload when the user just want to update room metadata not the state of the same room

    e.g. when a player joins, ready up, or votes for rematch — we want to send room updates to all players but the game state is managed separately by GameSession and doesn't need to be sent every time.
  */
  public toPayload(entry: RoomEntry) {
    const { gameState: _gs, ...roomWithoutState } = entry.room;

    return {
      room: roomWithoutState,
      players: entry.players,
    };
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(
      '',
    );
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2, 10);
  }
}
