export function loadChapterPositions(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("chapterPositions") || "{}");
  } catch {
    return {};
  }
}

export function saveChapterPosition(chapter: string, index: number) {
  const pos = loadChapterPositions();
  pos[chapter] = index;
  localStorage.setItem("chapterPositions", JSON.stringify(pos));
}

export function loadDailyGoal(): number {
  if (typeof window === "undefined") return 50;
  const v = localStorage.getItem("dailyGoal");
  return v ? parseInt(v, 10) || 50 : 50;
}

export function saveDailyGoal(goal: number) {
  localStorage.setItem("dailyGoal", String(goal));
}

export function loadProfile(): { name: string; avatar: string; wechat: { bound: boolean; openid?: string; nickname?: string; headimgurl?: string } } {
  if (typeof window === "undefined") return { name: "刷题达人", avatar: "👤", wechat: { bound: false } };
  try {
    const saved = JSON.parse(localStorage.getItem("profile") || "{}");
    return {
      name: saved.name || "刷题达人",
      avatar: saved.avatar || "👤",
      wechat: saved.wechat || { bound: false },
    };
  } catch {
    return { name: "刷题达人", avatar: "👤", wechat: { bound: false } };
  }
}

export function saveProfile(profile: { name: string; avatar: string; wechat: { bound: boolean; openid?: string; nickname?: string; headimgurl?: string } }) {
  localStorage.setItem("profile", JSON.stringify(profile));
}

