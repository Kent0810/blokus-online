import { useEffect } from 'react';
import { socket } from '../socket';
import { useAppStore } from '../store/appStore';
import { useGameUIStore } from '../store/gameUIStore';
import type {
  ChatUpdatePayload,
  MatchFoundPayload,
  RoomUpdatePayload,
  GameStartPayload,
  GameUpdatePayload,
  GameEndPayload,
  ErrorPayload,
} from '@blockus/shared';

export function useSocketEvents() {
  const store = useAppStore();
  const { resetTransform } = useGameUIStore();

  useEffect(() => {
    function onConnect() {
      store.setConnectionState('connected');
      store.setPlayer(store.playerName, socket.id ?? '');
    }

    function onDisconnect() {
      if (store.gameMode === 'local') return;
      store.setConnectionState('disconnected');
    }

    function onReconnectAttempt() {
      if (store.gameMode === 'local') return;
      store.setConnectionState('reconnecting');
    }

    function onReconnect() {
      store.setConnectionState('connected');
      store.setPlayer(store.playerName, socket.id ?? '');
    }

    function onQueued() {
      store.setPhase('matchmaking');
    }

    function onMatchFound(payload: MatchFoundPayload) {
      store.setMatchFound(payload.roomId, payload.code, payload.playerId);
    }

    function onRoomUpdate(payload: RoomUpdatePayload) {
      store.setRoom(payload.room, payload.players);
      if (store.phase !== 'lobby' && store.phase !== 'game' && store.phase !== 'game_over') {
        store.setPhase('lobby');
      }
    }

    function onGameStart(payload: GameStartPayload) {
      store.setGameState(payload.gameState);
      resetTransform();
    }

    function onGameUpdate(payload: GameUpdatePayload) {
      store.setGameState(payload.gameState);
    }

    function onGameEnd(payload: GameEndPayload) {
      store.setGameEnd(payload.gameState, payload.rankings);
    }

    function onError(payload: ErrorPayload) {
      store.setError(payload.message);
      setTimeout(() => store.setError(null), 4000);
    }

    function onChatUpdate(payload: ChatUpdatePayload) {
      store.addChatMessage(payload.message);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect', onReconnect);
    socket.on('queued', onQueued);
    socket.on('match_found', onMatchFound);
    socket.on('room_update', onRoomUpdate);
    socket.on('game_start', onGameStart);
    socket.on('game_update', onGameUpdate);
    socket.on('game_end', onGameEnd);
    socket.on('error', onError);
    socket.on('chat_update', onChatUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect', onReconnect);
      socket.off('queued', onQueued);
      socket.off('match_found', onMatchFound);
      socket.off('room_update', onRoomUpdate);
      socket.off('game_start', onGameStart);
      socket.off('game_update', onGameUpdate);
      socket.off('game_end', onGameEnd);
      socket.off('error', onError);
      socket.off('chat_update', onChatUpdate);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
