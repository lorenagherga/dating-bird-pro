import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Play, Plus, Mountain, Square } from 'lucide-react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

interface PigeonOption {
  id: string;
  ring_series: string | null;
  year: number | null;
}

function formatClock(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function FlightStopwatchCard() {
  const { t } = useLanguage();

  const [pigeons, setPigeons] = useState<PigeonOption[]>([]);
  const [loadingPigeons, setLoadingPigeons] = useState(true);
  const [pigeonId, setPigeonId] = useState<string | null>(null);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [figures, setFigures] = useState(0);
  const [ceilingStart, setCeilingStart] = useState<number | null>(null);
  const [ceilingMs, setCeilingMs] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const running = startedAt !== null;

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: loadError } = await supabase
        .from('pigeons')
        .select('id, ring_series, year')
        .order('created_at', { ascending: false });
      if (!active) return;
      if (loadError) {
        setError(t('fltStopLoadError'));
      } else {
        setPigeons((data as PigeonOption[]) ?? []);
      }
      setLoadingPigeons(false);
    })();
    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const resetSession = () => {
    setStartedAt(null);
    setFigures(0);
    setCeilingStart(null);
    setCeilingMs(0);
    setNotes('');
  };

  const handleStart = () => {
    setError(null);
    if (!pigeonId) {
      setError(t('fltStopChoosePigeon'));
      return;
    }
    const current = Date.now();
    setNow(current);
    setStartedAt(current);
  };

  const handleCeilingToggle = () => {
    const current = Date.now();
    if (ceilingStart === null) {
      setCeilingStart(current);
    } else {
      setCeilingMs((prev) => prev + (current - ceilingStart));
      setCeilingStart(null);
    }
  };

  const elapsedMs = running ? now - startedAt : 0;
  const liveCeilingMs = ceilingMs + (ceilingStart !== null ? now - ceilingStart : 0);

  const handleStopAndSave = async () => {
    if (!pigeonId || startedAt === null) return;
    setError(null);
    const stopAt = Date.now();
    const finalCeilingMs = ceilingMs + (ceilingStart !== null ? stopAt - ceilingStart : 0);
    setSaving(true);
    const { error: saveError } = await supabase.from('flight_sessions').insert({
      pigeon_id: pigeonId,
      duration_seconds: Math.round((stopAt - startedAt) / 1000),
      figures,
      ceiling_seconds: Math.round(finalCeilingMs / 1000),
      notes: notes.trim(),
    });
    setSaving(false);
    if (saveError) {
      setError(t('fltStopSaveError'));
      return;
    }
    resetSession();
  };

  const pigeonLabel = (p: PigeonOption) => {
    const base = p.ring_series?.trim() || t('fltStopNoRing');
    return p.year ? `${base} · ${p.year}` : base;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Mountain color={Colors.white} size={22} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('fltStopTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('fltStopSub')}
          </Text>
        </View>
      </View>

      {loadingPigeons ? (
        <ActivityIndicator color={Colors.royalBlue} style={{ marginVertical: 12 }} />
      ) : pigeons.length === 0 ? (
        <Text style={styles.emptyText}>
          {t('fltStopAddFirst')}
        </Text>
      ) : (
        <>
          <Text style={styles.label}>{t('fltStopPigeonLabel')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {pigeons.map((p) => {
              const selected = p.id === pigeonId;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setPigeonId(p.id)}
                  disabled={running}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{pigeonLabel(p)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {!running ? (
            <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.85}>
              <Play color={Colors.white} size={28} strokeWidth={2.2} fill={Colors.white} />
              <Text style={styles.startText}>{t('fltStopStart')}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.clockBox}>
                <Text style={styles.clock}>{formatClock(Math.floor(elapsedMs / 1000))}</Text>
                <Text style={styles.clockMeta}>
                  {`${t('fltStopFigures')}: ${figures}`}
                  {'   '}
                  {`${t('fltStopCeiling')}: ${formatClock(Math.floor(liveCeilingMs / 1000))}`}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.figureButton} onPress={() => setFigures((f) => f + 1)} activeOpacity={0.85}>
                  <Plus color={Colors.royalBlue} size={26} strokeWidth={2.4} />
                  <Text style={styles.figureText}>{t('fltStopFigureBtn')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ceilingButton, ceilingStart !== null && styles.ceilingButtonActive]}
                  onPress={handleCeilingToggle}
                  activeOpacity={0.85}
                >
                  <Mountain color={ceilingStart !== null ? Colors.white : Colors.royalBlue} size={26} strokeWidth={2.2} />
                  <Text style={[styles.ceilingText, ceilingStart !== null && styles.ceilingTextActive]}>
                    {ceilingStart !== null ? t('fltStopComeDown') : t('fltStopCeilingBtn')}
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.notes}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('fltStopNotes')}
                placeholderTextColor={Colors.textLight}
                multiline
              />

              <TouchableOpacity
                style={[styles.stopButton, saving && styles.stopButtonDisabled]}
                onPress={handleStopAndSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Square color={Colors.white} size={22} strokeWidth={2.2} fill={Colors.white} />
                    <Text style={styles.stopText}>{t('fltStopStopBtn')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.royalBlueBorder,
    ...Shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.royalBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 17 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  label: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textSecondary },
  chipRow: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.royalBlueBorder,
    backgroundColor: Colors.neutral50,
  },
  chipSelected: { backgroundColor: Colors.royalBlue, borderColor: Colors.royalBlue },
  chipText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  chipTextSelected: { color: Colors.white },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 84,
    borderRadius: 20,
    backgroundColor: Colors.royalBlue,
    ...Shadows.button,
  },
  startText: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.white },
  clockBox: { alignItems: 'center', paddingVertical: 8, gap: 6 },
  clock: { fontFamily: 'Inter-Bold', fontSize: 52, color: Colors.royalBlue, letterSpacing: 1 },
  clockMeta: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 10 },
  figureButton: {
    flex: 1,
    minHeight: 96,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.royalBlue,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  figureText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.royalBlue },
  ceilingButton: {
    flex: 1,
    minHeight: 96,
    borderRadius: 18,
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  ceilingButtonActive: { backgroundColor: Colors.royalBlueDark },
  ceilingText: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.royalBlue, textAlign: 'center' },
  ceilingTextActive: { color: Colors.white },
  notes: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.neutral50,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: Colors.error,
  },
  stopButtonDisabled: { opacity: 0.6 },
  stopText: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.white },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error },
});
