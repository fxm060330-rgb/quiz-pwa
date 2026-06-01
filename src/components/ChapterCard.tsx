"use client";

interface Props {
  chapter: string;
  total: number;
  completed: number;
  correct: number;
  onClick: () => void;
  resumeIndex?: number;
}

export default function ChapterCard({ chapter, total, completed, correct, onClick, resumeIndex }: Props) {
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const accuracy = completed > 0 ? Math.round((correct / completed) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-2xl bg-white shadow-sm text-left transition-all duration-200 active:scale-[0.98] hover:shadow-md"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-text-primary text-sm leading-snug flex-1 mr-2">
          {chapter}
        </h3>
        {resumeIndex !== undefined && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent flex-shrink-0">
            继续
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-text-secondary mb-2">
        <span>共 {total} 题</span>
        {completed > 0 && <span>已做 {completed} 题</span>}
        {completed > 0 && <span className="text-correct">正确率 {accuracy}%</span>}
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </button>
  );
}
