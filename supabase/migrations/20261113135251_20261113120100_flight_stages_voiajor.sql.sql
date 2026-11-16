/*
# Flight stages log for racing pigeons (voiajori)

1. New Tables
- `flight_stages` — recorded race stages ("etape") for the user's racing pigeons
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to the authenticated user)
  - `category` (text, not null) — one of: viteza, demifond, fond, maraton
  - `race_name` (text, not null) — stage / race name (e.g. "Etapa 1 Barcelona")
  - `pigeon_ring` (text, not null) — ring series of the pigeon
  - `event_date` (date, nullable) — stage date
  - `distance_km` (numeric, nullable) — stage distance in km
  - `release_at` (timestamptz, nullable) — release time
  - `arrival_at` (timestamptz, nullable) — arrival time
  - `speed_mpm` (numeric, nullable) — computed average speed in meters/minute
  - `position` (integer, nullable) — placement in the standings
  - `notes` (text, nullable)
  - `created_at` (timestamp)

2. Security
- Enable RLS on `flight_stages`.
- Grant SELECT/INSERT/UPDATE/DELETE to `authenticated` only.
- Owner-scoped CRUD policies.

3. Notes
- Speed in m/min = (distance_km * 1000) / minutes between release and arrival.
  Computed in the app and stored for standings sorting.
*/

CREATE TABLE IF NOT EXISTS flight_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('viteza','demifond','fond','maraton')),
  race_name text NOT NULL,
  pigeon_ring text NOT NULL,
  event_date date,
  distance_km numeric(10,3),
  release_at timestamptz,
  arrival_at timestamptz,
  speed_mpm numeric(12,2),
  position integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flight_stages_user_category_idx
  ON flight_stages (user_id, category);

ALTER TABLE flight_stages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON flight_stages TO authenticated;

DROP POLICY IF EXISTS "select_own_flight_stages" ON flight_stages;
CREATE POLICY "select_own_flight_stages" ON flight_stages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_flight_stages" ON flight_stages
  ;
CREATE POLICY "insert_own_flight_stages" ON flight_stages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_flight_stages" ON flight_stages;
CREATE POLICY "update_own_flight_stages" ON flight_stages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_flight_stages" ON flight_stages;
CREATE POLICY "delete_own_flight_stages" ON flight_stages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
