import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyRound } from 'lucide-react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

const MIN_PASSWORD_LENGTH = 6;

export function AccountPasswordCard() {
  const { t } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearStatus = () => {
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setSaved(false);
      setError(t('passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setSaved(false);
      setError(t('passwordMismatch'));
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(t('saveFailed'));
      return;
    }
    setPassword('');
    setConfirmPassword('');
    setSaved(true);
  };

  const canSave = password.length > 0 && confirmPassword.length > 0 && !saving;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <KeyRound color={Colors.royalBlue} size={20} />
        </View>
        <Text style={styles.title}>{t('passwordSectionTitle')}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t('fieldNewPassword')}</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={(v) => { setPassword(v); clearStatus(); }}
          secureTextEntry
          autoCapitalize="none"
          placeholderTextColor={Colors.textLight}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>{t('fieldConfirmPassword')}</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={(v) => { setConfirmPassword(v); clearStatus(); }}
          secureTextEntry
          autoCapitalize="none"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {saved && <Text style={styles.successText}>{t('passwordChanged')}</Text>}

      <TouchableOpacity
        style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!canSave}
        accessibilityRole="button"
      >
        {saving ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.saveBtnText}>{t('saveChanges')}</Text>
        )}
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
    borderColor: Colors.royalBlueBorder,
    gap: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.royalBluePale,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.text },
  field: { gap: 6 },
  label: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary },
  input: {
    fontFamily: 'Inter-Regular', fontSize: 16, color: Colors.text,
    backgroundColor: Colors.neutral50, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.error },
  successText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.success },
  saveBtn: {
    backgroundColor: Colors.royalBlue, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', minHeight: 48,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.white },
});
