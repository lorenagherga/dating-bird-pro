/*
# Races & flight stages module

1. New Tables
- `race_events` — competitions of any kind created by the user (columbodrom race, training, local contest, etc.)
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to the authenticated user)
  - `name` (text, not null) — competition name
  - `category` (text, not null) — free-form category (e.g. columbodrom, training, local contest)
  - `event_date` (date, nullable)
  - `standings` (text, nullable) — free-form standings / results
  - `created_at` (timestamp)

2. Modified Tables — none.

3. Security
- Enable RLS on `race_events`.
- Grant SELECT/INSERT/UPDATE/DELETE to `authenticated` only (app requires sign-in).
- Owner-scoped CRUD policies (each user sees and manages only their own events).

4. Notes
- Flight stage entries (stage, distance, times, speed) are stored per-user in `flight_stages`
  created by a companion migration; this migration covers the custom competition list.
- The racing "voiajor" stage log with categories (speed, middle, long, marathon) lives in
  `flight_stages` — see migration 038.
*/

CREATE TABLE IF NOT EXISTS race_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  event_date date,
  standings text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE race_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON race_events TO authenticated;

DROP POLICY IF EXISTS "select_own_race_events" ON race_events;
CREATE POLICY "select_own_race_events" ON race_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_race_events" ON race_events;
CREATE POLICY "insert_own_race_events" ON race_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_race_events" ON race_events;
CREATE POLICY "update_own_race_events" ON race_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_race_events" ON race_events;
CREATE POLICY "delete_own_race_events" ON race_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
