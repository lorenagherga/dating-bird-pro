import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { Gift, Copy, Check, MessageCircle } from 'lucide-react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { buildInviteWhatsAppUrl, fetchMyInviteSummary, type InviteSummary } from '@/lib/invite-program';

const COPY_FEEDBACK_MS = 2000;

export function InviteFriendsCard() {
  const { language } = useLanguage();
  const isRo = language === 'ro';
  const [summary, setSummary] = useState<InviteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchMyInviteSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  if (loading) {
    return <ActivityIndicator size="small" color={Colors.royalBlue} style={{ marginVertical: 16 }} />;
  }
  if (!summary || !summary.enabled) return null;

  const { inviteCode, friendsPaid, requiredFriends, bonusDays } = summary;
  const bonusLabel = bonusDays === 60 ? (isRo ? '2 LUNI' : '2 MONTHS') : `${bonusDays} ${isRo ? 'ZILE' : 'DAYS'}`;

  const copyCode = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const shareWhatsApp = () => {
    Linking.openURL(buildInviteWhatsAppUrl(inviteCode, isRo));
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Gift color={Colors.gold} size={22} />
        <Text style={styles.title}>
          {isRo
            ? `Invită ${requiredFriends} prieteni care își activează abonamentul anual și primești ${bonusLabel} Pro GRATIS!`
            : `Invite ${requiredFriends} friends who activate their annual subscription and get ${bonusLabel} of Pro FREE!`}
        </Text>
      </View>

      <Text style={styles.label}>{isRo ? 'Codul tău de invitație' : 'Your invite code'}</Text>
      <View style={styles.codeRow}>
        <Text style={styles.code} selectable>{inviteCode}</Text>
        <TouchableOpacity
          style={styles.copyBtn}
          onPress={copyCode}
          accessibilityRole="button"
          accessibilityLabel={isRo ? 'Copiază codul' : 'Copy code'}
          activeOpacity={0.8}
        >
          {copied ? <Check color={Colors.royalBlue} size={18} /> : <Copy color={Colors.royalBlue} size={18} />}
          <Text style={styles.copyText}>
            {copied ? (isRo ? 'Copiat' : 'Copied') : (isRo ? 'Copiază' : 'Copy')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.progressText}>
          {`${friendsPaid} / ${requiredFriends} ${isRo ? 'prieteni abonați' : 'paying friends'}`}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.whatsappBtn}
        onPress={shareWhatsApp}
        accessibilityRole="button"
        activeOpacity={0.85}
      >
        <MessageCircle color={Colors.white} size={18} />
        <Text style={styles.whatsappText}>{isRo ? 'Trimite invitația pe WhatsApp' : 'Send invitation on WhatsApp'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    gap: 12,
    marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { flex: 1, fontFamily: 'Inter-Bold', fontSize: 16, lineHeight: 22, color: Colors.text },
  label: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  code: { fontFamily: 'Inter-Bold', fontSize: 20, letterSpacing: 2, color: Colors.royalBlue },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.royalBlue,
  },
  copyText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  progressRow: { flexDirection: 'row' },
  progressText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#0B6E63',
  },
  whatsappText: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.white },
});
