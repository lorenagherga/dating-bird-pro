/*
# Add user reports and user blocks

1. New Tables
- `user_reports`: a report one user files about another user, optionally linked to an auction. Columns: id, reporter_id, reported_user_id, auction_id (nullable), reason (text, required), created_at.
- `user_blocks`: a user hides another user's chat messages and auction questions. Columns: blocker_id, blocked_id, created_at. Primary key (blocker_id, blocked_id).

2. Security
- Row level security enabled on both tables.
- Signed-in users can insert reports only as themselves and read only their own reports. Reports cannot be edited or deleted by users.
- Signed-in users can read, add and remove only their own blocks.
- Grants are limited to the verbs used by the app.

3. Notes
- Blocking is a personal setting; it does not affect other users' views of the blocker.
- Re-running this migration is safe.
*/

CREATE TABLE IF NOT EXISTS user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  auction_id uuid REFERENCES auctions(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (reporter_id <> reported_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports (reporter_id, created_at DESC);

ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON user_reports TO authenticated;

DROP POLICY IF EXISTS "select_own_user_reports" ON user_reports;
CREATE POLICY "select_own_user_reports" ON user_reports FOR SELECT
  TO authenticated USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "insert_own_user_reports" ON user_reports;
CREATE POLICY "insert_own_user_reports" ON user_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON user_blocks TO authenticated;

DROP POLICY IF EXISTS "select_own_user_blocks" ON user_blocks;
CREATE POLICY "select_own_user_blocks" ON user_blocks FOR SELECT
  TO authenticated USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "insert_own_user_blocks" ON user_blocks;
CREATE POLICY "insert_own_user_blocks" ON user_blocks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "delete_own_user_blocks" ON user_blocks;
CREATE POLICY "delete_own_user_blocks" ON user_blocks FOR DELETE
  TO authenticated USING (auth.uid() = blocker_id);
