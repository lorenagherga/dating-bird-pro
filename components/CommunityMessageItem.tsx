import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { CheckCircle2, Flag, Ban, Trash2 } from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { useLanguage } from '@/lib/language-context';
import type { CommunityMessage } from '@/lib/community-chat';
import { AmbassadorBadge } from '@/components/AmbassadorBadge';

interface CommunityMessageItemProps {
  message: CommunityMessage;
  isOwn: boolean;
  isAdmin: boolean;
  reported: boolean;
  onReport: () => void;
  onBlock: () => void;
  onDelete: () => void;
  onOpenImage: (uri: string) => void;
}

export function CommunityMessageItem({ message, isOwn, isAdmin, reported, onReport, onBlock, onDelete, onOpenImage }: CommunityMessageItemProps) {
  const { t, language } = useLanguage();
  const authorName = message.author_name?.trim() || t('breeder');
  const initial = authorName.charAt(0).toUpperCase();
  const time = new Date(message.created_at).toLocaleString(language, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.authorBox}>
          <View style={styles.authorRow}>
            <Text style={styles.author} numberOfLines={1}>
              {authorName}
              {isOwn ? ` · ${t('chatYou')}` : ''}
            </Text>
            {message.author_is_ambassador && <AmbassadorBadge size={14} />}
          </View>
          <Text style={styles.time}>{time}</Text>
        </View>
      </View>

      {message.body ? <Text style={styles.body}>{message.body}</Text> : null}

      {message.image_path && (
        message.image_url ? (
          <TouchableOpacity
            onPress={() => onOpenImage(message.image_url as string)}
            activeOpacity={0.9}
            accessibilityRole="imagebutton"
            style={styles.imageWrap}
          >
            <Image source={{ uri: message.image_url }} style={styles.image} resizeMode="cover" />
          </TouchableOpacity>
        ) : (
          <Text style={styles.imageMissing}>{language === 'ro' ? 'Fotografia nu poate fi afișată.' : 'Photo unavailable.'}</Text>
        )
      )}

      <View style={styles.actions}>
        {reported ? (
          <View style={styles.reportedBadge}>
            <CheckCircle2 color={Colors.success} size={16} />
            <Text style={styles.reportedText}>{t('chatReported')}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.actionBtn} onPress={onReport} accessibilityRole="button">
            <Flag color={Colors.textSecondary} size={16} />
            <Text style={styles.actionText}>{t('chatReport')}</Text>
          </TouchableOpacity>
        )}

        {!isOwn && (
          <TouchableOpacity style={styles.actionBtn} onPress={onBlock} accessibilityRole="button">
            <Ban color={Colors.textSecondary} size={16} />
            <Text style={styles.actionText}>Blochează</Text>
          </TouchableOpacity>
        )}

        {isAdmin && (
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete} accessibilityRole="button">
            <Trash2 color={Colors.error} size={16} />
            <Text style={[styles.actionText, styles.deleteText]}>{t('chatDelete')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: Colors.royalBlue,
  },
  authorBox: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  author: {
    flexShrink: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  time: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
  },
  imageWrap: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.neutral100,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  imageMissing: {
    marginTop: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.neutral100,
  },
  deleteBtn: {
    backgroundColor: Colors.errorBg,
  },
  actionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  deleteText: {
    color: Colors.error,
  },
  reportedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  reportedText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.success,
  },
});
