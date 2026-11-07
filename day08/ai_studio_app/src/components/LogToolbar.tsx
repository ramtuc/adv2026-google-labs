import React from 'react';
import { Search, Trash2, Download, ArrowDownToLine, Sparkles, Filter, Tag, X } from 'lucide-react';
import { EspLogLevel } from '../types/serial';

interface LogToolbarProps {
  currentLevel: EspLogLevel | 'ALL';
  onLevelChange: (level: EspLogLevel | 'ALL') => void;
  levelCounts: Record<string, number>;
  selectedTag: string | null;
  onTagChange: (tag: string | null) => void;
  availableTags: string[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  autoAiAnalyze: boolean;
  onToggleAutoAiAnalyze: () => void;
  onClear: () => void;
  onExport: () => void;
  totalLogs: number;
  filteredCount: number;
}

export const LogToolbar: React.FC<LogToolbarProps> = ({
  currentLevel,
  onLevelChange,
  levelCounts,
  selectedTag,
  onTagChange,
  availableTags,
  searchQuery,
  onSearchChange,
  autoScroll,
  onToggleAutoScroll,
  autoAiAnalyze,
  onToggleAutoAiAnalyze,
  onClear,
  onExport,
  totalLogs,
  filteredCount,
}) => {
  const [showTagDropdown, setShowTagDropdown] = React.useState(false);

  const levelTabs: Array<{ id: EspLogLevel | 'ALL'; label: string; countKey: string; color: string; badgeColor: string }> = [
    { id: 'ALL', label: 'All', countKey: 'ALL', color: 'hover:text-white', badgeColor: 'bg-neutral-800 text-neutral-300' },
    { id: 'E', label: 'E (Error)', countKey: 'E', color: 'hover:text-red-300 text-red-400', badgeColor: 'bg-red-950 border border-red-800 text-red-300' },
    { id: 'W', label: 'W (Warn)', countKey: 'W', color: 'hover:text-amber-300 text-amber-400', badgeColor: 'bg-amber-950 border border-amber-800 text-amber-300' },
    { id: 'I', label: 'I (Info)', countKey: 'I', color: 'hover:text-emerald-300 text-emerald-400', badgeColor: 'bg-emerald-950 border border-emerald-800 text-emerald-300' },
    { id: 'D', label: 'D (Debug)', countKey: 'D', color: 'hover:text-purple-300 text-purple-400', badgeColor: 'bg-purple-950 border border-purple-800 text-purple-300' },
    { id: 'PANIC', label: 'Guru / Panic', countKey: 'PANIC', color: 'hover:text-rose-300 text-rose-400', badgeColor: 'bg-rose-950 border border-rose-800 text-rose-300' },
    { id: 'BOOT', label: 'rst / Boot', countKey: 'BOOT', color: 'hover:text-indigo-300 text-indigo-400', badgeColor: 'bg-indigo-950 border border-indigo-800 text-indigo-300' },
  ];

  return (
    <div className="border-b border-neutral-800 bg-neutral-900/70 p-3 space-y-2.5">
      {/* Top row: Filter Tabs & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Level Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
          {levelTabs.map((tab) => {
            const count = tab.countKey === 'ALL' ? totalLogs : (levelCounts[tab.countKey] || 0);
            const isSelected = currentLevel === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onLevelChange(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                  isSelected
                    ? 'bg-neutral-800 text-white border border-neutral-600 shadow-sm'
                    : `text-neutral-400 bg-neutral-950/60 border border-neutral-800/80 ${tab.color}`
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${tab.badgeColor}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          {/* Auto-scroll toggle */}
          <button
            onClick={onToggleAutoScroll}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all border ${
              autoScroll
                ? 'bg-cyan-950/80 border-cyan-800 text-cyan-300'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title="新着ログ受信時に自動スクロール"
          >
            <ArrowDownToLine className={`w-3.5 h-3.5 ${autoScroll ? 'animate-bounce' : ''}`} />
            <span>オートスクロール: {autoScroll ? 'ON' : 'OFF'}</span>
          </button>

          {/* Auto AI Analyze on Error toggle */}
          <button
            onClick={onToggleAutoAiAnalyze}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all border ${
              autoAiAnalyze
                ? 'bg-purple-950/80 border-purple-800 text-purple-300 shadow-sm shadow-purple-900/30'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title="エラー発生時にGeminiで自動的に診断を実行"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI自動解析: {autoAiAnalyze ? 'ON' : 'OFF'}</span>
          </button>

          {/* Export logs */}
          <button
            onClick={onExport}
            disabled={totalLogs === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-all"
            title="ログをテキストファイルとしてダウンロード"
          >
            <Download className="w-3.5 h-3.5" />
            <span>保存</span>
          </button>

          {/* Clear logs */}
          <button
            onClick={onClear}
            disabled={totalLogs === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 transition-all"
            title="現在のログ表示を消去"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>消去</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Search & Tag Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="メッセージやタグ、エラー内容を検索..."
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg pl-8 pr-7 py-1 text-xs font-mono text-neutral-200 placeholder-neutral-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tag Filter Dropdown / Selector */}
        <div className="relative">
          <button
            onClick={() => setShowTagDropdown(!showTagDropdown)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${
              selectedTag
                ? 'bg-cyan-950/80 border-cyan-800 text-cyan-300'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Tag className="w-3 h-3 text-cyan-400" />
            <span>タグ: {selectedTag ? selectedTag : '全て'}</span>
          </button>

          {showTagDropdown && (
            <div
              className="absolute left-0 mt-1 w-52 max-h-60 overflow-y-auto bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-1.5 z-40 text-xs font-mono"
            >
              <div className="px-2 py-1 text-[11px] text-neutral-400 font-semibold border-b border-neutral-800 flex justify-between items-center">
                <span>タグで絞り込み</span>
                {selectedTag && (
                  <button
                    onClick={() => {
                      onTagChange(null);
                      setShowTagDropdown(false);
                    }}
                    className="text-cyan-400 hover:underline"
                  >
                    解除
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  onTagChange(null);
                  setShowTagDropdown(false);
                }}
                className={`w-full text-left px-2 py-1.5 rounded-md hover:bg-neutral-800 transition-colors ${
                  !selectedTag ? 'text-cyan-400 font-bold bg-neutral-800/50' : 'text-neutral-300'
                }`}
              >
                すべてのタグを表示
              </button>
              {availableTags.length === 0 ? (
                <div className="px-2 py-2 text-neutral-500 text-[11px]">タグが検出されていません</div>
              ) : (
                availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      onTagChange(tag);
                      setShowTagDropdown(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-md hover:bg-neutral-800 transition-colors truncate ${
                      selectedTag === tag ? 'text-cyan-400 font-bold bg-neutral-800/50' : 'text-neutral-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected Tag Clear Badge */}
        {selectedTag && (
          <div className="flex items-center gap-1 bg-cyan-950/80 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded text-xs font-mono">
            <span>#{selectedTag}</span>
            <button
              onClick={() => onTagChange(null)}
              className="hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Count Stats */}
        <div className="text-[11px] font-mono text-neutral-500 ml-auto flex items-center gap-1">
          <span>表示:</span>
          <span className="text-neutral-300 font-semibold">{filteredCount}</span>
          <span>/</span>
          <span>{totalLogs} 行</span>
        </div>
      </div>
    </div>
  );
};
