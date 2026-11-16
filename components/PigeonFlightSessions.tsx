import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

interface FlightSession {
  id: string;
  created_at: string;
  duration_seconds: number;
  figures: number;
  ceiling_seconds: number;
  notes: string | null;
}

interface PigeonFlightSessionsProps {
  pigeonId: string;
}

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export function PigeonFlightSessions({ pigeonId }: PigeonFlightSessionsProps) {
  const { language } = useLanguage();
  const ro = language === 'ro';

  const [sessions, setSessions] = useState<FlightSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      const { data, error: loadError } = await supabase
        .from('flight_sessions')
        .select('id, created_at, duration_seconds, figures, ceiling_seconds, notes')
        .eq('pigeon_id', pigeonId)
        .order('created_at', { ascending: false });
      if (!active) return;
      if (loadError) {
        setError(ro ? 'Nu s-au putut încărca zborurile.' : 'Could not load flights.');
      } else {
        setSessions((data as FlightSession[]) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [pigeonId, ro]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{ro ? 'Zboruri salvate' : 'Saved flights'}</Text>

      {loading && <ActivityIndicator color={Colors.royalBlue} />}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {!loading && !error && sessions.length === 0 && (
        <Text style={styles.emptyText}>
          {ro ? 'Niciun zbor salvat pentru acest porumbel.' : 'No saved flights for this pigeon yet.'}
        </Text>
      )}

      {sessions.map((session) => (
        <View key={session.id} style={styles.card}>
          <Text style={styles.date}>{new Date(session.created_at).toLocaleDateString(ro ? 'ro-RO' : 'en-GB')}</Text>
          <Text style={styles.stat}>
            {ro ? 'Durată' : 'Duration'}: {formatDuration(session.duration_seconds)}
            {'  ·  '}
            {ro ? 'Figuri' : 'Figures'}: {session.figures}
            {'  ·  '}
            {ro ? 'Plafon' : 'Ceiling'}: {formatDuration(session.ceiling_seconds)}
          </Text>
          {session.notes ? <Text style={styles.notes}>{session.notes}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24, gap: 10 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error },
  card: {
    backgroundColor: Colors.royalBlueMist,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.royalBlueBorder,
    padding: 12,
    gap: 4,
  },
  date: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  stat: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.text },
  notes: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
});
