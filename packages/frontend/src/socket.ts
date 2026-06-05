import { io, Socket } from 'socket.io-client';
import type {
  ChatPayload,
  JoinQueuePayload,
  CreateRoomPayload,
  JoinRoomPayload,
  PlayerReadyPayload,
  SubmitMovePayload,
  RematchVotePayload,
  LeaveRoomPayload,
} from '@blockus/shared';

// Use same origin so Vite's /socket.io proxy handles it in dev.
// Set VITE_SOCKET_URL in .env to override for production.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

let playerName = '';

export function setPlayerName(name: string) {
  playerName = name;
}

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
  auth: (cb) => {
    cb({ name: playerName });
  },
});

export function connectSocket(name: string) {
  playerName = name;
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket() {
  socket.disconnect();
}

// Client → Server emitters
export const emit = {
  joinQueue: (payload: JoinQueuePayload) => socket.emit('join_queue', payload),
  leaveQueue: () => socket.emit('leave_queue'),
  createRoom: (payload: CreateRoomPayload) => socket.emit('create_room', payload),
  joinRoom: (payload: JoinRoomPayload) => socket.emit('join_room', payload),
  playerReady: (payload: PlayerReadyPayload) => socket.emit('player_ready', payload),
  submitMove: (payload: SubmitMovePayload) => socket.emit('submit_move', payload),
  rematchVote: (payload: RematchVotePayload) => socket.emit('rematch_vote', payload),
  leaveRoom: (payload: LeaveRoomPayload) => socket.emit('leave_room', payload),
  chat: (payload: ChatPayload) => socket.emit('chat', payload),
};
