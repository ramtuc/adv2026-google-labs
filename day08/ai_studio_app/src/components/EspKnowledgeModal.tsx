import React, { useState } from 'react';
import { X, BookOpen, AlertCircle, RefreshCw, Cpu, CheckCircle2, Search, ExternalLink } from 'lucide-react';
import { ESP_RESET_REASONS, GURU_MEDITATION_CAUSES } from '../utils/espLogParser';

interface EspKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EspKnowledgeModal: React.FC<EspKnowledgeModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'guru' | 'reset' | 'dtr_rts'>('guru');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl font-mono text-xs overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">ESP32-S3 ログ＆エラー リファレンスガイド</h2>
              <p className="text-[11px] text-neutral-400">ESP-IDFのエラーコード、Guru Meditation例外、リセット要因の解説</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('guru')}
            className={`px-3 py-2 border-b-2 font-semibold transition-all ${
              activeTab === 'guru'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Guru Meditation Error (CPUパニック)
          </button>
          <button
            onClick={() => setActiveTab('reset')}
            className={`px-3 py-2 border-b-2 font-semibold transition-all ${
              activeTab === 'reset'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            リセット要因 (rst:0x...)
          </button>
          <button
            onClick={() => setActiveTab('dtr_rts')}
            className={`px-3 py-2 border-b-2 font-semibold transition-all ${
              activeTab === 'dtr_rts'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            DTR / RTS 再起動の仕組み
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'guru' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 leading-relaxed font-sans text-xs">
                <span className="font-bold text-white font-mono">Guru Meditation Error</span> とは、CPU（Xtensa / RISC-V）が回復不能なハードウェア例外や未処理の割り込みを検出したときに発生するシステムパニックです。
              </div>

              <div className="grid gap-2.5">
                {Object.entries(GURU_MEDITATION_CAUSES).map(([cause, desc]) => (
                  <div key={cause} className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 hover:border-neutral-700 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-rose-400 font-mono">{cause}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800">
                        CPU Panic
                      </span>
                    </div>
                    <p className="text-neutral-300 font-sans leading-relaxed">{desc}</p>
                    <div className="mt-2 pt-2 border-t border-neutral-850 text-[11px] text-neutral-400 font-sans">
                      <span className="text-cyan-400 font-semibold font-mono">対策: </span>
                      {cause === 'LoadProhibited' && 'ポインタがNULLまたは不正アドレスでないか確認。ポインタ使用前に if (ptr != NULL) ガードを入れる。'}
                      {cause === 'StoreProhibited' && '書き込み先アドレスがRAM領域であるか、constポインタへキャストして代入していないか確認。'}
                      {cause === 'Stack canary watchpoint got triggered' && 'xTaskCreateのスタックサイズ (usStackDepth) を増やす。menuconfigで CONFIG_ESP_MAIN_TASK_STACK_SIZE を見直し。'}
                      {cause === 'Interrupt wdt timeout' && 'ISRハンドラ内で printf や vTaskDelay、重いループを実行しない。FreeRTOSキューの xQueueSendFromISR を利用する。'}
                      {cause === 'InstrFetchProhibited' && '関数ポインタの初期化忘れ、またはスタック破壊によるリターンアドレスの不正上書きを検証。'}
                      {cause === 'IntegerDivideByZero' && '除数が0でないか除算前にチェック。'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reset' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 leading-relaxed font-sans text-xs">
                ブートローダ起動時に出力される <code className="text-indigo-400 font-mono">rst:0x...</code> は前回の停止・再起動理由を示します。
              </div>

              <div className="grid gap-2.5">
                {Object.entries(ESP_RESET_REASONS).map(([code, info]) => (
                  <div key={code} className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-start gap-3">
                    <div className="font-mono text-xs font-bold text-indigo-400 w-12 shrink-0 pt-0.5">
                      rst:{code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-white font-mono">{info.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          info.severity === 'error'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : info.severity === 'warning'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}>
                          {info.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-neutral-400 font-sans text-[11px] leading-relaxed">{info.desc}</p>
                      {code === '0xf' && (
                        <p className="text-amber-300 font-sans text-[11px] mt-1 bg-amber-950/40 p-1.5 rounded border border-amber-900/60">
                          ⚡ 対策: WiFiやBluetoothの送信開始時に突入電流で3.3Vが低下しています。USBケーブルを高品位なものに交換、または3.3V-GND間に100µF〜470µFの電解コンデンサを追加してください。
                        </p>
                      )}
                      {code === '0x7' && (
                        <p className="text-red-300 font-sans text-[11px] mt-1 bg-red-950/40 p-1.5 rounded border border-red-900/60">
                          ⚠️ 対策: タスクの優先度が高く、ループ内に vTaskDelay() やブロッキング待機がありません。ループ内に vTaskDelay(1) を追加してIDLEタスクにCPU時間を譲渡してください。
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'dtr_rts' && (
            <div className="space-y-4 font-sans text-xs text-neutral-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <h4 className="font-bold text-cyan-400 font-mono text-sm">ESP32 オートリセット回路 (Auto-Reset Circuit)</h4>
                <p>
                  ESP32の多くの開発ボード (DevKitC, NodeMCU, M5Stack等) には、USBシリアル変換IC (CP2102, CH340, FTDI, またはESP32-S3内蔵USB CDC) の <strong>DTR</strong> と <strong>RTS</strong> 信号に接続された2石トランジスタ回路が搭載されています。
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-3 font-mono text-[11px]">
                <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-1.5">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> 通常再起動 (Normal Reset)
                  </span>
                  <p className="text-neutral-400 font-sans">
                    RTS=1 (True), DTR=0 (False) に設定すると、トランジスタを通じて ESP32 の <strong>EN (CHIP_PU)</strong> ピンが GND に引き下げられます。120ms後に RTS=0 に戻すことでチップが再起動します。
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-1.5">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-amber-400" /> ROMブートローダ (Download Mode)
                  </span>
                  <p className="text-neutral-400 font-sans">
                    <strong>GPIO0 (DTR)</strong> を LOW に保ったまま <strong>EN (RTS)</strong> を立ち上げることで、ESP32はファームウェア書き込み待機状態 (Download Boot Mode) で起動します。
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/60 text-cyan-200">
                本アプリ上部の「再起動 (Reset)」ボタンを押すと、ブラウザから Web Serial API の <code className="bg-cyan-950 border border-cyan-800 px-1 py-0.5 rounded font-mono">port.setSignals({'{ dataTerminalReady, requestToSend }'})</code> を直接制御し、実機の物理ボタンを押さずにワンクリックで再起動できます。
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500">
            Powered by Espressif ESP-IDF & Google Gemini 3.8 Flash
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
