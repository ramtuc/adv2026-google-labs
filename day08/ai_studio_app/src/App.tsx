/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useWebSerial } from './hooks/useWebSerial';
import { parseEspLogLine } from './utils/espLogParser';
import { ParsedLogLine, EspLogLevel } from './types/serial';
import { MOCK_BOOT_SEQUENCE, MockLogEntry } from './utils/mockEspLogs';
import { Header } from './components/Header';
import { LogToolbar } from './components/LogToolbar';
import { LogViewer } from './components/LogViewer';
import { AiDiagnosisPanel } from './components/AiDiagnosisPanel';
import { SerialSendBar } from './components/SerialSendBar';
import { EspKnowledgeModal } from './components/EspKnowledgeModal';

const MAX_LOG_BUFFER = 2500;

export default function App() {
  const [logs, setLogs] = useState<ParsedLogLine[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<EspLogLevel | 'ALL'>('ALL');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [autoAiAnalyze, setAutoAiAnalyze] = useState<boolean>(true);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState<boolean>(false);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Diagnostic State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [analyzedLog, setAnalyzedLog] = useState<ParsedLogLine | null>(null);

  // Demo Simulation State
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const demoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const demoStepRef = useRef<number>(0);
  const lastAutoAnalyzedIdRef = useRef<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Analyze with Gemini
  const handleAnalyzeWithAi = useCallback(
    async (targetLog: ParsedLogLine, customQuestion?: string) => {
      setAnalyzedLog(targetLog);
      setSelectedLogId(targetLog.id);
      setIsAiPanelOpen(true);
      setIsAiLoading(true);
      setAiError(null);

      try {
        // Collect surrounding logs for context (10 prior lines)
        const targetIndex = logs.findIndex((l) => l.id === targetLog.id);
        const contextLines = targetIndex > 0
          ? logs.slice(Math.max(0, targetIndex - 10), targetIndex + 1).map((l) => l.raw)
          : [targetLog.raw];

        let detectedType = 'general';
        if (targetLog.isPanic) detectedType = 'guru_meditation';
        else if (targetLog.isReset) detectedType = 'reset_reason';
        else if (targetLog.isError) detectedType = 'error';
        else if (targetLog.isWarning) detectedType = 'warning';

        const res = await fetch('/api/analyze-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            logLine: targetLog.raw,
            contextLines,
            detectedType,
            customQuestion: customQuestion || '',
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Gemini 解析エラーが発生しました');
        }

        setAiAnalysis(data.analysis);
      } catch (err: any) {
        console.error('Failed to analyze with Gemini:', err);
        setAiError(err.message || 'Gemini サーバーへの接続に失敗しました');
      } finally {
        setIsAiLoading(false);
      }
    },
    [logs]
  );

  // Callback when a raw log line is received from serial or demo
  const handleLineReceived = useCallback(
    (rawLine: string) => {
      setLogs((prev) => {
        const nextIndex = prev.length;
        const parsed = parseEspLogLine(rawLine, nextIndex);
        const newLogs = [...prev, parsed];

        // Cap buffer to avoid memory bloat
        if (newLogs.length > MAX_LOG_BUFFER) {
          newLogs.splice(0, newLogs.length - MAX_LOG_BUFFER);
        }

        // Auto AI Analysis for critical error lines (Guru Meditation, Panic, rst:0xf Brownout, or fatal E)
        if (
          autoAiAnalyze &&
          (parsed.isPanic || parsed.isError || (parsed.isReset && parsed.raw.includes('0xf'))) &&
          lastAutoAnalyzedIdRef.current !== parsed.raw
        ) {
          lastAutoAnalyzedIdRef.current = parsed.raw;
          // Trigger AI analysis asynchronously
          setTimeout(() => {
            handleAnalyzeWithAi(parsed);
          }, 150);
        }

        return newLogs;
      });
    },
    [autoAiAnalyze, handleAnalyzeWithAi]
  );

  // Initialize Web Serial hook
  const {
    isSupported,
    isConnected,
    isConnecting,
    baudRate,
    setBaudRate,
    error: serialError,
    portInfo,
    isResetting,
    connect,
    disconnect,
    resetEsp32,
    sendData,
  } = useWebSerial({
    onLineReceived: handleLineReceived,
    defaultBaudRate: 115200,
  });

  // Handle errors from Web Serial
  useEffect(() => {
    if (serialError) {
      showToast(serialError);
    }
  }, [serialError, showToast]);

  // Demo mode runner
  const stopDemo = useCallback(() => {
    if (demoTimeoutRef.current) {
      clearTimeout(demoTimeoutRef.current);
      demoTimeoutRef.current = null;
    }
    setIsDemoMode(false);
  }, []);

  const runDemoStep = useCallback(() => {
    if (demoStepRef.current >= MOCK_BOOT_SEQUENCE.length) {
      demoStepRef.current = 0; // Loop or hold
    }
    const item: MockLogEntry = MOCK_BOOT_SEQUENCE[demoStepRef.current];
    demoStepRef.current += 1;
    handleLineReceived(item.text);

    demoTimeoutRef.current = setTimeout(() => {
      runDemoStep();
    }, item.delayMs);
  }, [handleLineReceived]);

  const startDemo = useCallback(() => {
    if (isConnected) {
      disconnect();
    }
    setIsDemoMode(true);
    demoStepRef.current = 0;
    showToast('ESP32-S3 デモログのシミュレーション再生を開始しました');
    runDemoStep();
  }, [isConnected, disconnect, showToast, runDemoStep]);

  const toggleDemo = useCallback(() => {
    if (isDemoMode) {
      stopDemo();
      showToast('デモログの再生を停止しました');
    } else {
      startDemo();
    }
  }, [isDemoMode, stopDemo, startDemo, showToast]);

  // Clean up demo timer on unmount
  useEffect(() => {
    return () => {
      if (demoTimeoutRef.current) {
        clearTimeout(demoTimeoutRef.current);
      }
    };
  }, []);

  // Reset ESP32 action
  const handleReset = useCallback(
    async (mode: 'normal' | 'bootloader') => {
      if (isDemoMode) {
        // Reset demo sequence with reset log
        stopDemo();
        showToast(
          mode === 'normal'
            ? '⚡ ESP32 を再起動しました (DTR=0, RTS=1 パルス)'
            : '⚡ ESP32 をROMダウンロードモードで再起動しました (DTR=1, RTS=1)'
        );
        handleLineReceived(
          mode === 'normal'
            ? 'rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)'
            : 'rst:0x1 (POWERON_RESET),boot:0x3 (DOWNLOAD_BOOT(UART/USB))'
        );
        setTimeout(() => {
          startDemo();
        }, 300);
        return;
      }

      if (!isConnected) {
        showToast('ESP32が接続されていません。');
        return;
      }

      try {
        await resetEsp32(mode);
        showToast(
          mode === 'normal'
            ? '⚡ ESP32 を再起動しました (DTR=0, RTS=1 パルス)'
            : '⚡ ESP32 をROMブートローダモードで再起動しました'
        );
      } catch (err: any) {
        showToast(`再起動に失敗しました: ${err?.message || err}`);
      }
    },
    [isDemoMode, isConnected, resetEsp32, stopDemo, startDemo, handleLineReceived, showToast]
  );

  // Clear logs
  const handleClearLogs = useCallback(() => {
    setLogs([]);
    setSelectedLogId(null);
    setAnalyzedLog(null);
    showToast('ログを消去しました');
  }, [showToast]);

  // Export logs as .log file
  const handleExportLogs = useCallback(() => {
    if (logs.length === 0) return;
    const content = logs.map((l) => l.raw).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.href = url;
    link.download = `esp32s3_serial_${dateStr}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('ログファイルをダウンロードしました');
  }, [logs, showToast]);

  // Calculate distinct tags and level counts
  const { availableTags, levelCounts } = useMemo(() => {
    const tags = new Set<string>();
    const counts: Record<string, number> = {
      E: 0,
      W: 0,
      I: 0,
      D: 0,
      V: 0,
      PANIC: 0,
      BOOT: 0,
    };

    logs.forEach((log) => {
      if (log.tag) {
        tags.add(log.tag);
      }
      if (log.isPanic) counts.PANIC = (counts.PANIC || 0) + 1;
      if (log.isReset) counts.BOOT = (counts.BOOT || 0) + 1;
      if (log.level === 'E') counts.E = (counts.E || 0) + 1;
      else if (log.level === 'W') counts.W = (counts.W || 0) + 1;
      else if (log.level === 'I') counts.I = (counts.I || 0) + 1;
      else if (log.level === 'D') counts.D = (counts.D || 0) + 1;
      else if (log.level === 'V') counts.V = (counts.V || 0) + 1;
    });

    return {
      availableTags: Array.from(tags).sort(),
      levelCounts: counts,
    };
  }, [logs]);

  // Filter logs by level, tag, and search query
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Level filter
      if (currentLevel !== 'ALL') {
        if (currentLevel === 'PANIC' && !log.isPanic) return false;
        if (currentLevel === 'BOOT' && !log.isReset) return false;
        if (currentLevel !== 'PANIC' && currentLevel !== 'BOOT' && log.level !== currentLevel) return false;
      }

      // Tag filter
      if (selectedTag && log.tag !== selectedTag) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesMessage = log.message.toLowerCase().includes(query);
        const matchesTag = log.tag ? log.tag.toLowerCase().includes(query) : false;
        const matchesRaw = log.raw.toLowerCase().includes(query);
        const matchesCategory = log.errorCategory ? log.errorCategory.toLowerCase().includes(query) : false;
        if (!matchesMessage && !matchesTag && !matchesRaw && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [logs, currentLevel, selectedTag, searchQuery]);

  // Total error count for badge
  const totalErrorCount = (levelCounts.E || 0) + (levelCounts.PANIC || 0);

  // Context logs for the selected log
  const selectedContextLogs = useMemo(() => {
    if (!analyzedLog) return [];
    const idx = logs.findIndex((l) => l.id === analyzedLog.id);
    if (idx === -1) return [];
    return logs.slice(Math.max(0, idx - 10), idx + 1);
  }, [logs, analyzedLog]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs font-mono px-3.5 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        isSupported={isSupported}
        isConnected={isConnected}
        isConnecting={isConnecting}
        isResetting={isResetting}
        baudRate={baudRate}
        onBaudRateChange={setBaudRate}
        onConnect={() => connect()}
        onDisconnect={disconnect}
        onReset={handleReset}
        isDemoMode={isDemoMode}
        onToggleDemo={toggleDemo}
        onOpenKnowledgeModal={() => setIsKnowledgeModalOpen(true)}
        portInfo={portInfo}
        errorCount={totalErrorCount}
      />

      {/* Main Body with Terminal & AI Inspector Pane */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left / Center Terminal Pane */}
        <div className="flex-1 flex flex-col min-w-0 bg-neutral-950">
          {/* Filtering Toolbar */}
          <LogToolbar
            currentLevel={currentLevel}
            onLevelChange={setCurrentLevel}
            levelCounts={levelCounts}
            selectedTag={selectedTag}
            onTagChange={setSelectedTag}
            availableTags={availableTags}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            autoScroll={autoScroll}
            onToggleAutoScroll={() => setAutoScroll(!autoScroll)}
            autoAiAnalyze={autoAiAnalyze}
            onToggleAutoAiAnalyze={() => setAutoAiAnalyze(!autoAiAnalyze)}
            onClear={handleClearLogs}
            onExport={handleExportLogs}
            totalLogs={logs.length}
            filteredCount={filteredLogs.length}
          />

          {/* Log Stream Viewer */}
          <LogViewer
            logs={filteredLogs}
            selectedLogId={selectedLogId}
            onSelectLog={(log) => {
              setSelectedLogId(log.id);
              setAnalyzedLog(log);
              setIsAiPanelOpen(true);
            }}
            onAnalyzeWithAi={(log) => handleAnalyzeWithAi(log)}
            onTagClick={(tag) => setSelectedTag(tag === selectedTag ? null : tag)}
            autoScroll={autoScroll}
            onTriggerDemo={startDemo}
          />

          {/* Bottom Command Send Bar */}
          <SerialSendBar
            isConnected={isConnected}
            onSend={sendData}
            isDemoMode={isDemoMode}
            onSimulateInput={(cmd) => {
              handleLineReceived(`> ${cmd}`);
              setTimeout(() => {
                if (cmd === 'help') {
                  handleLineReceived('ESP-IDF CLI Commands: help, version, restart, tasks, heap');
                } else if (cmd === 'version') {
                  handleLineReceived('ESP-IDF v5.2.1-dirty (ESP32-S3 dual-core Xtensa LX7)');
                } else if (cmd === 'heap') {
                  handleLineReceived('Free heap: 279,552 bytes, minimum free heap: 48,920 bytes');
                } else if (cmd === 'restart') {
                  handleReset('normal');
                } else {
                  handleLineReceived(`Command not found: ${cmd}`);
                }
              }, 120);
            }}
          />
        </div>

        {/* Right Gemini AI Diagnostic Inspector Panel */}
        {isAiPanelOpen && (
          <AiDiagnosisPanel
            log={analyzedLog}
            contextLogs={selectedContextLogs}
            analysis={aiAnalysis}
            isLoading={isAiLoading}
            error={aiError}
            onClose={() => setIsAiPanelOpen(false)}
            onReanalyze={(targetLog, customQuestion) => handleAnalyzeWithAi(targetLog, customQuestion)}
          />
        )}
      </div>

      {/* Offline Reference Guide Modal */}
      <EspKnowledgeModal
        isOpen={isKnowledgeModalOpen}
        onClose={() => setIsKnowledgeModalOpen(false)}
      />
    </div>
  );
}
