import type {
  GenerationProgress,
  NarratorVoice,
  StoryBook,
  StoryPage,
  StoryTone,
} from '../types/storybook';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `通信エラー (${res.status})`);
  }
  return data as T;
}

interface StoryApiResponse {
  story: {
    title: string;
    subtitle: string;
    protagonistName: string;
    protagonistSummaryJp: string;
    protagonistVisualSpec: string;
    artStyle: string;
    bgmPrompt: string;
    voiceStyle: string;
    pages: Array<{
      pageNumber: number;
      text: string;
      scenePrompt: string;
      characterPose: string;
    }>;
  };
}

interface IllustrateApiResponse {
  imageDataUrl: string;
  base64Data: string;
  mimeType: string;
}

interface NarrationApiResponse {
  audioDataUrl: string;
}

interface BgmApiResponse {
  audioDataUrl: string;
}

export async function generatePageIllustration(params: {
  pageNumber: number;
  protagonistVisualSpec: string;
  artStyle: string;
  scenePrompt: string;
  characterPose: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
}): Promise<IllustrateApiResponse> {
  return postJson<IllustrateApiResponse>('/api/storybook/illustrate', params);
}

export async function generatePageNarration(params: {
  text: string;
  voiceName: NarratorVoice;
  style?: string;
}): Promise<NarrationApiResponse> {
  return postJson<NarrationApiResponse>('/api/storybook/narration', params);
}

export async function generateBookBgm(params: {
  bgmPrompt: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
}): Promise<BgmApiResponse> {
  return postJson<BgmApiResponse>('/api/storybook/bgm', params);
}

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (index < tasks.length) {
      const current = index++;
      await tasks[current]();
    }
  });
  await Promise.all(workers);
}

export async function createCompleteStorybook(params: {
  theme: string;
  tone: StoryTone;
  voiceName: NarratorVoice;
  onProgress: (progress: GenerationProgress) => void;
}): Promise<StoryBook> {
  const { theme, tone, voiceName, onProgress } = params;

  // Total tasks: 1 story + 4 illustrations + 4 narrations + 1 BGM = 10
  const totalTasks = 10;
  let completedTasks = 0;

  const state: GenerationProgress = {
    stepStory: 'active',
    stepAnchor: 'pending',
    stepPages: 'pending',
    stepAudio: 'pending',
    stepBgm: 'pending',
    completedTasks,
    totalTasks,
    statusMessage: 'テーマから4ページのおはなしを執筆しています…',
  };

  const emit = (patch: Partial<GenerationProgress>) => {
    Object.assign(state, patch);
    onProgress({
      ...state,
      partialBook: state.partialBook
        ? {
            ...state.partialBook,
            pages: state.partialBook.pages ? state.partialBook.pages.map((p) => ({ ...p })) : undefined,
          }
        : undefined,
    });
  };

  emit({});

  // Step 1: Story generation
  const { story } = await postJson<StoryApiResponse>('/api/storybook/story', {
    theme,
    tone,
  });

  completedTasks += 1;

  const book: StoryBook = {
    id: `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    theme,
    tone,
    voiceName,
    title: story.title,
    subtitle: story.subtitle,
    protagonistName: story.protagonistName,
    protagonistSummaryJp: story.protagonistSummaryJp,
    protagonistVisualSpec: story.protagonistVisualSpec,
    artStyle: story.artStyle,
    bgmPrompt: story.bgmPrompt,
    voiceStyle: story.voiceStyle,
    pages: story.pages.map((p) => ({
      pageNumber: p.pageNumber,
      text: p.text,
      scenePrompt: p.scenePrompt,
      characterPose: p.characterPose,
    })),
  };

  emit({
    stepStory: 'done',
    stepAnchor: 'active',
    completedTasks,
    partialBook: book,
    statusMessage: `主人公「${book.protagonistName}」の姿と1ページ目の挿絵を描いています…`,
  });

  // Step 2: Page 1 illustration (Visual Anchor for protagonist consistency)
  const page1 = book.pages[0];
  try {
    const anchor = await generatePageIllustration({
      pageNumber: 1,
      protagonistVisualSpec: book.protagonistVisualSpec,
      artStyle: book.artStyle,
      scenePrompt: page1.scenePrompt,
      characterPose: page1.characterPose,
    });
    page1.imageDataUrl = anchor.imageDataUrl;
    page1.imageBase64 = anchor.base64Data;
    page1.imageMimeType = anchor.mimeType;
  } catch (err) {
    page1.imageError = err instanceof Error ? err.message : '1ページ目の挿絵生成に失敗しました。';
  }

  completedTasks += 1;
  emit({
    stepAnchor: page1.imageError ? 'error' : 'done',
    stepPages: 'active',
    stepAudio: 'active',
    stepBgm: 'active',
    completedTasks,
    partialBook: book,
    statusMessage: '同じ主人公で2〜4ページ目の挿絵・読み上げ音声・BGMを仕上げています…',
  });

  // Step 3: Remaining pages (using Page 1 as reference anchor), all 4 narrations, and BGM
  let pagesDone = 0;
  let pagesFailed = 0;
  let audioDone = 0;
  let audioFailed = 0;

  const tasks: Array<() => Promise<void>> = [];

  for (const page of book.pages.slice(1)) {
    tasks.push(async () => {
      try {
        const result = await generatePageIllustration({
          pageNumber: page.pageNumber,
          protagonistVisualSpec: book.protagonistVisualSpec,
          artStyle: book.artStyle,
          scenePrompt: page.scenePrompt,
          characterPose: page.characterPose,
          referenceImageBase64: page1.imageBase64,
          referenceImageMimeType: page1.imageMimeType,
        });
        page.imageDataUrl = result.imageDataUrl;
        page.imageBase64 = result.base64Data;
        page.imageMimeType = result.mimeType;
      } catch (err) {
        pagesFailed += 1;
        page.imageError = err instanceof Error ? err.message : '挿絵の生成に失敗しました。';
      } finally {
        pagesDone += 1;
        completedTasks += 1;
        emit({
          completedTasks,
          stepPages: pagesDone === 3 ? (pagesFailed > 0 ? 'error' : 'done') : 'active',
          partialBook: book,
        });
      }
    });
  }

  for (const page of book.pages) {
    tasks.push(async () => {
      try {
        const result = await generatePageNarration({
          text: page.text,
          voiceName,
          style: book.voiceStyle,
        });
        page.narrationDataUrl = result.audioDataUrl;
      } catch (err) {
        audioFailed += 1;
        page.narrationError = err instanceof Error ? err.message : '音声の生成に失敗しました。';
      } finally {
        audioDone += 1;
        completedTasks += 1;
        emit({
          completedTasks,
          stepAudio: audioDone === 4 ? (audioFailed > 0 ? 'error' : 'done') : 'active',
          partialBook: book,
        });
      }
    });
  }

  tasks.push(async () => {
    try {
      const result = await generateBookBgm({
        bgmPrompt: book.bgmPrompt,
        referenceImageBase64: page1.imageBase64,
        referenceImageMimeType: page1.imageMimeType,
      });
      book.bgmDataUrl = result.audioDataUrl;
      completedTasks += 1;
      emit({
        completedTasks,
        stepBgm: 'done',
        partialBook: book,
      });
    } catch (err) {
      book.bgmError = err instanceof Error ? err.message : 'BGMの生成に失敗しました。';
      completedTasks += 1;
      emit({
        completedTasks,
        stepBgm: 'error',
        partialBook: book,
      });
    }
  });

  await runWithConcurrency(tasks, 4);

  emit({
    completedTasks: totalTasks,
    partialBook: book,
    statusMessage: '絵本が完成しました！',
  });

  return book;
}

export function extractBase64FromDataUrl(dataUrl?: string): { base64?: string; mimeType?: string } {
  if (!dataUrl || !dataUrl.startsWith('data:')) return {};
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return {};
  const meta = dataUrl.slice(5, commaIdx);
  const mimeType = meta.split(';')[0] || 'image/png';
  const base64 = dataUrl.slice(commaIdx + 1);
  return { base64, mimeType };
}

export function getPagePagesSummary(pages: StoryPage[]): string {
  const readyImages = pages.filter((p) => Boolean(p.imageDataUrl)).length;
  const readyAudio = pages.filter((p) => Boolean(p.narrationDataUrl)).length;
  return `挿絵 ${readyImages}/4 · 音声 ${readyAudio}/4`;
}
