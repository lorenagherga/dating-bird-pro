/*
# Community chat photo attachments

1. Modified Tables
- `community_messages`
  - New column `image_path` (text, nullable): storage path of an attached photo.
  - A message must now have either text or a photo (empty messages are rejected).
  - The insert policy only allows a photo path inside the sender's own folder.

2. New Storage
- Private bucket `community-chat-images` for compressed JPEG photos.
- Files are stored under `<user id>/<file>` so ownership can be checked from the path.

3. Security
- Photos are private: the app reads them through short-lived signed links.
- Any signed-in user can view chat photos (same audience as chat messages).
- Users can upload only into their own folder and delete their own photos.
- Platform admins can delete any chat photo (for moderation).
- Existing message policies for reading, sending text, and admin deletion are unchanged apart from the photo check.
*/

ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS image_path text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_messages_content_present'
  ) THEN
    ALTER TABLE community_messages
      ADD CONSTRAINT community_messages_content_present
      CHECK (char_length(body) > 0 OR image_path IS NOT NULL);
  END IF;
END $$;

DROP POLICY IF EXISTS "insert_own_community_messages" ON community_messages;
CREATE POLICY "insert_own_community_messages" ON community_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (image_path IS NULL OR image_path LIKE (auth.uid()::text || '/%'))
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('community-chat-images', 'community-chat-images', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "community_chat_images_insert_own" ON storage.objects;
CREATE POLICY "community_chat_images_insert_own" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'community-chat-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "community_chat_images_select_members" ON storage.objects;
CREATE POLICY "community_chat_images_select_members" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'community-chat-images');

DROP POLICY IF EXISTS "community_chat_images_delete_own_or_admin" ON storage.objects;
CREATE POLICY "community_chat_images_delete_own_or_admin" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'community-chat-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_platform_admin()
    )
  );
