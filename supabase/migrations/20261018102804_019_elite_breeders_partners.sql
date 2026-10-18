/*
# Create elite_breeders table — Parteneri & Crescătorii Elite

1. New Tables
- `elite_breeders`: Stores digital business cards for elite partner breeders.
  - `id` (uuid, primary key)
  - `breeder_name` (text, not null) — Name of the breeder or loft
  - `logo_url` (text) — Logo or photograph URL
  - `county` (text) — Romanian county (judet)
  - `categories` (text[]) — Array of specialty categories (e.g. "Campion National Maraton", "Fond", "Viteză")
  - `description` (text) — Optional bio/description
  - `phone` (text) — Optional contact phone
  - `email` (text) — Optional contact email
  - `website` (text) — Optional website URL
  - `user_id` (uuid) — Optional link to the breeder's app account
  - `is_featured` (boolean, default false) — Featured breeders appear first
  - `sort_order` (integer, default 0) — Manual ordering
  - `created_at` (timestamptz)

2. Security
- Enable RLS on `elite_breeders`.
- SELECT: public (anyone can view partner breeders) — TO anon, authenticated.
- INSERT/UPDATE/DELETE: only the owner or admin can modify.
  - Owner check via `auth.uid() = user_id`.
  - Admin check via email match in `admin_whitelist` joined to `profiles.email`.

3. Notes
- This table is intentionally public-readable — it's a promotional directory.
- The categories array allows flexible tagging (Maraton, Fond, Viteză, Sprint, etc.).
- When a partner has a user_id, the "See Birds in Auction" button filters auctions by that seller_id.
*/

CREATE TABLE IF NOT EXISTS elite_breeders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breeder_name text NOT NULL,
  logo_url text,
  county text,
  categories text[] DEFAULT '{}',
  description text DEFAULT '',
  phone text,
  email text,
  website text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE elite_breeders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_elite_breeders" ON elite_breeders;
CREATE POLICY "select_elite_breeders" ON elite_breeders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_elite_breeders_owner" ON elite_breeders;
CREATE POLICY "insert_elite_breeders_owner" ON elite_breeders FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN admin_whitelist aw ON aw.email = p.email
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_elite_breeders_owner" ON elite_breeders;
CREATE POLICY "update_elite_breeders_owner" ON elite_breeders FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN admin_whitelist aw ON aw.email = p.email
      WHERE p.id = auth.uid()
    )
  ) WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN admin_whitelist aw ON aw.email = p.email
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_elite_breeders_owner" ON elite_breeders;
CREATE POLICY "delete_elite_breeders_owner" ON elite_breeders FOR DELETE
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN admin_whitelist aw ON aw.email = p.email
      WHERE p.id = auth.uid()
    )
  );

-- Seed a few sample elite breeders
INSERT INTO elite_breeders (breeder_name, county, categories, description, is_featured, sort_order) VALUES
  ('Loft Columbia Elite', 'Cluj', ARRAY['Campion National Maraton', 'Fond'], 'Crescătorie cu peste 30 de ani de experiență în maraton și fond. Multiplic campioni naționali.', true, 1),
  ('Pasărea Carpatină', 'Brașov', ARRAY['Viteză', 'Sprint'], 'Specializati în viteza pe distanțe scurte și medii. Cea mai bună crescătorie de viteză din regiune.', true, 2),
  ('Colombofil Timișoara Pro', 'Timiș', ARRAY['Fond', 'Maraton', 'Campion Național'], 'Crescătorie de top cu palmares impresionant la concursurile de fond și maraton.', true, 3),
  ('Royal Pigeons Arad', 'Arad', ARRAY['Sprint', 'Viteză', 'Campion Regional'], 'Porumbei de curse de elită, linii de sânge olandeze și belgiene.', false, 4),
  ('Loft Viitorul Sibiu', 'Sibiu', ARRAY['Fond', 'Maraton'], 'Crescătorie dedicată porumbeilor de maraton. Rezultate constante în ultimii 10 ani.', false, 5)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_elite_breeders_featured ON elite_breeders(is_featured, sort_order);
