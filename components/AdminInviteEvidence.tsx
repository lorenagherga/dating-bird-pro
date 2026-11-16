import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ChevronDown, ChevronUp, Users } from 'lucide-react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import {
  fetchInviteReferees,
  fetchInviteReferrers,
  validateInviteRewards,
  type InviteRefereeRow,
  type InviteReferrerRow,
} from '@/lib/invite-program';

export function AdminInviteEvidence() {
  const { language } = useLanguage();
  const isRo = language === 'ro';
  const [referrers, setReferrers] = useState<InviteReferrerRow[]>([]);
  const [referees, setReferees] = useState<InviteRefereeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [referrerRows, refereeRows] = await Promise.all([fetchInviteReferrers(), fetchInviteReferees()]);
      setReferrers(referrerRows);
      setReferees(refereeRows);
    } catch {
      setError(isRo ? 'Nu am putut încărca evidența invitațiilor.' : 'Could not load the invitation records.');
    } finally {
      setLoading(false);
    }
  }, [isRo]);

  useEffect(() => {
    load();
  }, [load]);

  const validate = async (row: InviteReferrerRow) => {
    setError(null);
    setNotice(null);
    setValidatingId(row.referrerId);
    try {
      const granted = await validateInviteRewards(row.referrerId);
      setNotice(
        granted > 0
          ? (isRo ? `Au fost acordate ${granted * row.bonusDays} zile Pro.` : `${granted * row.bonusDays} Pro days granted.`)
          : (isRo ? 'Nu există un lot nou de prieteni plătitori.' : 'No new batch of paying friends.'),
      );
      await load();
    } catch {
      setError(isRo ? 'Nu am putut acorda zilele. Încearcă din nou.' : 'Could not grant the days. Please try again.');
    } finally {
      setValidatingId(null);
    }
  };

  if (loading) {
    return <ActivityIndicator size="small" color={Colors.royalBlue} style={{ marginVertical: 16 }} />;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Users color={Colors.royalBlue} size={22} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isRo ? 'Dovadă & Evidență Invitații' : 'Proof & Invitation Records'}</Text>
          <Text style={styles.subtitle}>
            {isRo
              ? 'Un prieten contează doar după ce abonamentul anual este activ.'
              : 'A friend counts only once their annual subscription is active.'}
          </Text>
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {notice && <Text style={styles.success}>{notice}</Text>}

      {referrers.length === 0 ? (
        <Text style={styles.empty}>{isRo ? 'Nicio invitație înregistrată încă.' : 'No invitations recorded yet.'}</Text>
      ) : (
        referrers.map((row) => {
          const expanded = expandedId === row.referrerId;
          const friends = referees.filter((r) => r.referrerId === row.referrerId);
          const isValidating = validatingId === row.referrerId;
          return (
            <View key={row.referrerId} style={styles.row}>
              <TouchableOpacity
                style={styles.rowHeader}
                onPress={() => setExpandedId(expanded ? null : row.referrerId)}
                accessibilityRole="button"
                activeOpacity={0.8}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name} numberOfLines={1}>{row.referrerName || row.referrerEmail}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {row.referrerEmail} · {row.inviteCode}
                  </Text>
                  <Text style={styles.count}>
                    {`${row.friendsPaid} / ${row.requiredFriends} ${isRo ? 'prieteni abonați' : 'paying friends'}`}
                    {`  ·  ${row.friendsJoined} ${isRo ? 'înscriși' : 'signed up'}`}
                  </Text>
                </View>
                {expanded ? <ChevronUp color={Colors.textSecondary} size={18} /> : <ChevronDown color={Colors.textSecondary} size={18} />}
              </TouchableOpacity>

              {row.readyBatches > 0 && (
                <TouchableOpacity
                  style={[styles.validateBtn, isValidating && styles.disabled]}
                  onPress={() => validate(row)}
                  disabled={isValidating}
                  accessibilityRole="button"
                  activeOpacity={0.8}
                >
                  <Text style={styles.validateText}>
                    {isValidating
                      ? (isRo ? 'Se acordă...' : 'Granting...')
                      : `${isRo ? 'Validează & Acordă' : 'Validate & Grant'} +${row.bonusDays} ${isRo ? 'zile Pro' : 'Pro days'}`}
                  </Text>
                </TouchableOpacity>
              )}

              {expanded && (
                <View style={styles.refereeList}>
                  {friends.length === 0 ? (
                    <Text style={styles.empty}>{isRo ? 'Niciun prieten înscris.' : 'No friends signed up.'}</Text>
                  ) : (
                    friends.map((friend) => (
                      <View key={`${friend.refereeEmail}-${friend.joinedAt}`} style={styles.refereeRow}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.name} numberOfLines={1}>{friend.refereeName || friend.refereeEmail}</Text>
                          <Text style={styles.meta} numberOfLines={1}>
                            {friend.refereeEmail} · {new Date(friend.joinedAt).toLocaleDateString(isRo ? 'ro-RO' : 'en-GB')}
                          </Text>
                        </View>
                        <View style={[styles.badge, friend.isActive && styles.badgeActive]}>
                          <Text style={[styles.badgeText, friend.isActive && styles.badgeTextActive]}>
                            {friend.isActive
                              ? (isRo ? 'Abonament anual activ / Plătit' : 'Annual subscription active / Paid')
                              : (isRo ? 'În așteptare plată' : 'Awaiting payment')}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.text },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  empty: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  error: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.error },
  success: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.success },
  row: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  meta: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  count: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.royalBlue },
  validateBtn: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: Colors.royalBlue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  validateText: { fontFamily: 'Inter-Bold', fontSize: 13, color: Colors.white },
  refereeList: { gap: 8, borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 10 },
  refereeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.neutral50,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  badgeActive: { backgroundColor: Colors.royalBlue, borderColor: Colors.royalBlue },
  badgeText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: Colors.textSecondary },
  badgeTextActive: { color: Colors.white },
  disabled: { opacity: 0.6 },
});
