import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TextInput, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Trophy, Route as RouteIcon, Award, Building2, Sparkles, Medal, Calculator, Plus, ChevronRight, Trash2 } from 'lucide-react-native';
import { CategoryHub, type HubSection } from '@/components/CategoryHub';
import { FlightStopwatchCard } from '@/components/FlightStopwatchCard';
import { RaceResultsCard } from '@/components/RaceResultsCard';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

interface RaceEvent {
  id: string;
  name: string;
  category: string;
  event_date: string | null;
  standings: string | null;
}

export default function CompetitionsScreen() {
  const { pigeonCategories } = useAuth();
  const { t, language } = useLanguage();
  const ro = language === 'ro';
  const nav = useRouter();

  const [events, setEvents] = useState<RaceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [standings, setStandings] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('race_events')
      .select('id, name, category, event_date, standings')
      .order('created_at', { ascending: false });
    setEvents((data as unknown as RaceEvent[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleCreate = async () => {
    setFormError(null);
    if (!name.trim() || !category.trim()) {
      setFormError(ro ? 'Completează numele și categoria.' : 'Fill in the name and category.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('race_events').insert({
      name: name.trim(),
      category: category.trim(),
      event_date: date.trim() ? date.trim() : null,
      standings: standings.trim() ? standings.trim() : null,
    });
    setSaving(false);
    if (error) {
      setFormError(ro ? 'Nu s-a putut salva. Încearcă din nou.' : 'Could not save. Try again.');
      return;
    }
    setName('');
    setCategory('');
    setDate('');
    setStandings('');
    setModalOpen(false);
    loadEvents();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('race_events').delete().eq('id', id);
    loadEvents();
  };

  const showAll = !pigeonCategories || pigeonCategories.length === 0;
  const hasRacing = showAll || (pigeonCategories?.includes('voiajori') ?? false);
  const hasFlying = showAll || (pigeonCategories?.includes('joc_zbor') ?? false);

  const racingSection: HubSection = {
    title: ro ? 'Concursuri' : 'Competitions',
    items: hasRacing
      ? [
          { label: t('tabRaces'), subtitle: t('onbModRacesSub'), icon: Trophy, route: '/(tabs)/races' },
          { label: ro ? 'Palmares campion' : 'Champion record', icon: Medal, route: '/(tabs)/palmares' },
          { label: ro ? 'Calcul puncte FCI' : 'FCI points calculator', subtitle: ro ? 'Coeficient din poziție și porumbei' : 'Coefficient from position and birds', icon: Calculator, route: '/(tabs)/fci-calculator' },
          { label: t('tabColumbodroms'), icon: Building2, route: '/(tabs)/columbodroms' },
          { label: t('tabGpsTracks'), icon: RouteIcon, route: '/(tabs)/gps-tracks' },
          { label: t('tabCopilot'), icon: RouteIcon, route: '/(tabs)/copilot' },
        ]
      : [],
  };
  const flyingSection: HubSection = {
    title: ro ? 'Zbor & performanță' : 'Flying & performance',
    items: hasFlying
      ? [{ label: t('onbModBeauty'), subtitle: t('onbModBeautySub'), icon: Sparkles, route: '/(tabs)/flying' }]
      : [],
  };
  const showsSection: HubSection = {
    title: ro ? 'Expoziții' : 'Shows',
    items: [{ label: t('tabVitrina'), subtitle: ro ? 'Trofeele și medaliile crescătoriei' : 'Breeder trophies and medals', icon: Award, route: '/(tabs)/vitrina' }],
  };
  const sections = hasFlying && !hasRacing
    ? [flyingSection, racingSection, showsSection]
    : [racingSection, flyingSection, showsSection];

  return (
    <View style={{ flex: 1 }}>
      <CategoryHub
        title={ro ? 'Concursuri & zbor' : 'Competitions & flying'}
        subtitle={ro ? 'Competiții, zbor și performanță' : 'Races, flying and performance'}
        sections={sections}
      >
        {hasRacing && (
          <TouchableOpacity
            style={styles.heroCard}
            activeOpacity={0.8}
            onPress={() => nav.push('/(tabs)/flight-stages' as never)}
          >
            <View style={styles.heroIconBox}>
              <Feather color={Colors.white} size={24} strokeWidth={2} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>{ro ? 'Curse & etape voiajori' : 'Races & stages'}</Text>
              <Text style={styles.heroSub}>
                {ro ? 'Viteză · Demifond · Fond · Maraton' : 'Speed · Middle · Long · Marathon'}
              </Text>
            </View>
            <ChevronRight color={Colors.gold} size={22} />
          </TouchableOpacity>
        )}

        {hasRacing && <RaceResultsCard />}

        {hasFlying && <FlightStopwatchCard />}

        <View style={styles.eventsHeader}>
          <Text style={styles.eventsTitle}>{ro ? 'Concursurile mele' : 'My competitions'}</Text>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={() => setModalOpen(true)}>
            <Plus color={Colors.white} size={18} strokeWidth={2.5} />
            <Text style={styles.addBtnText}>{ro ? 'Concurs nou' : 'New competition'}</Text>
          </TouchableOpacity>
        </View>

        {!loading && events.length === 0 && (
          <Text style={styles.emptyText}>
            {ro ? 'Niciun concurs adăugat încă. Apasă „Concurs nou” pentru a salva un columbodrom, antrenament sau concurs local.' : 'No competitions yet. Tap “New competition” to save a columbodrom, training or local contest.'}
          </Text>
        )}

        {events.map((ev) => (
          <View key={ev.id} style={styles.eventCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eventName}>{ev.name}</Text>
              <Text style={styles.eventSub}>
                {ev.category}
                {ev.event_date ? ` · ${ev.event_date}` : ''}
              </Text>
              {ev.standings ? <Text style={styles.eventStandings}>{ev.standings}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => handleDelete(ev.id)} hitSlop={8}>
              <Trash2 color={Colors.error} size={17} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        ))}
      </CategoryHub>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{ro ? 'Concurs nou' : 'New competition'}</Text>

              <Text style={styles.label}>{ro ? 'Nume *' : 'Name *'}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={ro ? 'ex: Concurs local Salina' : 'e.g. Local contest Salina'}
                placeholderTextColor={Colors.textLight}
              />

              <Text style={styles.label}>{ro ? 'Categorie *' : 'Category *'}</Text>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder={ro ? 'ex: columbodrom, antrenament, concurs local' : 'e.g. columbodrom, training, local contest'}
                placeholderTextColor={Colors.textLight}
              />

              <Text style={styles.label}>{ro ? 'Data (AAAA-LL-ZZ)' : 'Date (YYYY-MM-DD)'}</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="2026-06-14"
                placeholderTextColor={Colors.textLight}
              />

              <Text style={styles.label}>{ro ? 'Clasament' : 'Standings'}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={standings}
                onChangeText={setStandings}
                placeholder={ro ? 'ex: 1. RO-123 — 1450 m/min' : 'e.g. 1. RO-123 — 1450 m/min'}
                placeholderTextColor={Colors.textLight}
                multiline
              />

              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => { setModalOpen(false); setFormError(null); }}
                >
                  <Text style={styles.modalBtnCancelText}>{t('close')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSave]}
                  onPress={handleCreate}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <Text style={styles.modalBtnSaveText}>{t('save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.royalBlue,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.royalBlueDark,
    ...Shadows.button,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.royalBlueLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroText: { flex: 1 },
  heroTitle: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.white },
  heroSub: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.goldLight, marginTop: 2 },
  eventsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.royalBlue,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    ...Shadows.button,
  },
  addBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.white },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(13,27,62,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text, marginBottom: 12 },
  label: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 10, marginBottom: 4 },
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
  textArea: { height: 80, textAlignVertical: 'top' },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error, marginTop: 8 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: Colors.neutral100 },
  modalBtnCancelText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textSecondary },
  modalBtnSave: { backgroundColor: Colors.royalBlue },
  modalBtnSaveText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.white },
  eventsTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.royalBlueMist,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.royalBlueBorder,
  },
  eventName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  eventSub: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  eventStandings: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.royalBlue, marginTop: 4 },
});
