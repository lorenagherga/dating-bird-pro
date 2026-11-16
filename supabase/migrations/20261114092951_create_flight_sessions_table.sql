/*
# Create flight sessions table

1. New Tables
- `flight_sessions`: one saved live flight or game session for a pigeon.
  - `id` (uuid, primary key)
  - `user_id` (uuid, owner, defaults to the signed-in user)
  - `pigeon_id` (uuid, the pigeon that flew; deleted with the pigeon)
  - `duration_seconds` (integer, total flight time in seconds)
  - `figures` (integer, number of game figures counted)
  - `ceiling_seconds` (integer, time spent at high altitude / vanishing)
  - `notes` (text, free observations)
  - `created_at` (timestamptz)

2. Security
- Enable RLS on `flight_sessions`.
- Grant SELECT, INSERT, UPDATE, DELETE to `authenticated` only.
- Four owner-scoped policies: each user can only read and write their own sessions.

3. Notes
- Sessions are stored as separate rows so a pigeon keeps its full flight history.
*/

CREATE TABLE IF NOT EXISTS flight_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  pigeon_id uuid NOT NULL REFERENCES pigeons(id) ON DELETE CASCADE,
  duration_seconds integer NOT NULL CHECK (duration_seconds >= 0),
  figures integer NOT NULL DEFAULT 0 CHECK (figures >= 0),
  ceiling_seconds integer NOT NULL DEFAULT 0 CHECK (ceiling_seconds >= 0),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flight_sessions_user_pigeon_idx ON flight_sessions (user_id, pigeon_id);

ALTER TABLE flight_sessions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON flight_sessions TO authenticated;

DROP POLICY IF EXISTS "select_own_flight_sessions" ON flight_sessions;
CREATE POLICY "select_own_flight_sessions" ON flight_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_flight_sessions" ON flight_sessions;
CREATE POLICY "insert_own_flight_sessions" ON flight_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_flight_sessions" ON flight_sessions;
CREATE POLICY "update_own_flight_sessions" ON flight_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_flight_sessions" ON flight_sessions;
CREATE POLICY "delete_own_flight_sessions" ON flight_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
