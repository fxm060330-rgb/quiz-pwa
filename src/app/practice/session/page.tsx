"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Question } from "@/types";
import { getChapterQuestions, getRandomQuestions, getQuestionById, addFavorite, removeFavorite, getFavoriteIds, removeWrongRecord, getWrongQuestionIds } from "@/lib/db";
import { saveChapterPosition } from "@/lib/storage";
import { usePractice } from "@/hooks/usePractice";
import QuestionCard from "@/components/QuestionCard";
import ProgressBar from "@/components/ProgressBar";

function SessionContent() {
  const router = useRouter();
  const params = useSearchParams();
  const chapter = params.get("chapter");
  const mode = params.get("mode");
  const questionId = params.get("questionId");
  const unwrong = params.get("unwrong") === "1";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      if (questionId) {
        const q = await getQuestionById(questionId);
        setQuestions(q ? [q] : []);
      } else if (mode === "wrong") {
        const { getWrongQuestions } = await import("@/lib/db");
        const qs = await getWrongQuestions();
        setQuestions(qs.sort(() => Math.random() - 0.5));
      } else if (chapter) {
        let qs = await getChapterQuestions(chapter);
        if (unwrong) {
          const wrongIds = await getWrongQuestionIds();
          qs = qs.filter((q) => wrongIds.has(q.id));
        }
        setQuestions(qs.sort(() => Math.random() - 0.5));
      } else {
        const qs = await getRandomQuestions(30);
        setQuestions(qs);
      }
      const favs = await getFavoriteIds();
      setFavoriteIds(favs);
      setLoading(false);
    };
    load();
  }, [chapter, mode, questionId, unwrong]);

  const practice = usePractice(questions);

  // Auto-remove wrong records for correct answers in wrong-repractice mode
  useEffect(() => {
    if (practice.isComplete && mode === "wrong") {
      for (const r of practice.results) {
        if (r.isCorrect) removeWrongRecord(r.questionId);
      }
    }
  }, [practice.isComplete, mode]);

  const handleToggleFavorite = async () => {
    if (!practice.currentQuestion) return;
    const qid = practice.currentQuestion.id;
    if (favoriteIds.has(qid)) {
      await removeFavorite(qid);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(qid);
        return next;
      });
    } else {
      await addFavorite(qid);
      setFavoriteIds((prev) => new Set(prev).add(qid));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">加载题目...</div>
      </div>
    );
  }

  if (practice.isComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <span className="text-6xl mb-4">🎉</span>
        <h2 className="text-xl font-bold text-primary mb-2">练习完成</h2>
        <p className="text-text-secondary text-sm mb-2">
          正确 {practice.correctCount} / {practice.results.length} 题
        </p>
        <p className="text-lg font-bold text-primary mb-6">
          正确率 {practice.results.length > 0 ? Math.round((practice.correctCount / practice.results.length) * 100) : 0}%
        </p>
        <button
          onClick={() => {
            if (chapter) saveChapterPosition(chapter, 0);
            router.back();
          }}
          className="px-8 py-3 rounded-full bg-primary text-white font-semibold text-sm transition-all duration-200 active:scale-95"
        >
          返回
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 bg-warm/95 backdrop-blur-sm z-10 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => {
            if (chapter) saveChapterPosition(chapter, practice.currentIndex);
            router.back();
          }} className="text-text-secondary">
            ✕
          </button>
          <ProgressBar current={practice.progress.current} total={practice.progress.total} />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 px-4 pb-4">
        {practice.currentQuestion && (
          <QuestionCard
            question={practice.currentQuestion}
            selectedAnswer={practice.selectedAnswer}
            onSelect={practice.selectAnswer}
            showResult={practice.showResult}
            isFavorite={favoriteIds.has(practice.currentQuestion.id)}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      </div>

      {/* Bottom actions */}
      <div className="sticky bottom-0 bg-warm/95 backdrop-blur-sm px-4 py-3 safe-bottom">
        {!practice.showResult ? (
          <button
            onClick={practice.confirm}
            disabled={!practice.selectedAnswer}
            className="w-full py-3 rounded-full bg-primary text-white font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-30"
          >
            确认答案
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={practice.prev}
              disabled={practice.currentIndex === 0}
              className="flex-1 py-3 rounded-full border-2 border-gray-200 text-text-secondary font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-30"
            >
              上一题
            </button>
            <button
              onClick={practice.next}
              className="flex-1 py-3 rounded-full bg-primary text-white font-semibold text-sm transition-all duration-200 active:scale-95"
            >
              {practice.currentIndex >= practice.progress.total - 1 ? "完成" : "下一题"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PracticeSessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-text-secondary">加载中...</div></div>}>
      <SessionContent />
    </Suspense>
  );
}
