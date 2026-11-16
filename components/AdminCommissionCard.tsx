import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Percent } from 'lucide-react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import {
  DEFAULT_COMMISSION_RATE,
  DEFAULT_PARTNER_COMMISSION_RATE,
  fetchCommissionRates,
  fetchPartnerProFree,
  updateAuctionCommissionRate,
  updatePartnerCommissionRate,
  updatePartnerProFree,
} from '@/lib/commission';

function parseRate(value: string): number | null {
  const rate = Number(value.trim().replace(',', '.'));
  if (value.trim() === '' || !Number.isFinite(rate) || rate < 0 || rate > 100) return null;
  return rate;
}

export function AdminCommissionCard() {
  const { t } = useLanguage();
  const [standardInput, setStandardInput] = useState('');
  const [partnerInput, setPartnerInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proFree, setProFree] = useState(false);
  const [proFreeSaving, setProFreeSaving] = useState(false);
  const [proFreeError, setProFreeError] = useState<string | null>(null);

  useEffect(() => {
    fetchCommissionRates()
      .then((rates) => {
        setStandardInput(String(rates.standard));
        setPartnerInput(String(rates.partner));
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
    fetchPartnerProFree()
      .then(setProFree)
      .catch(() => setProFreeError(t('error')));
  }, []);

  const handleProFreeToggle = async (enabled: boolean) => {
    const previous = proFree;
    setProFree(enabled);
    setProFreeSaving(true);
    setProFreeError(null);
    try {
      await updatePartnerProFree(enabled);
    } catch {
      setProFree(previous);
      setProFreeError(t('error'));
    } finally {
      setProFreeSaving(false);
    }
  };

  const clearStatus = () => {
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    const standard = parseRate(standardInput);
    const partner = parseRate(partnerInput);
    if (standard === null || partner === null) {
      setSaved(false);
      setError(t('adminCommissionInvalid'));
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateAuctionCommissionRate(standard);
      await updatePartnerCommissionRate(partner);
      setSaved(true);
    } catch {
      setError(t('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Percent color={Colors.gold} size={20} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('adminCommissionTitle')}</Text>
          <Text style={styles.hint}>{t('adminCommissionHint')}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={Colors.royalBlue} style={styles.spinner} />
      ) : loadFailed ? (
        <Text style={styles.errorText}>{t('commissionReportError')}</Text>
      ) : (
        <>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Comision Standard (%)</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={standardInput}
                onChangeText={(value) => {
                  setStandardInput(value);
                  clearStatus();
                }}
                keyboardType="decimal-pad"
                placeholder={String(DEFAULT_COMMISSION_RATE)}
                placeholderTextColor={Colors.textLight}
              />
              <Text style={styles.suffix}>%</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Comision Parteneri (%)</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={partnerInput}
                onChangeText={(value) => {
                  setPartnerInput(value);
                  clearStatus();
                }}
                keyboardType="decimal-pad"
                placeholder={String(DEFAULT_PARTNER_COMMISSION_RATE)}
                placeholderTextColor={Colors.textLight}
              />
              <Text style={styles.suffix}>%</Text>
            </View>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}
          {saved && <Text style={styles.successText}>{t('adminCommissionSaved')}</Text>}

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>{t('adminCommissionSave')}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.proRow}>
            <View style={styles.proText}>
              <Text style={styles.fieldLabel}>Abonament Pro Gratuit</Text>
              <Text style={styles.hint}>Parteneri și Ambasadori primesc planul Pro fără plată.</Text>
            </View>
            {proFreeSaving ? (
              <ActivityIndicator size="small" color={Colors.royalBlue} />
            ) : (
              <Switch
                value={proFree}
                onValueChange={handleProFreeToggle}
                trackColor={{ false: Colors.neutral200, true: Colors.royalBlue }}
                thumbColor={Colors.white}
              />
            )}
          </View>
          {proFreeError && <Text style={styles.errorText}>{proFreeError}</Text>}
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
    borderColor: Colors.gold,
    gap: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.goldPale,
    justifyContent: 'center', alignItems: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.text },
  hint: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  spinner: { marginVertical: 8 },
  field: { gap: 6 },
  fieldLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, minWidth: 0, fontFamily: 'Inter-Bold', fontSize: 24, color: Colors.text,
    backgroundColor: Colors.neutral50, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 12,
  },
  suffix: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: Colors.textSecondary },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.error },
  successText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.success },
  saveBtn: {
    backgroundColor: Colors.royalBlue, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', minHeight: 48,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.white },
  divider: { height: 1, backgroundColor: Colors.borderLight },
  proRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  proText: { flex: 1, gap: 2 },
});
