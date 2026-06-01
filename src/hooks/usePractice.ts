"use client";

import { useState, useCallback } from "react";
import type { Question, AnswerRecord } from "@/types";
import { saveRecord } from "@/lib/db";
import { loadProfile } from "@/lib/storage";
import { cloudPushRecordToMyGroups } from "@/lib/supabase";

let _cachedUserName = "";

function getUserName(): string {
  if (!_cachedUserName) _cachedUserName = loadProfile().name;
  return _cachedUserName;
}

export function usePractice(questions: Question[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<AnswerRecord[]>([]);

  const currentQuestion = questions[currentIndex] || null;
  const progress = { current: currentIndex + 1, total: questions.length };

  const selectAnswer = useCallback(
    (answer: string) => {
      if (showResult) return;
      setSelectedAnswer(answer);
    },
    [showResult]
  );

  const confirm = useCallback(async () => {
    if (!selectedAnswer || !currentQuestion) return;
    const isCorrect = selectedAnswer === currentQuestion.answer;
    const record: AnswerRecord = {
      questionId: currentQuestion.id,
      userAnswer: selectedAnswer,
      isCorrect,
      mode: "practice",
      timestamp: Date.now(),
      userName: getUserName(),
    };
    await saveRecord(record);
    cloudPushRecordToMyGroups(getUserName(), isCorrect);
    setResults((prev) => [...prev, record]);
    setShowResult(true);
  }, [selectedAnswer, currentQuestion]);

  const next = useCallback(() => {
    if (currentIndex >= questions.length - 1) {
      setIsComplete(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedAnswer("");
    setShowResult(false);
  }, [currentIndex, questions.length]);

  const prev = useCallback(() => {
    if (currentIndex <= 0) return;
    setCurrentIndex((i) => i - 1);
    setSelectedAnswer("");
    setShowResult(false);
  }, [currentIndex]);

  const correctCount = results.filter((r) => r.isCorrect).length;

  return {
    currentQuestion,
    currentIndex,
    selectedAnswer,
    showResult,
    isComplete,
    results,
    progress,
    correctCount,
    selectAnswer,
    confirm,
    next,
    prev,
  };
}
