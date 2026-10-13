/*
# Dating Bird Pro - Schema inițială completă

Aplicația "Dating Bird Pro" pentru columbofili. Această migrare creează toate tabelele necesare pentru:
- Profiluri crescători (cu plan de abonament)
- Registru porumbei (cu părinți pentru pedigree)
- Calendar biologic cuiburi (perechi și reproducere)
- Boli și tratamente (evidență medicală)
- Sesiuni active (pentru blocare logare simultană)
- Mesaje asistent AI (istoric chat)
- Limitări zilnice asistent AI
- Lista albă administrator (white-list pentru sesiuni multiple)

## Tabele noi:

1. **profiles** - Profiluri utilizatori cu nume crescătorie și plan abonament
   - id (uuid, PK, referință auth.users)
   - email (text)
   - breeder_name (text, nume crescătorie)
   - subscription_plan (text: free/hobby/standard/professional)
   - created_at (timestamptz)

2. **pigeons** - Registru porumbei
   - id (uuid, PK)
   - user_id (uuid, owner)
   - ring_series (text, serie inel)
   - year (int, an)
   - sex (text: Mascul/Femelă)
   - color (text, culoare/genetică)
   - status (text: În crescătorie/Dispărut/Vândut)
   - sire_id (uuid, tată - referință pigeons)
   - dam_id (uuid, mamă - referință pigeons)
   - photo_url (text, URL poză)
   - notes (text)
   - created_at (timestamptz)

3. **nests** - Calendar biologic cuiburi
   - id (uuid, PK)
   - user_id (uuid, owner)
   - nest_id (text, ID cuib)
   - male_ring (text, inel mascul)
   - female_ring (text, inel femelă)
   - pairing_date (date, dată împerechere)
   - laying_date (date, dată ouat)
   - hatching_date (date, calculat automat: laying_date + 18 zile)
   - chick_count (int, număr pui)
   - created_at (timestamptz)

4. **treatments** - Boli și tratamente
   - id (uuid, PK)
   - user_id (uuid, owner)
   - pigeon_ring (text, inel porumbel)
   - disease (text, boala)
   - symptoms (text, simptome)
   - treatment (text, tratament aplicat)
   - admin_date (date, data administrării)
   - booster_date (date, data rapelului)
   - created_at (timestamptz)

5. **sessions** - Sesiuni active (pentru blocare logare simultană)
   - id (uuid, PK)
   - user_id (uuid, owner)
   - device_id (text, identificator dispozitiv)
   - device_name (text, nume dispozitiv)
   - created_at (timestamptz)

6. **chat_messages** - Istoric chat asistent AI
   - id (uuid, PK)
   - user_id (uuid, owner)
   - role (text: user/assistant)
   - content (text)
   - created_at (timestamptz)

7. **ai_usage** - Limitări zilnice asistent AI
   - id (uuid, PK)
   - user_id (uuid, owner)
   - date (date, ziua curentă)
   - count (int, număr întrebări)
   - created_at (timestamptz)

8. **admin_whitelist** - Lista albă administrator
   - id (uuid, PK)
   - email (text, email administrator)
   - created_at (timestamptz)

## Securitate:
- RLS activat pe toate tabelele
- Policii CRUD separate per tabel, owner-scoped prin auth.uid()
- Storage bucket "pigeon-photos" pentru pozele porumbeilor
- Tabelul admin_whitelist este public pentru verificare
*/

-- ============================================
-- TABELA: profiles
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  breeder_name text NOT NULL,
  subscription_plan text NOT NULL DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ============================================
-- TABELA: pigeons
-- ============================================
CREATE TABLE IF NOT EXISTS pigeons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  ring_series text NOT NULL,
  year integer,
  sex text DEFAULT 'Mascul',
  color text DEFAULT '',
  status text DEFAULT 'În crescătorie',
  sire_id uuid REFERENCES pigeons(id) ON DELETE SET NULL,
  dam_id uuid REFERENCES pigeons(id) ON DELETE SET NULL,
  photo_url text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pigeons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_pigeons" ON pigeons;
CREATE POLICY "select_own_pigeons" ON pigeons FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_pigeons" ON pigeons;
CREATE POLICY "insert_own_pigeons" ON pigeons FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_pigeons" ON pigeons;
CREATE POLICY "update_own_pigeons" ON pigeons FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_pigeons" ON pigeons;
CREATE POLICY "delete_own_pigeons" ON pigeons FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pigeons_user_id ON pigeons(user_id);

-- ============================================
-- TABELA: nests
-- ============================================
CREATE TABLE IF NOT EXISTS nests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nest_id text NOT NULL,
  male_ring text NOT NULL,
  female_ring text NOT NULL,
  pairing_date date,
  laying_date date,
  hatching_date date,
  chick_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE nests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_nests" ON nests;
CREATE POLICY "select_own_nests" ON nests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_nests" ON nests;
CREATE POLICY "insert_own_nests" ON nests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_nests" ON nests;
CREATE POLICY "update_own_nests" ON nests FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_nests" ON nests;
CREATE POLICY "delete_own_nests" ON nests FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_nests_user_id ON nests(user_id);

-- ============================================
-- TABELA: treatments
-- ============================================
CREATE TABLE IF NOT EXISTS treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  pigeon_ring text NOT NULL,
  disease text NOT NULL,
  symptoms text DEFAULT '',
  treatment text DEFAULT '',
  admin_date date,
  booster_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_treatments" ON treatments;
CREATE POLICY "select_own_treatments" ON treatments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_treatments" ON treatments;
CREATE POLICY "insert_own_treatments" ON treatments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_treatments" ON treatments;
CREATE POLICY "update_own_treatments" ON treatments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_treatments" ON treatments;
CREATE POLICY "delete_own_treatments" ON treatments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_treatments_user_id ON treatments(user_id);

-- ============================================
-- TABELA: sessions
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  device_name text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sessions" ON sessions;
CREATE POLICY "select_own_sessions" ON sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sessions" ON sessions;
CREATE POLICY "insert_own_sessions" ON sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sessions" ON sessions;
CREATE POLICY "delete_own_sessions" ON sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- ============================================
-- TABELA: chat_messages
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chat_messages" ON chat_messages;
CREATE POLICY "select_own_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chat_messages" ON chat_messages;
CREATE POLICY "insert_own_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chat_messages" ON chat_messages;
CREATE POLICY "delete_own_chat_messages" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

-- ============================================
-- TABELA: ai_usage
-- ============================================
CREATE TABLE IF NOT EXISTS ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai_usage" ON ai_usage;
CREATE POLICY "select_own_ai_usage" ON ai_usage FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ai_usage" ON ai_usage;
CREATE POLICY "insert_own_ai_usage" ON ai_usage FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_ai_usage" ON ai_usage;
CREATE POLICY "update_own_ai_usage" ON ai_usage FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ai_usage" ON ai_usage;
CREATE POLICY "delete_own_ai_usage" ON ai_usage FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, date);

-- ============================================
-- TABELA: admin_whitelist
-- ============================================
CREATE TABLE IF NOT EXISTS admin_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_whitelist ENABLE ROW LEVEL SECURITY;

-- Tabel public: oricine îl poate citi pentru a verifica dacă un email este în lista albă
DROP POLICY IF EXISTS "read_admin_whitelist" ON admin_whitelist;
CREATE POLICY "read_admin_whitelist" ON admin_whitelist FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_admin_whitelist" ON admin_whitelist;
CREATE POLICY "insert_admin_whitelist" ON admin_whitelist FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_admin_whitelist" ON admin_whitelist;
CREATE POLICY "delete_admin_whitelist" ON admin_whitelist FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================
-- STORAGE: pigeon-photos bucket
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('pigeon-photos', 'pigeon-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Politici storage pentru pigeon-photos
DROP POLICY IF EXISTS "select_pigeon_photos" ON storage.objects;
CREATE POLICY "select_pigeon_photos" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'pigeon-photos');

DROP POLICY IF EXISTS "insert_pigeon_photos" ON storage.objects;
CREATE POLICY "insert_pigeon_photos" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'pigeon-photos');

DROP POLICY IF EXISTS "update_pigeon_photos" ON storage.objects;
CREATE POLICY "update_pigeon_photos" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'pigeon-photos') WITH CHECK (bucket_id = 'pigeon-photos');

DROP POLICY IF EXISTS "delete_pigeon_photos" ON storage.objects;
CREATE POLICY "delete_pigeon_photos" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'pigeon-photos');