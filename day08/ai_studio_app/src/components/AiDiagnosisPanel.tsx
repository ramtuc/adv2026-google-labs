import React, { useState } from 'react';
import { Sparkles, X, Copy, Check, RefreshCw, Send, AlertTriangle, Terminal, ChevronDown, ChevronUp, Cpu, Lightbulb, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ParsedLogLine } from '../types/serial';

interface AiDiagnosisPanelProps {
  log: ParsedLogLine | null;
  contextLogs: ParsedLogLine[];
  analysis: string | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onReanalyze: (log: ParsedLogLine, customQuestion?: string) => void;
}

export const AiDiagnosisPanel: React.FC<AiDiagnosisPanelProps> = ({
  log,
  contextLogs,
  analysis,
  isLoading,
  error,
  onClose,
  onReanalyze,
}) => {
  const [copied, setCopied] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');

  if (!log) {
    return (
      <div className="w-96 border-l border-neutral-800 bg-neutral-900/40 p-6 flex flex-col items-center justify-center text-center text-neutral-500 font-mono text-xs">
        <Sparkles className="w-8 h-8 text-neutral-600 mb-3 animate-pulse" />
        <h4 className="text-sm font-semibold text-neutral-400 mb-1">AI診断パネル</h4>
        <p className="text-[11px] text-neutral-500 leading-relaxed">
          左のシリアルログから行をクリックするか、「AI解析」ボタンを押すと、Geminiがその意味・原因・対処法を日本語で解説します。
        </p>
      </div>
    );
  }

  const handleCopy = () => {
    if (!analysis) return;
    const textToCopy = `### ESP32-S3 ログAI診断レポート\n対象ログ: ${log.raw}\n\n${analysis}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCustomQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim() || isLoading) return;
    onReanalyze(log, customQuestion);
    setCustomQuestion('');
  };

  const quickPrompts = [
    '修正コードの具体例を教えて',
    'idf.py でのバックトレース復元手順は？',
    'menuconfigで変更すべき項目は？',
    'Brownoutを防ぐ電源対策は？',
  ];

  return (
    <aside className="w-[440px] max-w-full border-l border-neutral-800 bg-neutral-900/95 flex flex-col h-full font-mono text-xs overflow-hidden shadow-2xl z-20">
      {/* Top Header */}
      <div className="border-b border-neutral-800 p-3 bg-neutral-950/70 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-200 text-xs flex items-center gap-1.5">
              Gemini AI エラー・ログ診断
            </h3>
            <span className="text-[10px] text-neutral-500">ESP32-S3 & ESP-IDF 専門解析</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {analysis && (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="診断結果をコピー"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => onReanalyze(log)}
            disabled={isLoading}
            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors disabled:opacity-40"
            title="再解析を実行"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="パネルを閉じる"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Target Log Summary Card */}
      <div className="p-3 border-b border-neutral-800/80 bg-neutral-950/40 shrink-0">
        <div className="text-[11px] text-neutral-400 mb-1 flex items-center justify-between">
          <span className="font-semibold text-neutral-300">対象のログ行:</span>
          {log.tag && <span className="text-cyan-400 font-medium">Tag: {log.tag}</span>}
        </div>
        <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-200 break-all select-text">
          <span className="text-neutral-500 mr-1.5">{log.timestamp ? `(${log.timestamp})` : ''}</span>
          <span className={log.isError ? 'text-rose-300 font-semibold' : log.isWarning ? 'text-amber-300' : 'text-neutral-200'}>
            {log.raw}
          </span>
        </div>

        {/* Category Hint */}
        {log.errorCategory && (
          <div className="mt-2 text-[11px] text-rose-300 bg-rose-950/60 border border-rose-900/70 rounded-md p-1.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
            <span>{log.errorCategory}</span>
          </div>
        )}

        {/* Collapsible Context Logs */}
        {contextLogs.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowContext(!showContext)}
              className="text-[10px] text-neutral-400 hover:text-neutral-200 flex items-center gap-1"
            >
              <Terminal className="w-2.5 h-2.5" />
              <span>前後のログ context ({contextLogs.length}行) を{showContext ? '隠す' : '確認'}</span>
              {showContext ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showContext && (
              <div className="mt-1 p-2 rounded bg-neutral-950 border border-neutral-800/70 max-h-32 overflow-y-auto text-[10px] text-neutral-400 font-mono space-y-0.5">
                {contextLogs.map((c) => (
                  <div key={c.id} className="truncate">
                    {c.raw}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-cyan-500/30 border border-purple-500/40 flex items-center justify-center text-purple-300 animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <Sparkles className="w-4 h-4 text-cyan-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-neutral-200 text-xs">Gemini がESP32ログを解析中...</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">エラーの根本原因とESP-IDF対処手順を整理しています</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>解析エラーが発生しました</span>
            </div>
            <p className="text-[11px] text-red-300 leading-relaxed">{error}</p>
            <button
              onClick={() => onReanalyze(log)}
              className="px-3 py-1 bg-red-900 hover:bg-red-800 text-white rounded text-xs font-medium transition-colors"
            >
              もう一度試す
            </button>
          </div>
        ) : analysis ? (
          <div className="prose prose-invert prose-xs max-w-none text-neutral-200 leading-relaxed space-y-3 font-sans">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-sm font-bold text-cyan-300 border-b border-neutral-800 pb-1 mt-3 mb-2 font-mono">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xs font-bold text-cyan-400 mt-3 mb-1.5 font-mono flex items-center gap-1.5">{children}</h2>,
                h3: ({ children }) => <h3 className="text-xs font-semibold text-neutral-200 mt-2 mb-1 font-mono">{children}</h3>,
                p: ({ children }) => <p className="text-xs text-neutral-300 leading-relaxed mb-2">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 text-xs text-neutral-300 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 text-xs text-neutral-300 mb-2">{children}</ol>,
                li: ({ children }) => <li className="text-xs text-neutral-300">{children}</li>,
                code: ({ children }) => (
                  <code className="bg-neutral-950 border border-neutral-800 text-cyan-300 px-1.5 py-0.5 rounded text-[11px] font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 overflow-x-auto text-[11px] font-mono text-neutral-200 my-2">
                    {children}
                  </pre>
                ),
                strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
              }}
            >
              {analysis}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="py-8 text-center text-neutral-500">
            <Lightbulb className="w-6 h-6 text-neutral-600 mx-auto mb-2" />
            <p>「解析を実行」を押してGeminiによる解説を生成してください。</p>
          </div>
        )}
      </div>

      {/* Quick Prompt Pills & Follow-up Question Bar */}
      <div className="border-t border-neutral-800 bg-neutral-950/90 p-3 shrink-0 space-y-2">
        {/* Quick prompt buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onReanalyze(log, prompt)}
              disabled={isLoading}
              className="shrink-0 px-2 py-0.5 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-400 hover:text-cyan-300 transition-colors disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input box for follow-up questions */}
        <form onSubmit={handleCustomQuestionSubmit} className="relative flex items-center">
          <MessageSquare className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5" />
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            disabled={isLoading}
            placeholder="Geminiに追加で質問 (例: 設定変更の手順は？)..."
            className="w-full bg-neutral-900 border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg pl-8 pr-8 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none font-sans disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!customQuestion.trim() || isLoading}
            className="absolute right-1.5 p-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-30 disabled:bg-transparent transition-colors"
            title="質問を送信"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </aside>
  );
};
