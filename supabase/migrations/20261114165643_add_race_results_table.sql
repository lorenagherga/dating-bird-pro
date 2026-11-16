/*
# Race results import table

Stores race results imported from official standings (CSV, Excel or pasted tables).

## New table: race_results
- id: unique identifier.
- user_id: owner, defaults to the signed-in user. Each user sees only their own rows.
- pigeon_id: optional link to the matching pigeon in the user's flock (cleared if the pigeon is deleted).
- ring_number: ring number as it appears in the standings.
- series, stage, event_date, distance_km: race context from the standings.
- place: position in the race (must be greater than 0).
- total_birds: number of birds that competed (must be greater than 0 and at least the place).
- speed_mpm: speed in metres per minute.
- fncpr_score: generated automatically as (place x 1000) / total_birds, rounded to 2 decimals.

## Security
- Row level security enabled.
- Grants: SELECT, INSERT, DELETE for the authenticated role only. No update is needed because imports are replaced by re-importing.
- Four separate policies (select, insert, update, delete) restricted to the owner.

## Notes
- Re-running this migration is safe: all statements are idempotent.
*/

CREATE TABLE IF NOT EXISTS race_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  pigeon_id uuid REFERENCES pigeons(id) ON DELETE SET NULL,
  ring_number text NOT NULL,
  series text,
  stage text,
  event_date date,
  distance_km numeric,
  place integer NOT NULL CHECK (place > 0),
  total_birds integer NOT NULL CHECK (total_birds > 0 AND place <= total_birds),
  speed_mpm numeric,
  fncpr_score numeric GENERATED ALWAYS AS (round((place::numeric * 1000) / total_birds, 2)) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS race_results_user_created_idx ON race_results (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS race_results_pigeon_idx ON race_results (pigeon_id);

ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON race_results TO authenticated;

DROP POLICY IF EXISTS "select_own_race_results" ON race_results;
CREATE POLICY "select_own_race_results" ON race_results FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_race_results" ON race_results;
CREATE POLICY "insert_own_race_results" ON race_results FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_race_results" ON race_results;
CREATE POLICY "update_own_race_results" ON race_results FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_race_results" ON race_results;
CREATE POLICY "delete_own_race_results" ON race_results FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
