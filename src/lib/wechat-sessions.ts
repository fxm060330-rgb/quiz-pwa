// In-memory session store (dev only, resets on server restart)
const sessions = new Map<string, { status: "pending" | "bound"; openid?: string; nickname?: string; headimgurl?: string; createdAt: number }>();

// Clean expired sessions (>10 min)
function cleanSessions() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.createdAt > 600000) sessions.delete(id);
  }
}

export function createSession(): string {
  cleanSessions();
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessions.set(id, { status: "pending", createdAt: Date.now() });
  return id;
}

export function getSession(id: string) {
  return sessions.get(id) || null;
}

export function setSessionBound(id: string, data: { openid: string; nickname: string; headimgurl: string }) {
  sessions.set(id, { status: "bound", ...data, createdAt: Date.now() });
}

export function deleteSession(id: string) {
  sessions.delete(id);
}
