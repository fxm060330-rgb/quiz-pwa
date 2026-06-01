import type { Table } from "dexie";
import type { Question, AnswerRecord, Favorite, ExamSession, StudyGroup, GroupMember } from "@/types";

interface QuizDBInstance {
  questions: Table<Question, string>;
  records: Table<AnswerRecord, number>;
  favorites: Table<Favorite, string>;
  examSessions: Table<ExamSession, string>;
  groups: Table<StudyGroup, string>;
  groupMembers: Table<GroupMember, number>;
}

let db: QuizDBInstance | null = null;

async function getDb(): Promise<QuizDBInstance> {
  if (db) return db;
  const DexieClass = (await import("dexie")).default;
  class QuizDB extends DexieClass {
    questions!: Table<Question, string>;
    records!: Table<AnswerRecord, number>;
    favorites!: Table<Favorite, string>;
    examSessions!: Table<ExamSession, string>;
    groups!: Table<StudyGroup, string>;
    groupMembers!: Table<GroupMember, number>;
    constructor() {
      super("QuizDB");
      this.version(1).stores({
        questions: "id, chapter, difficulty, type",
        records: "++id, questionId, isCorrect, mode, timestamp, examId",
        favorites: "questionId, timestamp",
        examSessions: "id, startTime",
      });
      this.version(2).stores({
        questions: "id, chapter, difficulty, type",
        records: "++id, questionId, isCorrect, mode, timestamp, examId",
        favorites: "questionId, timestamp",
        examSessions: "id, startTime",
        groups: "id, name, createdAt",
        groupMembers: "++id, groupId, role",
      });
    }
  }
  db = new QuizDB() as QuizDBInstance;
  return db;
}

export async function importQuestions(questions: Question[]): Promise<void> {
  const d = await getDb();
  await d.questions.bulkPut(questions);
}

export async function getQuestionCount(): Promise<number> {
  const d = await getDb();
  return d.questions.count();
}

export async function getChapters(): Promise<string[]> {
  const d = await getDb();
  const chapters = await d.questions.orderBy("chapter").uniqueKeys();
  return chapters as string[];
}

export async function getChapterQuestions(chapter: string): Promise<Question[]> {
  const d = await getDb();
  const all = await d.questions.toArray();
  return all.filter((q) => q.chapter === chapter);
}

export async function getChapterStats(
  chapter: string
): Promise<{ total: number; completed: number; correct: number }> {
  const d = await getDb();
  const questions = await d.questions.toArray();
  const chQuestions = questions.filter((q) => q.chapter === chapter);
  const questionIds = new Set(chQuestions.map((q) => q.id));
  const records = await d.records.toArray();
  const chRecords = records.filter((r) => questionIds.has(r.questionId));
  const correct = chRecords.filter((r) => r.isCorrect).length;
  const completedIds = new Set(chRecords.map((r) => r.questionId));
  return { total: chQuestions.length, completed: completedIds.size, correct };
}

export async function getQuestionById(id: string): Promise<Question | undefined> {
  const d = await getDb();
  return d.questions.get(id);
}

export async function saveRecord(record: AnswerRecord): Promise<number> {
  const d = await getDb();
  return d.records.put(record);
}

export async function getWrongQuestions(): Promise<Question[]> {
  const d = await getDb();
  const allRecords = await d.records.toArray();
  const wrongRecords = allRecords.filter((r) => r.isCorrect === false);
  wrongRecords.sort((a, b) => b.timestamp - a.timestamp);
  const questionIds = Array.from(new Set(wrongRecords.map((r) => r.questionId)));
  const allQuestions = await d.questions.toArray();
  const questionMap = new Map(allQuestions.map((q) => [q.id, q]));
  return questionIds.map((id) => questionMap.get(id)).filter((q): q is Question => q !== undefined);
}

export async function getWrongQuestionIds(): Promise<Set<string>> {
  const d = await getDb();
  const allRecords = await d.records.toArray();
  return new Set(allRecords.filter((r) => r.isCorrect === false).map((r) => r.questionId));
}

export async function removeWrongRecord(questionId: string): Promise<void> {
  const d = await getDb();
  const allRecords = await d.records.toArray();
  const toDelete = allRecords.filter((r) => r.questionId === questionId && r.isCorrect === false);
  await Promise.all(toDelete.map((r) => d.records.delete(r.id!)));
}

export async function addFavorite(questionId: string): Promise<void> {
  const d = await getDb();
  await d.favorites.put({ questionId, timestamp: Date.now() });
}

export async function removeFavorite(questionId: string): Promise<void> {
  const d = await getDb();
  await d.favorites.delete(questionId);
}

export async function getFavoriteIds(): Promise<Set<string>> {
  const d = await getDb();
  const favs = await d.favorites.toArray();
  return new Set(favs.map((f) => f.questionId));
}

export async function getFavoriteQuestions(): Promise<Question[]> {
  const d = await getDb();
  const favs = await d.favorites.toArray();
  const ids = favs.map((f) => f.questionId);
  const questions = await d.questions.bulkGet(ids);
  return questions.filter((q): q is Question => q !== undefined);
}

export async function saveExamSession(session: ExamSession): Promise<void> {
  const d = await getDb();
  await d.examSessions.put(session);
}

export async function getExamSessions(): Promise<ExamSession[]> {
  const d = await getDb();
  const sessions = await d.examSessions.toArray();
  return sessions.sort((a, b) => b.startTime - a.startTime);
}

export async function getUnfinishedExamSession(): Promise<ExamSession | null> {
  const d = await getDb();
  const all = await d.examSessions.toArray();
  return all.find((s) => s.status === "in_progress") || null;
}

export async function deleteExamSession(id: string): Promise<void> {
  const d = await getDb();
  await d.examSessions.delete(id);
}

export async function getStats(): Promise<{
  totalPracticed: number;
  totalCorrect: number;
  correctRate: number;
  todayCount: number;
  streak: number;
}> {
  const d = await getDb();
  const records = await d.records.toArray();
  const totalPracticed = records.length;
  const totalCorrect = records.filter((r) => r.isCorrect).length;
  const correctRate = totalPracticed > 0 ? Math.round((totalCorrect / totalPracticed) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();
  const todayCount = records.filter((r) => r.timestamp >= todayTimestamp).length;

  let streak = 0;
  const daySet = new Set(
    records.map((r) => {
      const d = new Date(r.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );
  const sortedDays = [...daySet].sort((a, b) => b - a);
  for (let i = 0; i < sortedDays.length; i++) {
    const expected = todayTimestamp - i * 86400000;
    if (sortedDays[i] === expected) {
      streak++;
    } else {
      break;
    }
  }

  return { totalPracticed, totalCorrect, correctRate, todayCount, streak };
}

export async function getTodayStats(): Promise<{
  todayCount: number;
  todayCorrect: number;
  todayCorrectRate: number;
  todayDuration: number;
}> {
  const d = await getDb();
  const allRecords = await d.records.toArray();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();
  const todayRecords = allRecords.filter((r) => r.timestamp >= todayTimestamp);

  const todayCount = todayRecords.length;
  const todayCorrect = todayRecords.filter((r) => r.isCorrect).length;
  const todayCorrectRate = todayCount > 0 ? Math.round((todayCorrect / todayCount) * 100) : 0;

  let todayDuration = 0;
  if (todayRecords.length >= 2) {
    const timestamps = todayRecords.map((r) => r.timestamp);
    todayDuration = Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 60000);
  }

  return { todayCount, todayCorrect, todayCorrectRate, todayDuration };
}

export async function clearAllData(): Promise<void> {
  const d = await getDb();
  await Promise.all([
    d.questions.clear(),
    d.records.clear(),
    d.favorites.clear(),
    d.examSessions.clear(),
    d.groups.clear(),
    d.groupMembers.clear(),
  ]);
}

export async function exportAllData() {
  const d = await getDb();
  const [questions, records, favorites, examSessions, groups, groupMembers] = await Promise.all([
    d.questions.toArray(),
    d.records.toArray(),
    d.favorites.toArray(),
    d.examSessions.toArray(),
    d.groups.toArray(),
    d.groupMembers.toArray(),
  ]);
  return { questions, records, favorites, examSessions, groups, groupMembers, exportTime: new Date().toISOString() };
}

export async function getRandomQuestions(count: number, chapter?: string): Promise<Question[]> {
  const d = await getDb();
  const all = await d.questions.toArray();
  const pool = chapter ? all.filter((q) => q.chapter === chapter) : all;
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export async function searchQuestions(keyword: string): Promise<Question[]> {
  const d = await getDb();
  const all = await d.questions.toArray();
  const kw = keyword.toLowerCase();
  return all.filter(
    (q) =>
      q.question.toLowerCase().includes(kw) ||
      q.options.some((o) => o.toLowerCase().includes(kw)) ||
      (q.analysis && q.analysis.toLowerCase().includes(kw))
  );
}

export async function getWrongQuestionCounts(): Promise<Map<string, number>> {
  const d = await getDb();
  const records = await d.records.toArray();
  const wrongs = records.filter((r) => r.isCorrect === false);
  const countMap = new Map<string, number>();
  for (const r of wrongs) {
    countMap.set(r.questionId, (countMap.get(r.questionId) || 0) + 1);
  }
  return countMap;
}

// ---------- Group functions ----------
// Routes to Supabase cloud when configured, falls back to local IndexedDB

import * as cloud from "@/lib/supabase";

function isCloudEnabled(): boolean {
  return cloud.isSupabaseConfigured();
}

// Try cloud first, fall back to local if unreachable
async function tryCloud<T>(cloudFn: () => Promise<T>, localFn: () => Promise<T>): Promise<T> {
  if (!isCloudEnabled()) return localFn();
  try {
    return await cloudFn();
  } catch {
    return localFn();
  }
}

export async function createGroup(group: StudyGroup): Promise<void> {
  return tryCloud(() => cloud.cloudCreateGroup(group), async () => {
    const d = await getDb();
    await d.groups.put(group);
    await d.groupMembers.put({
      groupId: group.id, name: group.creatorName, avatar: "👤", role: "admin", joinedAt: Date.now(),
    });
  });
}

export async function joinGroup(groupId: string, name: string, avatar: string): Promise<boolean> {
  return tryCloud(() => cloud.cloudJoinGroup(groupId, name, avatar), async () => {
    const d = await getDb();
    const existing = await d.groupMembers.toArray();
    if (existing.some((m) => m.groupId === groupId && m.name === name)) return false;
    await d.groupMembers.put({ groupId, name, avatar, role: "member", joinedAt: Date.now() });
    return true;
  });
}

export async function checkGroupPassword(password: string): Promise<StudyGroup | null> {
  return tryCloud(() => cloud.cloudCheckGroupPassword(password), async () => {
    const d = await getDb();
    const all = await d.groups.toArray();
    return all.find((g) => g.password === password) || null;
  });
}

export async function getMyGroups(userName?: string): Promise<StudyGroup[]> {
  return tryCloud(() => cloud.cloudGetMyGroups(userName || ""), async () => {
    const d = await getDb();
    const memberships = await d.groupMembers.toArray();
    const groupIds = Array.from(new Set(memberships.map((m) => m.groupId)));
    const allGroups = await d.groups.toArray();
    return allGroups.filter((g) => groupIds.includes(g.id));
  });
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  return tryCloud(() => cloud.cloudGetGroupMembers(groupId), async () => {
    const d = await getDb();
    const all = await d.groupMembers.toArray();
    return all.filter((m) => m.groupId === groupId);
  });
}

export async function updateMemberRole(memberId: number, role: "admin" | "member"): Promise<void> {
  return tryCloud(() => cloud.cloudUpdateMemberRole(memberId, role), async () => {
    const d = await getDb();
    const member = await d.groupMembers.get(memberId);
    if (member) { member.role = role; await d.groupMembers.put(member); }
  });
}

export async function removeMember(memberId: number): Promise<void> {
  return tryCloud(() => cloud.cloudRemoveMember(memberId), async () => {
    const d = await getDb();
    await d.groupMembers.delete(memberId);
  });
}

export async function leaveGroup(groupId: string, userName: string): Promise<void> {
  return tryCloud(() => cloud.cloudLeaveGroup(groupId, userName), async () => {
    const d = await getDb();
    const all = await d.groupMembers.toArray();
    const member = all.find((m) => m.groupId === groupId && m.name === userName);
    if (member?.id != null) await d.groupMembers.delete(member.id);
    const remaining = all.filter((m) => m.groupId === groupId && m.name !== userName);
    if (remaining.length === 0) await d.groups.delete(groupId);
  });
}

export async function getGroupLeaderboard(groupId: string): Promise<{ name: string; avatar: string; total: number; correct: number }[]> {
  return tryCloud(() => cloud.cloudGetGroupLeaderboard(groupId), async () => {
    const d = await getDb();
    const members = await d.groupMembers.toArray();
    const groupMembers = members.filter((m) => m.groupId === groupId);
    const records = await d.records.toArray();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    return groupMembers
      .map((m) => {
        const userRecords = records.filter((r) => r.userName === m.name && r.timestamp >= todayTimestamp);
        const correct = userRecords.filter((r) => r.isCorrect).length;
        return { name: m.name, avatar: m.avatar, total: userRecords.length, correct };
      })
      .sort((a, b) => b.total - a.total || b.correct - a.correct);
  });
}
