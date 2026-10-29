/*
# Benzing Live Electronic Timing Integration

## Purpose
Add tables to store race events and timing results from Benzing Live electronic
clocking systems. An edge function receives data pushes from Benzing (or manual
club operator entry) and populates these tables. Users can then view live
rankings on each columbodrom's detail page.

## New Tables

### 1. benzing_races
Stores individual race events at columbodromes.
- `id` (uuid, primary key)
- `columbodrom_id` (uuid, FK to columbodroms, ON DELETE CASCADE)
- `race_name` (text, not null) — e.g. "Etapa 3 — Fond National"
- `race_date` (date, not null) — the scheduled race date
- `distance_km` (integer) — actual race distance
- `birds_total` (integer) — total birds released
- `status` (text, default 'scheduled') — scheduled | basketing | released | live | completed | cancelled
- `release_time` (timestamptz) — actual release timestamp
- `weather` (text) — weather conditions at release
- `wind` (text) — wind direction/strength
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 2. benzing_results
Stores individual pigeon timing results per race.
- `id` (uuid, primary key)
- `race_id` (uuid, FK to benzing_races, ON DELETE CASCADE)
- `columbodrom_id` (uuid, FK to columbodroms, ON DELETE CASCADE)
- `ring_number` (text, not null) — pigeon ring number
- `breeder_name` (text) — breeder/owner name from Benzing
- `loft_name` (text) — loft name
- `arrival_time` (timestamptz) — when the pigeon clocked in
- `speed_mpm` (numeric) — speed in meters per minute
- `position` (integer) — final ranking position
- `fci_coefficient` (numeric) — FCI coefficient if calculated
- `is_winner` (boolean, default false)
- `created_at` (timestamptz)

## Security
- Enable RLS on both tables.
- benzing_races: all authenticated users can SELECT (public race data).
  Only service_role can INSERT/UPDATE/DELETE (managed via edge function or admin).
- benzing_results: all authenticated users can SELECT (public rankings).
  Only service_role can INSERT/UPDATE/DELETE (data comes from Benzing edge function).
- No user-facing writes — all data flows through the edge function using the service role key.
*/

CREATE TABLE IF NOT EXISTS benzing_races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  columbodrom_id uuid NOT NULL REFERENCES columbodroms(id) ON DELETE CASCADE,
  race_name text NOT NULL,
  race_date date NOT NULL,
  distance_km integer,
  birds_total integer,
  status text NOT NULL DEFAULT 'scheduled',
  release_time timestamptz,
  weather text,
  wind text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE benzing_races ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON benzing_races TO authenticated;

DROP POLICY IF EXISTS "select_benzing_races" ON benzing_races;
CREATE POLICY "select_benzing_races"
ON benzing_races FOR SELECT
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS benzing_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES benzing_races(id) ON DELETE CASCADE,
  columbodrom_id uuid NOT NULL REFERENCES columbodroms(id) ON DELETE CASCADE,
  ring_number text NOT NULL,
  breeder_name text,
  loft_name text,
  arrival_time timestamptz,
  speed_mpm numeric(10,2),
  position integer,
  fci_coefficient numeric(8,2),
  is_winner boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE benzing_results ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON benzing_results TO authenticated;

DROP POLICY IF EXISTS "select_benzing_results" ON benzing_results;
CREATE POLICY "select_benzing_results"
ON benzing_results FOR SELECT
TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_benzing_races_columbodrom ON benzing_races(columbodrom_id);
CREATE INDEX IF NOT EXISTS idx_benzing_races_date ON benzing_races(race_date DESC);
CREATE INDEX IF NOT EXISTS idx_benzing_results_race ON benzing_results(race_id);
CREATE INDEX IF NOT EXISTS idx_benzing_results_position ON benzing_results(race_id, position ASC);
CREATE INDEX IF NOT EXISTS idx_benzing_results_ring ON benzing_results(ring_number);
