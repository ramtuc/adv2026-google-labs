import { useEffect, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { CreateStudio } from './components/CreateStudio';
import { GenerationView } from './components/GenerationView';
import { BookReader } from './components/BookReader';
import { createCompleteStorybook } from './lib/api';
import { deleteBookFromShelf, loadBooksFromShelf, saveBookToShelf } from './lib/storage';
import type { GenerationProgress, NarratorVoice, StoryBook, StoryTone } from './types/storybook';

export default function App() {
  const [view, setView] = useState<'studio' | 'generating' | 'reader'>('studio');
  const [theme, setTheme] = useState('');
  const [tone, setTone] = useState<StoryTone>('gentle');
  const [voiceName, setVoiceName] = useState<NarratorVoice>('Kore');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [bookshelf, setBookshelf] = useState<StoryBook[]>([]);
  const [activeBook, setActiveBook] = useState<StoryBook | null>(null);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);

  const themeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadBooksFromShelf()
      .then((books) => {
        setBookshelf(books);
      })
      .catch((err) => {
        console.error('Failed to load bookshelf:', err);
      });
  }, []);

  const handleNavigateStudio = (sectionId?: string) => {
    setView('studio');
    if (sectionId) {
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStartNewBook = () => {
    setView('studio');
    setErrorMessage(null);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      themeInputRef.current?.focus();
    }, 50);
  };

  const handleCreateBook = async () => {
    const trimmed = theme.trim();
    if (!trimmed) return;

    setErrorMessage(null);
    setView('generating');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const book = await createCompleteStorybook({
        theme: trimmed,
        tone,
        voiceName,
        onProgress: (nextProgress) => {
          setProgress(nextProgress);
        },
      });

      await saveBookToShelf(book);
      setBookshelf((prev) => [book, ...prev.filter((b) => b.id !== book.id)]);
      setActiveBook(book);
      setView('reader');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : '絵本の作成中にエラーが発生しました。もう一度お試しください。';
      setErrorMessage(msg);
      setView('studio');
    }
  };

  const handleOpenBook = (book: StoryBook) => {
    setActiveBook(book);
    setView('reader');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateBook = async (updated: StoryBook) => {
    setActiveBook(updated);
    setBookshelf((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    try {
      await saveBookToShelf(updated);
    } catch (err) {
      console.error('Failed to update saved book:', err);
    }
  };

  const handleDeleteBook = async (id: string) => {
    try {
      await deleteBookFromShelf(id);
      setBookshelf((prev) => prev.filter((b) => b.id !== id));
      if (activeBook?.id === id) {
        setActiveBook(null);
      }
    } catch (err) {
      console.error('Failed to delete book:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <TopBar
        activeView={view}
        hasActiveBook={Boolean(activeBook)}
        onNavigateStudio={handleNavigateStudio}
        onOpenReader={() => {
          if (activeBook) {
            setView('reader');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onStartNewBook={handleStartNewBook}
      />

      {view === 'studio' && (
        <CreateStudio
          theme={theme}
          onThemeChange={setTheme}
          tone={tone}
          onToneChange={setTone}
          voiceName={voiceName}
          onVoiceChange={setVoiceName}
          onSubmit={handleCreateBook}
          errorMessage={errorMessage}
          bookshelf={bookshelf}
          onOpenBook={handleOpenBook}
          onDeleteBook={handleDeleteBook}
          inputRef={themeInputRef}
        />
      )}

      {view === 'generating' && progress && (
        <GenerationView theme={theme} progress={progress} />
      )}

      {view === 'reader' && activeBook && (
        <BookReader
          book={activeBook}
          onUpdateBook={handleUpdateBook}
          onBackToStudio={() => handleNavigateStudio('bookshelf-section')}
        />
      )}
    </div>
  );
}
