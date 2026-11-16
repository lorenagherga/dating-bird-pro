import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Link2, Table2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { RaceResultsImportModal } from '@/components/RaceResultsImportModal';

interface RaceResultRow {
  id: string;
  ring_number: string;
  stage: string | null;
  event_date: string | null;
  place: number;
  total_birds: number;
  speed_mpm: number | null;
  fncpr_score: number | null;
  pigeon_id: string | null;
}

const LIST_LIMIT = 30;

export function RaceResultsCard() {
  const { language } = useLanguage();
  const ro = language === 'ro';
  const [results, setResults] = useState<RaceResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const loadResults = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('race_results')
      .select('id, ring_number, stage, event_date, place, total_birds, speed_mpm, fncpr_score, pigeon_id')
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT);
    if (error) {
      setLoadError(ro ? 'Rezultatele nu au putut fi încărcate.' : 'Results could not be loaded.');
      setResults([]);
    } else {
      setLoadError(null);
      setResults((data ?? []) as RaceResultRow[]);
    }
    setLoading(false);
  }, [ro]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{ro ? 'Rezultate concursuri' : 'Race results'}</Text>
          <Text style={styles.subtitle}>
            {ro ? 'Importate din clasamentele oficiale' : 'Imported from official standings'}
          </Text>
        </View>
        <TouchableOpacity style={styles.importBtn} activeOpacity={0.85} onPress={() => setImportOpen(true)}>
          <Table2 color={Colors.white} size={16} />
          <Text style={styles.importBtnText}>{ro ? 'Importă Rezultate' : 'Import results'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.royalBlue} style={{ marginVertical: 12 }} />
      ) : loadError ? (
        <Text style={styles.errorText}>{loadError}</Text>
      ) : results.length === 0 ? (
        <Text style={styles.emptyText}>
          {ro
            ? 'Nu ai importat încă niciun rezultat. Apasă „Importă Rezultate” și alege un fișier sau lipește tabelul din clasament.'
            : 'No results imported yet. Tap “Import results” and choose a file or paste the standings table.'}
        </Text>
      ) : (
        <View style={styles.list}>
          {results.map((row) => (
            <View key={row.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <View style={styles.ringLine}>
                  <Text style={styles.ringText}>{row.ring_number}</Text>
                  {row.pigeon_id ? <Link2 color={Colors.success} size={13} /> : null}
                </View>
                <Text style={styles.metaText}>
                  {[row.stage ? `${ro ? 'Etapa' : 'Stage'} ${row.stage}` : null, row.event_date].filter(Boolean).join(' · ') || '—'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>{ro ? 'Loc' : 'Place'}</Text>
                <Text style={styles.statValue}>{row.place}/{row.total_birds}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>m/min</Text>
                <Text style={styles.statValue}>{row.speed_mpm ?? '—'}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>FNCPR</Text>
                <Text style={styles.statValue}>{row.fncpr_score?.toFixed(2) ?? '—'}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <RaceResultsImportModal
        visible={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={loadResults}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.royalBlue,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  importBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.white },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
    padding: 10,
  },
  ringLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ringText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  metaText: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statBox: { alignItems: 'center', minWidth: 52 },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.textSecondary },
  statValue: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.text, marginTop: 2 },
});
