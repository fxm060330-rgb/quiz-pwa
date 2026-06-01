"use client";

import { useState, useEffect } from "react";
import { getStats, getChapters } from "@/lib/db";
import type { ChapterProgress } from "@/types";

export function useStats() {
  const [stats, setStats] = useState({
    totalPracticed: 0,
    totalCorrect: 0,
    correctRate: 0,
    todayCount: 0,
    streak: 0,
  });
  const [chapterProgress, setChapterProgress] = useState<ChapterProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const s = await getStats();
    setStats(s);

    const { getChapterStats: getCh } = await import("@/lib/db");
    const chapters = await getChapters();
    const cp: ChapterProgress[] = [];
    for (const ch of chapters) {
      const st = await getCh(ch);
      cp.push({ chapter: ch, ...st });
    }
    setChapterProgress(cp);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  return { ...stats, chapterProgress, loading, refresh };
}
