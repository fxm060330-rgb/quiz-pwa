"use client";

import type { Question } from "@/types";

interface Props {
  question: Question;
  selectedAnswer: string;
  onSelect: (answer: string) => void;
  showResult: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

export default function QuestionCard({
  question,
  selectedAnswer,
  onSelect,
  showResult,
  isFavorite,
  onToggleFavorite,
}: Props) {
  return (
    <div className="animate-fadeIn">
      {/* Header: type + difficulty + favorite */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
            {question.type === "single" ? "单选题" : question.type === "multi" ? "多选题" : "判断题"}
          </span>
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${
              question.difficulty === 1
                ? "bg-green-100 text-green-700"
                : question.difficulty === 2
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {question.difficulty === 1 ? "简单" : question.difficulty === 2 ? "中等" : "困难"}
          </span>
        </div>
        <button
          onClick={onToggleFavorite}
          className={`text-xl transition-all duration-200 ${isFavorite ? "scale-110" : ""}`}
        >
          {isFavorite ? "⭐" : "☆"}
        </button>
      </div>

      {/* Question text */}
      <div className="mb-4">
        <p className="text-base leading-relaxed text-text-primary">{question.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {question.options.map((option, i) => {
          const label = OPTION_LABELS[i];
          const isSelected = selectedAnswer === label;
          const isRightAnswer = question.answer === label;
          let stateClass = "border-gray-200 bg-white";

          if (showResult) {
            if (isRightAnswer) {
              stateClass = "border-green-400 bg-correct-light";
            } else if (isSelected && !isRightAnswer) {
              stateClass = "border-red-400 bg-wrong-light";
            }
          } else if (isSelected) {
            stateClass = "border-primary border-2 bg-primary/5";
          }

          return (
            <button
              key={label}
              onClick={() => !showResult && onSelect(label)}
              disabled={showResult}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left ${stateClass} ${
                !showResult ? "active:scale-[0.98]" : ""
              }`}
            >
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                  showResult && isRightAnswer
                    ? "bg-correct text-white"
                    : showResult && isSelected && !isRightAnswer
                    ? "bg-wrong text-white"
                    : isSelected
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-text-secondary"
                }`}
              >
                {label}
              </span>
              <span className="text-sm text-text-primary leading-snug">{option}</span>
              {showResult && isRightAnswer && (
                <span className="ml-auto text-correct text-sm">✓</span>
              )}
              {showResult && isSelected && !isRightAnswer && (
                <span className="ml-auto text-wrong text-sm">✗</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Analysis - shown after answering */}
      {showResult && question.analysis && (
        <div className="mt-4 p-3 rounded-xl bg-warm">
          <p className="text-xs font-semibold text-text-secondary mb-1">解析</p>
          <p className="text-sm text-text-primary leading-relaxed">{question.analysis}</p>
        </div>
      )}
    </div>
  );
}
