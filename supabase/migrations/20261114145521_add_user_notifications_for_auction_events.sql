/*
# In-app notifications for auction questions and auction wins

1. New Tables
- `user_notifications`: one row per notification shown in the header bell.
  - `id` (uuid, primary key)
  - `user_id` (uuid, the profile that receives the notification)
  - `kind` ('auction_question' or 'auction_won')
  - `auction_id` (uuid, the auction the notification is about)
  - `title`, `body` (text shown in the notification list)
  - `read_at` (timestamptz, null until the user marks it read)
  - `created_at` (timestamptz)

2. Triggers (create rows automatically, the app never inserts them)
- After a question is posted on an auction, the seller is notified (unless the seller wrote the question).
- When an auction gets a winner and is marked ended, the winner is notified. This covers both buy-now and closing by timer.

3. Security
- Row level security enabled on `user_notifications`.
- Signed-in users can read their own notifications and update only `read_at` on their own rows.
- No insert or delete grant or policy for clients: rows are created only by the trigger functions, which run with owner rights.
- Trigger functions are not callable through the Data API.

4. Important Notes
- Notifications are stored in the database and shown when the app is open; they are not device push messages.
- Existing questions and auctions are not backfilled.
*/

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('auction_question', 'auction_won')),
  auction_id uuid REFERENCES auctions(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_notifications_user_created_idx
  ON user_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_notifications_user_unread_idx
  ON user_notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON user_notifications TO authenticated;
GRANT UPDATE (read_at) ON user_notifications TO authenticated;

DROP POLICY IF EXISTS "select_own_user_notifications" ON user_notifications;
CREATE POLICY "select_own_user_notifications" ON user_notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_user_notifications" ON user_notifications;
CREATE POLICY "update_own_user_notifications" ON user_notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_auction_question()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  a auctions%ROWTYPE;
BEGIN
  SELECT * INTO a FROM auctions WHERE id = NEW.auction_id;
  IF FOUND AND a.seller_id IS NOT NULL AND a.seller_id <> NEW.author_id THEN
    INSERT INTO user_notifications (user_id, kind, auction_id, title, body)
    VALUES (a.seller_id, 'auction_question', a.id, 'Întrebare nouă la licitație', a.title);
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_auction_question() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_seller_on_auction_question ON auction_questions;
CREATE TRIGGER notify_seller_on_auction_question
  AFTER INSERT ON auction_questions
  FOR EACH ROW EXECUTE FUNCTION public.notify_auction_question();

CREATE OR REPLACE FUNCTION public.notify_auction_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'ended'
     AND NEW.winner_id IS NOT NULL
     AND NEW.winner_id IS DISTINCT FROM OLD.winner_id THEN
    INSERT INTO user_notifications (user_id, kind, auction_id, title, body)
    VALUES (NEW.winner_id, 'auction_won', NEW.id, 'Ai câștigat licitația', NEW.title);
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_auction_won() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_winner_on_auction_won ON auctions;
CREATE TRIGGER notify_winner_on_auction_won
  AFTER UPDATE OF winner_id, status ON auctions
  FOR EACH ROW EXECUTE FUNCTION public.notify_auction_won();
