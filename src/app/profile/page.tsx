"use client";

import { useState, useRef, useEffect } from "react";
import { useStats } from "@/hooks/useStats";
import { clearAllData, exportAllData, importQuestions } from "@/lib/db";
import { useApp } from "@/context/AppContext";
import { loadProfile, saveProfile } from "@/lib/storage";
import StatsOverview from "@/components/StatsOverview";

const AVATARS = ["👤", "🐱", "🐶", "🐼", "🦊", "🐰", "🐨", "🐯", "🐸", "🐵", "🦁", "🐮", "🐙", "🦄", "🐳", "🎓", "💪", "🌟", "🔥", "💎"];

function DarkModeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const v = localStorage.getItem("darkMode") === "1";
    setDark(v);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("darkMode", next ? "1" : "0");
    document.documentElement.classList.toggle("dark", next);
  };
  return (
    <button onClick={toggle} className="w-full flex items-center justify-between">
      <span className="text-sm font-semibold text-text-primary">深色模式</span>
      <span className="text-lg">{dark ? "🌙" : "☀️"}</span>
    </button>
  );
}

interface WechatInfo {
  bound: boolean;
  openid?: string;
  nickname?: string;
  headimgurl?: string;
}

interface Profile {
  name: string;
  avatar: string;
  wechat: WechatInfo;
}

export default function ProfilePage() {
  const { questionCount, importing, refreshCount } = useApp();
  const stats = useStats();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chapterExpanded, setChapterExpanded] = useState(false);
  const [profile, setProfile] = useState<Profile>({ name: "刷题达人", avatar: "👤", wechat: { bound: false } });
  const [editingName, setEditingName] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);

  // Wechat OAuth binding
  const [showWechatModal, setShowWechatModal] = useState(false);
  const [wechatStep, setWechatStep] = useState<"loading" | "qrcode" | "done" | "error">("loading");
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [authUrl, setAuthUrl] = useState("");
  const [bindError, setBindError] = useState("");
  const sessionRef = useRef("");
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  const updateProfile = (p: Profile) => {
    setProfile(p);
    saveProfile(p);
  };

  const startBind = async () => {
    setShowWechatModal(true);
    setWechatStep("loading");
    setBindError("");
    try {
      const res = await fetch("/api/wechat/bind");
      const data = await res.json();
      if (data.error) {
        setBindError(data.error);
        setWechatStep("error");
        return;
      }
      sessionRef.current = data.sessionId;
      setQrImageUrl(data.qrImageUrl);
      setAuthUrl(data.authUrl);
      setWechatStep("qrcode");
      startPolling(data.sessionId);
    } catch {
      setBindError("网络错误，请重试");
      setWechatStep("error");
    }
  };

  const startPolling = (sessionId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/wechat/status?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.status === "bound") {
          clearInterval(pollRef.current);
          const newProfile = {
            ...profile,
            wechat: {
              bound: true,
              openid: data.openid,
              nickname: data.nickname,
              headimgurl: data.headimgurl,
            },
          };
          updateProfile(newProfile);
          setWechatStep("done");
        } else if (data.status === "expired") {
          clearInterval(pollRef.current);
          setBindError("绑定会话已过期，请重新发起");
          setWechatStep("error");
        }
      } catch {
        // keep polling
      }
    }, 2000);
  };

  const closeWechatModal = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setShowWechatModal(false);
  };

  const handleExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const questions = JSON.parse(text);
      if (!Array.isArray(questions) || questions.length === 0) {
        alert("文件中没有有效的题目数据");
        return;
      }
      await clearAllData();
      await importQuestions(questions);
      await refreshCount();
      await stats.refresh();
      alert(`成功导入 ${questions.length} 道题目！`);
    } catch (err) {
      alert(`导入失败: ${(err as Error).message}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClear = async () => {
    if (window.confirm("确定要清除所有数据吗？此操作不可恢复。")) {
      await clearAllData();
      await refreshCount();
      await stats.refresh();
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header - editable */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setEditingAvatar(true)}
          className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-2xl flex-shrink-0 transition-all duration-200 active:scale-95 relative"
          title="更换头像"
        >
          {profile.avatar}
          <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
            <span className="text-xs">✎</span>
          </span>
        </button>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              type="text"
              defaultValue={profile.name}
              autoFocus
              maxLength={12}
              className="text-lg font-bold text-primary bg-transparent border-b-2 border-primary outline-none w-full pb-0.5"
              onBlur={(e) => {
                const v = e.target.value.trim();
                updateProfile({ ...profile, name: v || profile.name });
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = (e.target as HTMLInputElement).value.trim();
                  updateProfile({ ...profile, name: v || profile.name });
                  setEditingName(false);
                }
              }}
            />
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-primary">{profile.name}</h1>
              <button onClick={() => setEditingName(true)} className="text-text-secondary text-xs">✎</button>
            </div>
          )}

          {/* WeChat binding */}
          {profile.wechat.bound ? (
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {profile.wechat.headimgurl && (
                <img src={profile.wechat.headimgurl} alt="" className="w-5 h-5 rounded-full" />
              )}
              <span className="text-xs text-correct font-semibold flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-correct text-white flex items-center justify-center text-[10px]">✓</span>
                已绑定微信
              </span>
              <span className="text-xs text-text-secondary">{profile.wechat.nickname}</span>
              <button
                onClick={() => updateProfile({ ...profile, wechat: { bound: false } })}
                className="text-xs text-text-secondary underline"
              >
                解绑
              </button>
            </div>
          ) : (
            <button
              onClick={startBind}
              className="mt-1.5 px-3 py-0.5 rounded-full text-xs font-semibold transition-all duration-200 bg-gray-100 text-text-secondary hover:bg-primary/10 hover:text-primary"
            >
              绑定微信
            </button>
          )}
        </div>
      </div>

      {/* WeChat binding modal */}
      {showWechatModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-6" onClick={closeWechatModal}>
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-primary mb-4 text-center">绑定微信</h3>

            {wechatStep === "loading" && (
              <div className="flex flex-col items-center py-8">
                <div className="animate-pulse text-text-secondary">正在生成二维码...</div>
              </div>
            )}

            {wechatStep === "qrcode" && (
              <div className="flex flex-col items-center">
                {/* QR Code image */}
                <div className="w-48 h-48 bg-gray-100 rounded-xl mb-3 overflow-hidden">
                  {qrImageUrl && (
                    <img src={qrImageUrl} alt="微信扫码绑定" className="w-full h-full object-contain" />
                  )}
                </div>
                <p className="text-sm text-text-primary font-semibold mb-1">使用微信扫码绑定</p>
                <p className="text-xs text-text-secondary mb-3">
                  扫码后点击&ldquo;同意&rdquo;即可完成绑定
                </p>

                {/* Alternative: open URL directly in WeChat */}
                <button
                  onClick={() => {
                    if (authUrl) window.open(authUrl, "_blank");
                  }}
                  className="text-xs text-primary underline"
                >
                  无法扫码？在微信中打开此链接
                </button>
              </div>
            )}

            {wechatStep === "done" && (
              <div className="flex flex-col items-center py-6">
                <span className="text-5xl mb-3">🎉</span>
                <p className="text-sm font-bold text-correct mb-1">绑定成功！</p>
                {profile.wechat.nickname && (
                  <p className="text-sm text-text-secondary mb-4">微信号：{profile.wechat.nickname}</p>
                )}
                <button
                  onClick={closeWechatModal}
                  className="px-8 py-2 rounded-full bg-primary text-white text-sm font-semibold"
                >
                  完成
                </button>
              </div>
            )}

            {wechatStep === "error" && (
              <div className="flex flex-col items-center py-6">
                <span className="text-5xl mb-3">😵</span>
                <p className="text-sm text-wrong font-semibold mb-1">绑定失败</p>
                <p className="text-xs text-text-secondary mb-4 text-center">{bindError}</p>
                <div className="flex gap-3">
                  <button onClick={closeWechatModal} className="px-4 py-2 rounded-full border border-gray-200 text-text-secondary text-sm">
                    取消
                  </button>
                  <button onClick={startBind} className="px-4 py-2 rounded-full bg-primary text-white text-sm">
                    重试
                  </button>
                </div>
              </div>
            )}

            {wechatStep === "qrcode" && (
              <button onClick={closeWechatModal} className="w-full mt-3 py-2 text-text-secondary text-sm">
                取消
              </button>
            )}
          </div>
        </div>
      )}

      {/* Avatar picker modal */}
      {editingAvatar && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end justify-center" onClick={() => setEditingAvatar(false)}>
          <div
            className="bg-white rounded-t-2xl p-5 w-full max-w-lg animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-text-primary mb-3 text-center">选择头像</h3>
            <div className="grid grid-cols-5 gap-3">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { updateProfile({ ...profile, avatar: emoji }); setEditingAvatar(false); }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-200 active:scale-90 ${
                    profile.avatar === emoji ? "bg-primary/10 ring-2 ring-primary" : "bg-gray-50"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button onClick={() => setEditingAvatar(false)} className="w-full mt-4 py-2 text-text-secondary text-sm">
              取消
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <h2 className="text-sm font-semibold text-text-secondary mb-3">概览</h2>

      <div className="rounded-2xl bg-primary p-5 text-white mb-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{stats.todayCount}</div>
            <div className="text-xs text-white/60 mt-1">今日已学习&复习</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{stats.totalPracticed}</div>
            <div className="text-xs text-white/60 mt-1">累计学习</div>
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-text-secondary mb-3">学习统计</h2>
      {importing ? (
        <p className="text-text-secondary text-sm py-4">正在自动导入题库...</p>
      ) : questionCount === 0 ? (
        <p className="text-text-secondary text-sm py-4">还没有数据，请先导入题库</p>
      ) : (
        <StatsOverview
          totalPracticed={stats.totalPracticed}
          correctRate={stats.correctRate}
          todayCount={stats.todayCount}
          streak={stats.streak}
        />
      )}

      {/* Chapter progress - collapsible */}
      {stats.chapterProgress.length > 0 && (
        <div className="rounded-2xl bg-white shadow-sm p-4 mt-6">
          <button
            onClick={() => setChapterExpanded(!chapterExpanded)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-sm font-semibold text-text-secondary">章节进度</h2>
            <span className="text-xs text-text-secondary transition-transform duration-200" style={{ transform: chapterExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
              ▼
            </span>
          </button>
          {chapterExpanded && (
            <div className="space-y-2 mt-4">
              {stats.chapterProgress.map((cp) => (
                <div key={cp.chapter} className="rounded-xl bg-warm p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-text-primary line-clamp-1 flex-1 mr-2">
                      {cp.chapter}
                    </span>
                    <span className="text-xs text-text-secondary flex-shrink-0">
                      {cp.completed}/{cp.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${cp.total > 0 ? Math.round((cp.completed / cp.total) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings */}
      <h2 className="text-sm font-semibold text-text-secondary mt-6 mb-3">设置</h2>
      <div className="rounded-2xl bg-white shadow-sm p-4 mb-5">
        <DarkModeToggle />
      </div>

      {/* Data management */}
      <h2 className="text-sm font-semibold text-text-secondary mt-6 mb-3">数据管理</h2>
      <div className="space-y-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-4 rounded-2xl bg-white shadow-sm text-left flex items-center justify-between transition-all duration-200 active:scale-[0.98]"
        >
          <div>
            <span className="text-sm font-semibold text-text-primary">导入题库</span>
            <p className="text-xs text-text-secondary mt-0.5">上传 JSON 题库文件</p>
          </div>
          <span className="text-text-secondary">📥</span>
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />

        <button
          onClick={handleExport}
          disabled={questionCount === 0}
          className="w-full p-4 rounded-2xl bg-white shadow-sm text-left flex items-center justify-between transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
        >
          <span className="text-sm font-semibold text-text-primary">导出数据</span>
          <span className="text-text-secondary">📤</span>
        </button>

        <button
          onClick={handleClear}
          disabled={questionCount === 0}
          className="w-full p-4 rounded-2xl bg-white shadow-sm text-left flex items-center justify-between transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
        >
          <span className="text-sm font-semibold text-wrong">清除所有数据</span>
          <span>🗑</span>
        </button>
      </div>
    </div>
  );
}
