import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StudyGroup, GroupMember } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: SupabaseClient<any, "public", any> | null = null;

function getClient() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("请在 .env.local 中配置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY");
  _client = createClient(url, key);
  return _client;
}

function supabase() {
  try { return getClient(); } catch { return null; }
}

// ==================== Groups ====================

export async function cloudCreateGroup(group: StudyGroup): Promise<void> {
  const sb = supabase();
  if (!sb) throw new Error("Supabase 未配置");
  const { error } = await sb.from("groups").insert({
    id: group.id, name: group.name, description: group.description,
    password: group.password, creator_name: group.creatorName, created_at: group.createdAt,
  });
  if (error) throw error;
  const { error: mErr } = await sb.from("group_members").insert({
    group_id: group.id, name: group.creatorName, avatar: "👤", role: "admin", joined_at: Date.now(),
  });
  if (mErr) throw mErr;
}

export async function cloudJoinGroup(groupId: string, name: string, avatar: string): Promise<boolean> {
  const sb = supabase();
  if (!sb) throw new Error("Supabase 未配置");
  const { data } = await sb.from("group_members").select("id").eq("group_id", groupId).eq("name", name);
  if (data && data.length > 0) return false;
  const { error } = await sb.from("group_members").insert({
    group_id: groupId, name, avatar, role: "member", joined_at: Date.now(),
  });
  if (error) throw error;
  return true;
}

export async function cloudCheckGroupPassword(password: string): Promise<StudyGroup | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.from("groups").select("*").eq("password", password);
  if (!data || data.length === 0) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = data[0];
  return { id: g.id, name: g.name, description: g.description || "", password: g.password, creatorName: g.creator_name, createdAt: g.created_at };
}

export async function cloudGetMyGroups(userName: string): Promise<StudyGroup[]> {
  const sb = supabase();
  if (!sb) return [];
  const { data: memberships } = await sb.from("group_members").select("group_id").eq("name", userName);
  if (!memberships || memberships.length === 0) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const groupIds = memberships.map((m: any) => m.group_id);
  const { data } = await sb.from("groups").select("*").in("id", groupIds);
  if (!data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((g: any) => ({ id: g.id, name: g.name, description: g.description || "", password: g.password, creatorName: g.creator_name, createdAt: g.created_at }));
}

export async function cloudGetGroupMembers(groupId: string): Promise<GroupMember[]> {
  const sb = supabase();
  if (!sb) return [];
  const { data } = await sb.from("group_members").select("*").eq("group_id", groupId).order("joined_at", { ascending: true });
  if (!data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((m: any) => ({ id: m.id, groupId: m.group_id, name: m.name, avatar: m.avatar, role: m.role as "admin" | "member", joinedAt: m.joined_at }));
}

export async function cloudUpdateMemberRole(memberId: number, role: "admin" | "member"): Promise<void> {
  const sb = supabase();
  if (!sb) throw new Error("Supabase 未配置");
  const { error } = await sb.from("group_members").update({ role }).eq("id", memberId);
  if (error) throw error;
}

export async function cloudRemoveMember(memberId: number): Promise<void> {
  const sb = supabase();
  if (!sb) throw new Error("Supabase 未配置");
  const { error } = await sb.from("group_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function cloudLeaveGroup(groupId: string, userName: string): Promise<void> {
  const sb = supabase();
  if (!sb) throw new Error("Supabase 未配置");
  const { error: e1 } = await sb.from("group_members").delete().eq("group_id", groupId).eq("name", userName);
  if (e1) throw e1;
  const { data } = await sb.from("group_members").select("id").eq("group_id", groupId);
  if (!data || data.length === 0) {
    await sb.from("groups").delete().eq("id", groupId);
  }
}

export async function cloudGetGroupLeaderboard(groupId: string): Promise<{ name: string; avatar: string; total: number; correct: number }[]> {
  const sb = supabase();
  if (!sb) return [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  const { data: members } = await sb.from("group_members").select("*").eq("group_id", groupId);
  if (!members) return [];
  const { data: records } = await sb.from("group_records").select("user_name, is_correct").eq("group_id", groupId).gte("timestamp", todayTs);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statsMap = new Map<string, { total: number; correct: number }>();
  for (const m of members) { statsMap.set((m as Record<string,unknown>).name as string, { total: 0, correct: 0 }); }
  if (records) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of records as any[]) {
      const s = statsMap.get(r.user_name);
      if (s) { s.total++; if (r.is_correct) s.correct++; }
    }
  }

  return (members as Record<string,unknown>[])
    .map((m) => {
      const s = statsMap.get(m.name as string) || { total: 0, correct: 0 };
      return { name: m.name as string, avatar: m.avatar as string, total: s.total, correct: s.correct };
    })
    .sort((a, b) => b.total - a.total || b.correct - a.correct);
}

export async function cloudPushRecord(groupId: string, userName: string, isCorrect: boolean): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  await sb.from("group_records").insert({ group_id: groupId, user_name: userName, is_correct: isCorrect, timestamp: Date.now() });
}

export async function cloudPushRecordToMyGroups(userName: string, isCorrect: boolean): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  const { data } = await sb.from("group_members").select("group_id").eq("name", userName);
  if (!data || data.length === 0) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inserts = (data as any[]).map((m: any) => ({ group_id: m.group_id, user_name: userName, is_correct: isCorrect, timestamp: Date.now() }));
  await sb.from("group_records").insert(inserts);
}

// ==================== WeChat binding ====================

export async function cloudBindWechat(userName: string, openid: string, nickname: string, headimgurl: string): Promise<void> {
  const sb = supabase();
  if (!sb) throw new Error("Supabase 未配置");
  await sb.from("user_bindings").upsert({
    user_name: userName, wechat_openid: openid, wechat_nickname: nickname, wechat_headimgurl: headimgurl, created_at: Date.now(),
  }, { onConflict: "user_name" });
}

export async function cloudGetUserBinding(userName: string): Promise<{ openid: string; nickname: string; headimgurl: string } | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.from("user_bindings").select("*").eq("user_name", userName);
  if (!data || data.length === 0) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d: any = data[0];
  return { openid: d.wechat_openid, nickname: d.wechat_nickname, headimgurl: d.wechat_headimgurl };
}

// ==================== Status ====================

export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
