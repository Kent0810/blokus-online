import { useState } from 'react';

interface RoomCodeProps {
  code: string;
}

export function RoomCode({ code }: RoomCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">Room Code</p>
      <button
        onClick={handleCopy}
        className="group flex items-center gap-3 bg-surface-2 hover:bg-slate-600 rounded-xl px-6 py-3 transition-all duration-150 cursor-pointer"
        title="Click to copy"
      >
        <span className="text-3xl font-bold tracking-[0.2em] text-white font-mono">{code}</span>
        <svg
          className={`w-5 h-5 transition-colors duration-150 ${copied ? 'text-green-400' : 'text-slate-400 group-hover:text-white'}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          {copied ? (
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          ) : (
            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
          )}
        </svg>
      </button>
      {copied && <p className="text-green-400 text-xs animate-fade-in">Copied!</p>}
    </div>
  );
}
