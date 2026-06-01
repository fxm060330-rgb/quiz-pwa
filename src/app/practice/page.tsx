"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Question } from "@/types";
import { getChapters, getChapterStats, getTodayStats, searchQuestions, getWrongQuestionIds } from "@/lib/db";
import { loadChapterPositions, loadDailyGoal, saveDailyGoal } from "@/lib/storage";
import ChapterCard from "@/components/ChapterCard";
import ImportButton from "@/components/ImportButton";
import { useApp } from "@/context/AppContext";

interface ChapterInfo {
  name: string;
  total: number;
  completed: number;
  correct: number;
}

export default function PracticePage() {
  const router = useRouter();
  const { questionCount, importing, refreshCount } = useApp();
  const [chapters, setChapters] = useState<ChapterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [todayStats, setTodayStats] = useState({ todayCount: 0, todayCorrect: 0, todayCorrectRate: 0 });
  const [chapterExpanded, setChapterExpanded] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(50);
  const [editingGoal, setEditingGoal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Question[]>([]);
  const [searching, setSearching] = useState(false);
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  const [unwrongOnly, setUnwrongOnly] = useState(false);

  const loadChapters = async () => {
    try {
      setLoading(true);
      setError("");
      setDailyGoal(loadDailyGoal());
      const [chNames, today, wIds] = await Promise.all([
        getChapters(),
        getTodayStats().catch(() => ({ todayCount: 0, todayCorrect: 0, todayCorrectRate: 0 })),
        getWrongQuestionIds().catch(() => new Set<string>()),
      ]);
      setTodayStats(today);
      setWrongIds(wIds);
      const list: ChapterInfo[] = [];
      for (const ch of chNames) {
        const stats = await getChapterStats(ch);
        list.push({ name: ch, ...stats });
      }
      setChapters(list);
    } catch (e: unknown) {
      setError((e as Error).message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChapters();
  }, [questionCount]);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const results = await searchQuestions(q.trim());
    setSearchResults(results.slice(0, 20));
    setSearching(false);
  };

  const goalPercent = dailyGoal > 0 ? Math.min(100, Math.round((todayStats.todayCount / dailyGoal) * 100)) : 0;

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <span className="text-5xl mb-4">😵</span>
        <p className="text-wrong text-sm mb-2">加载出错</p>
        <p className="text-text-secondary text-xs mb-4">{error}</p>
        <button
          onClick={loadChapters}
          className="px-6 py-2 rounded-full bg-primary text-white text-sm"
        >
          重试
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">加载中...</div>
      </div>
    );
  }

  if (questionCount === 0) {
    if (importing) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          <h1 className="text-2xl font-bold text-primary mb-2">刷题</h1>
          <div className="animate-pulse text-text-secondary text-sm mb-2">正在自动导入题库...</div>
          <p className="text-text-secondary text-xs">1455 道题目加载中，请稍候</p>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-bold text-primary mb-2">刷题</h1>
        <p className="text-text-secondary text-sm mb-8">还没有题库，请先导入题目</p>
        <ImportButton onImported={() => { refreshCount(); loadChapters(); }} />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Today's stats - primary background */}
      <div className="rounded-2xl bg-primary p-5 text-white mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/70">今日答题</h2>
          <div className="flex items-center gap-2">
            {editingGoal ? (
              <input
                type="number"
                min={1}
                max={999}
                defaultValue={dailyGoal}
                autoFocus
                className="w-14 px-1 py-0.5 rounded text-xs text-primary text-center"
                onBlur={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (v > 0) { setDailyGoal(v); saveDailyGoal(v); }
                  setEditingGoal(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = parseInt((e.target as HTMLInputElement).value, 10);
                    if (v > 0) { setDailyGoal(v); saveDailyGoal(v); }
                    setEditingGoal(false);
                  }
                }}
              />
            ) : (
              <span
                className="text-xs text-white/60 cursor-pointer"
                onClick={() => setEditingGoal(true)}
              >
                目标 {dailyGoal}题
              </span>
            )}
          </div>
        </div>

        {/* Goal progress bar */}
        <div className="w-full bg-white/20 rounded-full h-2 mb-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${goalPercent}%`,
              backgroundColor: goalPercent >= 100 ? "#10B981" : "#C8913A",
            }}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold">{todayStats.todayCount}</div>
            <div className="text-xs text-white/60 mt-0.5">答题数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-correct">{todayStats.todayCorrect}</div>
            <div className="text-xs text-white/60 mt-0.5">正确数</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${todayStats.todayCorrectRate >= 60 ? "text-correct" : "text-wrong"}`}>
              {todayStats.todayCorrectRate}<span className="text-sm font-normal">%</span>
            </div>
            <div className="text-xs text-white/60 mt-0.5">正确率</div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-5">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索题目、选项或解析..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-3 pr-10 rounded-2xl bg-white shadow-sm text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
            {searching ? "..." : "🔍"}
          </span>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map((q) => {
              const isWrong = wrongIds.has(q.id);
              return (
                <div
                  key={q.id}
                  onClick={() => router.push(`/practice/session?questionId=${q.id}`)}
                  className="rounded-xl bg-white shadow-sm p-3 cursor-pointer transition-all duration-200 active:scale-[0.98]"
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                      isWrong ? "bg-wrong/10 text-wrong" : "bg-primary/10 text-primary"
                    }`}>
                      {q.type === "single" ? "单选" : q.type === "multi" ? "多选" : "判断"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary line-clamp-2">{q.question}</p>
                      <span className="text-xs text-text-secondary">{q.chapter}</span>
                    </div>
                    {isWrong && <span className="text-xs text-wrong flex-shrink-0">错题</span>}
                  </div>
                </div>
              );
            })}
            {searchResults.length >= 20 && (
              <p className="text-xs text-text-secondary text-center">仅显示前20条结果，请输入更精确的关键词</p>
            )}
          </div>
        )}
      </div>

      {/* Chapter practice card */}
      <div className="rounded-2xl bg-white shadow-sm p-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-text-primary mb-1">章节练习</h1>
            <p className="text-sm text-text-secondary">共 {questionCount} 题，选择章节开始刷题</p>
          </div>
          <button
            onClick={() => {
              refreshCount();
              loadChapters();
            }}
            className="text-text-secondary hover:text-primary text-xs border border-gray-300 rounded-full px-3 py-1 flex-shrink-0"
          >
            刷新
          </button>
        </div>
      </div>

      {/* Chapter list - collapsible */}
      <div className="mb-5 rounded-2xl bg-white shadow-sm p-4">
        <button
          onClick={() => setChapterExpanded(!chapterExpanded)}
          className="w-full flex items-center justify-between"
        >
          <h2 className="text-sm font-semibold text-text-secondary">章节列表</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setUnwrongOnly(!unwrongOnly); }}
              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                unwrongOnly ? "bg-wrong/10 text-wrong font-semibold" : "bg-gray-100 text-text-secondary"
              }`}
            >
              只练未做对
            </button>
            <span className="text-xs text-text-secondary transition-transform duration-200" style={{ transform: chapterExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
              ▼
            </span>
          </div>
        </button>
        {chapterExpanded && (
          chapters.length === 0 ? (
            <p className="text-text-secondary text-sm text-center pt-4">暂无章节数据</p>
          ) : (
            <div className="space-y-3 mt-4">
              {chapters.map((ch) => {
                const pos = loadChapterPositions();
                const savedIndex = pos[ch.name];
                const hasProgress = savedIndex !== undefined && savedIndex > 0 && savedIndex < ch.total;
                return (
                  <ChapterCard
                    key={ch.name}
                    chapter={ch.name}
                    total={ch.total}
                    completed={ch.completed}
                    correct={ch.correct}
                    onClick={() => router.push(`/practice/session?chapter=${encodeURIComponent(ch.name)}${unwrongOnly ? "&unwrong=1" : ""}`)}
                    resumeIndex={hasProgress ? savedIndex : undefined}
                  />
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Random practice button */}
      <button
        onClick={() => router.push("/practice/session?mode=random")}
        className="w-full mb-5 p-4 rounded-2xl bg-white shadow-sm text-left transition-all duration-200 active:scale-[0.98] hover:shadow-md flex items-center justify-between"
      >
        <div>
          <h3 className="font-semibold text-text-primary text-sm">随机练习</h3>
          <p className="text-xs text-text-secondary mt-0.5">从所有题目中随机出题</p>
        </div>
        <span className="text-accent text-lg">🎲</span>
      </button>
    </div>
  );
}