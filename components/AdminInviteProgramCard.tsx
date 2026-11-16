import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { UserPlus } from 'lucide-react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { fetchInviteSettings, saveInviteSettings, type InviteSettings } from '@/lib/invite-program';

const MAX_FRIENDS = 100;
const MAX_BONUS_DAYS = 365;

function parseWhole(value: string, max: number): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return n >= 1 && n <= max ? n : null;
}

export function AdminInviteProgramCard() {
  const { language } = useLanguage();
  const isRo = language === 'ro';
  const [enabled, setEnabled] = useState(false);
  const [friendsText, setFriendsText] = useState('3');
  const [daysText, setDaysText] = useState('60');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchInviteSettings()
      .then((s: InviteSettings) => {
        setEnabled(s.enabled);
        setFriendsText(String(s.requiredFriends));
        setDaysText(String(s.bonusDays));
      })
      .catch(() => setError(isRo ? 'Nu am putut încărca setările.' : 'Could not load settings.'))
      .finally(() => setLoading(false));
  }, [isRo]);

  const save = async () => {
    setError(null);
    setSuccess(false);
    const friends = parseWhole(friendsText, MAX_FRIENDS);
    const days = parseWhole(daysText, MAX_BONUS_DAYS);
    if (friends === null) {
      setError(isRo ? `Numărul de prieteni trebuie să fie între 1 și ${MAX_FRIENDS}.` : `Friends count must be between 1 and ${MAX_FRIENDS}.`);
      return;
    }
    if (days === null) {
      setError(isRo ? `Zilele bonus trebuie să fie între 1 și ${MAX_BONUS_DAYS}.` : `Bonus days must be between 1 and ${MAX_BONUS_DAYS}.`);
      return;
    }
    setSaving(true);
    try {
      await saveInviteSettings({ enabled, requiredFriends: friends, bonusDays: days });
      setSuccess(true);
    } catch {
      setError(isRo ? 'Nu am putut salva setările. Încearcă din nou.' : 'Could not save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="small" color={Colors.royalBlue} style={{ marginVertical: 16 }} />;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <UserPlus color={Colors.gold} size={22} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isRo ? 'Invită 3 prieteni = 2 luni Pro gratis' : 'Invite 3 friends = 2 months Pro free'}</Text>
          <Text style={styles.subtitle}>
            {isRo
              ? 'Programul de recomandare. Dezactivat implicit, nevăzut de utilizatori.'
              : 'Referral program. Off by default and hidden from users.'}
          </Text>
        </View>
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.label}>{isRo ? 'Activează Programul Invită Prieteni' : 'Enable Invite Friends program'}</Text>
        <Text style={[styles.stateText, enabled && styles.stateTextOn]}>{enabled ? 'ON' : 'OFF'}</Text>
        <Switch
          value={enabled}
          onValueChange={(value) => {
            setSuccess(false);
            setEnabled(value);
          }}
          trackColor={{ false: Colors.borderLight, true: Colors.royalBlue }}
        />
      </View>

      <Text style={styles.label}>{isRo ? 'Prieteni plătitori necesari' : 'Paying friends required'}</Text>
      <TextInput
        style={styles.input}
        value={friendsText}
        onChangeText={(value) => {
          setSuccess(false);
          setFriendsText(value);
        }}
        keyboardType="number-pad"
        placeholderTextColor={Colors.textLight}
      />

      <Text style={styles.label}>{isRo ? 'Zile bonus acordate' : 'Bonus days granted'}</Text>
      <TextInput
        style={styles.input}
        value={daysText}
        onChangeText={(value) => {
          setSuccess(false);
          setDaysText(value);
        }}
        keyboardType="number-pad"
        placeholderTextColor={Colors.textLight}
      />

      {error && <Text style={styles.error}>{error}</Text>}
      {success && <Text style={styles.success}>{isRo ? 'Setările au fost salvate.' : 'Settings saved.'}</Text>}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.disabled]}
        onPress={save}
        disabled={saving}
        accessibilityRole="button"
        activeOpacity={0.8}
      >
        <Text style={styles.saveText}>
          {saving ? (isRo ? 'Se salvează...' : 'Saving...') : (isRo ? 'Salvează programul' : 'Save program')}
        </Text>
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
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.text },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary, marginTop: 6, flexShrink: 1 },
  stateText: { fontFamily: 'Inter-Bold', fontSize: 13, color: Colors.textLight, flex: 1 },
  stateTextOn: { color: Colors.royalBlue },
  input: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.neutral50,
  },
  error: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.error },
  success: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.success },
  saveBtn: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: Colors.royalBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.white },
  disabled: { opacity: 0.6 },
});
