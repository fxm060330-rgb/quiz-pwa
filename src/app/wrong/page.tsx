"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Question } from "@/types";
import { getWrongQuestions, getFavoriteQuestions, removeWrongRecord, removeFavorite, addFavorite, getFavoriteIds, getWrongQuestionCounts } from "@/lib/db";
import EmptyState from "@/components/EmptyState";

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

export default function WrongPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"wrong" | "favorite">("wrong");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [wrongCounts, setWrongCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const favIds = await getFavoriteIds();
      setFavoriteIds(favIds);
      if (tab === "wrong") {
        const [qs, counts] = await Promise.all([getWrongQuestions(), getWrongQuestionCounts()]);
        // Sort by wrong count descending
        qs.sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0));
        setQuestions(qs);
        setWrongCounts(counts);
      } else {
        setQuestions(await getFavoriteQuestions());
      }
      setExpandedId(null);
    } catch (e: unknown) {
      console.error("Wrong page load error:", e);
      setError((e as Error).message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const handleRemoveWrong = async (qid: string) => {
    await removeWrongRecord(qid);
    setQuestions((prev) => prev.filter((q) => q.id !== qid));
  };

  const handleToggleFavorite = async (qid: string) => {
    if (favoriteIds.has(qid)) {
      await removeFavorite(qid);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(qid);
        return next;
      });
      if (tab === "favorite") setQuestions((prev) => prev.filter((q) => q.id !== qid));
    } else {
      await addFavorite(qid);
      setFavoriteIds((prev) => new Set(prev).add(qid));
    }
  };

  return (
    <div className="px-4 pt-6 pb-4 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-primary">错题本</h1>
        {tab === "wrong" && questions.length > 0 && (
          <button
            onClick={() => router.push("/practice/session?mode=wrong")}
            className="px-4 py-1.5 rounded-full bg-accent text-white text-xs font-semibold transition-all duration-200 active:scale-95"
          >
            重练错题
          </button>
        )}
      </div>

      <div className="flex bg-white rounded-full p-1 mb-4 shadow-sm">
        <button
          onClick={() => setTab("wrong")}
          className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
            tab === "wrong" ? "bg-primary text-white" : "text-text-secondary"
          }`}
        >
          错题
        </button>
        <button
          onClick={() => setTab("favorite")}
          className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
            tab === "favorite" ? "bg-primary text-white" : "text-text-secondary"
          }`}
        >
          收藏
        </button>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <span className="text-5xl mb-4">😵</span>
          <p className="text-wrong text-sm mb-2">加载出错</p>
          <p className="text-text-secondary text-xs mb-4 text-center break-all">{error}</p>
          <button
            onClick={load}
            className="px-6 py-2 rounded-full bg-primary text-white text-sm"
          >
            重试
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-text-secondary">加载中...</div>
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          message={tab === "wrong" ? "还没有错题，继续加油！" : "还没有收藏的题目"}
          action={tab === "wrong" ? "去练习" : "去刷题"}
          onAction={() => router.push("/practice")}
        />
      ) : (
        <div className="space-y-2">
          {questions.map((q) => {
            const isExpanded = expandedId === q.id;
            return (
              <div
                key={q.id}
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
                className="rounded-xl bg-white shadow-sm p-4 cursor-pointer transition-all duration-200 active:scale-[0.98]"
              >
                {/* Header: question text */}
                <div className="flex items-start gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary flex-shrink-0 mt-0.5">
                    {q.type === "single" ? "单选" : q.type === "multi" ? "多选" : "判断"}
                  </span>
                  <p className={`text-sm text-text-primary leading-relaxed flex-1 ${isExpanded ? "" : "line-clamp-2"}`}>
                    {q.question}
                  </p>
                  <span className="text-text-secondary text-xs flex-shrink-0 mt-0.5">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>

                {/* Expanded: show options + answer + analysis */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {/* Options */}
                    <div className="space-y-1.5 mb-3">
                      {q.options.map((opt, i) => {
                        const label = OPTION_LABELS[i];
                        const isCorrect = q.answer.includes(label);
                        return (
                          <div
                            key={label}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                              isCorrect ? "bg-correct-light border border-green-400" : "bg-gray-50"
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                                isCorrect ? "bg-correct text-white" : "bg-gray-200 text-text-secondary"
                              }`}
                            >
                              {label}
                            </span>
                            <span className={isCorrect ? "text-correct font-medium" : "text-text-secondary"}>
                              {opt}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Answer */}
                    <div className="mb-2 p-2 rounded-lg bg-correct-light">
                      <span className="text-xs font-semibold text-correct">正确答案：{q.answer}</span>
                    </div>

                    {/* Analysis */}
                    {q.analysis && (
                      <div className="p-3 rounded-lg bg-warm">
                        <p className="text-xs font-semibold text-text-secondary mb-1">解析</p>
                        <p className="text-sm text-text-primary leading-relaxed">{q.analysis}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">{q.chapter}</span>
                    {tab === "wrong" && (wrongCounts.get(q.id) || 0) > 1 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-wrong/10 text-wrong font-semibold">
                        错{wrongCounts.get(q.id)}次
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleToggleFavorite(q.id)} className="text-lg">
                      {favoriteIds.has(q.id) ? "⭐" : "☆"}
                    </button>
                    {tab === "wrong" && (
                      <button
                        onClick={() => handleRemoveWrong(q.id)}
                        className="px-3 py-1 rounded-full bg-wrong/10 text-wrong text-xs font-semibold"
                      >
                        移除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
