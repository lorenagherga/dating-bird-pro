import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  MapPin,
  Navigation,
  Users,
  Globe,
  Star,
  Building2,
  Plus,
  X,
  Trophy,
  Bird,
  CheckCircle,
  Clock,
  Award,
  Radio,
  Calendar,
  Zap,
  TrendingUp,
} from 'lucide-react-native';

interface Columbodrom {
  id: string;
  name: string;
  location: string | null;
  country: string | null;
  logo_url: string | null;
  description: string;
  distance_km: number | null;
  capacity: number | null;
  website: string | null;
  is_active: boolean;
  is_featured: boolean;
  season: string | null;
}

interface Entry {
  id: string;
  pigeon_ring: string;
  pigeon_color: string | null;
  status: string;
  result_position: number | null;
  result_birds_total: number | null;
  result_fci_coeff: number | null;
  created_at: string;
}

interface BenzingResult {
  id: string;
  race_id: string;
  ring_number: string;
  breeder_name: string | null;
  loft_name: string | null;
  arrival_time: string | null;
  speed_mpm: number | null;
  position: number | null;
  fci_coefficient: number | null;
  is_winner: boolean;
}

interface BenzingRace {
  id: string;
  columbodrom_id: string;
  race_name: string;
  race_date: string;
  distance_km: number | null;
  birds_total: number | null;
  status: string;
  release_time: string | null;
  weather: string | null;
  wind: string | null;
  results?: BenzingResult[];
}

const raceStatusConfig: Record<string, { color: string; bg: string; icon: typeof Clock; label: string }> = {
  scheduled: { color: Colors.royalBlue, bg: Colors.royalBluePale, icon: Calendar, label: 'Programată' },
  basketing: { color: Colors.royalBlue, bg: Colors.royalBluePale, icon: Clock, label: 'Împerechere' },
  released: { color: Colors.warning, bg: Colors.warningBg, icon: Navigation, label: 'Lansat' },
  live: { color: Colors.error, bg: Colors.errorBg, icon: Radio, label: 'LIVE' },
  completed: { color: Colors.success, bg: Colors.successBg, icon: CheckCircle, label: 'Finalizată' },
  cancelled: { color: Colors.textLight, bg: Colors.neutral100, icon: X, label: 'Anulată' },
};

export default function ColumbodromDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [col, setCol] = useState<Columbodrom | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [enrollModal, setEnrollModal] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [form, setForm] = useState({ ring: '', color: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [races, setRaces] = useState<BenzingRace[]>([]);
  const [expandedRace, setExpandedRace] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    const { data: colData } = await supabase
      .from('columbodroms')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    setCol(colData as Columbodrom | null);
    setLoading(false);
    setRefreshing(false);

    if (colData && profile?.id) {
      const { data: entryData } = await supabase
        .from('columbodrom_entries')
        .select('*')
        .eq('columbodrom_id', id)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      setEntries((entryData || []) as Entry[]);
    }

    // Load Benzing races for this columbodrom
    const { data: raceData } = await supabase
      .from('benzing_races')
      .select('*')
      .eq('columbodrom_id', id)
      .order('race_date', { ascending: false })
      .limit(10);
    const raceList = (raceData || []) as BenzingRace[];

    // Load results for each race
    const racesWithResults = await Promise.all(
      raceList.map(async (race) => {
        const { data: resultsData } = await supabase
          .from('benzing_results')
          .select('*')
          .eq('race_id', race.id)
          .order('position', { ascending: true, nullsFirst: false })
          .limit(50);
        return { ...race, results: (resultsData || []) as BenzingResult[] };
      })
    );
    setRaces(racesWithResults);
  }, [id, profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleEnroll = async () => {
    if (!form.ring.trim() || !id || !profile?.id) {
      Alert.alert(t('error'), t('colRingRequired'));
      return;
    }
    setEnrolling(true);
    const { error } = await supabase.from('columbodrom_entries').insert({
      columbodrom_id: id,
      user_id: profile.id,
      pigeon_ring: form.ring.trim(),
      pigeon_color: form.color.trim() || null,
      status: 'enrolled',
    });
    setEnrolling(false);
    if (error) {
      Alert.alert(t('error'), t('colEnrollError'));
      return;
    }
    setEnrollModal(false);
    setForm({ ring: '', color: '' });
    Alert.alert(t('success'), t('colEnrolledSuccess'));
    loadData();
  };

  const handleRemove = (entryId: string) => {
    Alert.alert(t('colRemoveEntry'), t('colRemoveEntryConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('columbodrom_entries').delete().eq('id', entryId);
          loadData();
        },
      },
    ]);
  };

  const statusConfig: Record<string, { color: string; bg: string; icon: typeof Clock; label: string }> = {
    enrolled: { color: Colors.royalBlue, bg: Colors.royalBluePale, icon: Clock, label: t('colStatusEnrolled') },
    confirmed: { color: Colors.success, bg: Colors.successBg, icon: CheckCircle, label: t('colStatusConfirmed') },
    racing: { color: Colors.warning, bg: Colors.warningBg, icon: Navigation, label: t('colStatusRacing') },
    completed: { color: Colors.goldDark, bg: Colors.goldPale, icon: Trophy, label: t('colStatusCompleted') },
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 60 }} />
      </View>
    );
  }

  if (!col) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>{t('colNotFound')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.royalBlue]} />
        }
      >
        <ScreenHeader title={col.name} subtitle={col.location || ''} showBack />

        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroLogo}>
              <Building2 color={Colors.royalBlueLight} size={36} />
            </View>
            {col.is_featured && (
              <View style={styles.featuredBadge}>
                <Star color={Colors.goldDark} size={11} />
                <Text style={styles.featuredText}>{t('colFeatured')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.heroName}>{col.name}</Text>
          {col.location && (
            <View style={styles.locationRow}>
              <MapPin color={Colors.textSecondary} size={14} />
              <Text style={styles.locationText}>{col.location}, {col.country}</Text>
            </View>
          )}
          <View style={styles.statsRow}>
            {col.distance_km != null && (
              <View style={styles.statBox}>
                <Navigation color={Colors.royalBlue} size={16} />
                <Text style={styles.statValue}>{col.distance_km} km</Text>
                <Text style={styles.statLabel}>{t('colDistance')}</Text>
              </View>
            )}
            {col.capacity != null && (
              <View style={styles.statBox}>
                <Users color={Colors.royalBlue} size={16} />
                <Text style={styles.statValue}>{col.capacity}</Text>
                <Text style={styles.statLabel}>{t('colCapacity')}</Text>
              </View>
            )}
            {col.season && (
              <View style={styles.statBox}>
                <Award color={Colors.royalBlue} size={16} />
                <Text style={styles.statValue}>{col.season}</Text>
                <Text style={styles.statLabel}>{t('colSeason')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        {col.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('colAbout')}</Text>
            <Text style={styles.descriptionText}>{col.description}</Text>
          </View>
        ) : null}

        {/* Website */}
        {col.website ? (
          <TouchableOpacity style={styles.websiteBtn} onPress={() => {}}>
            <Globe color={Colors.royalBlue} size={18} />
            <Text style={styles.websiteText}>{col.website}</Text>
          </TouchableOpacity>
        ) : null}

        {/* My entries */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('colMyEntries')}</Text>
            {col.is_active && (
              <TouchableOpacity style={styles.enrollBtn} onPress={() => setEnrollModal(true)}>
                <Plus color={Colors.goldDark} size={16} />
                <Text style={styles.enrollBtnText}>{t('colEnrollPigeon')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {entries.length === 0 ? (
            <View style={styles.entriesEmpty}>
              <Bird color={Colors.textLight} size={36} />
              <Text style={styles.entriesEmptyText}>{t('colNoEntries')}</Text>
              <Text style={styles.entriesEmptySub}>{t('colNoEntriesSub')}</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {entries.map((entry) => {
                const cfg = statusConfig[entry.status] || statusConfig.enrolled;
                const StatusIcon = cfg.icon;
                return (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={styles.entryLeft}>
                      <View style={styles.entryRingBox}>
                        <Text style={styles.entryRingText} numberOfLines={1}>{entry.pigeon_ring}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                          <StatusIcon color={cfg.color} size={12} />
                          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                        {entry.pigeon_color && (
                          <Text style={styles.entryColor}>{entry.pigeon_color}</Text>
                        )}
                        {entry.status === 'completed' && entry.result_position != null && (
                          <View style={styles.entryResultRow}>
                            <Trophy color={Colors.gold} size={14} />
                            <Text style={styles.entryResultText}>
                              {t('colPosition')} {entry.result_position} / {entry.result_birds_total || '—'}
                              {entry.result_fci_coeff != null && ` · FCI ${entry.result_fci_coeff}`}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemove(entry.id)}
                      style={styles.removeBtn}
                    >
                      <X color={Colors.textLight} size={18} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Benzing Live Races & Rankings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Radio color={Colors.royalBlue} size={18} />
              <Text style={styles.sectionTitle}>{t('colLiveRaces')}</Text>
            </View>
            <View style={styles.benzingBadge}>
              <Zap color={Colors.white} size={10} />
              <Text style={styles.benzingBadgeText}>Benzing Live</Text>
            </View>
          </View>

          {races.length === 0 ? (
            <View style={styles.rankingsInfo}>
              <Trophy color={Colors.gold} size={24} />
              <Text style={styles.rankingsText}>{t('colRankingsInfo')}</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {races.map((race) => {
                const rCfg = raceStatusConfig[race.status] || raceStatusConfig.scheduled;
                const RIcon = rCfg.icon;
                const isExpanded = expandedRace === race.id;
                const hasResults = (race.results?.length || 0) > 0;
                return (
                  <View key={race.id} style={styles.raceCard}>
                    <TouchableOpacity
                      style={styles.raceHeader}
                      onPress={() => setExpandedRace(isExpanded ? null : race.id)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={styles.raceName} numberOfLines={2}>{race.race_name}</Text>
                        <View style={styles.raceMetaRow}>
                          <View style={[styles.raceStatusBadge, { backgroundColor: rCfg.bg }]}>
                            <RIcon color={rCfg.color} size={11} />
                            <Text style={[styles.raceStatusText, { color: rCfg.color }]}>{rCfg.label}</Text>
                          </View>
                          <Text style={styles.raceDate}>{new Date(race.race_date).toLocaleDateString('ro-RO')}</Text>
                          {race.distance_km != null && (
                            <Text style={styles.raceDistance}>{race.distance_km} km</Text>
                          )}
                        </View>
                      </View>
                      {hasResults && (
                        <View style={styles.resultsCountBadge}>
                          <Text style={styles.resultsCountText}>{race.results!.length}</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {isExpanded && hasResults && (
                      <View style={styles.resultsList}>
                        {race.results!.slice(0, 20).map((res, idx) => (
                          <View key={res.id} style={[styles.resultRow, idx < (race.results!.length - 1) && styles.resultRowBorder]}>
                            <View style={[styles.positionBadge, res.is_winner && styles.positionWinner]}>
                              <Text style={[styles.positionText, res.is_winner && styles.positionWinnerText]}>
                                {res.position || idx + 1}
                              </Text>
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={styles.resultRing} numberOfLines={1}>{res.ring_number}</Text>
                              {res.breeder_name && (
                                <Text style={styles.resultBreeder} numberOfLines={1}>{res.breeder_name}</Text>
                              )}
                            </View>
                            <View style={styles.resultStats}>
                              {res.speed_mpm != null && (
                                <Text style={styles.resultSpeed}>{res.speed_mpm} m/min</Text>
                              )}
                              {res.fci_coefficient != null && (
                                <Text style={styles.resultFci}>FCI {res.fci_coefficient}</Text>
                              )}
                            </View>
                          </View>
                        ))}
                        {race.results!.length > 20 && (
                          <Text style={styles.moreResults}>+{race.results!.length - 20} {t('colMoreResults')}</Text>
                        )}
                      </View>
                    )}

                    {isExpanded && !hasResults && (
                      <View style={styles.noResultsBox}>
                        <Text style={styles.noResultsText}>{t('colNoResultsYet')}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Enroll Modal */}
      <Modal visible={enrollModal} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('colEnrollPigeon')}</Text>
            <TouchableOpacity onPress={() => setEnrollModal(false)}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('colRingLabel')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.ring}
                onChangeText={(v) => setForm({ ...form, ring: v })}
                placeholder={t('colRingPlaceholder')}
                placeholderTextColor={Colors.textLight}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('colColorLabel')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.color}
                onChangeText={(v) => setForm({ ...form, color: v })}
                placeholder={t('colColorPlaceholder')}
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <TouchableOpacity style={styles.submitBtn} onPress={handleEnroll} disabled={enrolling}>
              {enrolling ? (
                <ActivityIndicator color={Colors.goldDark} />
              ) : (
                <>
                  <Plus color={Colors.goldDark} size={20} />
                  <Text style={styles.submitBtnText}>{t('colEnrollConfirm')}</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  notFound: { fontFamily: 'Inter-Medium', fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginTop: 60 },
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  heroLogo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  featuredText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.goldDark },
  heroName: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.text, lineHeight: 26, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  locationText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.royalBlueMist,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 4,
  },
  statValue: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.royalBlue },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  descriptionText: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  websiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.royalBluePale,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  websiteText: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.royalBlue },
  enrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  enrollBtnText: { fontFamily: 'Inter-Bold', fontSize: 13, color: Colors.goldDark },
  entriesEmpty: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  entriesEmptyText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  entriesEmptySub: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.royalBlueMist,
    borderRadius: 12,
    padding: 14,
  },
  entryLeft: { flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1 },
  entryRingBox: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    maxWidth: 120,
  },
  entryRingText: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.royalBlue },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontFamily: 'Inter-SemiBold', fontSize: 11 },
  entryColor: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  entryResultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  entryResultText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.goldDark },
  removeBtn: { padding: 8 },
  rankingsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.goldPale,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  rankingsText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  benzingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.royalBlue,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  benzingBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.white },
  raceCard: {
    backgroundColor: Colors.royalBlueMist,
    borderRadius: 14,
    overflow: 'hidden',
  },
  raceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  raceName: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text, lineHeight: 20 },
  raceMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  raceStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  raceStatusText: { fontFamily: 'Inter-SemiBold', fontSize: 10 },
  raceDate: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  raceDistance: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  resultsCountBadge: {
    backgroundColor: Colors.royalBlue,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsCountText: { fontFamily: 'Inter-Bold', fontSize: 13, color: Colors.white },
  resultsList: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  resultRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  positionBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionWinner: {
    backgroundColor: Colors.goldLight,
  },
  positionText: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.royalBlue },
  positionWinnerText: { color: Colors.goldDark },
  resultRing: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.text },
  resultBreeder: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textSecondary },
  resultStats: { alignItems: 'flex-end', gap: 2 },
  resultSpeed: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.royalBlue },
  resultFci: { fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.goldDark },
  moreResults: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  noResultsBox: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingVertical: 20,
    alignItems: 'center',
  },
  noResultsText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textLight },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 50,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.text },
  modalScroll: { padding: 24 },
  formGroup: { marginBottom: 16, gap: 6 },
  formLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.text },
  formInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.goldLight,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: Colors.gold,
    ...Shadows.gold,
  },
  submitBtnText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.goldDark },
});
