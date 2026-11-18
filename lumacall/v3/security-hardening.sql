-- LumaCall security hardening / 2026-11-18.
-- Additive, designed for application before the matching code deploy.
-- Never republish archived-channel messages or make them available through legacy routes.
ALTER TABLE v3_channels ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE v3_channels ADD COLUMN IF NOT EXISTS archived_name varchar(32);
CREATE INDEX IF NOT EXISTS v3_active_channels_lookup
 ON v3_channels(server_id,kind,position) WHERE archived_at IS NULL;

-- Room visibility is denied after archival, for both text and voice.
CREATE OR REPLACE FUNCTION v3_can_read_channel(p_channel uuid,p_user uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS (
  SELECT 1 FROM v3_channels c
  JOIN v2_memberships m ON m.server_id=c.server_id AND m.user_id=p_user
  WHERE c.id=p_channel AND c.archived_at IS NULL
   AND (NOT c.is_private OR m.role='owner' OR EXISTS(
    SELECT 1 FROM v3_channel_grants g
    JOIN v3_member_roles mr ON mr.role_id=g.role_id
      AND mr.user_id=p_user AND mr.server_id=c.server_id
    JOIN v3_roles r ON r.id=g.role_id AND r.server_id=c.server_id
    WHERE g.channel_id=c.id
   ))
 );
$$;

-- An invitation is checked for bans under the same server-level lock as capacity.
-- Existing memberships are deliberately checked after the ban condition:
-- a banned user cannot be returned as ALREADY_MEMBER and cannot join.
CREATE OR REPLACE FUNCTION v2_join_server(p_code text,p_user uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE s v2_servers%ROWTYPE; cnt integer;
BEGIN
  SELECT * INTO s FROM v2_servers WHERE invite_code=upper(trim(p_code)) FOR UPDATE;
  IF NOT FOUND THEN RETURN 'NOT_FOUND'; END IF;
  IF EXISTS(SELECT 1 FROM v3_bans WHERE server_id=s.id AND user_id=p_user) THEN
    RETURN 'BANNED';
  END IF;
  IF EXISTS(SELECT 1 FROM v2_memberships WHERE server_id=s.id AND user_id=p_user) THEN
    RETURN 'ALREADY_MEMBER';
  END IF;
  SELECT count(*) INTO cnt FROM v2_memberships WHERE server_id=s.id;
  IF cnt>=6 THEN RETURN 'FULL'; END IF;
  INSERT INTO v2_memberships(server_id,user_id) VALUES(s.id,p_user);
  UPDATE v2_servers SET member_count=cnt+1 WHERE id=s.id;
  RETURN s.id::text;
END $$;
