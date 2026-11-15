import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  BookOpen,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music,
  RefreshCw,
} from 'lucide-react';
import type { StoryBook } from '../types/storybook';
import {
  extractBase64FromDataUrl,
  generateBookBgm,
  generatePageIllustration,
  generatePageNarration,
} from '../lib/api';

interface BookReaderProps {
  book: StoryBook;
  onUpdateBook: (updated: StoryBook) => void;
  onBackToStudio: () => void;
}

export function BookReader({ book, onUpdateBook, onBackToStudio }: BookReaderProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'spread' | 'overview'>('spread');

  // Audio playback state
  const [isAutoReading, setIsAutoReading] = useState(false);
  const [isNarrationPlaying, setIsNarrationPlaying] = useState(false);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [isBgmMuted, setIsBgmMuted] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.45);

  // Regeneration loading flags
  const [regeneratingImagePage, setRegeneratingImagePage] = useState<number | null>(null);
  const [regeneratingAudioPage, setRegeneratingAudioPage] = useState<number | null>(null);
  const [isRegeneratingBgm, setIsRegeneratingBgm] = useState(false);

  const narrationAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const autoReadTimerRef = useRef<number | null>(null);

  const currentPage = book.pages[pageIndex];

  const clearAutoReadTimer = useCallback(() => {
    if (autoReadTimerRef.current !== null) {
      window.clearTimeout(autoReadTimerRef.current);
      autoReadTimerRef.current = null;
    }
  }, []);

  // Smart audio ducking: gently lower BGM while narration voice is speaking
  useEffect(() => {
    const bgmEl = bgmAudioRef.current;
    if (!bgmEl) return;
    if (isBgmMuted) {
      bgmEl.volume = 0;
    } else {
      bgmEl.volume = isNarrationPlaying ? bgmVolume * 0.22 : bgmVolume;
    }
  }, [bgmVolume, isBgmMuted, isNarrationPlaying]);

  // Attempt starting BGM when book loads or BGM URL updates
  useEffect(() => {
    const bgmEl = bgmAudioRef.current;
    if (!bgmEl || !book.bgmDataUrl) return;
    bgmEl.src = book.bgmDataUrl;
    bgmEl.loop = true;
    bgmEl.volume = isBgmMuted ? 0 : bgmVolume;
    bgmEl
      .play()
      .then(() => {
        setIsBgmPlaying(true);
      })
      .catch(() => {
        setIsBgmPlaying(false);
      });

    return () => {
      bgmEl.pause();
    };
  }, [book.id, book.bgmDataUrl]);

  // Cleanup timers and audio on unmount
  useEffect(() => {
    return () => {
      clearAutoReadTimer();
      narrationAudioRef.current?.pause();
      bgmAudioRef.current?.pause();
    };
  }, [clearAutoReadTimer]);

  const ensureBgmStarted = useCallback(() => {
    const bgmEl = bgmAudioRef.current;
    if (!bgmEl || !book.bgmDataUrl || isBgmMuted) return;
    if (bgmEl.paused) {
      bgmEl
        .play()
        .then(() => setIsBgmPlaying(true))
        .catch(() => {});
    }
  }, [book.bgmDataUrl, isBgmMuted]);

  const playNarrationForPage = useCallback(
    (targetIdx: number) => {
      const targetPage = book.pages[targetIdx];
      const audioEl = narrationAudioRef.current;
      if (!audioEl || !targetPage?.narrationDataUrl) return;

      clearAutoReadTimer();
      ensureBgmStarted();

      audioEl.pause();
      audioEl.src = targetPage.narrationDataUrl;
      audioEl.currentTime = 0;
      audioEl
        .play()
        .then(() => {
          setIsNarrationPlaying(true);
        })
        .catch(() => {
          setIsNarrationPlaying(false);
        });
    },
    [book.pages, clearAutoReadTimer, ensureBgmStarted]
  );

  const stopNarration = useCallback(() => {
    clearAutoReadTimer();
    const audioEl = narrationAudioRef.current;
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
    }
    setIsNarrationPlaying(false);
  }, [clearAutoReadTimer]);

  const goToPage = useCallback(
    (nextIdx: number, shouldPlayNarration = false) => {
      const clamped = Math.max(0, Math.min(3, nextIdx));
      stopNarration();
      setPageIndex(clamped);
      setViewMode('spread');
      if (shouldPlayNarration) {
        window.setTimeout(() => {
          playNarrationForPage(clamped);
        }, 120);
      }
    },
    [playNarrationForPage, stopNarration]
  );

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'spread') return;
      if (e.key === 'ArrowRight' && pageIndex < 3) {
        setIsAutoReading(false);
        goToPage(pageIndex + 1);
      } else if (e.key === 'ArrowLeft' && pageIndex > 0) {
        setIsAutoReading(false);
        goToPage(pageIndex - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goToPage, pageIndex, viewMode]);

  const handleToggleAutoRead = () => {
    if (isAutoReading) {
      setIsAutoReading(false);
      stopNarration();
      return;
    }
    setViewMode('spread');
    setIsAutoReading(true);
    ensureBgmStarted();
    playNarrationForPage(pageIndex);
  };

  const handleToggleSinglePageNarration = () => {
    setIsAutoReading(false);
    if (isNarrationPlaying) {
      stopNarration();
    } else {
      playNarrationForPage(pageIndex);
    }
  };

  const handleNarrationEnded = () => {
    setIsNarrationPlaying(false);
    if (isAutoReading) {
      if (pageIndex < 3) {
        autoReadTimerRef.current = window.setTimeout(() => {
          const next = pageIndex + 1;
          setPageIndex(next);
          playNarrationForPage(next);
        }, 1100);
      } else {
        setIsAutoReading(false);
      }
    }
  };

  const handleToggleBgm = () => {
    const bgmEl = bgmAudioRef.current;
    if (!bgmEl || !book.bgmDataUrl) return;
    if (isBgmMuted || bgmEl.paused) {
      setIsBgmMuted(false);
      bgmEl.volume = isNarrationPlaying ? bgmVolume * 0.22 : bgmVolume;
      bgmEl
        .play()
        .then(() => setIsBgmPlaying(true))
        .catch(() => {});
    } else {
      bgmEl.pause();
      setIsBgmPlaying(false);
    }
  };

  const handleRegeneratePageImage = async (targetPageNumber: number) => {
    if (regeneratingImagePage !== null) return;
    setRegeneratingImagePage(targetPageNumber);
    try {
      const targetPage = book.pages.find((p) => p.pageNumber === targetPageNumber);
      if (!targetPage) return;

      const anchorPage = book.pages[0];
      const anchorMeta =
        targetPageNumber > 1
          ? anchorPage.imageBase64
            ? { base64: anchorPage.imageBase64, mimeType: anchorPage.imageMimeType }
            : extractBase64FromDataUrl(anchorPage.imageDataUrl)
          : {};

      const result = await generatePageIllustration({
        pageNumber: targetPage.pageNumber,
        protagonistVisualSpec: book.protagonistVisualSpec,
        artStyle: book.artStyle,
        scenePrompt: targetPage.scenePrompt,
        characterPose: targetPage.characterPose,
        referenceImageBase64: anchorMeta.base64,
        referenceImageMimeType: anchorMeta.mimeType,
      });

      const updated: StoryBook = {
        ...book,
        pages: book.pages.map((p) =>
          p.pageNumber === targetPageNumber
            ? {
                ...p,
                imageDataUrl: result.imageDataUrl,
                imageBase64: result.base64Data,
                imageMimeType: result.mimeType,
                imageError: undefined,
              }
            : p
        ),
      };
      onUpdateBook(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : '挿絵の再生成に失敗しました。';
      const updated: StoryBook = {
        ...book,
        pages: book.pages.map((p) =>
          p.pageNumber === targetPageNumber ? { ...p, imageError: message } : p
        ),
      };
      onUpdateBook(updated);
    } finally {
      setRegeneratingImagePage(null);
    }
  };

  const handleRegeneratePageAudio = async (targetPageNumber: number) => {
    if (regeneratingAudioPage !== null) return;
    setRegeneratingAudioPage(targetPageNumber);
    try {
      const targetPage = book.pages.find((p) => p.pageNumber === targetPageNumber);
      if (!targetPage) return;

      const result = await generatePageNarration({
        text: targetPage.text,
        voiceName: book.voiceName,
        style: book.voiceStyle,
      });

      const updated: StoryBook = {
        ...book,
        pages: book.pages.map((p) =>
          p.pageNumber === targetPageNumber
            ? {
                ...p,
                narrationDataUrl: result.audioDataUrl,
                narrationError: undefined,
              }
            : p
        ),
      };
      onUpdateBook(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : '音声の再生成に失敗しました。';
      const updated: StoryBook = {
        ...book,
        pages: book.pages.map((p) =>
          p.pageNumber === targetPageNumber ? { ...p, narrationError: message } : p
        ),
      };
      onUpdateBook(updated);
    } finally {
      setRegeneratingAudioPage(null);
    }
  };

  const handleRegenerateBgm = async () => {
    if (isRegeneratingBgm) return;
    setIsRegeneratingBgm(true);
    try {
      const anchorPage = book.pages[0];
      const anchorMeta = anchorPage.imageBase64
        ? { base64: anchorPage.imageBase64, mimeType: anchorPage.imageMimeType }
        : extractBase64FromDataUrl(anchorPage.imageDataUrl);

      const result = await generateBookBgm({
        bgmPrompt: book.bgmPrompt,
        referenceImageBase64: anchorMeta.base64,
        referenceImageMimeType: anchorMeta.mimeType,
      });

      onUpdateBook({
        ...book,
        bgmDataUrl: result.audioDataUrl,
        bgmError: undefined,
      });
    } catch (err) {
      onUpdateBook({
        ...book,
        bgmError: err instanceof Error ? err.message : 'BGMの再生成に失敗しました。',
      });
    } finally {
      setIsRegeneratingBgm(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <audio
        ref={narrationAudioRef}
        onEnded={handleNarrationEnded}
        onPause={() => setIsNarrationPlaying(false)}
        className="hidden"
      />
      <audio ref={bgmAudioRef} className="hidden" />

      {/* Reader Workspace Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setIsAutoReading(false);
              stopNarration();
              bgmAudioRef.current?.pause();
              onBackToStudio();
            }}
            className="cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            ほんだなへ
          </button>

          <div>
            <h1 className="font-serif text-xl font-bold text-slate-900 sm:text-2xl">
              {book.title}
            </h1>
            <p className="text-xs text-slate-500">
              主人公：{book.protagonistName} · 全4ページ · テーマ「{book.theme}」
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* BGM controls */}
          {book.bgmDataUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
              <button
                type="button"
                onClick={handleToggleBgm}
                className="cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-700 hover:text-teal-800"
              >
                {isBgmPlaying && !isBgmMuted ? (
                  <Music className="h-3.5 w-3.5 text-teal-700" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5 text-slate-400" />
                )}
                <span>{isBgmPlaying && !isBgmMuted ? 'BGM 再生中' : 'BGM 停止中'}</span>
              </button>
              <label className="flex items-center gap-2 border-l border-slate-200 pl-3 text-xs text-slate-500">
                <span className="whitespace-nowrap">音量</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(bgmVolume * 100)}
                  onChange={(e) => {
                    const next = Number(e.target.value) / 100;
                    setBgmVolume(next);
                    if (next > 0 && isBgmMuted) setIsBgmMuted(false);
                  }}
                  aria-label="BGMの音量"
                  className="h-1.5 w-20 cursor-pointer accent-teal-700"
                />
                <span className="w-8 tabular-nums text-right text-slate-700">
                  {Math.round(bgmVolume * 100)}%
                </span>
              </label>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRegenerateBgm}
              disabled={isRegeneratingBgm}
              className="cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRegeneratingBgm ? 'animate-spin' : ''}`} />
              {isRegeneratingBgm ? 'BGM作曲中…' : 'BGMをつくり直す'}
            </button>
          )}

          {/* View mode segmented switch */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode('spread')}
              className={`cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'spread'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              みひらき
            </button>
            <button
              type="button"
              onClick={() => setViewMode('overview')}
              className={`cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'overview'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              4ページいちらん
            </button>
          </div>

          {/* Primary Auto-Read CTA */}
          <button
            type="button"
            onClick={handleToggleAutoRead}
            className="cursor-pointer inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            {isAutoReading ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isAutoReading ? 'よみきかせを一時停止' : '自動よみきかせ'}
          </button>
        </div>
      </div>

      {/* Main Reader Stage */}
      {viewMode === 'spread' ? (
        <section className="mt-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white book-spread-shadow">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Left Page: Illustration */}
              <div className="relative bg-slate-50 lg:col-span-7">
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  {currentPage.imageDataUrl ? (
                    <img
                      src={currentPage.imageDataUrl}
                      alt={`${book.title} ${currentPage.pageNumber}ページ目の挿絵`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center">
                      <p className="text-sm font-medium text-slate-700">
                        {currentPage.imageError || '挿絵を読み込めませんでした'}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRegeneratePageImage(currentPage.pageNumber)}
                        disabled={regeneratingImagePage === currentPage.pageNumber}
                        className="mt-4 cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-60"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${
                            regeneratingImagePage === currentPage.pageNumber ? 'animate-spin' : ''
                          }`}
                        />
                        挿絵をつくる
                      </button>
                    </div>
                  )}

                  {regeneratingImagePage === currentPage.pageNumber && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs">
                      <RefreshCw className="h-7 w-7 animate-spin text-teal-700" />
                      <p className="mt-2 text-xs font-bold text-slate-800">
                        同じ主人公で挿絵を描き直しています…
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Page: Japanese Storybook Text & Narration */}
              <div className="relative flex flex-col justify-between border-t border-slate-200 bg-white p-7 sm:p-10 lg:col-span-5 lg:border-t-0 lg:border-l">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="tabular-nums font-medium">
                    {currentPage.pageNumber} / 4 ページ
                  </span>
                  {currentPage.pageNumber === 4 && (
                    <span className="font-serif text-slate-600">おしまい</span>
                  )}
                </div>

                <div className="my-8 flex-1 flex items-center">
                  <p className="text-xl font-medium leading-[2.15] tracking-wide text-slate-900 sm:text-[22px]">
                    {currentPage.text}
                  </p>
                </div>

                <div className="space-y-4 border-t border-slate-100 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {currentPage.narrationDataUrl ? (
                      <button
                        type="button"
                        onClick={handleToggleSinglePageNarration}
                        className={`cursor-pointer inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                          isNarrationPlaying
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {isNarrationPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                        {isNarrationPlaying ? 'よみあげを止める' : 'このページをよむ'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRegeneratePageAudio(currentPage.pageNumber)}
                        disabled={regeneratingAudioPage === currentPage.pageNumber}
                        className="cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${
                            regeneratingAudioPage === currentPage.pageNumber ? 'animate-spin' : ''
                          }`}
                        />
                        {regeneratingAudioPage === currentPage.pageNumber
                          ? '音声を作成中…'
                          : '音声をつくり直す'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRegeneratePageImage(currentPage.pageNumber)}
                      disabled={regeneratingImagePage !== null}
                      className="cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${
                          regeneratingImagePage === currentPage.pageNumber ? 'animate-spin' : ''
                        }`}
                      />
                      この絵を描き直す
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page Turning Controls */}
          <div className="mt-6 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                setIsAutoReading(false);
                goToPage(pageIndex - 1);
              }}
              disabled={pageIndex === 0}
              className="min-h-[44px] cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              <ChevronLeft className="h-4 w-4" />
              まえのページ
            </button>

            <div className="flex items-center gap-2" role="tablist" aria-label="ページ番号">
              {book.pages.map((p, idx) => (
                <button
                  key={p.pageNumber}
                  type="button"
                  role="tab"
                  aria-selected={idx === pageIndex}
                  onClick={() => {
                    setIsAutoReading(false);
                    goToPage(idx);
                  }}
                  className={`h-10 min-w-[40px] cursor-pointer rounded-lg px-3 tabular-nums text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                    idx === pageIndex
                      ? 'bg-teal-700 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p.pageNumber}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsAutoReading(false);
                goToPage(pageIndex + 1);
              }}
              disabled={pageIndex === 3}
              className="min-h-[44px] cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              つぎのページ
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      ) : (
        /* 4-Page Overview Grid */
        <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {book.pages.map((p, idx) => (
            <div
              key={p.pageNumber}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white book-spread-shadow"
            >
              <button
                type="button"
                onClick={() => goToPage(idx)}
                className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-slate-100 text-left"
              >
                {p.imageDataUrl ? (
                  <img
                    src={p.imageDataUrl}
                    alt={`${p.pageNumber}ページ目`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                    挿絵がありません
                  </div>
                )}
              </button>

              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="tabular-nums font-bold text-teal-800">
                      {p.pageNumber} ページ目
                    </span>
                    <button
                      type="button"
                      onClick={() => goToPage(idx, true)}
                      className="cursor-pointer inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-teal-800"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      ここからよむ
                    </button>
                  </div>
                  <p className="mt-2.5 text-base leading-relaxed text-slate-900">{p.text}</p>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Colophon & Consistency Metadata */}
      <footer className="mt-10 flex flex-col justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
        <div>
          <span className="font-bold text-slate-700">主人公の設定：</span>
          <span>{book.protagonistSummaryJp}</span>
        </div>
        <div className="flex items-center gap-4">
          {book.bgmDataUrl && (
            <button
              type="button"
              onClick={handleRegenerateBgm}
              disabled={isRegeneratingBgm}
              className="cursor-pointer inline-flex items-center gap-1 whitespace-nowrap text-slate-500 hover:text-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${isRegeneratingBgm ? 'animate-spin' : ''}`} />
              {isRegeneratingBgm ? 'BGMをつくり直しています…' : 'BGMをつくり直す'}
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}
