import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Megaphone } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/lib/theme';

const MAX_ANNOUNCEMENT_LENGTH = 300;

export function AdminAnnouncementCard() {
  const [message, setMessage] = useState('');
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      supabase.from('platform_text_settings').select('value').eq('key', 'announcement_message').maybeSingle(),
      supabase.from('platform_settings').select('value').eq('key', 'announcement_active').maybeSingle(),
    ]).then(([textRes, flagRes]) => {
      if (!mounted) return;
      if (textRes.error || flagRes.error) {
        setError('Nu am putut încărca anunțul.');
      } else {
        setMessage(textRes.data?.value ?? '');
        setActive(flagRes.data?.value === 1);
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const publish = async () => {
    const text = message.trim();
    if (!text) {
      setError('Scrieți textul anunțului înainte de publicare.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    const { error: textError } = await supabase.rpc('admin_set_text_setting', {
      p_key: 'announcement_message',
      p_value: text,
    });
    if (textError) {
      setSaving(false);
      setError('Nu am putut salva anunțul.');
      return;
    }
    const { error: flagError } = await supabase
      .from('platform_settings')
      .update({ value: 1, updated_at: new Date().toISOString() })
      .eq('key', 'announcement_active');
    setSaving(false);
    if (flagError) {
      setError('Nu am putut publica anunțul.');
      return;
    }
    setActive(true);
    setSuccess('Anunțul este publicat pe pagina de start.');
  };

  const stop = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const { error: flagError } = await supabase
      .from('platform_settings')
      .update({ value: 0, updated_at: new Date().toISOString() })
      .eq('key', 'announcement_active');
    setSaving(false);
    if (flagError) {
      setError('Nu am putut opri anunțul.');
      return;
    }
    setActive(false);
    setSuccess('Anunțul a fost oprit.');
  };

  if (loading) {
    return <ActivityIndicator size="small" color={Colors.royalBlue} style={styles.spinner} />;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Megaphone color={Colors.gold} size={20} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Anunț global</Text>
          <Text style={styles.hint}>Apare ca bandă pe pagina de start a tuturor utilizatorilor.</Text>
        </View>
        <View style={[styles.statusBadge, active ? styles.statusOn : styles.statusOff]}>
          <Text style={[styles.statusText, active ? styles.statusTextOn : styles.statusTextOff]}>
            {active ? 'Publicat' : 'Oprit'}
          </Text>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Text anunț</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={message}
          onChangeText={(value) => {
            setMessage(value.slice(0, MAX_ANNOUNCEMENT_LENGTH));
            setError(null);
            setSuccess(null);
          }}
          multiline
          textAlignVertical="top"
          placeholder="Ex.: Licitația săptămânală începe vineri la 18:00."
          placeholderTextColor={Colors.textLight}
        />
        <Text style={styles.counter}>{message.length}/{MAX_ANNOUNCEMENT_LENGTH}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, saving && styles.disabled]}
          onPress={publish}
          disabled={saving}
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.primaryText}>{active ? 'Actualizează anunțul' : 'Publică anunțul'}</Text>
          )}
        </TouchableOpacity>
        {active && (
          <TouchableOpacity
            style={[styles.stopBtn, saving && styles.disabled]}
            onPress={stop}
            disabled={saving}
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <Text style={styles.stopText}>Oprește</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
      {success && <Text style={styles.successText}>{success}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: { marginVertical: 16 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    gap: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.goldPale,
    justifyContent: 'center', alignItems: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  hint: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusOn: { backgroundColor: Colors.successBg },
  statusOff: { backgroundColor: Colors.neutral100 },
  statusText: { fontFamily: 'Inter-SemiBold', fontSize: 11 },
  statusTextOn: { color: Colors.success },
  statusTextOff: { color: Colors.textSecondary },
  field: { gap: 6 },
  label: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary },
  input: {
    fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.text,
    backgroundColor: Colors.neutral50, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  multiline: { minHeight: 96 },
  counter: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textLight, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  primaryBtn: {
    flex: 1, minWidth: 180, backgroundColor: Colors.royalBlue, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minHeight: 48,
  },
  primaryText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.white },
  stopBtn: {
    paddingHorizontal: 18, borderRadius: 12, backgroundColor: Colors.errorBg,
    alignItems: 'center', justifyContent: 'center', minHeight: 48,
  },
  stopText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.error },
  disabled: { opacity: 0.6 },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.error },
  successText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.success },
});
