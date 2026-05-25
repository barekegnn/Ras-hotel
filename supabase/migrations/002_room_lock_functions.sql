-- ============================================================
-- Room Lock RPC Functions
-- supabase/migrations/002_room_lock_functions.sql
--
-- Advisory-lock-based room hold for 10 minutes.
-- Called from Next.js via supabase.rpc()
-- Requirements 3.2, 3.3, 3.6
-- ============================================================

-- Stores active room locks with expiry
CREATE TABLE IF NOT EXISTS room_locks (
  room_id     UUID NOT NULL,
  session_id  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id)
);

ALTER TABLE room_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room_locks_public_read" ON room_locks FOR SELECT USING (TRUE);
CREATE POLICY "room_locks_insert"      ON room_locks FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "room_locks_delete"      ON room_locks FOR DELETE USING (TRUE);

-- ── acquire_room_lock ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION acquire_room_lock(
  p_room_id   UUID,
  p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing room_locks%ROWTYPE;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Clean expired locks first
  DELETE FROM room_locks WHERE expires_at < NOW();

  -- Check if lock exists for this room
  SELECT * INTO v_existing FROM room_locks WHERE room_id = p_room_id;

  IF FOUND THEN
    -- Lock held by same session? Renew it
    IF v_existing.session_id = p_session_id THEN
      UPDATE room_locks
        SET expires_at = NOW() + INTERVAL '10 minutes'
        WHERE room_id = p_room_id
        RETURNING expires_at INTO v_expires_at;
      RETURN jsonb_build_object('acquired', true, 'renewed', true, 'expires_at', v_expires_at);
    ELSE
      -- Lock held by another session
      RETURN jsonb_build_object(
        'acquired', false,
        'reason', 'Room is currently being booked by another user',
        'expires_at', v_existing.expires_at
      );
    END IF;
  END IF;

  -- Acquire new lock
  INSERT INTO room_locks (room_id, session_id, expires_at)
    VALUES (p_room_id, p_session_id, NOW() + INTERVAL '10 minutes')
    RETURNING expires_at INTO v_expires_at;

  RETURN jsonb_build_object('acquired', true, 'renewed', false, 'expires_at', v_expires_at);
END;
$$;

-- ── release_room_lock ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION release_room_lock(
  p_room_id    UUID,
  p_session_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM room_locks
    WHERE room_id = p_room_id AND session_id = p_session_id;
  RETURN FOUND;
END;
$$;

-- ── cleanup_expired_locks (called by cron) ────────────────────

CREATE OR REPLACE FUNCTION cleanup_expired_room_locks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM room_locks WHERE expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
