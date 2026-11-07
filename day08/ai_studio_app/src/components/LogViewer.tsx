import React, { useRef, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Info, Bug, Flame, Cpu, Sparkles, Terminal, ArrowUpRight } from 'lucide-react';
import { ParsedLogLine, EspLogLevel } from '../types/serial';

interface LogViewerProps {
  logs: ParsedLogLine[];
  selectedLogId: string | null;
  onSelectLog: (log: ParsedLogLine) => void;
  onAnalyzeWithAi: (log: ParsedLogLine) => void;
  onTagClick: (tag: string) => void;
  autoScroll: boolean;
  onTriggerDemo: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  selectedLogId,
  onSelectLog,
  onAnalyzeWithAi,
  onTagClick,
  autoScroll,
  onTriggerDemo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive if autoScroll is enabled
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [logs.length, autoScroll]);

  const renderLevelBadge = (level: EspLogLevel, isPanic: boolean, isReset: boolean) => {
    if (isPanic || level === 'PANIC') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-950 text-rose-300 border border-rose-800 shadow-sm shadow-rose-950 animate-pulse">
          <Flame className="w-2.5 h-2.5 text-rose-400" />
          PANIC
        </span>
      );
    }
    if (isReset || level === 'BOOT') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
          <Cpu className="w-2.5 h-2.5 text-indigo-400" />
          RST
        </span>
      );
    }
    switch (level) {
      case 'E':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-red-950 text-red-300 border border-red-800">
            <AlertCircle className="w-2.5 h-2.5 text-red-400" />
            E
          </span>
        );
      case 'W':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-950 text-amber-300 border border-amber-800">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
            W
          </span>
        );
      case 'I':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            <Info className="w-2.5 h-2.5 text-emerald-400" />
            I
          </span>
        );
      case 'D':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-950/80 text-purple-300 border border-purple-800/80">
            <Bug className="w-2.5 h-2.5 text-purple-400" />
            D
          </span>
        );
      case 'V':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-neutral-800 text-neutral-400 border border-neutral-700">
            V
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-neutral-900 text-neutral-500 border border-neutral-800">
            RAW
          </span>
        );
    }
  };

  const getLineStyle = (log: ParsedLogLine, isSelected: boolean) => {
    if (isSelected) {
      return 'bg-cyan-950/40 border-l-4 border-l-cyan-400 border-y border-y-cyan-900/50';
    }
    if (log.isPanic) {
      return 'bg-rose-950/20 hover:bg-rose-950/30 border-l-2 border-l-rose-500';
    }
    if (log.isError) {
      return 'bg-red-950/15 hover:bg-red-950/25 border-l-2 border-l-red-500';
    }
    if (log.isWarning) {
      return 'bg-amber-950/10 hover:bg-amber-950/20 border-l-2 border-l-amber-500';
    }
    if (log.isReset) {
      return 'bg-indigo-950/15 hover:bg-indigo-950/25 border-l-2 border-l-indigo-500';
    }
    return 'hover:bg-neutral-900/60 border-l-2 border-l-transparent';
  };

  const getTextColor = (log: ParsedLogLine) => {
    if (log.isPanic) return 'text-rose-200 font-semibold';
    if (log.isError) return 'text-red-300 font-medium';
    if (log.isWarning) return 'text-amber-200';
    if (log.isReset) return 'text-indigo-200 font-medium';
    if (log.level === 'I') return 'text-neutral-200';
    if (log.level === 'D') return 'text-purple-300/90';
    return 'text-neutral-300';
  };

  if (logs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500 font-mono">
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 mb-4 shadow-inner">
          <Terminal className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-base font-semibold text-neutral-300 mb-2">ログを受信していません</h3>
        <p className="text-xs max-w-md text-neutral-400 leading-relaxed mb-6">
          USBケーブルでESP32-S3を接続し、上の「ESP32を接続」ボタンをクリックしてください。115200 bpsでリアルタイム受信を開始します。
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onTriggerDemo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-700/80 text-cyan-300 text-xs font-mono font-medium transition-all shadow-md shadow-cyan-950/40"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            デモログを再生して動作を体験
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden font-mono text-xs select-text bg-neutral-950 divide-y divide-neutral-900/60"
    >
      {logs.map((log, index) => {
        const isSelected = selectedLogId === log.id;
        const lineStyle = getLineStyle(log, isSelected);
        const textColor = getTextColor(log);

        return (
          <div
            key={log.id}
            onClick={() => onSelectLog(log)}
            className={`group flex items-start gap-2.5 px-3 py-1.5 transition-colors cursor-pointer ${lineStyle}`}
          >
            {/* Line Index */}
            <span className="text-[10px] text-neutral-600 font-mono w-9 text-right shrink-0 select-none pt-0.5">
              {index + 1}
            </span>

            {/* Level Badge */}
            <div className="shrink-0 pt-0.5">
              {renderLevelBadge(log.level, log.isPanic, log.isReset)}
            </div>

            {/* Timestamp */}
            <span className="text-[11px] text-neutral-500 font-mono shrink-0 select-none pt-0.5">
              {log.timestamp ? `(${log.timestamp})` : log.receivedAt.toLocaleTimeString()}
            </span>

            {/* Tag Badge (clickable for filtering) */}
            {log.tag && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick(log.tag!);
                }}
                className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-cyan-400 hover:text-cyan-300 border border-neutral-800 transition-colors"
                title={`タグ "${log.tag}" で絞り込み`}
              >
                {log.tag}:
              </button>
            )}

            {/* Message Body & Inline Category Callout */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className={`break-all whitespace-pre-wrap leading-relaxed ${textColor}`}>
                {log.message}
              </span>

              {/* Special Category Hint (e.g. Guru Meditation / Brownout / Reset reason) */}
              {log.errorCategory && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-300/90 bg-red-950/40 border border-red-900/50 rounded px-2 py-0.5 mt-0.5 w-fit">
                  <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                  <span>{log.errorCategory}</span>
                </div>
              )}
            </div>

            {/* Quick Action Button on Hover */}
            <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAnalyzeWithAi(log);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all shadow-sm ${
                  log.isError || log.isPanic
                    ? 'bg-rose-950/90 hover:bg-rose-900 border border-rose-700 text-rose-200'
                    : 'bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-800 text-cyan-200'
                }`}
                title="このログ行の意味と考えらえる原因・対処をGemini AIで解説"
              >
                <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                <span>AI解析</span>
                <ArrowUpRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} className="h-4" />
    </div>
  );
};
