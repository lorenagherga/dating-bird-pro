/*
# Lista VIP - utilizatori cu acces premium gratuit

## Ce face
1. Creează tabelul `vip_list` pentru a oferi acces premium gratuit unor utilizatori selectați (ex: prieteni care promovează aplicația).
2. Fiecare rând conține emailul utilizatorului VIP și planul premium care i se acordă (hobby/standard/professional).
3. La logare, aplicația verifică dacă emailul utilizatorului este în lista VIP și, dacă da, îi oferă beneficiile planului respectiv gratuit.

## Tabel nou: vip_list
- id (uuid, cheie primară)
- email (text, unic - emailul utilizatorului VIP)
- plan (text: hobby/standard/professional - planul premium acordat gratuit)
- reason (text - motivul pentru care a fost adăugat, ex: "promovează aplicația")
- created_at (timestamptz)

## Securitate
- RLS activat pe vip_list
- Doar utilizatorii autentificați pot citi lista (pentru a verifica propriul status VIP)
- Doar adminul poate adăuga/șterge din listă (verificare prin admin_whitelist)
- Politica de INSERT/DELETE verifică că emailul utilizatorului curent este în admin_whitelist
*/

CREATE TABLE IF NOT EXISTS vip_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  plan text NOT NULL DEFAULT 'professional' CHECK (plan IN ('hobby', 'standard', 'professional')),
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vip_list ENABLE ROW LEVEL SECURITY;

-- Toți utilizatorii autentificați pot verifica dacă emailul lor e în lista VIP
DROP POLICY IF EXISTS "select_vip_list" ON vip_list;
CREATE POLICY "select_vip_list" ON vip_list FOR SELECT
  TO authenticated USING (true);

-- Doar adminii (email în admin_whitelist) pot adăuga intrări VIP
DROP POLICY IF EXISTS "insert_vip_list" ON vip_list;
CREATE POLICY "insert_vip_list" ON vip_list FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_whitelist
      WHERE admin_whitelist.email = (
        SELECT email FROM auth.users WHERE auth.users.id = auth.uid()
      )
    )
  );

-- Doar adminii pot șterge intrări VIP
DROP POLICY IF EXISTS "delete_vip_list" ON vip_list;
CREATE POLICY "delete_vip_list" ON vip_list FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM admin_whitelist
      WHERE admin_whitelist.email = (
        SELECT email FROM auth.users WHERE auth.users.id = auth.uid()
      )
    )
  );

-- Doar adminii pot modifica intrări VIP
DROP POLICY IF EXISTS "update_vip_list" ON vip_list;
CREATE POLICY "update_vip_list" ON vip_list FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM admin_whitelist
      WHERE admin_whitelist.email = (
        SELECT email FROM auth.users WHERE auth.users.id = auth.uid()
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_whitelist
      WHERE admin_whitelist.email = (
        SELECT email FROM auth.users WHERE auth.users.id = auth.uid()
      )
    )
  );
