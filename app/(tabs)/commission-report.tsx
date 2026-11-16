import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { fetchAuctionTransactions, isSuperAdminEmail, type AuctionTransaction } from '@/lib/commission';

export default function CommissionReportScreen() {
  const { t, language } = useLanguage();
  const { session } = useAuth();
  const allowed = isSuperAdminEmail(session?.user?.email);
  const [rows, setRows] = useState<AuctionTransaction[]>([]);
  const [loading, setLoading] = useState(allowed);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!allowed) return;
    fetchAuctionTransactions()
      .then(setRows)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [allowed]);

  const total = rows.reduce((sum, row) => sum + row.commission_amount, 0);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(language === 'ro' ? 'ro-RO' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const renderBody = () => {
    if (!allowed || failed) {
      return <Text style={styles.message}>{t('commissionReportError')}</Text>;
    }
    if (loading) {
      return <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 40 }} />;
    }
    return (
      <>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>{t('commissionReportTotal')}</Text>
          <Text style={styles.totalValue}>{total.toFixed(2)} {t('aucLei')}</Text>
        </View>

        {rows.length === 0 ? (
          <Text style={styles.message}>{t('commissionReportEmpty')}</Text>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={2}>{row.auction_title}</Text>
                <Text style={styles.cardDate}>{formatDate(row.created_at)}</Text>
              </View>
              <View style={styles.grid}>
                <View style={styles.cell}>
                  <Text style={styles.cellLabel}>{t('commissionReportSeller')}</Text>
                  <Text style={styles.cellValue}>{row.seller_name ?? '—'}</Text>
                </View>
                <View style={styles.cell}>
                  <Text style={styles.cellLabel}>{t('commissionReportWinner')}</Text>
                  <Text style={styles.cellValue}>{row.winner_name ?? '—'}</Text>
                </View>
                <View style={styles.cell}>
                  <Text style={styles.cellLabel}>{t('commissionReportSale')}</Text>
                  <Text style={styles.cellValue}>{row.sale_amount.toFixed(2)} {t('aucLei')}</Text>
                </View>
                <View style={styles.cell}>
                  <Text style={styles.cellLabel}>{t('commissionReportCommission')}</Text>
                  <Text style={[styles.cellValue, styles.commissionValue]}>
                    {row.commission_amount.toFixed(2)} {t('aucLei')} ({row.commission_rate}%)
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('commissionReportTitle')} showBack />
        {renderBody()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 40, gap: 12 },
  message: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary,
    textAlign: 'center', paddingVertical: 24,
  },
  totalCard: {
    backgroundColor: Colors.royalBlue, borderRadius: 16, padding: 20, gap: 4, marginBottom: 8,
  },
  totalLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.goldLight },
  totalValue: { fontFamily: 'Inter-Bold', fontSize: 26, color: Colors.white },
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.borderLight, gap: 12,
  },
  cardHeader: { gap: 4 },
  cardTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.text },
  cardDate: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textLight },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47%', gap: 2 },
  cellLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textSecondary },
  cellValue: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.text },
  commissionValue: { color: Colors.goldDark },
});
