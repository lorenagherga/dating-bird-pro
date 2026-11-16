import { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { History, Wallet, Plus } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/lib/theme';
import {
  COMMISSION_KIND_LABELS,
  CommissionWalletEntry,
  fetchMyCommissionBalance,
  fetchMyCommissionEntries,
  formatLei,
} from '@/lib/commission-wallet';
import { CommissionWalletHistoryModal } from '@/components/CommissionWalletHistoryModal';
import { CommissionTopUpModal } from '@/components/CommissionTopUpModal';
import { fetchCommissionRates, type CommissionRates } from '@/lib/commission';

export function CommissionWalletCard() {
  const [rates, setRates] = useState<CommissionRates | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<CommissionWalletEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextRates, nextBalance, nextEntries] = await Promise.all([
        fetchCommissionRates(),
        fetchMyCommissionBalance(),
        fetchMyCommissionEntries(10),
      ]);
      setRates(nextRates);
      setBalance(nextBalance);
      setEntries(nextEntries);
    } catch (cause) {
      console.error('commission wallet load failed', cause);
      setError('Portofelul nu poate fi încărcat acum. Încearcă din nou mai târziu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (rates && rates.standard === 0 && rates.partner === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Wallet color={Colors.royalBlue} size={20} />
        </View>
        <Text style={styles.title}>Portofel Comisioane (lei)</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.royalBlue} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          <Text style={[styles.balance, balance !== null && balance < 0 && styles.balanceNegative]}>
            {formatLei(balance ?? 0)}
          </Text>
          <Text style={styles.hint}>
            Comisionul final al licitațiilor câștigate se scade automat din acest sold. Pentru a publica o licitație nouă, soldul trebuie să acopere comisionul calculat la prețul de pornire (Standard {rates?.standard ?? 0}%, Partener {rates?.partner ?? 0}%). Ambasadorii nu au comision.
          </Text>

          <TouchableOpacity style={styles.topUpBtn} onPress={() => setTopUpOpen(true)}>
            <Plus color={Colors.white} size={16} />
            <Text style={styles.topUpBtnText}>Încarcă Portofel</Text>
          </TouchableOpacity>

          {entries.length === 0 ? (
            <Text style={styles.emptyText}>Nu există mișcări în portofel.</Text>
          ) : (
            <View style={styles.entries}>
              {entries.map((entry) => (
                <View key={entry.id} style={styles.entryRow}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryKind}>{COMMISSION_KIND_LABELS[entry.kind]}</Text>
                    {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}
                    <Text style={styles.entryDate}>{new Date(entry.created_at).toLocaleDateString('ro-RO')}</Text>
                  </View>
                  <Text style={[styles.entryAmount, entry.amount < 0 && styles.entryAmountNegative]}>
                    {entry.amount > 0 ? '+' : ''}{formatLei(Number(entry.amount))}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.historyBtn} onPress={() => setHistoryOpen(true)}>
            <History color={Colors.royalBlue} size={16} />
            <Text style={styles.historyBtnText}>Vezi tot istoricul</Text>
          </TouchableOpacity>
        </>
      )}

      <CommissionWalletHistoryModal visible={historyOpen} onClose={() => setHistoryOpen(false)} />
      <CommissionTopUpModal visible={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
    marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.royalBluePale,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  balance: { fontFamily: 'Inter-Bold', fontSize: 28, color: Colors.royalBlue },
  balanceNegative: { color: Colors.error },
  hint: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textLight },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error },
  entries: { gap: 0 },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  entryInfo: { flex: 1, gap: 2 },
  entryKind: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  entryNote: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  entryDate: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight },
  entryAmount: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.success },
  entryAmountNegative: { color: Colors.error },
  historyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: BorderRadius.md, backgroundColor: Colors.royalBluePale,
  },
  historyBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.royalBlue },
  topUpBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: BorderRadius.md, backgroundColor: Colors.royalBlue,
  },
  topUpBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.white },
});
