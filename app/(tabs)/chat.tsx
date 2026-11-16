import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { AlertTriangle, ArrowRight, Gavel, Megaphone, MessageCircle } from 'lucide-react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { CommunityMessageItem } from '@/components/CommunityMessageItem';
import { CommunityComposer, type PendingChatImage } from '@/components/CommunityComposer';
import { ChatImageViewer } from '@/components/ChatImageViewer';
import { Colors } from '@/lib/theme';
import { blockUser, fetchBlockedUserIds } from '@/lib/user-safety';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import {
  compressChatImage,
  deleteCommunityMessage,
  fetchCommunityMessages,
  fetchMyReportedMessageIds,
  reportCommunityMessage,
  sendCommunityMessage,
  subscribeToCommunityMessages,
  uploadCommunityImage,
  type CommunityChannel,
  type CommunityMessage,
} from '@/lib/community-chat';

const CHANNELS: { key: CommunityChannel; icon: typeof MessageCircle }[] = [
  { key: 'discussions', icon: MessageCircle },
  { key: 'exchanges', icon: Megaphone },
];

export default function ChatScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isAdmin, session } = useAuth();
  const userId: string | null = session?.user?.id ?? null;

  const [channel, setChannel] = useState<CommunityChannel>('discussions');
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [actionFailed, setActionFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [pendingImage, setPendingImage] = useState<PendingChatImage | null>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendFailed, setSendFailed] = useState(false);

  const loadMessages = useCallback(async (target: CommunityChannel) => {
    try {
      const rows = await fetchCommunityMessages(target);
      setMessages(rows);
      setReportedIds(userId ? await fetchMyReportedMessageIds(userId, rows.map((row) => row.id)) : new Set());
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchBlockedUserIds(userId).then(setBlockedIds).catch(() => setBlockedIds(new Set()));
  }, [userId]);

  const visibleMessages = messages.filter((row) => !blockedIds.has(row.user_id));

  useEffect(() => {
    setLoading(true);
    loadMessages(channel);
    return subscribeToCommunityMessages(() => loadMessages(channel));
  }, [channel, loadMessages]);

  const handlePickImage = async () => {
    setSendFailed(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled) return;
      const asset = result.assets[0];
      setPendingImage({ uri: asset.uri, width: asset.width });
    } catch {
      setSendFailed(true);
    }
  };

  const handleSend = async () => {
    const body = draft.trim();
    if ((!body && !pendingImage) || sending || !userId) return;
    setSending(true);
    setSendFailed(false);
    try {
      let imagePath: string | null = null;
      if (pendingImage) {
        const compressed = await compressChatImage(pendingImage.uri, pendingImage.width);
        imagePath = await uploadCommunityImage(userId, compressed);
      }
      await sendCommunityMessage(channel, body, imagePath);
      setDraft('');
      setPendingImage(null);
      loadMessages(channel);
    } catch {
      setSendFailed(true);
    } finally {
      setSending(false);
    }
  };

  const handleReport = (message: CommunityMessage) => {
    if (!userId) return;
    Alert.alert(t('chatReport'), t('chatReportConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('chatReport'),
        onPress: async () => {
          const result = await reportCommunityMessage(message.id, userId);
          if (result === 'failed') {
            setActionFailed(true);
            return;
          }
          setActionFailed(false);
          setReportedIds((prev) => new Set(prev).add(message.id));
          if (result === 'ok') Alert.alert(t('chatReported'), t('chatReportSent'));
        },
      },
    ]);
  };

  const handleBlock = (message: CommunityMessage) => {
    Alert.alert('Blochează', `Nu vei mai vedea mesajele lui ${message.author_name ?? 'acest utilizator'} în chat.`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: 'Blochează',
        style: 'destructive',
        onPress: async () => {
          try {
            await blockUser(message.user_id);
            setBlockedIds((prev) => new Set(prev).add(message.user_id));
            setActionFailed(false);
          } catch {
            setActionFailed(true);
          }
        },
      },
    ]);
  };

  const handleDelete = (message: CommunityMessage) => {
    Alert.alert(t('chatDelete'), t('chatDeleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('chatDelete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCommunityMessage(message);
            setActionFailed(false);
            setMessages((prev) => prev.filter((row) => row.id !== message.id));
          } catch {
            setActionFailed(true);
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <ScreenHeader title={t('chatTitle')} subtitle={t('chatSubtitle')} />

        <View style={styles.banner}>
          <View style={styles.bannerTextRow}>
            <AlertTriangle color={Colors.warning} size={20} />
            <Text style={styles.bannerText}>{t('chatBannerText')}</Text>
          </View>
          <TouchableOpacity
            style={styles.bannerButton}
            onPress={() => router.push('/(tabs)/auctions' as any)}
            accessibilityRole="button"
          >
            <Gavel color={Colors.white} size={18} />
            <Text style={styles.bannerButtonText}>{t('chatBannerButton')}</Text>
            <ArrowRight color={Colors.white} size={18} />
          </TouchableOpacity>
        </View>

        <View style={styles.segment}>
          {CHANNELS.map(({ key, icon: Icon }) => {
            const active = channel === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                onPress={() => setChannel(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Icon color={active ? Colors.royalBlue : Colors.textSecondary} size={16} />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {key === 'discussions' ? t('chatTabDiscussions') : t('chatTabExchanges')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {actionFailed && <Text style={styles.errorText}>{t('chatActionError')}</Text>}
        {loadFailed && <Text style={styles.errorText}>{t('chatLoadError')}</Text>}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.royalBlue} />
          </View>
        ) : (
          <FlatList
            data={visibleMessages}
            keyExtractor={(item) => item.id}
            inverted
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <CommunityMessageItem
                message={item}
                isOwn={item.user_id === userId}
                isAdmin={isAdmin}
                reported={reportedIds.has(item.id)}
                onReport={() => handleReport(item)}
                onBlock={() => handleBlock(item)}
                onDelete={() => handleDelete(item)}
                onOpenImage={setViewerUri}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  {channel === 'discussions' ? t('chatEmptyDiscussions') : t('chatEmptyExchanges')}
                </Text>
              </View>
            }
          />
        )}

        <CommunityComposer
          draft={draft}
          onChangeDraft={setDraft}
          pendingImage={pendingImage}
          onPickImage={handlePickImage}
          onRemoveImage={() => setPendingImage(null)}
          onSend={handleSend}
          sending={sending}
          canSend={draft.trim().length > 0 || pendingImage !== null}
          allowPhotos
        />
        {sendFailed && <Text style={styles.errorText}>{t('chatSendError')}</Text>}
      </View>

      <ChatImageViewer uri={viewerUri} onClose={() => setViewerUri(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
  },
  banner: {
    backgroundColor: Colors.warningBg,
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  bannerTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bannerText: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    lineHeight: 21,
    color: Colors.text,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.royalBlue,
    borderRadius: 14,
    paddingVertical: 12,
  },
  bannerButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.white,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral100,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 11,
  },
  segmentBtnActive: {
    backgroundColor: Colors.white,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  segmentText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.royalBlue,
  },
  errorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: Colors.error,
    marginBottom: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  emptyBox: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
