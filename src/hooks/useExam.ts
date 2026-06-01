"use client";

import { useState, useCallback, useRef } from "react";
import type { Question, AnswerRecord, ExamConfig, ExamSession } from "@/types";
import { saveRecord, saveExamSession } from "@/lib/db";
import { loadProfile } from "@/lib/storage";
import { cloudPushRecordToMyGroups } from "@/lib/supabase";

export function useExam(questions: Question[], config: ExamConfig, resumeSession?: ExamSession | null) {
  const [currentIndex, setCurrentIndex] = useState(resumeSession?.currentIndex ?? 0);
  const [answers, setAnswers] = useState<Record<string, string>>(resumeSession?.answers ?? {});
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [results, setResults] = useState<AnswerRecord[]>([]);
  const sessionRef = useRef<ExamSession | null>(resumeSession ?? null);

  const currentQuestion = questions[currentIndex] || null;
  const progress = { current: currentIndex + 1, total: questions.length };
  const timeLimitSeconds = resumeSession?.remainingSeconds ?? config.timeLimit * 60;

  const persistSession = useCallback(async (idx: number, ans: Record<string, string>, remainingSec: number) => {
    if (!sessionRef.current) return;
    sessionRef.current.currentIndex = idx;
    sessionRef.current.answers = ans;
    sessionRef.current.remainingSeconds = remainingSec;
    sessionRef.current.status = "in_progress";
    await saveExamSession(sessionRef.current);
  }, []);

  const start = useCallback(() => {
    if (resumeSession) {
      // Resuming — keep existing session
      sessionRef.current = resumeSession;
    } else {
      sessionRef.current = {
        id: `exam-${Date.now()}`,
        config,
        startTime: Date.now(),
        questionIds: questions.map((q) => q.id),
        answers: {},
        status: "in_progress",
        currentIndex: 0,
        remainingSeconds: config.timeLimit * 60,
      };
    }
    setIsStarted(true);
  }, [config, questions, resumeSession]);

  const selectAnswer = useCallback((answer: string) => {
    setAnswers((prev) => {
      const q = questions[currentIndex];
      if (!q) return prev;
      return { ...prev, [q.id]: answer };
    });
  }, [currentIndex, questions]);

  const finish = useCallback(async () => {
    const userName = loadProfile().name;
    const records: AnswerRecord[] = [];
    let correctCount = 0;
    for (const q of questions) {
      const userAnswer = answers[q.id] || "";
      const isCorrect = userAnswer === q.answer;
      if (isCorrect) correctCount++;
      records.push({
        questionId: q.id,
        userAnswer,
        isCorrect,
        mode: "exam",
        timestamp: Date.now(),
        examId: sessionRef.current?.id,
        userName,
      });
    }
    await Promise.all(records.map(saveRecord));

    // Push to cloud for group leaderboard
    const correctRecords = records.filter((r) => r.isCorrect);
    if (correctRecords.length > 0) {
      await Promise.all(correctRecords.map(() => cloudPushRecordToMyGroups(userName, true)));
    }
    const wrongRecords = records.filter((r) => !r.isCorrect);
    if (wrongRecords.length > 0) {
      await Promise.all(wrongRecords.map(() => cloudPushRecordToMyGroups(userName, false)));
    }

    if (sessionRef.current) {
      sessionRef.current.endTime = Date.now();
      sessionRef.current.score = Math.round((correctCount / questions.length) * 100);
      sessionRef.current.answers = answers;
      sessionRef.current.status = "finished";
      sessionRef.current.currentIndex = currentIndex;
      await saveExamSession(sessionRef.current);
    }

    setResults(records);
    setIsFinished(true);
  }, [questions, answers, currentIndex]);

  const goTo = useCallback(async (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      // Persist progress on navigation
      const remaining = 0; // placeholder — timer tracks this separately
      await persistSession(index, answers, remaining);
    }
  }, [questions.length, answers, persistSession]);

  const updateRemaining = useCallback(async (sec: number) => {
    if (sessionRef.current) {
      sessionRef.current.remainingSeconds = sec;
      await saveExamSession(sessionRef.current);
    }
  }, []);

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] || "" : "";

  return {
    currentQuestion,
    currentIndex,
    currentAnswer,
    answers,
    isStarted,
    isFinished,
    results,
    progress,
    timeLimitSeconds,
    start,
    selectAnswer,
    finish,
    goTo,
    setCurrentIndex,
    updateRemaining,
    persistSession,
  };
}
