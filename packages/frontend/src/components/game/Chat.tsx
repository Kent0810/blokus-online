import React, { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@blockus/shared';

const EMOJIS = ['😀', '😂', '😱', '😤', '🎉', '👍', '👎', '💪', '🔥', '❤️', '😎', '🤔'];

const COLOR_TEXT: Record<string, string> = {
  blue: 'text-blue-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  green: 'text-green-400',
};

interface ChatProps {
  messages: ChatMessage[];
  myPlayerId: string;
  onSend: (text: string) => void;
}

export const Chat = React.memo(function Chat({ messages, myPlayerId, onSend }: ChatProps) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function send(msg: string) {
    const trimmed = msg.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }

  return (
    <div className="flex flex-col gap-2 mt-4 border-t border-slate-700/50 pt-3">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Chat</p>

      <div className="flex flex-col gap-1 h-28 overflow-y-auto pr-0.5">
        {messages.length === 0 && <p className="text-slate-600 text-xs italic">No messages yet…</p>}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.playerId === myPlayerId ? 'items-end' : 'items-start'}`}
          >
            <span
              className={`text-[10px] font-medium ${COLOR_TEXT[msg.playerColor] ?? 'text-slate-400'}`}
            >
              {msg.playerName}
            </span>
            <span className="bg-surface-2 rounded px-2 py-0.5 text-white text-xs break-all max-w-full">
              {msg.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-wrap gap-1">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => send(emoji)}
            className="text-base leading-none hover:scale-125 transition-transform"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(text)}
          placeholder="Message…"
          maxLength={100}
          className="flex-1 min-w-0 bg-surface-2 text-white placeholder-slate-500 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={() => send(text)}
          disabled={!text.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-2 py-1 rounded text-xs font-bold transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
});
