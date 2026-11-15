import { Check, Loader2, AlertCircle, BookOpen, Circle } from 'lucide-react';
import type { GenerationProgress, GenerationStepStatus } from '../types/storybook';

interface GenerationViewProps {
  theme: string;
  progress: GenerationProgress;
}

function StepRow({
  label,
  detail,
  status,
}: {
  label: string;
  detail: string;
  status: GenerationStepStatus;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3.5 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          {status === 'done' && <Check className="h-4 w-4 text-teal-700" strokeWidth={2.5} />}
          {status === 'active' && <Loader2 className="h-4 w-4 animate-spin text-teal-700" />}
          {status === 'error' && <AlertCircle className="h-4 w-4 text-amber-600" />}
          {status === 'pending' && <Circle className="h-3.5 w-3.5 text-slate-300" />}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">{label}</p>
          <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
        </div>
      </div>

      <span
        className={`shrink-0 whitespace-nowrap text-xs font-medium ${
          status === 'done'
            ? 'text-teal-700'
            : status === 'active'
              ? 'text-slate-900'
              : status === 'error'
                ? 'text-amber-700'
                : 'text-slate-400'
        }`}
      >
        {status === 'done' && '完了'}
        {status === 'active' && '作成中'}
        {status === 'error' && 'あとで再生成できます'}
        {status === 'pending' && '待機中'}
      </span>
    </div>
  );
}

export function GenerationView({ theme, progress }: GenerationViewProps) {
  const percent = Math.round((progress.completedTasks / progress.totalTasks) * 100);
  const partial = progress.partialBook;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 book-spread-shadow">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium text-teal-800">テーマ「{theme}」の絵本を制作中</p>
            <h1 className="mt-1.5 font-serif text-2xl font-bold text-slate-900 sm:text-3xl">
              {partial?.title ? `『${partial.title}』` : 'おはなしと絵をじゅんびしています…'}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{progress.statusMessage}</p>
          </div>
          <div className="shrink-0 text-right">
            <span className="tabular-nums text-2xl font-bold text-teal-700">{percent}%</span>
          </div>
        </div>

        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-teal-700 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="text-xs font-bold tracking-wide text-slate-500">制作のすすみぐあい</h2>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4">
              <StepRow
                label="1. 4ページのおはなし執筆"
                detail="子ども向けの文章と主人公の設定を考えます"
                status={progress.stepStory}
              />
              <StepRow
                label="2. 主人公の見た目と1ページ目の挿絵"
                detail="全ページで姿が変わらないように基準の絵を描きます"
                status={progress.stepAnchor}
              />
              <StepRow
                label="3. 2〜4ページ目の挿絵"
                detail="同じ主人公のまま、それぞれの場面を描きます"
                status={progress.stepPages}
              />
              <StepRow
                label="4. 4ページ分の読み上げ音声"
                detail="1ページずつやさしい声で朗読を録音します"
                status={progress.stepAudio}
              />
              <StepRow
                label="5. 絵本全体のオリジナルBGM"
                detail="物語の世界に合うおだやかな音楽を作曲します"
                status={progress.stepBgm}
              />
            </div>
          </div>

          <div className="flex flex-col justify-between lg:col-span-5">
            <div>
              <h2 className="text-xs font-bold tracking-wide text-slate-500">できあがる絵本のプレビュー</h2>
              {partial?.protagonistName ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">主人公</p>
                  <p className="mt-0.5 text-base font-bold text-slate-900">
                    {partial.protagonistName}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {partial.protagonistSummaryJp}
                  </p>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                  <BookOpen className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>主人公の名前とすがたを決めています…</span>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((idx) => {
                  const page = partial?.pages?.[idx];
                  return (
                    <div
                      key={idx}
                      className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                    >
                      {page?.imageDataUrl ? (
                        <img
                          src={page.imageDataUrl}
                          alt={`${idx + 1}ページ目の挿絵`}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                          <span className="tabular-nums text-xs font-medium">{idx + 1}ページ</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
