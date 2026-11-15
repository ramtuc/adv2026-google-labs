interface TopBarProps {
  activeView: 'studio' | 'generating' | 'reader';
  hasActiveBook: boolean;
  onNavigateStudio: (sectionId?: string) => void;
  onOpenReader: () => void;
  onStartNewBook: () => void;
}

export function TopBar({
  activeView,
  hasActiveBook,
  onNavigateStudio,
  onOpenReader,
  onStartNewBook,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
        <button
          type="button"
          onClick={() => onNavigateStudio()}
          className="cursor-pointer whitespace-nowrap shrink-0 text-left text-lg font-bold tracking-tight text-slate-900 transition-colors hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
        >
          ことのは絵本工房
        </button>

        <nav
          aria-label="メインナビゲーション"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={() => onNavigateStudio('create-section')}
            className={`cursor-pointer whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 ${
              activeView === 'studio' ? 'text-slate-900 underline decoration-teal-700 decoration-2 underline-offset-8' : ''
            }`}
          >
            絵本をつくる
          </button>
          <button
            type="button"
            onClick={hasActiveBook ? onOpenReader : () => onNavigateStudio('bookshelf-section')}
            className={`cursor-pointer whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 ${
              activeView === 'reader' ? 'text-slate-900 underline decoration-teal-700 decoration-2 underline-offset-8' : ''
            }`}
          >
            よみきかせ
          </button>
          <button
            type="button"
            onClick={() => onNavigateStudio('bookshelf-section')}
            className="cursor-pointer whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
          >
            ほんだな
          </button>
          <button
            type="button"
            onClick={() => onNavigateStudio('how-it-works')}
            className="cursor-pointer whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
          >
            つくりかた
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onStartNewBook}
            className="cursor-pointer whitespace-nowrap shrink-0 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            あたらしい絵本
          </button>
        </div>
      </div>
    </header>
  );
}
