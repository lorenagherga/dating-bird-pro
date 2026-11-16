import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { fetchPublicProfiles } from '@/lib/public-profiles';

export type CommunityChannel = 'discussions' | 'exchanges';

export const COMMUNITY_MESSAGE_MAX_LENGTH = 1000;

const CHAT_IMAGE_BUCKET = 'community-chat-images';
const CHAT_IMAGE_MAX_WIDTH = 1024;
const CHAT_IMAGE_JPEG_QUALITY = 0.8;
const SIGNED_URL_TTL_SECONDS = 3600;

export interface CommunityMessage {
  id: string;
  channel: CommunityChannel;
  user_id: string;
  body: string;
  image_path: string | null;
  image_url: string | null;
  created_at: string;
  author_name: string | null;
  author_is_ambassador: boolean;
}

interface CommunityMessageRow {
  id: string;
  channel: CommunityChannel;
  user_id: string;
  body: string;
  image_path: string | null;
  created_at: string;
}

async function fetchSignedImageUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;

  const { data, error } = await supabase.storage
    .from(CHAT_IMAGE_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;

  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
  }
  return urls;
}

export async function fetchCommunityMessages(channel: CommunityChannel): Promise<CommunityMessage[]> {
  const { data, error } = await supabase
    .from('community_messages')
    .select('id, channel, user_id, body, image_path, created_at')
    .eq('channel', channel)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  const rows = (data ?? []) as CommunityMessageRow[];
  const authors = await fetchPublicProfiles(rows.map((row) => row.user_id));
  const imageUrls = await fetchSignedImageUrls(
    rows.map((row) => row.image_path).filter((path): path is string => !!path),
  );

  return rows.map((row) => {
    const author = authors.get(row.user_id);
    return {
      id: row.id,
      channel: row.channel,
      user_id: row.user_id,
      body: row.body,
      image_path: row.image_path,
      image_url: row.image_path ? imageUrls.get(row.image_path) ?? null : null,
      created_at: row.created_at,
      author_name: author?.breeder_name ?? null,
      author_is_ambassador: author?.isAmbassador ?? false,
    };
  });
}

export async function compressChatImage(uri: string, sourceWidth: number): Promise<string> {
  const context = ImageManipulator.ImageManipulator.manipulate(uri);
  context.resize({ width: Math.min(CHAT_IMAGE_MAX_WIDTH, sourceWidth) });
  const image = await context.renderAsync();
  const result = await image.saveAsync({
    format: ImageManipulator.SaveFormat.JPEG,
    compress: CHAT_IMAGE_JPEG_QUALITY,
  });
  return result.uri;
}

export async function uploadCommunityImage(userId: string, compressedUri: string): Promise<string> {
  const response = await fetch(compressedUri);
  const blob = await response.blob();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;

  const { error } = await supabase.storage
    .from(CHAT_IMAGE_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

export async function sendCommunityMessage(
  channel: CommunityChannel,
  body: string,
  imagePath: string | null = null,
): Promise<void> {
  const { error } = await supabase
    .from('community_messages')
    .insert({ channel, body, image_path: imagePath });
  if (error) throw error;
}

export async function fetchMyReportedMessageIds(reporterId: string, messageIds: string[]): Promise<Set<string>> {
  if (messageIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from('community_message_reports')
    .select('message_id')
    .eq('reporter_id', reporterId)
    .in('message_id', messageIds);

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.message_id as string));
}

export type ReportResult = 'ok' | 'already_reported' | 'failed';

export async function reportCommunityMessage(messageId: string, reporterId: string): Promise<ReportResult> {
  const { error } = await supabase
    .from('community_message_reports')
    .insert({ message_id: messageId, reporter_id: reporterId, reason: 'reported_in_app' });

  if (!error) return 'ok';
  if (error.code === '23505') return 'already_reported';
  return 'failed';
}

export async function deleteCommunityMessage(message: CommunityMessage): Promise<void> {
  const { data, error } = await supabase
    .from('community_messages')
    .delete()
    .eq('id', message.id)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) throw new Error('message_not_deleted');

  if (message.image_path) {
    await supabase.storage.from(CHAT_IMAGE_BUCKET).remove([message.image_path]);
  }
}

export function subscribeToCommunityMessages(onChange: () => void): () => void {
  const channel = supabase
    .channel('community-messages')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages' }, () => onChange())
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
