"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Question, ExamConfig, ExamSession } from "@/types";
import { getQuestionCount, getRandomQuestions, getUnfinishedExamSession, deleteExamSession } from "@/lib/db";
import { generateExam } from "@/lib/exam-generator";
import { useExam } from "@/hooks/useExam";
import QuestionCard from "@/components/QuestionCard";
import ProgressBar from "@/components/ProgressBar";
import ExamTimer from "@/components/ExamTimer";
import EmptyState from "@/components/EmptyState";

export default function ExamPage() {
  const router = useRouter();
  const [questionCount, setQCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ExamConfig>({ questionCount: 50, timeLimit: 60 });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showConfig, setShowConfig] = useState(true);
  const [unfinishedSession, setUnfinishedSession] = useState<ExamSession | null>(null);
  const [resuming, setResuming] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const remainingRef = useRef(0);

  useEffect(() => {
    const init = async () => {
      const n = await getQuestionCount();
      setQCount(n);
      if (n < 50) setConfig((c) => ({ ...c, questionCount: Math.min(n, 50) }));
      const session = await getUnfinishedExamSession();
      setUnfinishedSession(session);
      setLoading(false);
    };
    init();
  }, []);

  const exam = useExam(questions, config, resuming ? unfinishedSession : null);

  const handleStart = async (resume?: boolean) => {
    const qs = await getRandomQuestions(config.questionCount);
    const examQs = generateExam(qs, config);
    setQuestions(examQs);
    if (resume && unfinishedSession) {
      setResuming(true);
      const savedRemaining = unfinishedSession.remainingSeconds ?? config.timeLimit * 60;
      setRemainingSeconds(savedRemaining);
      remainingRef.current = savedRemaining;
    } else {
      setRemainingSeconds(config.timeLimit * 60);
      remainingRef.current = config.timeLimit * 60;
    }
    setShowConfig(false);
    setTimeout(() => exam.start(), 100);
  };

  const handleTimeout = useCallback(() => {
    exam.finish();
  }, [exam]);

  const handleDiscardSession = async () => {
    if (unfinishedSession) {
      await deleteExamSession(unfinishedSession.id);
      setUnfinishedSession(null);
    }
  };

  useEffect(() => {
    if (exam.isFinished && exam.results.length > 0) {
      const correctCount = exam.results.filter((r) => r.isCorrect).length;
      const total = exam.results.length;
      router.push(
        `/exam/result?score=${Math.round((correctCount / total) * 100)}&correct=${correctCount}&total=${total}`
      );
    }
  }, [exam.isFinished]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">加载中...</div>
      </div>
    );
  }

  if (questionCount === 0) {
    return (
      <div className="min-h-screen px-4 pt-6">
        <EmptyState message="还没有题库，请先在「练习」页导入题目" action="去导入" onAction={() => router.push("/practice")} />
      </div>
    );
  }

  if (showConfig) {
    return (
      <div className="px-4 pt-6 pb-4">
        <div className="rounded-2xl bg-primary p-5 text-white mb-6">
          <h1 className="text-xl font-bold mb-1">模拟考试</h1>
          <p className="text-sm opacity-80">计时答题，检验你的学习成果</p>
        </div>

        {/* Unfinished session banner */}
        {unfinishedSession && (
          <div className="rounded-2xl border-2 border-accent bg-accent/5 p-4 mb-5">
            <p className="text-sm font-semibold text-accent mb-2">⚠️ 你有未完成的考试</p>
            <p className="text-xs text-text-secondary mb-3">
              已答 {Object.keys(unfinishedSession.answers).length}/{unfinishedSession.questionIds.length} 题，
              剩余约 {Math.ceil((unfinishedSession.remainingSeconds ?? 0) / 60)} 分钟
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleStart(true)}
                className="flex-1 py-2 rounded-full bg-accent text-white text-sm font-semibold"
              >
                继续考试
              </button>
              <button
                onClick={handleDiscardSession}
                className="px-4 py-2 rounded-full border border-gray-300 text-text-secondary text-sm"
              >
                放弃
              </button>
            </div>
          </div>
        )}

        <div className="space-y-5">
          <div className="rounded-2xl bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-text-primary">题目数量</span>
              <span className="text-lg font-bold text-primary">{config.questionCount} 题</span>
            </div>
            <input
              type="range"
              min="10"
              max={Math.min(questionCount, 100)}
              step="5"
              value={config.questionCount}
              onChange={(e) => setConfig((c) => ({ ...c, questionCount: Number(e.target.value) }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>10</span>
              <span>{Math.min(questionCount, 100)}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-text-primary">考试时间</span>
              <span className="text-lg font-bold text-primary">{config.timeLimit} 分钟</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={config.timeLimit}
              onChange={(e) => setConfig((c) => ({ ...c, timeLimit: Number(e.target.value) }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>10 分钟</span>
              <span>120 分钟</span>
            </div>
          </div>

          <button
            onClick={() => handleStart(false)}
            className="w-full py-4 rounded-full bg-primary text-white font-bold text-base transition-all duration-200 active:scale-95"
          >
            开始考试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 bg-warm/95 backdrop-blur-sm z-10 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <ExamTimer
            totalSeconds={remainingSeconds}
            onTimeout={handleTimeout}
            running={exam.isStarted && !exam.isFinished}
            onTick={(sec) => {
              exam.updateRemaining(sec);
              setRemainingSeconds(sec);
            }}
          />
          <button
            onClick={exam.finish}
            className="px-4 py-1.5 rounded-full bg-wrong text-white text-xs font-semibold"
          >
            交卷
          </button>
        </div>
        <ProgressBar current={exam.progress.current} total={exam.progress.total} />
        <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => exam.goTo(i)}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono flex-shrink-0 transition-colors ${
                exam.answers[q.id]
                  ? "bg-primary text-white"
                  : i === exam.currentIndex
                  ? "bg-primary/20 text-primary border border-primary"
                  : "bg-gray-100 text-text-secondary"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-3 pb-4">
        {exam.currentQuestion && (
          <QuestionCard
            question={exam.currentQuestion}
            selectedAnswer={exam.currentAnswer}
            onSelect={exam.selectAnswer}
            showResult={false}
            isFavorite={false}
            onToggleFavorite={() => {}}
          />
        )}
      </div>

      <div className="sticky bottom-0 bg-warm/95 backdrop-blur-sm px-4 py-3 safe-bottom">
        <div className="flex gap-3">
          <button
            onClick={() => exam.goTo(exam.currentIndex - 1)}
            disabled={exam.currentIndex === 0}
            className="flex-1 py-3 rounded-full border-2 border-gray-200 text-text-secondary font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-30"
          >
            上一题
          </button>
          <button
            onClick={() => exam.goTo(exam.currentIndex + 1)}
            disabled={exam.currentIndex >= exam.progress.total - 1}
            className="flex-1 py-3 rounded-full bg-primary text-white font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-30"
          >
            下一题
          </button>
        </div>
      </div>
    </div>
  );
}
