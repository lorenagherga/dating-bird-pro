import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/lib/theme';
import {
  COMMISSION_KIND_LABELS,
  CommissionWalletEntry,
  fetchMyCommissionEntries,
  formatLei,
} from '@/lib/commission-wallet';

const HISTORY_LIMIT = 200;

interface CommissionWalletHistoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CommissionWalletHistoryModal({ visible, onClose }: CommissionWalletHistoryModalProps) {
  const [entries, setEntries] = useState<CommissionWalletEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setEntries(null);
    setError(null);
    fetchMyCommissionEntries(HISTORY_LIMIT)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((cause) => {
        console.error('commission wallet history failed', cause);
        if (!cancelled) setError('Istoricul nu poate fi încărcat acum. Încearcă din nou mai târziu.');
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>Istoric portofel</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Închide">
              <X color={Colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : entries === null ? (
            <ActivityIndicator color={Colors.royalBlue} style={{ marginVertical: 24 }} />
          ) : entries.length === 0 ? (
            <Text style={styles.emptyText}>Nu există mișcări în portofel.</Text>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(entry) => entry.id}
              renderItem={({ item }) => (
                <View style={styles.entryRow}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryKind}>{COMMISSION_KIND_LABELS[item.kind]}</Text>
                    {item.note ? <Text style={styles.entryNote}>{item.note}</Text> : null}
                    <Text style={styles.entryDate}>{new Date(item.created_at).toLocaleString('ro-RO')}</Text>
                  </View>
                  <Text style={[styles.entryAmount, item.amount < 0 && styles.entryAmountNegative]}>
                    {item.amount > 0 ? '+' : ''}{formatLei(Number(item.amount))}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: 20,
    maxHeight: '80%',
    gap: 12,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  closeBtn: { padding: 8 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight, paddingVertical: 16 },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.error, paddingVertical: 16 },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  entryInfo: { flex: 1, gap: 2 },
  entryKind: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  entryNote: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  entryDate: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight },
  entryAmount: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.success },
  entryAmountNegative: { color: Colors.error },
});
