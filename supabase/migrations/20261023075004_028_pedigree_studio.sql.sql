/*
# Pedigree Studio — breeder customization settings

## Purpose
Store per-user pedigree customization: loft logo, background image, template size,
and accent colors. Used by the pedigree studio to generate professional pedigree
certificates with branding.

## Table: pedigree_settings
- `id` (uuid, primary key)
- `user_id` (uuid, FK to auth.users, ON DELETE CASCADE, unique)
- `logo_url` (text) — URL to uploaded loft logo in Supabase Storage
- `background_url` (text) — URL to uploaded background image
- `template_size` (text, default 'standard') — standard | xl | xxl
- `accent_color` (text) — hex color for borders/headers
- `show_palmares` (boolean, default true) — include palmares in export
- `show_photos` (boolean, default true) — include pigeon photos
- `generations` (integer, default 5) — number of generations to show
- `breeder_display_name` (text) — name shown on certificate
- `loft_address` (text) — optional address line
- `created_at`, `updated_at` (timestamptz)

## Table: pedigree_shares
- `id` (uuid, primary key)
- `user_id` (uuid, FK to auth.users, ON DELETE CASCADE)
- `pigeon_id` (uuid, FK to pigeons, ON DELETE CASCADE)
- `share_token` (text, unique) — random token for public link
- `template_size` (text) — which template was shared
- `expires_at` (timestamptz, nullable) — optional expiry
- `view_count` (integer, default 0)
- `created_at` (timestamptz)

## Security
- pedigree_settings: user can only CRUD their own settings
- pedigree_shares: user can CRUD their own shares; anon can SELECT by share_token
  (public viewing of shared pedigrees)
*/

CREATE TABLE IF NOT EXISTS pedigree_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url text,
  background_url text,
  template_size text NOT NULL DEFAULT 'standard',
  accent_color text DEFAULT '#0F2A6B',
  show_palmares boolean NOT NULL DEFAULT true,
  show_photos boolean NOT NULL DEFAULT true,
  generations integer NOT NULL DEFAULT 5,
  breeder_display_name text,
  loft_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE pedigree_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON pedigree_settings TO authenticated;

CREATE POLICY "select_own_pedigree_settings"
ON pedigree_settings FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_pedigree_settings"
ON pedigree_settings FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_pedigree_settings"
ON pedigree_settings FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_pedigree_settings"
ON pedigree_settings FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS pedigree_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pigeon_id uuid NOT NULL REFERENCES pigeons(id) ON DELETE CASCADE,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  template_size text NOT NULL DEFAULT 'standard',
  expires_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pedigree_shares ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON pedigree_shares TO authenticated;
GRANT SELECT ON pedigree_shares TO anon;

-- Owners can CRUD their shares
CREATE POLICY "select_own_pedigree_shares"
ON pedigree_shares FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_pedigree_shares"
ON pedigree_shares FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_pedigree_shares"
ON pedigree_shares FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_pedigree_shares"
ON pedigree_shares FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Anon can view shared pedigrees by token (public links)
CREATE POLICY "anon_view_shared_pedigree"
ON pedigree_shares FOR SELECT
TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_pedigree_settings_user ON pedigree_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_pedigree_shares_token ON pedigree_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_pedigree_shares_user ON pedigree_shares(user_id);
