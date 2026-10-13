/*
# Adăugare sistem Campioni, Palmares și Vitrina de Aur

## Ce face
1. Adaugă coloana `is_champion` (boolean) la tabelul `pigeons` - marchează porumbeii de podium
2. Creează tabelul `pigeon_palmares` - rezultate individuale per porumbel (loc, concurs, an, distanță)
3. Creează tabelul `trophies` - Vitrina de Aur: trofee/cupe/medalii la nivel de crescătorie

## Tabele noi:
- pigeon_palmares: id, user_id, pigeon_id, position (1-10), race_name, year, distance_km, created_at
- trophies: id, user_id, photo_url, year, category, medal (gold/silver/bronze), description, created_at

## Securitate:
- RLS activat pe toate tabelele
- Politici separate per CRUD verb, scoping TO authenticated cu auth.uid() = user_id
*/

-- 1. Adaugă is_champion la pigeons
ALTER TABLE pigeons ADD COLUMN IF NOT EXISTS is_champion boolean DEFAULT false;

-- 2. Tabelul pigeon_palmares (rezultate individuale per porumbel)
CREATE TABLE IF NOT EXISTS pigeon_palmares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pigeon_id uuid REFERENCES pigeons(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 1 AND position <= 100),
  race_name text NOT NULL DEFAULT '',
  year integer,
  distance_km integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pigeon_palmares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_palmares" ON pigeon_palmares FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_palmares" ON pigeon_palmares FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_palmares" ON pigeon_palmares FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_palmares" ON pigeon_palmares FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_palmares_pigeon ON pigeon_palmares(pigeon_id);
CREATE INDEX IF NOT EXISTS idx_palmares_user ON pigeon_palmares(user_id);

-- 3. Tabelul trophies (Vitrina de Aur)
CREATE TABLE IF NOT EXISTS trophies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text,
  year integer,
  category text NOT NULL DEFAULT '',
  medal text CHECK (medal IN ('gold', 'silver', 'bronze')),
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trophies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_trophies" ON trophies FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_trophies" ON trophies FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_trophies" ON trophies FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_trophies" ON trophies FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trophies_user ON trophies(user_id);
