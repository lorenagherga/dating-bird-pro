/*
# Create partner_requests table — solicitari_parteneri

1. New Tables
- `partner_requests`: Stores applications from breeders who want to become partners.
  - `id` (uuid, primary key)
  - `breeder_name` (text, not null) — Name of the breeder or loft
  - `county` (text) — Romanian county (judet)
  - `categories` (text[]) — Array of specialty categories
  - `contact_link` (text) — Facebook profile or auctions page link
  - `user_id` (uuid) — The applicant's app account
  - `status` (text, default 'pending') — pending / approved / rejected
  - `reviewed_by` (uuid) — Admin who reviewed the request
  - `reviewed_at` (timestamptz) — When the request was reviewed
  - `created_at` (timestamptz)

2. Security
- Enable RLS on `partner_requests`.
- SELECT: applicants can see their own requests; admins can see all.
- INSERT: any authenticated user can submit a partner application.
- UPDATE: only admins can change status (approve/reject).
- DELETE: only admins can delete requests.

3. Notes
- Only requests with status='approved' should appear on the partners screen.
- When approved, the admin should also create a row in `elite_breeders` for the partner to appear publicly.
- The migration for elite_breeders (019) already exists with the same admin-check pattern.
*/

CREATE TABLE IF NOT EXISTS partner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  breeder_name text NOT NULL,
  county text,
  categories text[] DEFAULT '{}',
  contact_link text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE partner_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_partner_requests" ON partner_requests;
CREATE POLICY "select_own_partner_requests" ON partner_requests FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN admin_whitelist aw ON aw.email = p.email
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_partner_requests" ON partner_requests;
CREATE POLICY "insert_partner_requests" ON partner_requests FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_partner_requests_admin" ON partner_requests;
CREATE POLICY "update_partner_requests_admin" ON partner_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN admin_whitelist aw ON aw.email = p.email
      WHERE p.id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN admin_whitelist aw ON aw.email = p.email
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_partner_requests_admin" ON partner_requests;
CREATE POLICY "delete_partner_requests_admin" ON partner_requests FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN admin_whitelist aw ON aw.email = p.email
      WHERE p.id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_partner_requests_status ON partner_requests(status, created_at);
