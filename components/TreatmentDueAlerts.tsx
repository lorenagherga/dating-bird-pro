import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle, Syringe } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { PLAN_LIMITS } from '@/lib/types';

interface DueTreatment {
  id: string;
  pigeon_ring: string;
  disease: string;
  booster_date: string;
}

const LOOKBACK_DAYS = 30;
const LOOKAHEAD_DAYS = 7;
const MAX_ALERTS = 5;

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBetween(fromIso: string, toDate: Date): number {
  const [year, month, day] = fromIso.split('-').map(Number);
  const from = new Date(year, month - 1, day);
  const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  return Math.round((from.getTime() - to.getTime()) / (1000 * 60 * 60 * 24));
}

export function TreatmentDueAlerts() {
  const { effectivePlan } = useAuth();
  const { language } = useLanguage();
  const ro = language === 'ro';
  const [items, setItems] = useState<DueTreatment[]>([]);
  const [loadError, setLoadError] = useState(false);
  const hasTreatments = PLAN_LIMITS[effectivePlan].hasTreatments;

  useEffect(() => {
    if (!hasTreatments) return;
    (async () => {
      const today = new Date();
      const earliest = new Date(today);
      earliest.setDate(earliest.getDate() - LOOKBACK_DAYS);
      const latest = new Date(today);
      latest.setDate(latest.getDate() + LOOKAHEAD_DAYS);
      const { data, error } = await supabase
        .from('treatments')
        .select('id, pigeon_ring, disease, booster_date')
        .gte('booster_date', localIsoDate(earliest))
        .lte('booster_date', localIsoDate(latest))
        .order('booster_date', { ascending: true })
        .limit(MAX_ALERTS);
      if (error) {
        setLoadError(true);
        setItems([]);
        return;
      }
      setLoadError(false);
      setItems((data ?? []) as DueTreatment[]);
    })();
  }, [hasTreatments]);

  if (!hasTreatments) return null;
  if (loadError) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>
          {ro ? 'Alertele de sănătate nu au putut fi încărcate.' : 'Health alerts could not be loaded.'}
        </Text>
      </View>
    );
  }
  if (items.length === 0) return null;

  const today = new Date();

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Syringe color={Colors.royalBlue} size={18} />
        <Text style={styles.title}>{ro ? 'Rapeluri de sănătate' : 'Health reminders'}</Text>
      </View>
      {items.map((item) => {
        const days = daysBetween(item.booster_date, today);
        const overdue = days < 0;
        const when = overdue
          ? (ro ? `întârziat cu ${Math.abs(days)} zile` : `${Math.abs(days)} days overdue`)
          : days === 0
            ? (ro ? 'astăzi' : 'today')
            : (ro ? `în ${days} zile` : `in ${days} days`);
        return (
          <View key={item.id} style={[styles.row, overdue && styles.rowOverdue]}>
            <AlertCircle color={overdue ? Colors.error : Colors.warning} size={16} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.disease}</Text>
              <Text style={styles.rowMeta}>{item.pigeon_ring} · {when}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.warningBg,
    gap: 10,
    marginBottom: 16,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.warningBg,
    borderRadius: 10,
    padding: 10,
  },
  rowOverdue: { backgroundColor: Colors.errorBg },
  rowTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  rowMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error },
});
