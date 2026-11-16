import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather, Wind, Navigation2, Flag, Trash2, Plus } from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';

type FlyingLang = 'ro' | 'en';

const CATEGORIES = ['viteza', 'demifond', 'fond', 'maraton'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_META: Record<Category, { icon: typeof Feather; label: Record<FlyingLang, string> }> = {
  viteza: { icon: Feather, label: { ro: 'Viteză', en: 'Speed' } },
  demifond: { icon: Wind, label: { ro: 'Demifond', en: 'Middle distance' } },
  fond: { icon: Navigation2, label: { ro: 'Fond', en: 'Long distance' } },
  maraton: { icon: Flag, label: { ro: 'Maraton', en: 'Marathon' } },
};

interface StageRow {
  id: string;
  category: Category;
  race_name: string;
  pigeon_ring: string;
  event_date: string | null;
  distance_km: number | null;
  release_at: string | null;
  arrival_at: string | null;
  speed_mpm: number | null;
  position: number | null;
}

const COPY: Record<FlyingLang, {
  title: string;
  subtitle: string;
  tabStages: string;
  tabStandings: string;
  addStage: string;
  newStage: string;
  raceName: string;
  pigeonRing: string;
  date: string;
  distance: string;
  releaseTime: string;
  arrivalTime: string;
  position: string;
  save: string;
  cancel: string;
  empty: string;
  emptySub: string;
  saveError: string;
  requiredFields: string;
  invalidTimes: string;
  speedLabel: string;
  mpm: string;
  standingsTitle: string;
  standingsEmpty: string;
  delete: string;
  deleteConfirm: string;
  stage: string;
}> = {
  ro: {
    title: 'Curse & Etape Voiajori',
    subtitle: 'Înregistrează etape și viteza medie',
    tabStages: 'Etape',
    tabStandings: 'Clasamente',
    addStage: 'Etapă nouă',
    newStage: 'Adaugă etapă',
    raceName: 'Nume etapă *',
    pigeonRing: 'Inel porumbel *',
    date: 'Data (AAAA-LL-ZZ)',
    distance: 'Distanță (km)',
    releaseTime: 'Ora eliberării (LL:ZZ)',
    arrivalTime: 'Ora sosirii (LL:ZZ)',
    position: 'Locul în clasament',
    save: 'Salvează',
    cancel: 'Anulează',
    empty: 'Nicio etapă înregistrată',
    emptySub: 'Adaugă prima etapă cu butonul de mai sus.',
    saveError: 'Nu s-a putut salva. Încearcă din nou.',
    requiredFields: 'Completează numele etapei, inelul și categoria.',
    invalidTimes: 'Orele introduse nu sunt valide sau sosirea este înaintea eliberării.',
    speedLabel: 'Viteză medie',
    mpm: 'm/min',
    standingsTitle: 'Clasament',
    standingsEmpty: 'Nicio etapă în această categorie încă.',
    delete: 'Șterge',
    deleteConfirm: 'Ștergi această etapă?',
    stage: 'Etapa',
  },
  en: {
    title: 'Races & Stages',
    subtitle: 'Log stages and average speed',
    tabStages: 'Stages',
    tabStandings: 'Standings',
    addStage: 'New stage',
    newStage: 'Add stage',
    raceName: 'Stage name *',
    pigeonRing: 'Pigeon ring *',
    date: 'Date (YYYY-MM-DD)',
    distance: 'Distance (km)',
    releaseTime: 'Release time (HH:MM)',
    arrivalTime: 'Arrival time (HH:MM)',
    position: 'Position',
    save: 'Save',
    cancel: 'Cancel',
    empty: 'No stages recorded',
    emptySub: 'Add your first stage with the button above.',
    saveError: 'Could not save. Try again.',
    requiredFields: 'Fill in stage name, ring and category.',
    invalidTimes: 'Times are invalid or arrival is before release.',
    speedLabel: 'Average speed',
    mpm: 'm/min',
    standingsTitle: 'Standings',
    standingsEmpty: 'No stages in this category yet.',
    delete: 'Delete',
    deleteConfirm: 'Delete this stage?',
    stage: 'Stage',
  },
};

function parseDateTime(dateStr: string | null | undefined, timeStr: string): Date | null {
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!timeMatch) return null;
  const h = Number(timeMatch[1]);
  const m = Number(timeMatch[2]);
  if (h > 23 || m > 59) return null;
  let base: Date;
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    base = new Date(`${dateStr.trim()}T00:00:00`);
  } else {
    base = new Date();
  }
  if (Number.isNaN(base.getTime())) return null;
  base.setHours(h, m, 0, 0);
  return base;
}

function computeSpeedMpm(distanceKm: number, release: Date, arrival: Date): number | null {
  const minutes = (arrival.getTime() - release.getTime()) / 60000;
  if (minutes <= 0) return null;
  return (distanceKm * 1000) / minutes;
}

export default function FlightStagesScreen() {
  const { language } = useLanguage();
  const lang: FlyingLang = language === 'ro' ? 'ro' : 'en';
  const copy = COPY[lang];

  const [tab, setTab] = useState<'stages' | 'standings'>('stages');
  const [activeCat, setActiveCat] = useState<Category>('viteza');
  const [stages, setStages] = useState<StageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [raceName, setRaceName] = useState('');
  const [pigeonRing, setPigeonRing] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [distanceStr, setDistanceStr] = useState('');
  const [releaseStr, setReleaseStr] = useState('');
  const [arrivalStr, setArrivalStr] = useState('');
  const [positionStr, setPositionStr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('flight_stages')
      .select('id, category, race_name, pigeon_ring, event_date, distance_km, release_at, arrival_at, speed_mpm, position')
      .order('speed_mpm', { ascending: false });
    if (!error && data) {
      setStages(data as unknown as StageRow[]);
    } else {
      setStages([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const catStages = useMemo(
    () => stages.filter((s) => s.category === activeCat),
    [stages, activeCat],
  );

  const standings = useMemo(
    () =>
      [...catStages]
        .filter((s) => s.speed_mpm != null)
        .sort((a, b) => (b.speed_mpm ?? 0) - (a.speed_mpm ?? 0)),
    [catStages],
  );

  const resetForm = () => {
    setRaceName('');
    setPigeonRing('');
    setDateStr('');
    setDistanceStr('');
    setReleaseStr('');
    setArrivalStr('');
    setPositionStr('');
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    if (!raceName.trim() || !pigeonRing.trim()) {
      setFormError(copy.requiredFields);
      return;
    }
    let speed: number | null = null;
    if (distanceStr.trim() || releaseStr.trim() || arrivalStr.trim()) {
      const dist = parseFloat(distanceStr.replace(',', '.'));
      if (!Number.isFinite(dist) || dist <= 0 || !releaseStr.trim() || !arrivalStr.trim()) {
        setFormError(copy.invalidTimes);
        return;
      }
      const release = parseDateTime(dateStr, releaseStr);
      const arrival = parseDateTime(dateStr, arrivalStr);
      if (!release || !arrival) {
        setFormError(copy.invalidTimes);
        return;
      }
      speed = computeSpeedMpm(dist, release, arrival);
      if (speed == null) {
        setFormError(copy.invalidTimes);
        return;
      }
    }
    const pos = positionStr.trim() ? parseInt(positionStr, 10) : null;

    setSaving(true);
    const { error } = await supabase.from('flight_stages').insert({
      category: activeCat,
      race_name: raceName.trim(),
      pigeon_ring: pigeonRing.trim(),
      event_date: dateStr.trim() ? dateStr.trim() : null,
      distance_km: Number.isFinite(parseFloat(distanceStr.replace(',', '.')))
        ? parseFloat(distanceStr.replace(',', '.'))
        : null,
      release_at: releaseStr.trim() && dateStr.trim() ? parseDateTime(dateStr, releaseStr)?.toISOString() : null,
      arrival_at: arrivalStr.trim() && dateStr.trim() ? parseDateTime(dateStr, arrivalStr)?.toISOString() : null,
      speed_mpm: speed,
      position: pos != null && !Number.isNaN(pos) ? pos : null,
    });
    setSaving(false);
    if (error) {
      setFormError(copy.saveError);
      return;
    }
    resetForm();
    setFormOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('flight_stages').delete().eq('id', id);
    load();
  };

  const CatIcon = CATEGORY_META[activeCat].icon;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={copy.title} subtitle={copy.subtitle} showBack />

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'stages' && styles.tabBtnActive]}
          onPress={() => setTab('stages')}
        >
          <Text style={[styles.tabText, tab === 'stages' && styles.tabTextActive]}>{copy.tabStages}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'standings' && styles.tabBtnActive]}
          onPress={() => setTab('standings')}
        >
          <Text style={[styles.tabText, tab === 'standings' && styles.tabTextActive]}>{copy.tabStandings}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.catRow}>
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_META[cat].icon;
          const active = cat === activeCat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catBtn, active && styles.catBtnActive]}
              onPress={() => setActiveCat(cat)}
              activeOpacity={0.7}
            >
              <Icon color={active ? Colors.white : Colors.royalBlue} size={15} strokeWidth={2} />
              <Text style={[styles.catText, active && styles.catTextActive]}>{CATEGORY_META[cat].label[lang]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {formOpen && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{copy.newStage}</Text>
            <Text style={styles.fieldLabel}>{copy.raceName}</Text>
            <TextInput style={styles.input} value={raceName} onChangeText={setRaceName} placeholder={copy.raceName} />
            <Text style={styles.fieldLabel}>{copy.pigeonRing}</Text>
            <TextInput style={styles.input} value={pigeonRing} onChangeText={setPigeonRing} placeholder="RO-2026-12345" />
            <Text style={styles.fieldLabel}>{copy.date}</Text>
            <TextInput style={styles.input} value={dateStr} onChangeText={setDateStr} placeholder="2026-06-14" />
            <Text style={styles.fieldLabel}>{copy.distance}</Text>
            <TextInput style={styles.input} value={distanceStr} onChangeText={setDistanceStr} placeholder="450" keyboardType="decimal-pad" />
            <Text style={styles.fieldLabel}>{copy.releaseTime}</Text>
            <TextInput style={styles.input} value={releaseStr} onChangeText={setReleaseStr} placeholder="07:30" />
            <Text style={styles.fieldLabel}>{copy.arrivalTime}</Text>
            <TextInput style={styles.input} value={arrivalStr} onChangeText={setArrivalStr} placeholder="14:45" />
            <Text style={styles.fieldLabel}>{copy.position}</Text>
            <TextInput style={styles.input} value={positionStr} onChangeText={setPositionStr} placeholder="1" keyboardType="number-pad" />
            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            <View style={styles.formButtons}>
              <TouchableOpacity style={[styles.formBtn, styles.formBtnCancel]} onPress={() => { setFormOpen(false); resetForm(); }}>
                <Text style={styles.formBtnCancelText}>{copy.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.formBtn, styles.formBtnSave]} onPress={handleSave} disabled={saving}>
                <Text style={styles.formBtnSaveText}>{copy.save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {tab === 'stages' ? (
          loading ? (
            <ActivityIndicator color={Colors.royalBlue} style={styles.loader} />
          ) : catStages.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{copy.empty}</Text>
              <Text style={styles.emptySub}>{copy.emptySub}</Text>
            </View>
          ) : (
            catStages.map((s) => (
              <View key={s.id} style={styles.stageCard}>
                <View style={styles.stageHead}>
                  <Text style={styles.stageTitle}>{s.race_name}</Text>
                  <TouchableOpacity onPress={() => handleDelete(s.id)} hitSlop={8}>
                    <Trash2 color={Colors.error} size={17} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.stageSub}>
                  {s.pigeon_ring}
                  {s.event_date ? ` · ${s.event_date}` : ''}
                  {s.position ? ` · #${s.position}` : ''}
                </Text>
                {s.speed_mpm != null && (
                  <View style={styles.speedBadge}>
                    <Text style={styles.speedBadgeText}>
                      {copy.speedLabel}: {s.speed_mpm.toFixed(1)} {copy.mpm}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )
        ) : loading ? (
          <ActivityIndicator color={Colors.royalBlue} style={styles.loader} />
        ) : standings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{copy.standingsTitle}</Text>
            <Text style={styles.emptySub}>{copy.standingsEmpty}</Text>
          </View>
        ) : (
          standings.map((s, i) => (
            <View key={s.id} style={[styles.stageCard, i === 0 && styles.stageCardFirst]}>
              <View style={styles.rankBox}>
                <Text style={styles.rankText}>{i + 1}</Text>
              </View>
              <View style={styles.stageBody}>
                <Text style={styles.stageTitle}>{s.pigeon_ring}</Text>
                <Text style={styles.stageSub}>{s.race_name}{s.event_date ? ` · ${s.event_date}` : ''}</Text>
              </View>
              <Text style={styles.speedValue}>
                {s.speed_mpm?.toFixed(1)} {copy.mpm}
              </Text>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setFormOpen((v) => !v)}
      >
        <Plus color={Colors.white} size={24} strokeWidth={2.5} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingTop: 8, paddingBottom: 40, gap: 12 },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: Colors.royalBlue, borderColor: Colors.royalBlue },
  tabText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, paddingTop: 12, gap: 8 },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.royalBlueBorder,
  },
  catBtnActive: { backgroundColor: Colors.royalBlue, borderColor: Colors.royalBlue },
  catText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  catTextActive: { color: Colors.white },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.royalBlueBorder,
    gap: 6,
  },
  formTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text, marginBottom: 4 },
  fieldLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.neutral50,
  },
  formError: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error, marginTop: 6 },
  formButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  formBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  formBtnCancel: { backgroundColor: Colors.neutral100 },
  formBtnCancelText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textSecondary },
  formBtnSave: { backgroundColor: Colors.royalBlue },
  formBtnSaveText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.white },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  emptySub: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  stageCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  stageCardFirst: { borderColor: Colors.gold },
  stageHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stageTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text, flex: 1 },
  stageSub: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  speedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.royalBluePale,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  speedBadgeText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.royalBlue },
  speedValue: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  stageBody: { flex: 1, gap: 2 },
  rankBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.royalBlue },
  loader: { marginTop: 24 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.royalBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
