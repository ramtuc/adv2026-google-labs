import React from 'react';
import { Cpu, RefreshCw, Power, Terminal, BookOpen, AlertTriangle, Play, Square, CheckCircle2, ChevronDown } from 'lucide-react';

interface HeaderProps {
  isSupported: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  isResetting: boolean;
  baudRate: number;
  onBaudRateChange: (baud: number) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onReset: (mode: 'normal' | 'bootloader') => void;
  isDemoMode: boolean;
  onToggleDemo: () => void;
  onOpenKnowledgeModal: () => void;
  portInfo: string | null;
  errorCount: number;
}

const BAUD_RATES = [115200, 921600, 460800, 230400, 74880, 57600, 9600];

export const Header: React.FC<HeaderProps> = ({
  isSupported,
  isConnected,
  isConnecting,
  isResetting,
  baudRate,
  onBaudRateChange,
  onConnect,
  onDisconnect,
  onReset,
  isDemoMode,
  onToggleDemo,
  onOpenKnowledgeModal,
  portInfo,
  errorCount,
}) => {
  const [showResetMenu, setShowResetMenu] = React.useState(false);

  return (
    <header className="border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-md px-4 py-3 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Chip ID */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-bold text-base tracking-tight text-white flex items-center gap-2">
                ESP32-S3 <span className="text-cyan-400 font-medium text-xs px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60">Web Serial</span>
              </h1>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  接続中
                </span>
              ) : isDemoMode ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  シミュレーション中
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 bg-neutral-800/80 border border-neutral-700/60 px-2 py-0.5 rounded-full">
                  未接続
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 font-mono flex items-center gap-2">
              <span>{portInfo || 'ESP-IDF Real-time Log & AI Diagnostics'}</span>
              {errorCount > 0 && (
                <span className="text-red-400 bg-red-950/80 border border-red-800/60 px-1.5 py-0.2 rounded text-[10px] font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {errorCount} エラー
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Baud Rate Selector */}
          <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-neutral-400 font-mono">Baud:</span>
            <select
              value={baudRate}
              onChange={(e) => onBaudRateChange(Number(e.target.value))}
              disabled={isConnected}
              className="bg-transparent text-neutral-200 font-mono font-medium focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {BAUD_RATES.map((rate) => (
                <option key={rate} value={rate} className="bg-neutral-900 text-neutral-200">
                  {rate} bps {rate === 115200 ? '(標準)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Connect / Disconnect Button */}
          {isConnected ? (
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700/70 text-red-300 text-xs font-medium font-mono transition-all shadow-sm"
              title="ESP32とのシリアル接続を切断"
            >
              <Power className="w-3.5 h-3.5" />
              切断
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting || !isSupported}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-neutral-800 disabled:text-neutral-500 border border-cyan-500/50 text-white text-xs font-medium font-mono transition-all shadow-md shadow-cyan-900/30 active:scale-95"
              title={!isSupported ? 'ブラウザがWeb Serial APIに対応していません' : 'USB接続したESP32を選択して接続'}
            >
              <Terminal className="w-3.5 h-3.5" />
              {isConnecting ? '接続中...' : 'ESP32を接続'}
            </button>
          )}

          {/* DTR/RTS Reset Button & Dropdown */}
          <div className="relative">
            <div className="inline-flex rounded-lg shadow-sm">
              <button
                onClick={() => onReset('normal')}
                disabled={isResetting || (!isConnected && !isDemoMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg border text-xs font-mono font-medium transition-all ${
                  isResetting
                    ? 'bg-amber-600 text-white border-amber-500 animate-pulse'
                    : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
                title="DTR/RTSを使ってESP32をリセット再起動 (ENピンをGNDにパルス)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                {isResetting ? '再起動中...' : '再起動 (Reset)'}
              </button>
              <button
                onClick={() => setShowResetMenu(!showResetMenu)}
                disabled={!isConnected && !isDemoMode}
                className="px-1.5 py-1.5 rounded-r-lg bg-neutral-800 hover:bg-neutral-700 border-t border-b border-r border-neutral-700 text-neutral-400 hover:text-white text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                title="再起動モード選択 (ブートローダモードなど)"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Reset Submenu */}
            {showResetMenu && (
              <div
                className="absolute right-0 mt-1 w-64 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-1 z-50 text-xs font-mono"
                onClick={() => setShowResetMenu(false)}
              >
                <button
                  onClick={() => onReset('normal')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-800 text-neutral-200 flex flex-col gap-0.5"
                >
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 text-cyan-400" /> 通常再起動 (Normal Reset)
                  </span>
                  <span className="text-[11px] text-neutral-400">RTSでENピンを立ち下げて再起動</span>
                </button>
                <button
                  onClick={() => onReset('bootloader')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-800 text-amber-300 flex flex-col gap-0.5"
                >
                  <span className="font-semibold text-amber-200 flex items-center gap-1.5">
                    <Cpu className="w-3 h-3 text-amber-400" /> ROMブートローダ再起動 (Download)
                  </span>
                  <span className="text-[11px] text-neutral-400">IO0(DTR)=0 + EN(RTS)パルスで書き込み待機状態へ</span>
                </button>
              </div>
            )}
          </div>

          {/* Demo Mode Toggle */}
          <button
            onClick={onToggleDemo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all ${
              isDemoMode
                ? 'bg-amber-950/80 border-amber-600/70 text-amber-300 hover:bg-amber-900'
                : 'bg-neutral-800/80 hover:bg-neutral-700 border-neutral-700 text-neutral-300'
            }`}
            title="ESP32実機が手元にない場合でも動作確認できるデモログを再生"
          >
            {isDemoMode ? <Square className="w-3 h-3 text-amber-400 fill-amber-400" /> : <Play className="w-3 h-3 text-cyan-400 fill-cyan-400" />}
            {isDemoMode ? 'デモ停止' : 'デモログ再生'}
          </button>

          {/* Knowledge Reference Modal */}
          <button
            onClick={onOpenKnowledgeModal}
            className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white transition-colors"
            title="ESP32リセット要因・Guruエラー早見表"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Browser compatibility warning */}
      {!isSupported && (
        <div className="max-w-7xl mx-auto mt-2 text-xs bg-amber-950/70 border border-amber-700/60 text-amber-300 px-3 py-2 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              お使いのブラウザは Web Serial API に対応していません（Chrome、Edge、Opera推奨）。実機接続はできませんが、「デモログ再生」でAI診断や色分け・タグ絞り込みの全機能をお試しいただけます。
            </span>
          </div>
          <button
            onClick={onToggleDemo}
            className="ml-2 px-2.5 py-1 bg-amber-800 hover:bg-amber-700 text-white rounded font-mono text-[11px] shrink-0"
          >
            デモを開始
          </button>
        </div>
      )}
    </header>
  );
};
