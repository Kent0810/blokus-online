import React, { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@blockus/shared';
import { GeneratedAvatar } from '../ui/GeneratedAvatar';

const QUICK_EMOJIS = ['👍', '😂', '😱', '😤', '🎉', '🔥', '💪', '😎', '🤔', '❤️', '👎', '🫡'];

const COLOR_TEXT: Record<string, string> = {
  blue: 'text-blue-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  green: 'text-green-400',
};

const COLOR_BG: Record<string, string> = {
  blue: 'bg-blue-600',
  yellow: 'bg-yellow-500',
  red: 'bg-red-600',
  green: 'bg-green-600',
};

interface ChatProps {
  messages: ChatMessage[];
  myPlayerId: string;
  avatarMap: Record<string, string>;
  onSend: (text: string) => void;
}

function PlayerInitial({ color, name }: { color: string; name: string }) {
  return (
    <div
      className={`w-6 h-6 rounded-full ${COLOR_BG[color] ?? 'bg-slate-600'} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export const Chat = React.memo(function Chat({
  messages,
  myPlayerId,
  avatarMap,
  onSend,
}: ChatProps) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function send(msg: string) {
    const trimmed = msg.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  }

  // Group consecutive messages from the same sender
  type Group = { playerId: string; playerName: string; playerColor: string; msgs: ChatMessage[] };
  const groups: Group[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.playerId === msg.playerId) {
      last.msgs.push(msg);
    } else {
      groups.push({
        playerId: msg.playerId,
        playerName: msg.playerName,
        playerColor: msg.playerColor,
        msgs: [msg],
      });
    }
  }

  return (
    <div className="flex flex-col gap-2 mt-3 border-t border-white/[0.06] pt-3 min-h-0">
      <p className="text-[10px] font-semibold text-[#7b94b9] uppercase tracking-widest">Chat</p>

      {/* Message area */}
      <div className="flex flex-col gap-2.5 h-40 overflow-y-auto pr-0.5 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-surface-2 [&::-webkit-scrollbar-thumb]:rounded-full">
        {groups.length === 0 && (
          <p className="text-[#7b94b9]/40 text-xs italic text-center pt-4">No messages yet</p>
        )}

        {groups.map((group, gi) => {
          const isMe = group.playerId === myPlayerId;
          const avatar = avatarMap[group.playerId];

          return (
            <div key={gi} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar: generated if known, else color initial circle */}
              <div className="shrink-0 mt-0.5">
                {avatar ? (
                  <GeneratedAvatar seed={avatar} size={24} className="rounded-md" />
                ) : (
                  <PlayerInitial color={group.playerColor} name={group.playerName} />
                )}
              </div>

              <div
                className={`flex flex-col gap-0.5 min-w-0 max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Name — only shown for others */}
                {!isMe && (
                  <span
                    className={`text-[10px] font-semibold px-0.5 ${COLOR_TEXT[group.playerColor] ?? 'text-slate-400'}`}
                  >
                    {group.playerName}
                  </span>
                )}

                {/* Message bubbles */}
                {group.msgs.map((msg, mi) => (
                  <div
                    key={mi}
                    className={`px-2.5 py-1.5 rounded-xl text-xs text-[#eef2ff] break-words max-w-full ${
                      isMe ? 'bg-accent/20 rounded-tr-sm' : 'bg-surface-2 rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Quick emoji row */}
      <div className="flex flex-wrap gap-1">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => send(emoji)}
            className="text-sm leading-none hover:scale-125 transition-transform p-0.5"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(text)}
          placeholder="Say something…"
          maxLength={100}
          className="flex-1 min-w-0 bg-surface-2 text-[#eef2ff] placeholder-[#7b94b9]/50 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-accent/50 transition-all"
        />
        <button
          type="button"
          onClick={() => send(text)}
          disabled={!text.trim()}
          aria-label="Send message"
          className="w-8 h-8 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-35 text-white flex items-center justify-center transition-all active:scale-95 shrink-0"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
            <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
});
