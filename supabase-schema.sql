-- 在 Supabase SQL Editor 中执行此文件
-- 22 人小团体使用，RLS 设为允许已认证/匿名用户访问

-- 群组表
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  password TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

-- 群组成员表
CREATE TABLE IF NOT EXISTS group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT DEFAULT '👤',
  role TEXT DEFAULT 'member',
  joined_at BIGINT NOT NULL
);

-- 群组答题记录（用于排行榜）
CREATE TABLE IF NOT EXISTS group_records (
  id BIGSERIAL PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  timestamp BIGINT NOT NULL DEFAULT 0
);

-- 用户绑定表（微信 / 用户名）
CREATE TABLE IF NOT EXISTS user_bindings (
  id BIGSERIAL PRIMARY KEY,
  user_name TEXT NOT NULL UNIQUE,
  wechat_openid TEXT,
  wechat_nickname TEXT,
  wechat_headimgurl TEXT,
  created_at BIGINT NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_records_group ON group_records(group_id);
CREATE INDEX IF NOT EXISTS idx_group_records_user ON group_records(group_id, user_name);
CREATE INDEX IF NOT EXISTS idx_user_bindings_openid ON user_bindings(wechat_openid);

-- RLS: 允许所有操作（22 人信任团体，anon key 仅用于自己人）
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on groups" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on group_members" ON group_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on group_records" ON group_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on user_bindings" ON user_bindings FOR ALL USING (true) WITH CHECK (true);
