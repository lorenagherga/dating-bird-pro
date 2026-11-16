import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { Gift } from 'lucide-react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import {
  fetchFreeLaunchSettings,
  saveFreeLaunchSettings,
  type FreeLaunchSettings,
} from '@/lib/free-launch';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const EMPTY_SETTINGS: FreeLaunchSettings = {
  mode: false,
  expiresOn: '',
  message: '',
  iban: '',
  revolut: '',
};

export function AdminFreeLaunchCard() {
  const { language } = useLanguage();
  const isRo = language === 'ro';
  const [draft, setDraft] = useState<FreeLaunchSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchFreeLaunchSettings()
      .then(setDraft)
      .catch(() => setError(isRo ? 'Nu am putut încărca setările.' : 'Could not load settings.'))
      .finally(() => setLoading(false));
  }, [isRo]);

  const update = <K extends keyof FreeLaunchSettings>(key: K, value: FreeLaunchSettings[K]) => {
    setSuccess(false);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setError(null);
    setSuccess(false);
    if (draft.expiresOn && !DATE_PATTERN.test(draft.expiresOn)) {
      setError(isRo ? 'Data trebuie să aibă formatul AAAA-LL-ZZ.' : 'Date must use the format YYYY-MM-DD.');
      return;
    }
    setSaving(true);
    try {
      await saveFreeLaunchSettings(draft);
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
        <Gift color={Colors.gold} size={22} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{isRo ? 'Mod lansare gratuită' : 'Free launch mode'}</Text>
          <Text style={styles.subtitle}>
            {isRo
              ? 'Banner automat pentru toți utilizatorii în ultimele 7 zile.'
              : 'Automatic banner for all users during the last 7 days.'}
          </Text>
        </View>
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.label}>{isRo ? 'Mod Lansare Gratuită' : 'Free launch mode'}</Text>
        <Text style={[styles.stateText, draft.mode && styles.stateTextOn]}>
          {draft.mode ? 'ON' : 'OFF'}
        </Text>
        <Switch
          value={draft.mode}
          onValueChange={(value) => update('mode', value)}
          trackColor={{ false: Colors.borderLight, true: Colors.royalBlue }}
        />
      </View>

      <Text style={styles.label}>{isRo ? 'Dată expirare perioadă gratuită (AAAA-LL-ZZ)' : 'Free period end date (YYYY-MM-DD)'}</Text>
      <TextInput
        style={styles.input}
        value={draft.expiresOn}
        onChangeText={(value) => update('expiresOn', value.trim())}
        placeholder="2026-12-31"
        placeholderTextColor={Colors.textLight}
        autoCapitalize="none"
      />

      <Text style={styles.label}>{isRo ? 'Mesaj banner' : 'Banner message'}</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={draft.message}
        onChangeText={(value) => update('message', value)}
        placeholder={isRo ? 'Perioada gratuită se încheie curând.' : 'The free period ends soon.'}
        placeholderTextColor={Colors.textLight}
        multiline
      />

      <Text style={styles.sectionTitle}>{isRo ? 'Date de plată' : 'Payment details'}</Text>
      <Text style={styles.label}>IBAN</Text>
      <TextInput
        style={styles.input}
        value={draft.iban}
        onChangeText={(value) => update('iban', value)}
        autoCapitalize="characters"
        placeholderTextColor={Colors.textLight}
      />
      <Text style={styles.label}>Revolut</Text>
      <TextInput
        style={styles.input}
        value={draft.revolut}
        onChangeText={(value) => update('revolut', value)}
        autoCapitalize="none"
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
        <Text style={styles.saveText}>{saving ? (isRo ? 'Se salvează...' : 'Saving...') : (isRo ? 'Salvează setările' : 'Save settings')}</Text>
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
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.text, marginTop: 12 },
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
  multiline: { minHeight: 72, textAlignVertical: 'top' },
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
