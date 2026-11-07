import React, { useState, useRef } from 'react';
import { Send, Terminal, CornerDownLeft } from 'lucide-react';

interface SerialSendBarProps {
  isConnected: boolean;
  onSend: (text: string, lineEnding: 'crlf' | 'lf' | 'none') => Promise<void>;
  onSimulateInput?: (text: string) => void;
  isDemoMode: boolean;
}

export const SerialSendBar: React.FC<SerialSendBarProps> = ({
  isConnected,
  onSend,
  onSimulateInput,
  isDemoMode,
}) => {
  const [inputText, setInputText] = useState('');
  const [lineEnding, setLineEnding] = useState<'crlf' | 'lf' | 'none'>('crlf');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const command = inputText;
    setIsSending(true);

    try {
      if (isConnected) {
        await onSend(command, lineEnding);
      } else if (isDemoMode && onSimulateInput) {
        onSimulateInput(command);
      }

      // Add to command history
      setHistory((prev) => [command, ...prev.filter((h) => h !== command)].slice(0, 50));
      setHistoryIndex(-1);
      setInputText('');
    } catch (err) {
      console.error('Failed to send serial data:', err);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInputText(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputText(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputText('');
      }
    }
  };

  const quickCommands = [
    { label: 'help', cmd: 'help' },
    { label: 'version', cmd: 'version' },
    { label: 'tasks', cmd: 'tasks' },
    { label: 'heap', cmd: 'heap' },
    { label: 'restart', cmd: 'restart' },
  ];

  return (
    <div className="border-t border-neutral-800 bg-neutral-900/90 p-2.5 px-4 font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        {/* Quick Command Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] text-neutral-400">
          <span className="text-[10px] text-neutral-500 uppercase font-semibold">クイック送信:</span>
          {quickCommands.map((q) => (
            <button
              key={q.cmd}
              onClick={() => {
                setInputText(q.cmd);
                inputRef.current?.focus();
              }}
              className="px-2 py-0.5 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-cyan-300 transition-colors"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Line Ending Selector */}
        <div className="flex items-center gap-1 text-[11px] text-neutral-400">
          <span>改行:</span>
          <select
            value={lineEnding}
            onChange={(e) => setLineEnding(e.target.value as any)}
            className="bg-neutral-950 border border-neutral-800 rounded px-1.5 py-0.5 text-neutral-300 focus:outline-none"
          >
            <option value="crlf">CRLF (\r\n)</option>
            <option value="lf">LF (\n)</option>
            <option value="none">None (なし)</option>
          </select>
        </div>
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Terminal className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isConnected && !isDemoMode}
            placeholder={
              isConnected || isDemoMode
                ? 'ESP32へコマンド送信 (Enterで送信、↑↓で履歴)...'
                : 'ESP32を接続するとコマンド送信が有効になります'
            }
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg pl-8 pr-16 py-1.5 text-neutral-200 placeholder-neutral-500 focus:outline-none disabled:opacity-50"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500 flex items-center gap-0.5 pointer-events-none">
            <CornerDownLeft className="w-3 h-3" />
            <span>Enter</span>
          </span>
        </div>

        <button
          type="submit"
          disabled={(!isConnected && !isDemoMode) || !inputText.trim() || isSending}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-medium transition-all shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>送信</span>
        </button>
      </form>
    </div>
  );
};
