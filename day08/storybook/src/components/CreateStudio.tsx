import { useState, type FormEvent, type RefObject } from 'react';
import { BookOpen, Trash2, Volume2, Music, Image as ImageIcon, Feather } from 'lucide-react';
import heroBookImg from '../assets/images/hero_storybook_desk_1794624491597.jpg';
import type { NarratorVoice, StoryBook, StoryTone } from '../types/storybook';

interface CreateStudioProps {
  theme: string;
  onThemeChange: (value: string) => void;
  tone: StoryTone;
  onToneChange: (value: StoryTone) => void;
  voiceName: NarratorVoice;
  onVoiceChange: (value: NarratorVoice) => void;
  onSubmit: () => void;
  errorMessage: string | null;
  bookshelf: StoryBook[];
  onOpenBook: (book: StoryBook) => void;
  onDeleteBook: (id: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

const EXAMPLE_THEMES = [
  'そらをとぶクジラ',
  'おやすみ前の月のうさぎ',
  '雨の日のあまがえる',
  '森のちいさなパンやさん',
];

const TONE_OPTIONS: Array<{ value: StoryTone; label: string }> = [
  { value: 'gentle', label: 'やさしい' },
  { value: 'adventure', label: 'ぼうけん' },
  { value: 'funny', label: 'ゆかい' },
];

const VOICE_OPTIONS: Array<{ value: NarratorVoice; label: string }> = [
  { value: 'Kore', label: 'おだやかな声' },
  { value: 'Zephyr', label: 'あかるい声' },
  { value: 'Puck', label: 'げんきな声' },
];

const PROCESS_STEPS = [
  {
    number: '01',
    icon: Feather,
    title: 'おはなし執筆',
    description: '一言のテーマから、起承転結のある4ページの子ども向け日本語ストーリーを紡ぎます。',
  },
  {
    number: '02',
    icon: ImageIcon,
    title: '同じ主人公の挿絵',
    description: '1ページ目の主人公の姿を基準に、全4ページを通して同じ見た目・画風で描き分けます。',
  },
  {
    number: '03',
    icon: Volume2,
    title: 'ページの朗読音声',
    description: '選んだ語り手の声で、各ページの文章を子どもに寄り添うやさしいトーンで読み上げます。',
  },
  {
    number: '04',
    icon: Music,
    title: '絵本全体のBGM',
    description: '物語の雰囲気と挿絵の色合いに合わせた、歌詞のないおだやかなオリジナルBGMを付けます。',
  },
];

export function CreateStudio({
  theme,
  onThemeChange,
  tone,
  onToneChange,
  voiceName,
  onVoiceChange,
  onSubmit,
  errorMessage,
  bookshelf,
  onOpenBook,
  onDeleteBook,
  inputRef,
}: CreateStudioProps) {
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (theme.trim()) {
      onSubmit();
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:py-14">
      {/* Creation Hero Split */}
      <section
        id="create-section"
        className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12"
      >
        <div className="flex flex-col justify-between lg:col-span-6">
          <div>
            <p className="text-xs font-medium tracking-wide text-teal-800">
              全4ページ · 挿絵 · 読み上げ音声 · オリジナルBGM
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl [text-wrap:balance]">
              ひとこと入れるだけで、あなただけの4ページの絵本。
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              好きなことばや短いテーマを入力すると、同じ主人公が登場する4枚の挿絵と、ページごとの朗読音声、やさしいBGMつきの絵本ができあがります。
            </p>

            <form onSubmit={handleFormSubmit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="theme-input" className="block text-sm font-bold text-slate-800">
                  絵本のテーマ（ひとこと）
                </label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <input
                    ref={inputRef}
                    id="theme-input"
                    type="text"
                    value={theme}
                    onChange={(e) => onThemeChange(e.target.value)}
                    placeholder="例：そらをとぶクジラ、星をあつめるこねこ"
                    maxLength={60}
                    className="min-h-[48px] flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  />
                  <button
                    type="submit"
                    disabled={!theme.trim()}
                    className="min-h-[48px] cursor-pointer whitespace-nowrap shrink-0 rounded-xl bg-teal-700 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                  >
                    絵本をつくる
                  </button>
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-500">
                  テーマの例からえらぶ
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EXAMPLE_THEMES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => onThemeChange(example)}
                      className={`cursor-pointer whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                        theme === example
                          ? 'border-teal-700 bg-teal-50 text-teal-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
                <div>
                  <span className="block text-xs font-medium text-slate-600">おはなしのふんいき</span>
                  <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                    {TONE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onToneChange(opt.value)}
                        className={`cursor-pointer whitespace-nowrap rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                          tone === opt.value
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-600">よみきかせの声</span>
                  <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                    {VOICE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onVoiceChange(opt.value)}
                        className={`cursor-pointer whitespace-nowrap rounded-md px-2 py-2 text-xs font-medium transition-colors ${
                          voiceName === opt.value
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                >
                  {errorMessage}
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="flex flex-col lg:col-span-6">
          <div className="relative flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white book-spread-shadow">
            {!heroImageFailed ? (
              <img
                src={heroBookImg}
                alt="机の上に開かれた子ども向け絵本と色鉛筆、浮かぶ星々のイラスト"
                referrerPolicy="no-referrer"
                onError={() => setHeroImageFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center bg-slate-100 p-8 text-center">
                <BookOpen className="h-12 w-12 text-teal-700" strokeWidth={1.5} />
                <p className="mt-3 font-serif text-lg font-bold text-slate-800">ことのは絵本工房</p>
                <p className="mt-1 text-xs text-slate-500">4ページの挿絵・朗読・BGMをひとつに</p>
              </div>
            )}
          </div>
          <p className="mt-3 text-right text-xs text-slate-500">
            水彩と色鉛筆のあたたかい画風で、全ページ同じ主人公が登場します
          </p>
        </div>
      </section>

      {/* 4-Step Process Strip */}
      <section id="how-it-works" className="mt-16 border-t border-slate-200 pt-12">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-bold text-slate-900">えほんができるまで</h2>
            <p className="mt-1 text-sm text-slate-600">
              ボタンを押してからおよそ30秒で、絵と声と音楽がそろった1冊が完成します。
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span className="tabular-nums font-bold text-teal-800">{step.number}</span>
                  <Icon className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Saved Bookshelf */}
      <section id="bookshelf-section" className="mt-16 border-t border-slate-200 pt-12">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">みんなのほんだな</h2>
            <p className="mt-1 text-sm text-slate-600">
              これまでに作った絵本はブラウザに保存され、いつでも読み返せます。
            </p>
          </div>
          <span className="tabular-nums text-xs font-medium text-slate-500">
            {bookshelf.length} 冊
          </span>
        </div>

        {bookshelf.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
            <BookOpen className="mx-auto h-9 w-9 text-slate-400" strokeWidth={1.5} />
            <p className="mt-3 text-sm font-medium text-slate-700">
              まだほんだなに絵本がありません。
            </p>
            <p className="mt-1 text-xs text-slate-500">
              上の入力欄に好きなテーマを入れて、最初の1冊を作ってみましょう。
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bookshelf.map((book) => {
              const coverImage = book.pages[0]?.imageDataUrl;
              const dateStr = new Date(book.createdAt).toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric',
              });
              return (
                <article
                  key={book.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => onOpenBook(book)}
                    className="group relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-slate-100 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                  >
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={book.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                        <BookOpen className="h-10 w-10" strokeWidth={1.5} />
                      </div>
                    )}
                  </button>

                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>テーマ：{book.theme}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{dateStr}</span>
                      </div>
                      <h3 className="mt-1.5 font-serif text-lg font-bold text-slate-900">
                        {book.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600">
                        主人公：{book.protagonistName}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => onOpenBook(book)}
                        className="cursor-pointer whitespace-nowrap rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                      >
                        この絵本をよむ
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteBook(book.id)}
                        aria-label={`${book.title}を削除`}
                        className="cursor-pointer rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
