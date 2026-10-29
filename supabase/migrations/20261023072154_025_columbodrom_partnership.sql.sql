/*
# Columbodrom Partnership Module

## Purpose
Create a partnership system for major columbodromes (pigeon racing venues). Users can view
columbodromes, see rankings/leaderboards, and enroll their pigeons in competitions directly
from the app.

## New Tables

### 1. columbodroms
Stores the major columbodromes partnered with the app.
- `id` (uuid, primary key)
- `name` (text, not null) — columbodrome name
- `location` (text) — city/region
- `country` (text, default 'Romania')
- `logo_url` (text) — optional logo image URL
- `description` (text) — about the columbodrome
- `distance_km` (integer) — typical race distance
- `capacity` (integer) — max birds capacity
- `website` (text) — optional website link
- `is_active` (boolean, default true) — whether currently accepting entries
- `is_featured` (boolean, default false) — highlighted partner
- `sort_order` (integer, default 0)
- `season` (text) — e.g. '2026'
- `created_at` (timestamptz)

### 2. columbodrom_entries
Stores user enrollments — each user can enroll pigeons in a columbodrome.
- `id` (uuid, primary key)
- `columbodrom_id` (uuid, FK to columbodroms, ON DELETE CASCADE)
- `user_id` (uuid, not null, DEFAULT auth.uid(), FK to auth.users ON DELETE CASCADE)
- `pigeon_ring` (text, not null) — ring number of the enrolled pigeon
- `pigeon_color` (text) — optional color/genetics
- `status` (text, default 'enrolled') — enrolled | confirmed | racing | completed
- `result_position` (integer) — final position if race completed
- `result_birds_total` (integer) — total birds in the race
- `result_fci_coeff` (numeric) — FCI coefficient if completed
- `created_at` (timestamptz)

## Security
- Enable RLS on both tables.
- columbodroms: all authenticated users can SELECT (public partner directory).
  Only service_role can INSERT/UPDATE/DELETE (admin-managed).
- columbodrom_entries: authenticated users can SELECT, INSERT, UPDATE, DELETE only their own entries.
- user_id defaults to auth.uid() so inserts without explicit user_id succeed.
*/

CREATE TABLE IF NOT EXISTS columbodroms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  country text DEFAULT 'Romania',
  logo_url text,
  description text DEFAULT '',
  distance_km integer,
  capacity integer,
  website text,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  season text DEFAULT '2026',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE columbodroms ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON columbodroms TO authenticated;

DROP POLICY IF EXISTS "select_columbodroms" ON columbodroms;
CREATE POLICY "select_columbodroms"
ON columbodroms FOR SELECT
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS columbodrom_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  columbodrom_id uuid NOT NULL REFERENCES columbodroms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  pigeon_ring text NOT NULL,
  pigeon_color text,
  status text NOT NULL DEFAULT 'enrolled',
  result_position integer,
  result_birds_total integer,
  result_fci_coeff numeric(8,2),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE columbodrom_entries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON columbodrom_entries TO authenticated;

DROP POLICY IF EXISTS "select_own_entries" ON columbodrom_entries;
CREATE POLICY "select_own_entries"
ON columbodrom_entries FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_entries" ON columbodrom_entries;
CREATE POLICY "insert_own_entries"
ON columbodrom_entries FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_entries" ON columbodrom_entries;
CREATE POLICY "update_own_entries"
ON columbodrom_entries FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_entries" ON columbodrom_entries;
CREATE POLICY "delete_own_entries"
ON columbodrom_entries FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_columbodrom_entries_user ON columbodrom_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_columbodrom_entries_columbodrom ON columbodrom_entries(columbodrom_id);

-- Seed initial columbodrom data
INSERT INTO columbodroms (name, location, country, description, distance_km, capacity, is_active, is_featured, sort_order, season)
VALUES
  ('Columbodromul Național București', 'București', 'Romania', 'Cel mai mare columbodrom din România, gazda marilor campionate naționale.', 550, 5000, true, true, 1, '2026'),
  ('Columbodromul Timișoara', 'Timișoara', 'Romania', 'Columbodrom modern cu facilități de top pentru curse de fond și maraton.', 700, 3000, true, true, 2, '2026'),
  ('Columbodromul Cluj-Napoca', 'Cluj-Napoca', 'Romania', 'Centru regional pentru curse de viteză și demifond din Transilvania.', 400, 2500, true, false, 3, '2026'),
  ('Columbodromul Constanța', 'Constanța', 'Romania', 'Columbodrom litoral specializat în curse de maraton pe distanțe lungi.', 900, 4000, true, true, 4, '2026'),
  ('Columbodromul Iași', 'Iași', 'Romania', 'Columbodrom din Moldova pentru curse regionale și interregionale.', 500, 2000, true, false, 5, '2026'),
  ('Columbodromul Brașov', 'Brașov', 'Romania', 'Columbodrom montan pentru curse de demifond și viteză.', 350, 2000, true, false, 6, '2026'),
  ('Columbodromul Craiova', 'Craiova', 'Romania', 'Columbodrom din Oltenia pentru curse naționale de fond.', 600, 3000, true, false, 7, '2026'),
  ('Columbodromul Arad', 'Arad', 'Romania', 'Columbodrom din vestul țării pentru curse internaționale.', 650, 2500, true, false, 8, '2026')
ON CONFLICT DO NOTHING;
