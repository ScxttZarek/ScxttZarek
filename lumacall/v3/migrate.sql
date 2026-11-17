-- LumaCall 3.0 additive migration. Idempotent. No existing rows are deleted.
CREATE TABLE IF NOT EXISTS v3_channels (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 server_id uuid NOT NULL REFERENCES v2_servers(id) ON DELETE CASCADE,
 name varchar(32) NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 32),
 kind varchar(8) NOT NULL CHECK(kind IN ('text','voice')),
 position int NOT NULL DEFAULT 0,
 is_private boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS v3_channels_unique_name ON v3_channels(server_id,kind,lower(name));
CREATE INDEX IF NOT EXISTS v3_channels_server ON v3_channels(server_id,kind,position);
ALTER TABLE v2_messages ADD COLUMN IF NOT EXISTS channel_id uuid REFERENCES v3_channels(id) ON DELETE SET NULL;
ALTER TABLE v2_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE v2_messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS v3_messages_channel ON v2_messages(channel_id,id DESC);
ALTER TABLE v2_users ADD COLUMN IF NOT EXISTS bio varchar(180) NOT NULL DEFAULT '';
ALTER TABLE v2_users ADD COLUMN IF NOT EXISTS presence varchar(12) NOT NULL DEFAULT 'online';
CREATE TABLE IF NOT EXISTS v3_roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 server_id uuid NOT NULL REFERENCES v2_servers(id) ON DELETE CASCADE,
 name varchar(32) NOT NULL,
 color char(7) NOT NULL DEFAULT '#aaaaaa' CHECK(color ~ '^#[a-fA-F0-9]{6}$'),
 priority int NOT NULL DEFAULT 0,
 manage_channels boolean NOT NULL DEFAULT false,
 manage_messages boolean NOT NULL DEFAULT false,
 moderate_members boolean NOT NULL DEFAULT false,
 manage_roles boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS v3_roles_unique_name ON v3_roles(server_id,lower(name));
CREATE TABLE IF NOT EXISTS v3_member_roles (
 server_id uuid NOT NULL,
 user_id uuid NOT NULL,
 role_id uuid NOT NULL REFERENCES v3_roles(id) ON DELETE CASCADE,
 PRIMARY KEY(server_id,user_id,role_id),
 FOREIGN KEY(server_id,user_id) REFERENCES v2_memberships(server_id,user_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS v3_channel_grants (
 channel_id uuid NOT NULL REFERENCES v3_channels(id) ON DELETE CASCADE,
 role_id uuid NOT NULL REFERENCES v3_roles(id) ON DELETE CASCADE,
 PRIMARY KEY(channel_id,role_id)
);
CREATE TABLE IF NOT EXISTS v3_bans (
 server_id uuid NOT NULL REFERENCES v2_servers(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES v2_users(id) ON DELETE CASCADE,
 banned_by uuid REFERENCES v2_users(id) ON DELETE SET NULL,
 reason varchar(300) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(server_id,user_id)
);
CREATE TABLE IF NOT EXISTS v3_reactions (
 message_id bigint NOT NULL REFERENCES v2_messages(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES v2_users(id) ON DELETE CASCADE,
 emoji varchar(24) NOT NULL,
 PRIMARY KEY(message_id,user_id,emoji)
);
CREATE TABLE IF NOT EXISTS v3_call_messages (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 server_id uuid NOT NULL REFERENCES v2_servers(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES v2_users(id),
 content varchar(2000) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS v3_call_messages_recent ON v3_call_messages(server_id,id DESC);
CREATE TABLE IF NOT EXISTS v3_dm_threads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_a uuid NOT NULL REFERENCES v2_users(id) ON DELETE CASCADE,
 user_b uuid NOT NULL REFERENCES v2_users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(user_a::text < user_b::text),
 UNIQUE(user_a,user_b)
);
CREATE TABLE IF NOT EXISTS v3_dm_messages (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 thread_id uuid NOT NULL REFERENCES v3_dm_threads(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES v2_users(id) ON DELETE CASCADE,
 content varchar(2000) NOT NULL,
 edited_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS v3_dm_recent ON v3_dm_messages(thread_id,id DESC);
CREATE TABLE IF NOT EXISTS v3_blocks (
 blocker_id uuid NOT NULL REFERENCES v2_users(id) ON DELETE CASCADE,
 blocked_id uuid NOT NULL REFERENCES v2_users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(blocker_id,blocked_id),
 CHECK(blocker_id<>blocked_id)
);
INSERT INTO v3_channels(server_id,name,kind,position)
 SELECT s.id,'geral','text',0 FROM v2_servers s
 ON CONFLICT DO NOTHING;
INSERT INTO v3_channels(server_id,name,kind,position)
 SELECT s.id,'Geral','voice',0 FROM v2_servers s
 ON CONFLICT DO NOTHING;
UPDATE v2_messages m SET channel_id=(
 SELECT c.id FROM v3_channels c
 WHERE c.server_id=m.server_id AND c.kind='text' AND c.name='geral'
 LIMIT 1
) WHERE m.channel_id IS NULL;
CREATE OR REPLACE FUNCTION v3_seed_channels() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO v3_channels(server_id,name,kind,position)
 VALUES(NEW.id,'geral','text',0),(NEW.id,'Geral','voice',0) ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER v3_server_default_channels AFTER INSERT ON v2_servers
 FOR EACH ROW EXECUTE FUNCTION v3_seed_channels();
CREATE OR REPLACE FUNCTION v3_can_read_channel(p_channel uuid,p_user uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS (
  SELECT 1 FROM v3_channels c JOIN v2_memberships m ON m.server_id=c.server_id AND m.user_id=p_user
  WHERE c.id=p_channel AND (NOT c.is_private OR m.role='owner'
   OR EXISTS(SELECT 1 FROM v3_channel_grants g
    JOIN v3_member_roles mr ON mr.role_id=g.role_id AND mr.user_id=p_user AND mr.server_id=c.server_id
    WHERE g.channel_id=c.id))
 );
$$;
CREATE OR REPLACE FUNCTION v3_user_permission(p_server uuid,p_user uuid,p_permission text)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS (
  SELECT 1 FROM v2_memberships m WHERE m.server_id=p_server AND m.user_id=p_user
  AND (m.role='owner' OR
   EXISTS(SELECT 1 FROM v3_member_roles mr JOIN v3_roles r ON r.id=mr.role_id
     WHERE mr.server_id=p_server AND mr.user_id=p_user AND r.server_id=p_server
     AND CASE p_permission
      WHEN 'channels' THEN r.manage_channels
      WHEN 'messages' THEN r.manage_messages
      WHEN 'moderation' THEN r.moderate_members
      WHEN 'roles' THEN r.manage_roles
      ELSE false END))
 );
$$;

-- V3.1: server presentation and channel categories
ALTER TABLE v2_servers ADD COLUMN IF NOT EXISTS icon_data_url text;
CREATE TABLE IF NOT EXISTS v3_categories(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 server_id uuid NOT NULL REFERENCES v2_servers(id) ON DELETE CASCADE,
 name varchar(32) NOT NULL,
 position int NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS v3_categories_unique_name ON v3_categories(server_id,lower(name));
ALTER TABLE v3_channels ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES v3_categories(id) ON DELETE SET NULL;
-- Per-voice-channel call chat, keeping old records through a default-channel backfill.
ALTER TABLE v3_call_messages ADD COLUMN IF NOT EXISTS channel_id uuid REFERENCES v3_channels(id) ON DELETE SET NULL;
UPDATE v3_call_messages m SET channel_id=(SELECT id FROM v3_channels WHERE server_id=m.server_id AND kind='voice' ORDER BY position LIMIT 1) WHERE m.channel_id IS NULL;
CREATE INDEX IF NOT EXISTS v3_call_messages_channel_recent ON v3_call_messages(channel_id,id DESC);
