export type StoryTone = 'gentle' | 'adventure' | 'funny';

export type NarratorVoice = 'Kore' | 'Zephyr' | 'Puck';

export interface StoryPage {
  pageNumber: number;
  text: string;
  scenePrompt: string;
  characterPose: string;
  imageDataUrl?: string;
  imageBase64?: string;
  imageMimeType?: string;
  imageError?: string;
  narrationDataUrl?: string;
  narrationError?: string;
}

export interface StoryBook {
  id: string;
  createdAt: number;
  theme: string;
  tone: StoryTone;
  voiceName: NarratorVoice;
  title: string;
  subtitle: string;
  protagonistName: string;
  protagonistSummaryJp: string;
  protagonistVisualSpec: string;
  artStyle: string;
  bgmPrompt: string;
  voiceStyle: string;
  bgmDataUrl?: string;
  bgmError?: string;
  pages: StoryPage[];
}

export type GenerationStepStatus = 'pending' | 'active' | 'done' | 'error';

export interface GenerationProgress {
  stepStory: GenerationStepStatus;
  stepAnchor: GenerationStepStatus;
  stepPages: GenerationStepStatus;
  stepAudio: GenerationStepStatus;
  stepBgm: GenerationStepStatus;
  completedTasks: number;
  totalTasks: number;
  partialBook?: Partial<StoryBook>;
  statusMessage: string;
}
