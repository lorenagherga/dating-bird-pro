/*
# Create swallow_monitor table — Regula Rândunicii

1. New Tables
- `swallow_monitor`: Stores annual swallow arrival/departure records per breeder.
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null) — The breeder's account
  - `event_type` (text, not null) — 'arrival' (spring) or 'departure' (autumn)
  - `event_date` (date, not null) — The exact date the user recorded the event
  - `year` (integer, not null) — Extracted year for easy filtering
  - `created_at` (timestamptz)

2. Security
- Enable RLS on `swallow_monitor`.
- SELECT: owner only (auth.uid() = user_id).
- INSERT: owner only.
- DELETE: owner only.
- No UPDATE needed — events are immutable records.

3. Notes
- This implements the traditional Romanian columbophile practice of tracking
  swallow migration as a natural indicator of predator (hawk) pressure.
- Arrival (spring) = safer flying season, predator pressure drops.
- Departure (autumn) = predator risk increases, extra caution needed.
- One record per event_type per year per user (enforced by unique constraint).
*/

CREATE TABLE IF NOT EXISTS swallow_monitor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('arrival', 'departure')),
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, event_type, year)
);

ALTER TABLE swallow_monitor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_swallow" ON swallow_monitor;
CREATE POLICY "select_own_swallow" ON swallow_monitor FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_swallow" ON swallow_monitor;
CREATE POLICY "insert_own_swallow" ON swallow_monitor FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_swallow" ON swallow_monitor;
CREATE POLICY "delete_own_swallow" ON swallow_monitor FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_swallow_monitor_user_year ON swallow_monitor(user_id, year);
