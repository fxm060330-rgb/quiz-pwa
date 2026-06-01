"use client";

import { useState, useEffect } from "react";
import type { StudyGroup, GroupMember } from "@/types";
import { createGroup, joinGroup, checkGroupPassword, getMyGroups, getGroupMembers, getGroupLeaderboard, updateMemberRole, removeMember, leaveGroup } from "@/lib/db";
import { loadProfile } from "@/lib/storage";

export default function GroupsPage() {
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ name: "刷题达人", avatar: "👤" });

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ name: string; avatar: string; total: number; correct: number }[]>([]);
  const [groupView, setGroupView] = useState<"list" | "detail">("list");

  // Form states
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createPwd, setCreatePwd] = useState("");
  const [joinPwd, setJoinPwd] = useState("");

  const load = async () => {
    const p = loadProfile();
    setProfile({ name: p.name, avatar: p.avatar });
    const groups = await getMyGroups(p.name);
    setMyGroups(groups);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!createName.trim() || !createPwd.trim()) { alert("请填写群组名称和口令"); return; }
    const group: StudyGroup = {
      id: "group-" + Date.now(),
      name: createName.trim(),
      description: createDesc.trim(),
      password: createPwd.trim(),
      creatorName: profile.name,
      createdAt: Date.now(),
    };
    await createGroup(group);
    setCreateName(""); setCreateDesc(""); setCreatePwd("");
    setShowCreate(false);
    await load();
  };

  const handleJoin = async () => {
    if (!joinPwd.trim()) { alert("请输入群组口令"); return; }
    const group = await checkGroupPassword(joinPwd.trim());
    if (!group) { alert("无效的口令，请检查后重试"); return; }
    const ok = await joinGroup(group.id, profile.name, profile.avatar);
    if (!ok) { alert("你已在该群组中"); return; }
    setJoinPwd("");
    setShowJoin(false);
    await load();
  };

  const openDetail = async (group: StudyGroup) => {
    setSelectedGroup(group);
    const mems = await getGroupMembers(group.id);
    setMembers(mems);
    const lb = await getGroupLeaderboard(group.id);
    setLeaderboard(lb);
    setGroupView("detail");
  };

  const handleSetAdmin = async (memberId: number) => {
    await updateMemberRole(memberId, "admin");
    if (selectedGroup) {
      const mems = await getGroupMembers(selectedGroup.id);
      setMembers(mems);
    }
  };

  const handleKick = async (memberId: number) => {
    if (!window.confirm("确定要移出该成员吗？")) return;
    await removeMember(memberId);
    if (selectedGroup) {
      const mems = await getGroupMembers(selectedGroup.id);
      setMembers(mems);
    }
  };

  const handleLeave = async () => {
    if (!selectedGroup) return;
    if (!window.confirm("确定要退出该群组吗？")) return;
    await leaveGroup(selectedGroup.id, profile.name);
    setGroupView("list");
    setSelectedGroup(null);
    await load();
  };

  const isAdmin = selectedGroup && members.some((m) => m.name === profile.name && m.role === "admin");

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-text-secondary">加载中...</div></div>;
  }

  if (groupView === "detail" && selectedGroup) {
    return (
      <div className="px-4 pt-6 pb-4 min-h-screen">
        <button onClick={() => setGroupView("list")} className="text-primary text-sm mb-4">← 返回群组列表</button>
        <div className="rounded-2xl bg-primary p-5 text-white mb-5">
          <h1 className="text-xl font-bold mb-1">{selectedGroup.name}</h1>
          <p className="text-sm opacity-70">{selectedGroup.description || "暂无简介"}</p>
          <p className="text-xs text-white/50 mt-2">口令：{selectedGroup.password}</p>
        </div>

        {/* Leaderboard */}
        <h2 className="text-sm font-semibold text-text-secondary mb-3">🏆 今日排行</h2>
        <div className="rounded-2xl bg-white shadow-sm p-4 mb-5">
          {leaderboard.length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-4">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((m, i) => (
                <div key={m.name} className="flex items-center gap-3 py-1.5">
                  <span className="w-6 text-center font-bold text-sm" style={{ color: i === 0 ? "#C8913A" : i === 1 ? "#9CA3AF" : i === 2 ? "#D97706" : "#9CA3AF" }}>
                    {i + 1}
                  </span>
                  <span className="text-lg">{m.avatar}</span>
                  <span className="text-sm text-text-primary flex-1 font-medium">{m.name}</span>
                  <span className="text-xs text-text-secondary">{m.total} 题 / {m.correct} 对</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members */}
        <h2 className="text-sm font-semibold text-text-secondary mb-3">
          成员 ({members.length})
          {isAdmin && <span className="text-xs text-text-secondary ml-1">— 管理员</span>}
        </h2>
        <div className="rounded-2xl bg-white shadow-sm p-4 mb-5">
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-1.5">
                <span className="text-lg">{m.avatar}</span>
                <span className="text-sm text-text-primary flex-1">{m.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{m.role === "admin" ? "管理员" : "成员"}</span>
                {isAdmin && m.name !== profile.name && (
                  <div className="flex gap-1">
                    {m.role !== "admin" && (
                      <button onClick={() => handleSetAdmin(m.id!)} className="text-xs text-primary px-1">设为管理</button>
                    )}
                    <button onClick={() => handleKick(m.id!)} className="text-xs text-wrong px-1">移出</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleLeave} className="w-full py-3 rounded-full border-2 border-wrong text-wrong font-semibold text-sm mb-5">
          退出群组
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 min-h-screen">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-primary">群组</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowJoin(true)} className="px-4 py-1.5 rounded-full border border-primary text-primary text-xs font-semibold">
            加入群组
          </button>
          <button onClick={() => setShowCreate(true)} className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-semibold">
            创建群组
          </button>
        </div>
      </div>

      {myGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="text-5xl mb-4">👥</span>
          <p className="text-text-secondary text-sm mb-2">还没有加入任何群组</p>
          <p className="text-text-secondary text-xs">创建一个群组或通过口令加入</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myGroups.map((g) => (
            <button
              key={g.id}
              onClick={() => openDetail(g)}
              className="w-full p-4 rounded-2xl bg-white shadow-sm text-left transition-all duration-200 active:scale-[0.98]"
            >
              <h3 className="font-semibold text-text-primary text-sm">{g.name}</h3>
              <p className="text-xs text-text-secondary mt-1">{g.description || "暂无简介"}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-text-secondary">创建者：{g.creatorName}</span>
                <span className="text-xs text-text-secondary">口令：{g.password}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create group modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-6" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-primary mb-4 text-center">创建群组</h3>
            <div className="space-y-3">
              <input type="text" placeholder="群组名称" value={createName} onChange={(e) => setCreateName(e.target.value)} maxLength={20} className="w-full px-3 py-2 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              <input type="text" placeholder="群组简介（选填）" value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} maxLength={100} className="w-full px-3 py-2 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              <input type="text" placeholder="设置口令（用于他人加入）" value={createPwd} onChange={(e) => setCreatePwd(e.target.value)} maxLength={20} className="w-full px-3 py-2 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-full border border-gray-200 text-text-secondary text-sm font-semibold">取消</button>
              <button onClick={handleCreate} className="flex-1 py-2 rounded-full bg-primary text-white text-sm font-semibold">确认创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Join group modal */}
      {showJoin && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-6" onClick={() => setShowJoin(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-primary mb-4 text-center">加入群组</h3>
            <p className="text-xs text-text-secondary mb-3 text-center">输入群组口令即可加入</p>
            <input type="text" placeholder="输入群组口令" value={joinPwd} onChange={(e) => setJoinPwd(e.target.value)} maxLength={20} className="w-full px-3 py-2 rounded-xl bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowJoin(false)} className="flex-1 py-2 rounded-full border border-gray-200 text-text-secondary text-sm font-semibold">取消</button>
              <button onClick={handleJoin} className="flex-1 py-2 rounded-full bg-primary text-white text-sm font-semibold">加入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
