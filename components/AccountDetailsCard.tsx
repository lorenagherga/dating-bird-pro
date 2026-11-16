import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { UserRound } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

export function AccountDetailsCard() {
  const { t } = useLanguage();
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [kennelName, setKennelName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setKennelName(profile.breeder_name ?? '');
    setPhone(profile.phone ?? '');
    setLocation(profile.location ?? '');
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        breeder_name: kennelName.trim(),
        phone: phone.trim() || null,
        location: location.trim() || null,
      })
      .eq('id', profile.id);
    setSaving(false);
    if (updateError) {
      setError(t('saveFailed'));
      return;
    }
    await refreshProfile();
    setSaved(true);
  };

  const clearStatus = () => {
    setSaved(false);
    setError(null);
  };

  const canSave = kennelName.trim().length > 0 && !saving;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <UserRound color={Colors.royalBlue} size={20} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('accountEditTitle')}</Text>
          <Text style={styles.hint}>{t('accountEditHint')}</Text>
        </View>
      </View>

      <Field label={t('fieldFullName')} value={fullName} onChange={(v) => { setFullName(v); clearStatus(); }} />
      <Field label={t('fieldKennelName')} value={kennelName} onChange={(v) => { setKennelName(v); clearStatus(); }} />
      <Field label={t('fieldPhone')} value={phone} onChange={(v) => { setPhone(v); clearStatus(); }} keyboardType="phone-pad" />
      <Field label={t('fieldLocation')} value={location} onChange={(v) => { setLocation(v); clearStatus(); }} />

      {error && <Text style={styles.errorText}>{error}</Text>}
      {saved && <Text style={styles.successText}>{t('changesSaved')}</Text>}

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

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: 'default' | 'phone-pad';
};

function Field({ label, value, onChange, keyboardType = 'default' }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholderTextColor={Colors.textLight}
      />
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
  headerText: { flex: 1, gap: 2 },
  title: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.text },
  hint: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
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
