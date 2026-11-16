import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BadgeEuro } from 'lucide-react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { fetchProPricing, updateProPricing } from '@/lib/pricing';

function parsePrice(value: string): number | null {
  const parsed = Number(value.trim().replace(',', '.'));
  if (value.trim() === '' || !Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function AdminProPricingCard() {
  const { t } = useLanguage();
  const [leiInput, setLeiInput] = useState('');
  const [eurInput, setEurInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProPricing()
      .then((pricing) => {
        setLeiInput(String(pricing.annual_price_lei));
        setEurInput(String(pricing.annual_price_eur));
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const lei = parsePrice(leiInput);
    const eur = parsePrice(eurInput);
    if (lei === null || eur === null) {
      setSaved(false);
      setError(t('proPriceInvalid'));
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateProPricing(lei, eur);
      setSaved(true);
    } catch {
      setError(t('error'));
    } finally {
      setSaving(false);
    }
  };

  const clearStatus = () => {
    setSaved(false);
    setError(null);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <BadgeEuro color={Colors.royalBlue} size={20} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('proPriceTitle')}</Text>
          <Text style={styles.hint}>{t('proPriceHint')}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={Colors.royalBlue} style={styles.spinner} />
      ) : loadFailed ? (
        <Text style={styles.errorText}>{t('error')}</Text>
      ) : (
        <>
          <View style={styles.fieldRow}>
            <View style={styles.field}>
              <Text style={styles.label}>{t('proPriceLei')}</Text>
              <TextInput
                style={styles.input}
                value={leiInput}
                onChangeText={(value) => {
                  setLeiInput(value);
                  clearStatus();
                }}
                keyboardType="decimal-pad"
                placeholder="60"
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>{t('proPriceEur')}</Text>
              <TextInput
                style={styles.input}
                value={eurInput}
                onChangeText={(value) => {
                  setEurInput(value);
                  clearStatus();
                }}
                keyboardType="decimal-pad"
                placeholder="10"
                placeholderTextColor={Colors.textLight}
              />
            </View>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}
          {saved && <Text style={styles.successText}>{t('proPriceSaved')}</Text>}

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>{t('proPriceSave')}</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 32,
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
  spinner: { marginVertical: 8 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  field: { flex: 1, minWidth: 0, gap: 6 },
  label: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary },
  input: {
    width: '100%', minWidth: 0, fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.text,
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
