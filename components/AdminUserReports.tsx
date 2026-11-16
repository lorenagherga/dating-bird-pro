import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Flag } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/lib/theme';

interface UserReport {
  report_id: string;
  report_created_at: string;
  report_reason: string | null;
  reporter_email: string | null;
  reported_email: string | null;
  auction_title: string | null;
}

export function AdminUserReports() {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.rpc('admin_list_user_reports').then(({ data, error: loadError }) => {
      if (!mounted) return;
      if (loadError) {
        setError('Nu am putut încărca raportările.');
      } else {
        setReports((data ?? []) as UserReport[]);
      }
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Flag color={Colors.error} size={20} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Raportări utilizatori</Text>
          <Text style={styles.hint}>Cele mai recente 200 de raportări trimise de utilizatori.</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={Colors.royalBlue} style={styles.spinner} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : reports.length === 0 ? (
        <Text style={styles.emptyText}>Nu există raportări.</Text>
      ) : (
        <View style={styles.list}>
          {reports.map((report) => (
            <View key={report.report_id} style={styles.row}>
              <Text style={styles.rowDate}>
                {new Date(report.report_created_at).toLocaleString('ro-RO', {
                  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </Text>
              <Text style={styles.rowReason}>{report.report_reason || 'Fără motiv specificat'}</Text>
              <Text style={styles.rowMeta}>
                Raportat de: {report.reporter_email ?? 'necunoscut'}
              </Text>
              <Text style={styles.rowMeta}>
                Utilizator raportat: {report.reported_email ?? 'necunoscut'}
              </Text>
              {report.auction_title && (
                <Text style={styles.rowMeta}>Licitație: {report.auction_title}</Text>
              )}
            </View>
          ))}
        </View>
      )}
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
    gap: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.errorBg,
    justifyContent: 'center', alignItems: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  hint: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  spinner: { marginVertical: 8 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.error },
  list: { gap: 10 },
  row: {
    gap: 4, padding: 14, borderRadius: 12,
    backgroundColor: Colors.neutral50, borderWidth: 1, borderColor: Colors.borderLight,
  },
  rowDate: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight },
  rowReason: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text, lineHeight: 20 },
  rowMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
});
