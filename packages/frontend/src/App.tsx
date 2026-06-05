import { useAppStore } from './store/appStore';
import { useSocketEvents } from './hooks/useSocketEvents';
import { LandingPage } from './pages/LandingPage';
import { MatchmakingPage } from './pages/MatchmakingPage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { LocalSetupPage } from './pages/LocalSetupPage';
import { disconnectSocket } from './socket';

function ConnectionBanner() {
  const { connectionState, gameMode, phase } = useAppStore();

  // Only relevant when user is supposed to be connected online
  const onlinePhase =
    gameMode === 'online' &&
    (phase === 'matchmaking' || phase === 'lobby' || phase === 'game' || phase === 'game_over');
  if (!onlinePhase || connectionState === 'connected') return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 text-center text-sm font-medium py-2 ${
        connectionState === 'reconnecting' ? 'bg-yellow-600 text-white' : 'bg-red-700 text-white'
      }`}
    >
      {connectionState === 'reconnecting'
        ? '⟳ Reconnecting...'
        : '✕ Disconnected — trying to reconnect...'}
    </div>
  );
}

function ErrorBanner() {
  const { error } = useAppStore();
  if (!error) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-700 text-white px-6 py-3 rounded-xl shadow-xl text-sm font-medium animate-bounce-in">
      {error}
    </div>
  );
}

function HomeButton() {
  const { phase, resetToLanding } = useAppStore();
  if (phase === 'landing') return null;
  return (
    <button
      onClick={() => {
        disconnectSocket();
        resetToLanding();
      }}
      className="fixed top-3 right-3 z-40 text-xs text-slate-500 hover:text-slate-300 bg-surface/80 border border-slate-700/50 px-3 py-1.5 rounded-lg transition-all backdrop-blur-sm"
      title="Back to home"
    >
      ⌂ Home
    </button>
  );
}

export default function App() {
  const { phase } = useAppStore();
  useSocketEvents();

  return (
    <>
      <ConnectionBanner />
      <ErrorBanner />
      <HomeButton />
      {phase === 'landing' && <LandingPage />}
      {phase === 'local_setup' && <LocalSetupPage />}
      {phase === 'matchmaking' && <MatchmakingPage />}
      {phase === 'lobby' && <LobbyPage />}
      {(phase === 'game' || phase === 'game_over') && <GamePage />}
    </>
  );
}
