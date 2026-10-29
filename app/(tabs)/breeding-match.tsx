import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  scoreAllPairs,
  type BreedingPigeon,
  type PalmaresRecord,
  type NestRecord,
  type PairScore,
} from '@/lib/breeding-match';
import {
  Heart,
  Dna,
  Trophy,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Filter,
  X,
  Mars,
  Venus,
  Zap,
  Target,
  Layers,
  Award,
  RefreshCw,
  Info,
} from 'lucide-react-native';

export default function BreedingMatchScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pigeons, setPigeons] = useState<BreedingPigeon[]>([]);
  const [palmares, setPalmares] = useState<PalmaresRecord[]>([]);
  const [nests, setNests] = useState<NestRecord[]>([]);
  const [pairs, setPairs] = useState<PairScore[]>([]);
  const [selectedPair, setSelectedPair] = useState<PairScore | null>(null);
  const [filterMinScore, setFilterMinScore] = useState(0);
  const [filterChampionOnly, setFilterChampionOnly] = useState(false);
  const [filterModal, setFilterModal] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);

    const [pigeonsRes, palmaresRes, nestsRes] = await Promise.all([
      supabase.from('pigeons').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('pigeon_palmares').select('*').eq('user_id', profile.id),
      supabase.from('nests').select('male_ring, female_ring, chick_count, hatching_date').eq('user_id', profile.id),
    ]);

    const pgs = (pigeonsRes.data || []) as BreedingPigeon[];
    setPigeons(pgs);
    setPalmares((palmaresRes.data || []) as PalmaresRecord[]);
    setNests((nestsRes.data || []) as NestRecord[]);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const males = useMemo(() => pigeons.filter(p => p.sex === 'Mascul'), [pigeons]);
  const females = useMemo(() => pigeons.filter(p => p.sex === 'Femelă'), [pigeons]);

  const runMatching = useCallback(() => {
    if (males.length === 0 || females.length === 0) return;
    setCalculating(true);
    setTimeout(() => {
      const results = scoreAllPairs(males, females, pigeons, palmares, nests);
      setPairs(results);
      setCalculating(false);
    }, 100);
  }, [males, females, pigeons, palmares, nests]);

  useEffect(() => {
    if (pigeons.length > 0 && males.length > 0 && females.length > 0) {
      runMatching();
    }
  }, [runMatching]);

  const filteredPairs = useMemo(() => {
    return pairs.filter(p => {
      if (p.totalScore < filterMinScore) return false;
      if (filterChampionOnly && !p.male.is_champion && !p.female.is_champion) return false;
      return true;
    });
  }, [pairs, filterMinScore, filterChampionOnly]);

  const topPairs = filteredPairs.slice(0, 20);

  const getScoreColor = (score: number) => {
    if (score >= 75) return Colors.success;
    if (score >= 50) return Colors.gold;
    if (score >= 30) return Colors.warning;
    return Colors.error;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return t('bmExcellent');
    if (score >= 50) return t('bmGood');
    if (score >= 30) return t('bmModerate');
    return t('bmRisky');
  };

  const renderStrength = (s: string) => {
    const map: Record<string, { icon: any; label: string; color: string }> = {
      no_inbreeding: { icon: Dna, label: t('bmNoInbreeding'), color: Colors.success },
      controlled_linebreeding: { icon: Dna, label: t('bmLinebreeding'), color: Colors.gold },
      champion_parents: { icon: Trophy, label: t('bmChampionParents'), color: Colors.gold },
      proven_performers: { icon: Award, label: t('bmProvenPerformers'), color: Colors.royalBlue },
      proven_breeder_male: { icon: Heart, label: t('bmProvenBreederM'), color: Colors.success },
      proven_breeder_female: { icon: Heart, label: t('bmProvenBreederF'), color: Colors.success },
    };
    const entry = map[s];
    if (!entry) return null;
    const Icon = entry.icon;
    return (
      <View key={s} style={styles.tagChip}>
        <Icon color={entry.color} size={12} />
        <Text style={[styles.tagChipText, { color: entry.color }]}>{entry.label}</Text>
      </View>
    );
  };

  const renderWarning = (w: string) => {
    const map: Record<string, { label: string }> = {
      high_inbreeding: { label: t('bmHighInbreeding') },
    };
    const entry = map[w];
    if (!entry) return null;
    return (
      <View key={w} style={styles.warningChip}>
        <AlertTriangle color={Colors.error} size={12} />
        <Text style={styles.warningChipText}>{entry.label}</Text>
      </View>
    );
  };

  const renderPairCard = (pair: PairScore, index: number) => {
    const scoreColor = getScoreColor(pair.totalScore);
    return (
      <TouchableOpacity
        key={`${pair.male.id}-${pair.female.id}`}
        style={styles.pairCard}
        onPress={() => setSelectedPair(pair)}
        activeOpacity={0.8}
      >
        {pair.recommended && index < 3 && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankBadgeText}>#{index + 1}</Text>
          </View>
        )}
        <View style={styles.pairScoreCircle}>
          <Text style={[styles.pairScoreText, { color: scoreColor }]}>{pair.totalScore}</Text>
          <Text style={[styles.pairScoreLabel, { color: scoreColor }]}>{getScoreLabel(pair.totalScore)}</Text>
        </View>
        <View style={styles.pairBirdsRow}>
          <View style={styles.pairBirdBox}>
            <View style={[styles.pairBirdIcon, styles.maleIcon]}>
              <Mars color={Colors.royalBlue} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pairBirdRing} numberOfLines={1}>{pair.male.ring_series || t('bmUnknown')}</Text>
              <Text style={styles.pairBirdColor} numberOfLines={1}>{pair.male.color || '—'}</Text>
            </View>
            {pair.male.is_champion && <Trophy color={Colors.gold} size={14} />}
          </View>
          <View style={styles.pairHeart}>
            <Heart color={Colors.error} size={16} fill={Colors.error} />
          </View>
          <View style={styles.pairBirdBox}>
            <View style={[styles.pairBirdIcon, styles.femaleIcon]}>
              <Venus color={Colors.error} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pairBirdRing} numberOfLines={1}>{pair.female.ring_series || t('bmUnknown')}</Text>
              <Text style={styles.pairBirdColor} numberOfLines={1}>{pair.female.color || '—'}</Text>
            </View>
            {pair.female.is_champion && <Trophy color={Colors.gold} size={14} />}
          </View>
        </View>
        <View style={styles.pairMetricsRow}>
          <View style={styles.metricChip}>
            <Dna color={Colors.royalBlue} size={12} />
            <Text style={styles.metricText}>{pair.geneticScore}</Text>
          </View>
          <View style={styles.metricChip}>
            <TrendingUp color={Colors.royalBlue} size={12} />
            <Text style={styles.metricText}>{pair.performanceScore}</Text>
          </View>
          <View style={styles.metricChip}>
            <Layers color={Colors.royalBlue} size={12} />
            <Text style={styles.metricText}>{pair.compatibilityScore}</Text>
          </View>
          <View style={[styles.metricChip, pair.inbreedingCoeff > 6.25 ? styles.metricWarn : null]}>
            <AlertTriangle color={pair.inbreedingCoeff > 6.25 ? Colors.error : Colors.textLight} size={12} />
            <Text style={[styles.metricText, pair.inbreedingCoeff > 6.25 ? styles.metricWarnText : null]}>
              {pair.inbreedingCoeff}%
            </Text>
          </View>
        </View>
        {pair.strengths.length > 0 && (
          <View style={styles.tagsRow}>
            {pair.strengths.slice(0, 3).map(s => renderStrength(s))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedPair) return null;
    const scoreColor = getScoreColor(selectedPair.totalScore);
    return (
      <Modal visible={!!selectedPair} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('bmPairAnalysis')}</Text>
            <TouchableOpacity onPress={() => setSelectedPair(null)}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Score header */}
            <View style={[styles.detailScoreHeader, { borderColor: scoreColor }]}>
              <View style={[styles.detailScoreCircle, { borderColor: scoreColor }]}>
                <Text style={[styles.detailScoreText, { color: scoreColor }]}>{selectedPair.totalScore}</Text>
                <Text style={[styles.detailScoreLabel, { color: scoreColor }]}>{getScoreLabel(selectedPair.totalScore)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.detailScoreTitle}>{t('bmCompatibilityScore')}</Text>
                <Text style={styles.detailScoreDesc}>{t('bmScoreDesc')}</Text>
              </View>
            </View>

            {/* Parent cards */}
            <View style={styles.detailParentsRow}>
              <View style={styles.detailParentCard}>
                <View style={styles.detailParentHeader}>
                  <View style={[styles.pairBirdIcon, styles.maleIcon]}>
                    <Mars color={Colors.royalBlue} size={18} />
                  </View>
                  <Text style={styles.detailParentSex}>{t('bmMale')}</Text>
                </View>
                <Text style={styles.detailParentRing}>{selectedPair.male.ring_series || t('bmUnknown')}</Text>
                <Text style={styles.detailParentColor}>{selectedPair.male.color || '—'}</Text>
                <View style={styles.detailParentTags}>
                  <Text style={styles.detailParentYear}>{selectedPair.male.year || '—'}</Text>
                  {selectedPair.male.is_champion && (
                    <View style={styles.detailChampionTag}>
                      <Trophy color={Colors.gold} size={10} />
                      <Text style={styles.detailChampionText}>{t('bmChampion')}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.detailHeart}>
                <Heart color={Colors.error} size={24} fill={Colors.error} />
              </View>
              <View style={styles.detailParentCard}>
                <View style={styles.detailParentHeader}>
                  <View style={[styles.pairBirdIcon, styles.femaleIcon]}>
                    <Venus color={Colors.error} size={18} />
                  </View>
                  <Text style={styles.detailParentSex}>{t('bmFemale')}</Text>
                </View>
                <Text style={styles.detailParentRing}>{selectedPair.female.ring_series || t('bmUnknown')}</Text>
                <Text style={styles.detailParentColor}>{selectedPair.female.color || '—'}</Text>
                <View style={styles.detailParentTags}>
                  <Text style={styles.detailParentYear}>{selectedPair.female.year || '—'}</Text>
                  {selectedPair.female.is_champion && (
                    <View style={styles.detailChampionTag}>
                      <Trophy color={Colors.gold} size={10} />
                      <Text style={styles.detailChampionText}>{t('bmChampion')}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Score breakdown */}
            <Text style={styles.detailSectionTitle}>{t('bmScoreBreakdown')}</Text>
            <View style={styles.detailScoreBars}>
              {[
                { label: t('bmGeneticScore'), score: selectedPair.geneticScore, icon: Dna, color: Colors.royalBlue },
                { label: t('bmPerformanceScore'), score: selectedPair.performanceScore, icon: TrendingUp, color: Colors.gold },
                { label: t('bmCompatScore'), score: selectedPair.compatibilityScore, icon: Layers, color: Colors.success },
              ].map((m, i) => (
                <View key={i} style={styles.detailScoreBar}>
                  <View style={styles.detailScoreBarHeader}>
                    <m.icon color={m.color} size={16} />
                    <Text style={styles.detailScoreBarLabel}>{m.label}</Text>
                    <Text style={[styles.detailScoreBarValue, { color: m.color }]}>{m.score}/100</Text>
                  </View>
                  <View style={styles.detailScoreBarTrack}>
                    <View style={[styles.detailScoreBarFill, { width: `${m.score}%`, backgroundColor: m.color }]} />
                  </View>
                </View>
              ))}
            </View>

            {/* Inbreeding */}
            <View style={styles.detailInbreedingBox}>
              <View style={styles.detailInbreedingHeader}>
                <Dna color={selectedPair.inbreedingCoeff > 6.25 ? Colors.error : Colors.success} size={20} />
                <Text style={styles.detailInbreedingTitle}>{t('bmInbreedingCoeff')}</Text>
                <Text style={[styles.detailInbreedingValue, { color: selectedPair.inbreedingCoeff > 6.25 ? Colors.error : Colors.success }]}>
                  {selectedPair.inbreedingCoeff}%
                </Text>
              </View>
              <Text style={styles.detailInbreedingDesc}>
                {selectedPair.inbreedingCoeff === 0
                  ? t('bmInbreedingZero')
                  : selectedPair.inbreedingCoeff <= 6.25
                    ? t('bmInbreedingSafe')
                    : t('bmInbreedingHigh')}
              </Text>
              {selectedPair.sharedAncestors.length > 0 && (
                <Text style={styles.detailSharedCount}>
                  {t('bmSharedAncestors')}: {selectedPair.sharedAncestors.length}
                </Text>
              )}
            </View>

            {/* Strengths */}
            {selectedPair.strengths.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>{t('bmStrengths')}</Text>
                <View style={styles.tagsColumn}>
                  {selectedPair.strengths.map(s => renderStrength(s))}
                </View>
              </View>
            )}

            {/* Warnings */}
            {selectedPair.warnings.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>{t('bmWarnings')}</Text>
                <View style={styles.tagsColumn}>
                  {selectedPair.warnings.map(w => renderWarning(w))}
                </View>
              </View>
            )}

            {/* AI Rationale */}
            <View style={styles.detailRationaleBox}>
              <View style={styles.detailRationaleHeader}>
                <Sparkles color={Colors.gold} size={18} />
                <Text style={styles.detailRationaleTitle}>{t('bmAiRationale')}</Text>
              </View>
              <Text style={styles.detailRationaleText}>
                {selectedPair.rationale.split(',').map(r => t(`bmRationale_${r}` as any)).filter(Boolean).join(' ')}
              </Text>
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={styles.detailCreateNestBtn}
              onPress={() => {
                setSelectedPair(null);
                router.push('/(tabs)/nests');
              }}
            >
              <Heart color={Colors.white} size={20} />
              <Text style={styles.detailCreateNestText}>{t('bmCreateNest')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.detailViewPedBtn}
              onPress={() => {
                setSelectedPair(null);
                router.push(`/(tabs)/pedigree-studio?id=${selectedPair.male.id}`);
              }}
            >
              <Dna color={Colors.royalBlue} size={18} />
              <Text style={styles.detailViewPedText}>{t('bmViewPedigree')}</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 60 }} />
      </View>
    );
  }

  if (males.length === 0 || females.length === 0) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ScreenHeader title={t('bmTitle')} subtitle={t('bmSub')} showBack />
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Heart color={Colors.textLight} size={48} />
            </View>
            <Text style={styles.emptyTitle}>{t('bmEmpty')}</Text>
            <Text style={styles.emptySubtitle}>{t('bmEmptySub')}</Text>
            <View style={styles.emptyStats}>
              <View style={styles.emptyStatBox}>
                <Mars color={Colors.royalBlue} size={24} />
                <Text style={styles.emptyStatNum}>{males.length}</Text>
                <Text style={styles.emptyStatLabel}>{t('bmMales')}</Text>
              </View>
              <View style={styles.emptyStatBox}>
                <Venus color={Colors.error} size={24} />
                <Text style={styles.emptyStatNum}>{females.length}</Text>
                <Text style={styles.emptyStatLabel}>{t('bmFemales')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/(tabs)/pigeons')}
            >
              <Heart color={Colors.white} size={20} />
              <Text style={styles.primaryBtnText}>{t('bmAddPigeons')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('bmTitle')} subtitle={t('bmSub')} showBack />

        {/* AI banner */}
        <View style={styles.aiBanner}>
          <View style={styles.aiBannerIcon}>
            <Sparkles color={Colors.gold} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiBannerTitle}>{t('bmAiTitle')}</Text>
            <Text style={styles.aiBannerDesc}>{t('bmAiDesc')}</Text>
          </View>
        </View>

        {/* Stats summary */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Mars color={Colors.royalBlue} size={18} />
            <Text style={styles.statNum}>{males.length}</Text>
            <Text style={styles.statLabel}>{t('bmMales')}</Text>
          </View>
          <View style={styles.statCard}>
            <Venus color={Colors.error} size={18} />
            <Text style={styles.statNum}>{females.length}</Text>
            <Text style={styles.statLabel}>{t('bmFemales')}</Text>
          </View>
          <View style={styles.statCard}>
            <Heart color={Colors.gold} size={18} />
            <Text style={styles.statNum}>{males.length * females.length}</Text>
            <Text style={styles.statLabel}>{t('bmPossible')}</Text>
          </View>
          <View style={styles.statCard}>
            <Trophy color={Colors.gold} size={18} />
            <Text style={styles.statNum}>
              {pigeons.filter(p => p.is_champion).length}
            </Text>
            <Text style={styles.statLabel}>{t('bmChampions')}</Text>
          </View>
        </View>

        {/* Filter bar */}
        <View style={styles.filterBar}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterModal(true)}>
            <Filter color={Colors.royalBlue} size={16} />
            <Text style={styles.filterBtnText}>{t('bmFilter')}</Text>
            {(filterMinScore > 0 || filterChampionOnly) && (
              <View style={styles.filterActiveDot} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshBtn} onPress={runMatching} disabled={calculating}>
            {calculating ? (
              <ActivityIndicator color={Colors.royalBlue} size={16} />
            ) : (
              <RefreshCw color={Colors.royalBlue} size={16} />
            )}
            <Text style={styles.refreshBtnText}>{t('bmRecalculate')}</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {calculating ? (
          <View style={styles.calculatingBox}>
            <ActivityIndicator size="large" color={Colors.royalBlue} />
            <Text style={styles.calculatingText}>{t('bmCalculating')}</Text>
            <Text style={styles.calculatingSub}>{t('bmCalculatingDesc')}</Text>
          </View>
        ) : topPairs.length === 0 ? (
          <View style={styles.noResultsBox}>
            <Text style={styles.noResultsText}>{t('bmNoResults')}</Text>
          </View>
        ) : (
          <View style={styles.pairsList}>
            {topPairs.map((pair, i) => renderPairCard(pair, i))}
          </View>
        )}

        {/* Legend */}
        <View style={styles.legendBox}>
          <Text style={styles.legendTitle}>{t('bmLegend')}</Text>
          <View style={styles.legendRow}>
            <Dna color={Colors.royalBlue} size={14} />
            <Text style={styles.legendText}>{t('bmLegendGenetic')}</Text>
          </View>
          <View style={styles.legendRow}>
            <TrendingUp color={Colors.gold} size={14} />
            <Text style={styles.legendText}>{t('bmLegendPerf')}</Text>
          </View>
          <View style={styles.legendRow}>
            <Layers color={Colors.success} size={14} />
            <Text style={styles.legendText}>{t('bmLegendCompat')}</Text>
          </View>
          <View style={styles.legendRow}>
            <AlertTriangle color={Colors.textLight} size={14} />
            <Text style={styles.legendText}>{t('bmLegendInbreeding')}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Detail modal */}
      {renderDetailModal()}

      {/* Filter modal */}
      <Modal visible={filterModal} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('bmFilterTitle')}</Text>
            <TouchableOpacity onPress={() => setFilterModal(false)}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            {/* Min score */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>{t('bmMinScore')}: {filterMinScore}</Text>
              <View style={styles.scoreButtonsRow}>
                {[0, 30, 50, 70, 80].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.scoreBtn, filterMinScore === s && styles.scoreBtnActive]}
                    onPress={() => setFilterMinScore(s)}
                  >
                    <Text style={[styles.scoreBtnText, filterMinScore === s && styles.scoreBtnTextActive]}>
                      {s === 0 ? t('bmAll') : `${s}+`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Champion only */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>{t('bmChampionOnly')}</Text>
              <TouchableOpacity
                style={[styles.championToggle, filterChampionOnly && styles.championToggleActive]}
                onPress={() => setFilterChampionOnly(!filterChampionOnly)}
              >
                <Trophy color={filterChampionOnly ? Colors.goldDark : Colors.textLight} size={18} />
                <Text style={[styles.championToggleText, filterChampionOnly && styles.championToggleTextActive]}>
                  {filterChampionOnly ? t('bmYes') : t('bmNo')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.applyFilterBtn}
              onPress={() => setFilterModal(false)}
            >
              <CheckCircle2 color={Colors.white} size={20} />
              <Text style={styles.applyFilterBtnText}>{t('bmApply')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.goldPale,
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  aiBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.goldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiBannerTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.goldDark },
  aiBannerDesc: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.goldDark, opacity: 0.8, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 2,
  },
  statNum: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.textSecondary },
  filterBar: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  filterActiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gold },
  refreshBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  refreshBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  calculatingBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  calculatingText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.royalBlue },
  calculatingSub: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  noResultsBox: { alignItems: 'center', paddingVertical: 40 },
  noResultsText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary },
  pairsList: { gap: 12 },
  pairCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    position: 'relative',
    ...Shadows.card,
  },
  rankBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 2,
  },
  rankBadgeText: { fontFamily: 'Inter-Bold', fontSize: 12, color: Colors.goldDark },
  pairScoreCircle: {
    position: 'absolute',
    top: 10,
    right: 50,
    alignItems: 'center',
    zIndex: 1,
  },
  pairScoreText: { fontFamily: 'Inter-Bold', fontSize: 28 },
  pairScoreLabel: { fontFamily: 'Inter-SemiBold', fontSize: 9, marginTop: -2 },
  pairBirdsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 80 },
  pairBirdBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pairBirdIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maleIcon: { backgroundColor: Colors.royalBluePale },
  femaleIcon: { backgroundColor: Colors.errorBg },
  pairBirdRing: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.text },
  pairBirdColor: { fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.textSecondary, marginTop: 1 },
  pairHeart: { padding: 4 },
  pairMetricsRow: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.neutral100,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metricText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: Colors.text },
  metricWarn: { backgroundColor: Colors.errorBg },
  metricWarnText: { color: Colors.error },
  tagsRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.successBg,
  },
  tagChipText: { fontFamily: 'Inter-SemiBold', fontSize: 10 },
  warningChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.errorBg,
  },
  warningChipText: { fontFamily: 'Inter-SemiBold', fontSize: 10, color: Colors.error },
  emptyContainer: { alignItems: 'center', gap: 16, marginTop: 40 },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.text },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  emptyStats: { flexDirection: 'row', gap: 16 },
  emptyStatBox: { alignItems: 'center', gap: 4 },
  emptyStatNum: { fontFamily: 'Inter-Bold', fontSize: 24, color: Colors.text },
  emptyStatLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.royalBlue,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Shadows.button,
  },
  primaryBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.white },
  legendBox: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 8,
  },
  legendTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.text, marginBottom: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendText: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, flex: 1 },
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
  detailScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: 20,
    marginBottom: 20,
    backgroundColor: Colors.white,
  },
  detailScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailScoreText: { fontFamily: 'Inter-Bold', fontSize: 28 },
  detailScoreLabel: { fontFamily: 'Inter-SemiBold', fontSize: 10, marginTop: -2 },
  detailScoreTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  detailScoreDesc: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  detailParentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  detailParentCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    gap: 6,
  },
  detailParentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailParentSex: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textSecondary },
  detailParentRing: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.text, textAlign: 'center' },
  detailParentColor: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  detailParentTags: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailParentYear: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight },
  detailChampionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.goldLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  detailChampionText: { fontFamily: 'Inter-Bold', fontSize: 9, color: Colors.goldDark },
  detailHeart: { padding: 4 },
  detailSection: { marginBottom: 20 },
  detailSectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text, marginBottom: 10 },
  detailScoreBars: { gap: 12, marginBottom: 20 },
  detailScoreBar: { gap: 6 },
  detailScoreBarHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailScoreBarLabel: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.text },
  detailScoreBarValue: { fontFamily: 'Inter-Bold', fontSize: 13 },
  detailScoreBarTrack: { height: 8, backgroundColor: Colors.neutral100, borderRadius: 4, overflow: 'hidden' },
  detailScoreBarFill: { height: '100%', borderRadius: 4 },
  detailInbreedingBox: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 20,
  },
  detailInbreedingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  detailInbreedingTitle: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  detailInbreedingValue: { fontFamily: 'Inter-Bold', fontSize: 18 },
  detailInbreedingDesc: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  detailSharedCount: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.royalBlue, marginTop: 6 },
  tagsColumn: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailRationaleBox: {
    backgroundColor: Colors.goldPale,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gold,
    marginBottom: 20,
  },
  detailRationaleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  detailRationaleTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.goldDark },
  detailRationaleText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.goldDark, lineHeight: 20 },
  detailCreateNestBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.royalBlue,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Shadows.button,
  },
  detailCreateNestText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },
  detailViewPedBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.royalBlue,
    marginTop: 10,
  },
  detailViewPedText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.royalBlue },
  filterSection: { marginBottom: 24 },
  filterSectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text, marginBottom: 10 },
  scoreButtonsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  scoreBtn: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  scoreBtnActive: { borderColor: Colors.royalBlue, backgroundColor: Colors.royalBluePale },
  scoreBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary },
  scoreBtnTextActive: { color: Colors.royalBlue },
  championToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  championToggleActive: { borderColor: Colors.gold, backgroundColor: Colors.goldPale },
  championToggleText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textSecondary },
  championToggleTextActive: { color: Colors.goldDark },
  applyFilterBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.royalBlue,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Shadows.button,
  },
  applyFilterBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },
});
