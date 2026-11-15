import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function createAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません。Settings > Secrets を確認してください。');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelayMs = 1200): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const isNonRetryable =
        message.includes('API_KEY_INVALID') ||
        message.includes('PERMISSION_DENIED') ||
        message.includes('INVALID_ARGUMENT');
      if (isNonRetryable || attempt === maxAttempts) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

function formatApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED')) {
    return {
      status: 403,
      message: 'APIキーが無効または権限がありません。Settings > Secrets パネルでAPIキーを確認してください。',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'リクエストが混み合っているか利用上限に達しました。しばらくしてからもう一度お試しください。',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 404,
      message: '指定されたモデルが見つかりませんでした。',
    };
  }
  return {
    status: 500,
    message: raw || '生成中にエラーが発生しました。',
  };
}

interface StoryPagePayload {
  pageNumber: number;
  text: string;
  scenePrompt: string;
  characterPose: string;
}

interface StoryPayload {
  title: string;
  subtitle: string;
  protagonistName: string;
  protagonistSummaryJp: string;
  protagonistVisualSpec: string;
  artStyle: string;
  bgmPrompt: string;
  voiceStyle: string;
  pages: StoryPagePayload[];
}

const app = express();
app.use(express.json({ limit: '20mb' }));

app.post('/api/storybook/story', async (req, res) => {
  try {
    const theme = typeof req.body?.theme === 'string' ? req.body.theme.trim() : '';
    const tone = typeof req.body?.tone === 'string' ? req.body.tone.trim() : 'gentle';

    if (!theme) {
      res.status(400).json({ error: 'テーマを入力してください。' });
      return;
    }

    const toneGuide: Record<string, string> = {
      gentle: 'やさしく、あたたかく、おやすみ前にも読める心安らぐ雰囲気',
      adventure: 'わくわくする小さな冒険と発見がある、元気で楽しい雰囲気',
      funny: 'くすっと笑えて、リズムや擬音語が楽しいユーモラスな雰囲気',
    };

    const ai = createAiClient();

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `テーマ：「${theme}」\n雰囲気の希望：${toneGuide[tone] ?? toneGuide.gentle}\n\nこのテーマから、子ども向けの4ページの絵本の構成と本文を作成してください。`,
        config: {
          systemInstruction: `あなたは日本の名作絵本を手がける絵本作家・アートディレクターです。
ユーザーから与えられた一言のテーマをもとに、子ども（3〜7歳くらい）が読み聞かせで楽しめる「4ページの絵本」を日本語で作ります。

守るべきルール：
1. ページ数は必ずぴったり4ページ（pageNumber: 1, 2, 3, 4）にすること。
   - 1ページ目：導入（主人公と世界の紹介）
   - 2ページ目：展開（小さな出来事や出発）
   - 3ページ目：山場（ちょっとした驚きやハプニング、心の動き）
   - 4ページ目：結び（あたたかく安心感のあるハッピーエンド）
2. 本文（text）は、ひらがなを中心に、子どもがすぐわかるやさしい漢字（少しだけ）を使い、声に出して読みやすいリズミカルな日本語で、1ページあたり2〜4文（60〜110文字程度）にすること。擬音語・擬態語（「ふわふわ」「とことこ」「きらきら」など）を自然に取り入れること。
3. 主人公の見た目（protagonistVisualSpec）は、全4ページの挿絵で主人公がまったく同じ見た目に描かれるよう、英語で極めて具体的に指定すること。
   - 種族や年齢、体格、顔立ち・目の色と形、髪型や耳・しっぽの特徴
   - 服装のアイテム、色、模様（例：赤いストライプのレインコート、黄色い長靴、青い星模様の小さなリュックなど）
   - 変えないこと：1〜4ページすべてで同じ服・同じ色・同じ特徴を保つこと。
4. 画風（artStyle）は、温かみのある子ども向け絵本のスタイル（例：Warm hand-painted gouache and colored pencil children's picture book illustration on textured cream cotton paper, soft natural lighting）を英語で指定すること。
5. 各ページの挿絵プロンプト（scenePrompt / characterPose）は英語で書き、1ページ目は主人公の全身と顔・服装がはっきり見える中景〜全身ショットにすること。挿絵の中に文字や吹き出しを一切含めない前提で視覚情景のみを書くこと。
6. BGMプロンプト（bgmPrompt）は、絵本全体の世界観に合う、歌詞のないインストゥルメンタル楽曲（30秒ループ向け）を英語で具体的に指定すること（例：木琴、アコースティックギター、オルゴール、やさしいフルート、ピチカート弦楽器など）。`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: '絵本のタイトル（日本語・子ども向け）',
              },
              subtitle: {
                type: Type.STRING,
                description: '絵本の表紙や導入に添える短い一文（日本語）',
              },
              protagonistName: {
                type: Type.STRING,
                description: '主人公の名前（日本語）',
              },
              protagonistSummaryJp: {
                type: Type.STRING,
                description: '主人公の特徴の短い説明（日本語・1文）',
              },
              protagonistVisualSpec: {
                type: Type.STRING,
                description:
                  'Detailed, immutable English visual description of the protagonist (exact species/age, face, eyes, hair/fur, exact clothing colors, patterns, accessories) to stay identical across all 4 pages.',
              },
              artStyle: {
                type: Type.STRING,
                description:
                  'Consistent English picture book illustration medium, brush/pencil texture, and color palette description.',
              },
              bgmPrompt: {
                type: Type.STRING,
                description:
                  'Detailed English prompt for a gentle, instrumental, loop-friendly children storybook background music track (no vocals, specify acoustic instruments, tempo, and mood).',
              },
              voiceStyle: {
                type: Type.STRING,
                description:
                  'Concise English style direction for a warm, affectionate Japanese picture book narrator reading aloud to young children.',
              },
              pages: {
                type: Type.ARRAY,
                description: 'Exactly 4 pages of the picture book.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    pageNumber: { type: Type.INTEGER },
                    text: {
                      type: Type.STRING,
                      description: 'Japanese story text for this page (2-4 short rhythmic sentences for kids).',
                    },
                    scenePrompt: {
                      type: Type.STRING,
                      description:
                        'Detailed English visual description of the environment, background, lighting, and camera framing for this page (no text in image).',
                    },
                    characterPose: {
                      type: Type.STRING,
                      description:
                        'English description of what the protagonist is doing, facial expression, and body pose in this page.',
                    },
                  },
                  required: ['pageNumber', 'text', 'scenePrompt', 'characterPose'],
                },
              },
            },
            required: [
              'title',
              'subtitle',
              'protagonistName',
              'protagonistSummaryJp',
              'protagonistVisualSpec',
              'artStyle',
              'bgmPrompt',
              'voiceStyle',
              'pages',
            ],
          },
        },
      })
    );

    const rawText = (response.text ?? '').trim();
    const story = JSON.parse(rawText) as StoryPayload;

    if (!Array.isArray(story.pages) || story.pages.length !== 4) {
      throw new Error('4ページ構成のお話の生成に失敗しました。もう一度お試しください。');
    }

    story.pages.sort((a, b) => a.pageNumber - b.pageNumber);
    res.json({ story });
  } catch (err: unknown) {
    console.error('Story generation error:', err);
    const { status, message } = formatApiError(err);
    res.status(status).json({ error: message });
  }
});

app.post('/api/storybook/illustrate', async (req, res) => {
  try {
    const {
      pageNumber,
      protagonistVisualSpec,
      artStyle,
      scenePrompt,
      characterPose,
      referenceImageBase64,
      referenceImageMimeType,
    } = req.body ?? {};

    if (!protagonistVisualSpec || !scenePrompt) {
      res.status(400).json({ error: '挿絵の生成に必要な情報が不足しています。' });
      return;
    }

    const ai = createAiClient();

    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [];

    if (referenceImageBase64 && typeof referenceImageBase64 === 'string') {
      parts.push({
        inlineData: {
          data: referenceImageBase64,
          mimeType: typeof referenceImageMimeType === 'string' ? referenceImageMimeType : 'image/png',
        },
      });
      parts.push({
        text: [
          `Reference guidance: Keep the EXACT SAME protagonist character shown in the attached reference illustration — identical face, eye style, hair/fur, colors, proportions, outfit, and accessories.`,
          `Protagonist design specification: ${protagonistVisualSpec}`,
          `Art style (must match the reference illustration's medium, brushwork, and paper texture): ${artStyle}`,
          `New scene for Page ${pageNumber}: ${scenePrompt}`,
          `Protagonist action & expression: ${characterPose}`,
          `CRITICAL RULES: Full-bleed children's picture book illustration. Zero text, zero letters, zero words, zero numbers, zero speech bubbles, zero borders or book frames inside the image.`,
        ].join('\n\n'),
      });
    } else {
      parts.push({
        text: [
          `Create a warm children's picture book illustration for Page ${pageNumber}.`,
          `Protagonist character design (draw clearly from head to toe/knees in clear lighting so this exact design serves as a visual reference): ${protagonistVisualSpec}`,
          `Art style: ${artStyle}`,
          `Scene & composition: ${scenePrompt}`,
          `Protagonist action & expression: ${characterPose}`,
          `CRITICAL RULES: Full-bleed children's picture book illustration. Zero text, zero letters, zero words, zero numbers, zero speech bubbles, zero borders or book frames inside the image.`,
        ].join('\n\n'),
      });
    }

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: '4:3',
          },
        },
      })
    );

    const candidateParts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of candidateParts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType ?? 'image/png';
        const base64Data = part.inlineData.data;
        res.json({
          imageDataUrl: `data:${mimeType};base64,${base64Data}`,
          base64Data,
          mimeType,
        });
        return;
      }
    }

    throw new Error('画像データが返されませんでした。');
  } catch (err: unknown) {
    console.error('Illustration generation error:', err);
    const { status, message } = formatApiError(err);
    res.status(status).json({ error: message });
  }
});

app.post('/api/storybook/narration', async (req, res) => {
  try {
    const { text, voiceName, style } = req.body ?? {};
    if (typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: '読み上げる文章がありません。' });
      return;
    }

    const allowedVoices = new Set(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr']);
    const selectedVoice = typeof voiceName === 'string' && allowedVoices.has(voiceName) ? voiceName : 'Kore';

    const ai = createAiClient();

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.trim(),
                speechMetadata: {
                  style:
                    typeof style === 'string' && style.trim()
                      ? style.trim()
                      : 'Warm, gentle, affectionate Japanese children picture book storyteller reading clearly and calmly',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: selectedVoice,
              },
            },
          },
        },
      })
    );

    const candidateParts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of candidateParts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType ?? 'audio/wav';
        res.json({
          audioDataUrl: `data:${mime};base64,${part.inlineData.data}`,
        });
        return;
      }
    }

    throw new Error('音声データが返されませんでした。');
  } catch (err: unknown) {
    console.error('Narration TTS error:', err);
    const { status, message } = formatApiError(err);
    res.status(status).json({ error: message });
  }
});

app.post('/api/storybook/bgm', async (req, res) => {
  try {
    const { bgmPrompt, referenceImageBase64, referenceImageMimeType } = req.body ?? {};
    if (typeof bgmPrompt !== 'string' || !bgmPrompt.trim()) {
      res.status(400).json({ error: 'BGMのプロンプトがありません。' });
      return;
    }

    const ai = createAiClient();

    const generateMusic = async (includeImage: boolean) => {
      const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
        {
          text: `Generate a gentle, seamless, instrumental-only 30-second background music track for a Japanese children's picture book. NO vocals, NO singing, NO spoken words. Keep volume and dynamics soft and soothing so a narrator's voice can be heard clearly over it. Musical direction: ${bgmPrompt.trim()}`,
        },
      ];

      if (includeImage && referenceImageBase64 && typeof referenceImageBase64 === 'string') {
        parts.push({
          inlineData: {
            data: referenceImageBase64,
            mimeType: typeof referenceImageMimeType === 'string' ? referenceImageMimeType : 'image/png',
          },
        });
      }

      const response = await ai.models.generateContentStream({
        model: 'lyria-3-clip-preview',
        contents: { parts },
      });

      const audioChunks: Buffer[] = [];
      let mimeType = 'audio/mpeg';

      for await (const chunk of response) {
        const chunkParts = chunk.candidates?.[0]?.content?.parts;
        if (!chunkParts) continue;
        for (const part of chunkParts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
        }
      }

      if (audioChunks.length === 0) {
        throw new Error('音楽データが生成されませんでした。');
      }

      const audioBase64 = Buffer.concat(audioChunks).toString('base64');
      return `data:${mimeType};base64,${audioBase64}`;
    };

    let audioDataUrl: string;
    try {
      audioDataUrl = await withRetry(() => generateMusic(Boolean(referenceImageBase64)), 2, 1500);
    } catch (err) {
      if (referenceImageBase64) {
        audioDataUrl = await withRetry(() => generateMusic(false), 2, 1500);
      } else {
        throw err;
      }
    }

    res.json({ audioDataUrl });
  } catch (err: unknown) {
    console.error('BGM generation error:', err);
    const { status, message } = formatApiError(err);
    res.status(status).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
