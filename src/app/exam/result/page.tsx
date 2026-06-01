"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ResultContent() {
  const router = useRouter();
  const params = useSearchParams();
  const score = Number(params.get("score")) || 0;
  const correct = Number(params.get("correct")) || 0;
  const total = Number(params.get("total")) || 0;

  const isPassed = score >= 60;
  const ringColor = isPassed ? "#10B981" : "#EF4444";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Score ring */}
      <div className="relative w-36 h-36 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#E2E8F0" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={ringColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-primary">{score}</span>
          <span className="text-xs text-text-secondary">分</span>
        </div>
      </div>

      {/* Result text */}
      <h2 className="text-xl font-bold text-primary mb-1">
        {isPassed ? "恭喜通过!" : "继续加油"}
      </h2>
      <p className="text-text-secondary text-sm mb-6">
        答对 {correct}/{total} 题
      </p>

      {/* Action buttons */}
      <div className="w-full space-y-3 max-w-xs">
        <button
          onClick={() => router.push("/exam")}
          className="w-full py-3 rounded-full bg-primary text-white font-semibold text-sm transition-all duration-200 active:scale-95"
        >
          再来一场
        </button>
        {score < 100 && (
          <button
            onClick={() => router.push("/wrong")}
            className="w-full py-3 rounded-full border-2 border-wrong text-wrong font-semibold text-sm transition-all duration-200 active:scale-95"
          >
            查看错题
          </button>
        )}
        <button
          onClick={() => router.push("/practice")}
          className="w-full py-3 rounded-full border-2 border-gray-200 text-text-secondary font-semibold text-sm transition-all duration-200 active:scale-95"
        >
          返回首页
        </button>
      </div>
    </div>
  );
}

export default function ExamResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-text-secondary">加载中...</div></div>}>
      <ResultContent />
    </Suspense>
  );
}
