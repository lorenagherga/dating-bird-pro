import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { BreedingCriteriaPanel } from '@/components/BreedingCriteriaPanel';
import {
  scoreAllPairs,
  type BreedingPigeon,
  type PalmaresRecord,
  type NestRecord,
  type PairScore,
  type MatchCriteria,
} from '@/lib/breeding-match';
import { type GameStyle } from '@/lib/types';
import { Heart, Dna, Trophy, TrendingUp, AlertTriangle, Mars, Venus, X } from 'lucide-react-native';

const TOP_PAIRS_LIMIT = 10;
const INBREEDING_WARN_PCT = 6.25;
const DEFAULT_CRITERIA: MatchCriteria = {
  avoidKinship: true,
  rewardPerformance: true,
  sameGameStyle: false,
  sameBreed: false,
  longDistance: false,
};

function scoreColor(score: number) {
  if (score >= 75) return Colors.success;
  if (score >= 50) return Colors.gold;
  if (score >= 30) return Colors.warning;
  return Colors.error;
}

export default function BreedingMatchScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pigeons, setPigeons] = useState<BreedingPigeon[]>([]);
  const [palmares, setPalmares] = useState<PalmaresRecord[]>([]);
  const [nests, setNests] = useState<NestRecord[]>([]);
  const [criteria, setCriteria] = useState<MatchCriteria>(DEFAULT_CRITERIA);
  const [playStyleFilter, setPlayStyleFilter] = useState<GameStyle | null>(null);
  const [customCriteria, setCustomCriteria] = useState<string[]>([]);
  const [selectedPair, setSelectedPair] = useState<PairScore | null>(null);

  const loadData = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [pigeonsRes, palmaresRes, nestsRes] = await Promise.all([
        supabase.from('pigeons').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }),
        supabase.from('pigeon_palmares').select('*').eq('user_id', profile.id),
        supabase.from('nests').select('male_ring, female_ring, chick_count, hatching_date').eq('user_id', profile.id),
      ]);
      if (pigeonsRes.error || palmaresRes.error || nestsRes.error) {
        setLoadError(t('bmLoadError'));
        return;
      }
      setPigeons((pigeonsRes.data || []) as BreedingPigeon[]);
      setPalmares((palmaresRes.data || []) as PalmaresRecord[]);
      setNests((nestsRes.data || []) as NestRecord[]);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const males = useMemo(
    () => pigeons.filter(p => p.sex === 'Mascul' && (!playStyleFilter || p.game_style === playStyleFilter)),
    [pigeons, playStyleFilter]
  );
  const females = useMemo(
    () => pigeons.filter(p => p.sex === 'Femelă' && (!playStyleFilter || p.game_style === playStyleFilter)),
    [pigeons, playStyleFilter]
  );
  const hasPair = males.length > 0 && females.length > 0;

  const pairs = useMemo(
    () => (hasPair ? scoreAllPairs(males, females, pigeons, palmares, nests, criteria) : []),
    [hasPair, males, females, pigeons, palmares, nests, criteria]
  );
  const topPairs = pairs.slice(0, TOP_PAIRS_LIMIT);

  const toggleCriterion = (key: keyof MatchCriteria) => {
    setCriteria(c => ({ ...c, [key]: !c[key] }));
  };

  const explain = (pair: PairScore) =>
    pair.reasons.length > 0
      ? pair.reasons.map(r => t(r as any)).join(' + ')
      : t('bmReasonBasic');

  const renderPairCard = (pair: PairScore, index: number) => {
    const color = scoreColor(pair.totalScore);
    const highInbreeding = pair.inbreedingCoeff > INBREEDING_WARN_PCT;
    return (
      <TouchableOpacity
        key={`${pair.male.id}-${pair.female.id}`}
        style={styles.pairCard}
        onPress={() => setSelectedPair(pair)}
        activeOpacity={0.85}
      >
        <View style={styles.pairTop}>
          <View style={styles.pairPercentBox}>
            <Text style={[styles.pairPercent, { color }]}>{pair.totalScore}%</Text>
            <Text style={styles.pairRank}>#{index + 1}</Text>
          </View>
          <View style={styles.pairBirds}>
            <View style={styles.birdLine}>
              <Mars color={Colors.royalBlue} size={14} />
              <Text style={styles.birdRing} numberOfLines={1}>{pair.male.ring_series || t('bmUnknown')}</Text>
              {pair.male.is_champion && <Trophy color={Colors.gold} size={12} />}
            </View>
            <View style={styles.birdLine}>
              <Venus color={Colors.error} size={14} />
              <Text style={styles.birdRing} numberOfLines={1}>{pair.female.ring_series || t('bmUnknown')}</Text>
              {pair.female.is_champion && <Trophy color={Colors.gold} size={12} />}
            </View>
          </View>
        </View>
        <Text style={styles.pairExplain}>{explain(pair)}</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metricChip}>
            <Dna color={Colors.royalBlue} size={12} />
            <Text style={styles.metricText}>{t('bmGeneticScore')} {pair.geneticScore}</Text>
          </View>
          <View style={styles.metricChip}>
            <TrendingUp color={Colors.royalBlue} size={12} />
            <Text style={styles.metricText}>{t('bmPerformanceScore')} {pair.performanceScore}</Text>
          </View>
          <View style={[styles.metricChip, highInbreeding && styles.metricWarn]}>
            <AlertTriangle color={highInbreeding ? Colors.error : Colors.textLight} size={12} />
            <Text style={[styles.metricText, highInbreeding && styles.metricWarnText]}>
              {t('bmInbreedingCoeff')} {pair.inbreedingCoeff}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedPair) return null;
    const color = scoreColor(selectedPair.totalScore);
    const highInbreeding = selectedPair.inbreedingCoeff > INBREEDING_WARN_PCT;
    return (
      <Modal visible animationType="slide" transparent={false} onRequestClose={() => setSelectedPair(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('bmPairAnalysis')}</Text>
            <TouchableOpacity onPress={() => setSelectedPair(null)} accessibilityLabel={t('bmClose')}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={[styles.detailHeader, { borderColor: color }]}>
              <Text style={[styles.detailPercent, { color }]}>{selectedPair.totalScore}%</Text>
              <View style={styles.detailHeaderText}>
                <Text style={styles.detailTitle}>{t('bmCompatibilityScore')}</Text>
                <Text style={styles.detailExplain}>{explain(selectedPair)}</Text>
              </View>
            </View>

            <View style={styles.detailBirds}>
              <View style={styles.detailBird}>
                <Mars color={Colors.royalBlue} size={18} />
                <Text style={styles.detailBirdSex}>{t('bmMale')}</Text>
                <Text style={styles.detailBirdRing}>{selectedPair.male.ring_series || t('bmUnknown')}</Text>
                <Text style={styles.detailBirdColor}>{selectedPair.male.color || '—'}</Text>
              </View>
              <Heart color={Colors.error} size={20} fill={Colors.error} />
              <View style={styles.detailBird}>
                <Venus color={Colors.error} size={18} />
                <Text style={styles.detailBirdSex}>{t('bmFemale')}</Text>
                <Text style={styles.detailBirdRing}>{selectedPair.female.ring_series || t('bmUnknown')}</Text>
                <Text style={styles.detailBirdColor}>{selectedPair.female.color || '—'}</Text>
              </View>
            </View>

            <Text style={styles.detailSectionTitle}>{t('bmScoreBreakdown')}</Text>
            {[
              { label: t('bmGeneticScore'), score: selectedPair.geneticScore, color: Colors.royalBlue },
              { label: t('bmPerformanceScore'), score: selectedPair.performanceScore, color: Colors.gold },
              { label: t('bmCompatScore'), score: selectedPair.compatibilityScore, color: Colors.success },
            ].map(m => (
              <View key={m.label} style={styles.barRow}>
                <View style={styles.barHeader}>
                  <Text style={styles.barLabel}>{m.label}</Text>
                  <Text style={[styles.barValue, { color: m.color }]}>{m.score}/100</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${m.score}%`, backgroundColor: m.color }]} />
                </View>
              </View>
            ))}

            <View style={styles.inbreedingBox}>
              <Text style={styles.inbreedingTitle}>{t('bmInbreedingCoeff')}: {selectedPair.inbreedingCoeff}%</Text>
              <Text style={[styles.inbreedingDesc, highInbreeding && styles.inbreedingWarn]}>
                {selectedPair.inbreedingCoeff === 0
                  ? t('bmInbreedingZero')
                  : highInbreeding
                    ? t('bmInbreedingHigh')
                    : t('bmInbreedingSafe')}
              </Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => { setSelectedPair(null); router.push('/(tabs)/nests'); }}>
              <Heart color={Colors.white} size={20} />
              <Text style={styles.primaryBtnText}>{t('bmCreateNest')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => { setSelectedPair(null); router.push(`/(tabs)/pedigree-studio?id=${selectedPair.male.id}`); }}
            >
              <Dna color={Colors.royalBlue} size={18} />
              <Text style={styles.secondaryBtnText}>{t('bmViewPedigree')}</Text>
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

  if (loadError) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={t('bmTitle')} subtitle={t('bmSub')} showBack />
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }

  if (!hasPair) {
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
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/pigeons')}>
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

        <BreedingCriteriaPanel
          criteria={criteria}
          onToggle={toggleCriterion}
          playStyle={playStyleFilter}
          onPlayStyleChange={setPlayStyleFilter}
          customCriteria={customCriteria}
          onAddCustom={text => setCustomCriteria(list => [...list, text])}
          onRemoveCustom={index => setCustomCriteria(list => list.filter((_, i) => i !== index))}
        />

        <Text style={styles.resultsTitle}>{t('bmTopPairs')}</Text>
        {topPairs.length === 0 ? (
          <Text style={styles.noResultsText}>{t('bmNoResults')}</Text>
        ) : (
          <View style={styles.pairsList}>{topPairs.map((pair, i) => renderPairCard(pair, i))}</View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  errorText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.error, padding: 24 },
  resultsTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text, marginBottom: 12 },
  noResultsText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 32 },
  pairsList: { gap: 12 },
  pairCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 10,
    ...Shadows.card,
  },
  pairTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pairPercentBox: { alignItems: 'center', minWidth: 64 },
  pairPercent: { fontFamily: 'Inter-Bold', fontSize: 26 },
  pairRank: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: Colors.textLight },
  pairBirds: { flex: 1, gap: 6 },
  birdLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  birdRing: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  pairExplain: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
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
  emptyContainer: { alignItems: 'center', gap: 16, marginTop: 40 },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.text, textAlign: 'center' },
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
  secondaryBtn: {
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
  secondaryBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.royalBlue },
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
  modalScroll: { padding: 24, gap: 16 },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: 20,
    backgroundColor: Colors.white,
  },
  detailPercent: { fontFamily: 'Inter-Bold', fontSize: 36 },
  detailHeaderText: { flex: 1, gap: 4 },
  detailTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.text },
  detailExplain: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  detailBirds: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailBird: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  detailBirdSex: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textSecondary },
  detailBirdRing: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.text, textAlign: 'center' },
  detailBirdColor: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  detailSectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  barRow: { gap: 6 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.text },
  barValue: { fontFamily: 'Inter-Bold', fontSize: 13 },
  barTrack: { height: 8, backgroundColor: Colors.neutral100, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  inbreedingBox: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  inbreedingTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  inbreedingDesc: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  inbreedingWarn: { color: Colors.error },
});
