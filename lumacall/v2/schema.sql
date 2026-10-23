-- LumaCall V2: executar somente no banco da nova versão.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS v2_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(24) NOT NULL,
  name_key varchar(24) NOT NULL UNIQUE,
  secret_hash text NOT NULL,
  avatar_data_url text,
  badge varchar(32),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (length(name_key) BETWEEN 3 AND 24)
);
CREATE TABLE IF NOT EXISTS v2_sessions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES v2_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS v2_sessions_user ON v2_sessions(user_id);
CREATE TABLE IF NOT EXISTS v2_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(45) NOT NULL,
  invite_code varchar(12) NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES v2_users(id),
  member_count smallint NOT NULL DEFAULT 1 CHECK(member_count BETWEEN 1 AND 6),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS v2_memberships (
  server_id uuid NOT NULL REFERENCES v2_servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES v2_users(id) ON DELETE CASCADE,
  role varchar(12) NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(server_id,user_id)
);
CREATE INDEX IF NOT EXISTS v2_memberships_user ON v2_memberships(user_id);
CREATE TABLE IF NOT EXISTS v2_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  server_id uuid NOT NULL REFERENCES v2_servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES v2_users(id),
  content varchar(2000) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS v2_messages_recent ON v2_messages(server_id,id DESC);
CREATE OR REPLACE FUNCTION v2_add_owner() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO v2_memberships(server_id,user_id,role) VALUES (NEW.id,NEW.owner_id,'owner');
  RETURN NEW;
END$$;
DROP TRIGGER IF EXISTS v2_server_owner_join ON v2_servers;
CREATE TRIGGER v2_server_owner_join AFTER INSERT ON v2_servers
FOR EACH ROW EXECUTE FUNCTION v2_add_owner();
CREATE OR REPLACE FUNCTION v2_join_server(p_code text,p_user uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE s v2_servers%ROWTYPE; cnt integer;
BEGIN
  SELECT * INTO s FROM v2_servers WHERE invite_code=upper(trim(p_code)) FOR UPDATE;
  IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
  IF EXISTS(SELECT 1 FROM v2_memberships WHERE server_id=s.id AND user_id=p_user) THEN RETURN 'ALREADY_MEMBER'; END IF;
  SELECT count(*) INTO cnt FROM v2_memberships WHERE server_id=s.id;
  IF cnt>=6 THEN RETURN 'FULL'; END IF;
  INSERT INTO v2_memberships(server_id,user_id) VALUES (s.id,p_user);
  UPDATE v2_servers SET member_count=cnt+1 WHERE id=s.id;
  RETURN s.id::text;
END$$;
