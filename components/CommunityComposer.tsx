import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ImagePlus, Send, X } from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { useLanguage } from '@/lib/language-context';
import { COMMUNITY_MESSAGE_MAX_LENGTH } from '@/lib/community-chat';

export interface PendingChatImage {
  uri: string;
  width: number;
}

interface CommunityComposerProps {
  draft: string;
  onChangeDraft: (text: string) => void;
  pendingImage: PendingChatImage | null;
  onPickImage: () => void;
  onRemoveImage: () => void;
  onSend: () => void;
  sending: boolean;
  canSend: boolean;
  allowPhotos: boolean;
}

export function CommunityComposer({
  draft,
  onChangeDraft,
  pendingImage,
  onPickImage,
  onRemoveImage,
  onSend,
  sending,
  canSend,
  allowPhotos,
}: CommunityComposerProps) {
  const { t, language } = useLanguage();
  const ro = language === 'ro';

  return (
    <View style={styles.wrap}>
      {pendingImage && (
        <View style={styles.previewRow}>
          <View style={styles.previewWrap}>
            <Image source={{ uri: pendingImage.uri }} style={styles.preview} resizeMode="cover" />
            <TouchableOpacity
              style={styles.previewRemove}
              onPress={onRemoveImage}
              disabled={sending}
              accessibilityRole="button"
              accessibilityLabel={ro ? 'Elimină fotografia' : 'Remove photo'}
            >
              <X color={Colors.white} size={14} />
            </TouchableOpacity>
          </View>
          <Text style={styles.previewText}>{ro ? 'Fotografie atașată' : 'Photo attached'}</Text>
        </View>
      )}

      <View style={styles.row}>
        {allowPhotos && (
          <TouchableOpacity
            style={[styles.attachBtn, sending && styles.attachBtnDisabled]}
            onPress={onPickImage}
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel={ro ? 'Atașează o fotografie' : 'Attach a photo'}
          >
            <ImagePlus color={Colors.royalBlue} size={20} />
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={onChangeDraft}
          placeholder={t('chatPlaceholder')}
          placeholderTextColor={Colors.textLight}
          multiline
          maxLength={COMMUNITY_MESSAGE_MAX_LENGTH}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!canSend || sending) && styles.sendBtnDisabled]}
          onPress={onSend}
          disabled={!canSend || sending}
          accessibilityRole="button"
        >
          {sending ? <ActivityIndicator color={Colors.white} size="small" /> : <Send color={Colors.white} size={20} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.neutral100,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  previewRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(13, 27, 62, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachBtnDisabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.royalBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.neutral300,
  },
});
