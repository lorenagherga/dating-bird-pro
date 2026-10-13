import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { PLAN_LIMITS } from '@/lib/types';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ArrowLeft, Download, Crown, Bird, Trophy, Medal, Award } from 'lucide-react-native';

interface PigeonRecord {
  id: string;
  ring_series: string;
  year: number | null;
  sex: string;
  color: string;
  status: string;
  sire_id: string | null;
  dam_id: string | null;
  photo_url: string | null;
  notes: string;
  is_champion: boolean;
}

interface PalmaresEntry {
  id: string;
  position: number;
  race_name: string;
  year: number | null;
  distance_km: number | null;
}

export default function PedigreeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [pigeon, setPigeon] = useState<PigeonRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [palmaresMap, setPalmaresMap] = useState<Record<string, PalmaresEntry[]>>({});

  const plan = profile?.subscription_plan || 'free';
  const limits = PLAN_LIMITS[plan];

  const fetchPigeon = async (pid: string): Promise<PigeonRecord | null> => {
    const { data } = await supabase
      .from('pigeons')
      .select('*')
      .eq('id', pid)
      .maybeSingle();
    return data as PigeonRecord | null;
  };

  const fetchPalmaresForPigeon = async (pid: string): Promise<PalmaresEntry[]> => {
    const { data } = await supabase
      .from('pigeon_palmares')
      .select('id, position, race_name, year, distance_km')
      .eq('pigeon_id', pid)
      .order('position', { ascending: true });
    return (data || []) as PalmaresEntry[];
  };

  const loadPigeon = useCallback(async () => {
    if (!id) return;
    const p = await fetchPigeon(id);
    setPigeon(p);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadPigeon();
  }, [loadPigeon]);

  const buildAncestry = async (p: PigeonRecord | null, generations: number): Promise<any> => {
    if (!p || generations === 0) return null;
    const [sire, dam] = await Promise.all([
      p.sire_id ? fetchPigeon(p.sire_id) : Promise.resolve(null),
      p.dam_id ? fetchPigeon(p.dam_id) : Promise.resolve(null),
    ]);
    return {
      ...p,
      sire: await buildAncestry(sire, generations - 1),
      dam: await buildAncestry(dam, generations - 1),
    };
  };

  const loadAllPalmares = async (rootNode: any) => {
    const ids = new Set<string>();
    const collect = (node: any) => {
      if (!node) return;
      if (node.id) ids.add(node.id);
      collect(node.sire);
      collect(node.dam);
    };
    collect(rootNode);
    const map: Record<string, PalmaresEntry[]> = {};
    await Promise.all(
      Array.from(ids).map(async (pid) => {
        const entries = await fetchPalmaresForPigeon(pid);
        if (entries.length > 0) map[pid] = entries;
      })
    );
    setPalmaresMap(map);
  };

  const [ancestry, setAncestry] = useState<any>(null);
  const [ancestryLoading, setAncestryLoading] = useState(false);

  useEffect(() => {
    if (pigeon) {
      setAncestryLoading(true);
      buildAncestry(pigeon, 4).then((tree) => {
        setAncestry(tree);
        loadAllPalmares(tree).finally(() => setAncestryLoading(false));
      });
    }
  }, [pigeon]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!limits.hasPedigree) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.lockedContainer}>
          <View style={styles.lockedIcon}>
            <Crown color={Colors.royalBlue} size={40} />
          </View>
          <Text style={styles.lockedTitle}>{t('pedigreePremium')}</Text>
          <Text style={styles.lockedSubtitle}>
            {t('pedigreePremiumMsg')}
          </Text>
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.upgradeBtnText}>{t('seePlans')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getMedalColor = (position: number) => {
    if (position === 1) return Colors.gold;
    if (position === 2) return '#C0C0C0';
    if (position === 3) return '#CD7F32';
    return Colors.royalBlue;
  };

  const renderTreeNode = (node: any, gen: number): React.ReactNode => {
    if (!node) {
      return (
        <View style={[styles.treeNode, { marginLeft: gen * 8 }]}>
          <View style={[styles.nodeBox, styles.emptyNode]}>
            <Text style={styles.emptyNodeText}>{t('unknown')}</Text>
          </View>
        </View>
      );
    }
    const isChampion = node.is_champion;
    const palmares = palmaresMap[node.id] || [];
    const hasPodium = palmares.some((p) => p.position <= 3);
    const showTrophy = isChampion || hasPodium;

    return (
      <View style={{ gap: 3 }}>
        <View style={[styles.treeNode, { marginLeft: gen * 8 }]}>
          <View style={[
            styles.nodeBox,
            gen === 0 && styles.rootNode,
            isChampion && styles.championNode,
          ]}>
            {showTrophy && (
              <View style={styles.trophyCorner}>
                <Trophy
                  color={isChampion || palmares.some(p => p.position === 1) ? Colors.gold : Colors.royalBlue}
                  size={14}
                />
              </View>
            )}
            <View style={styles.nodeHeader}>
              <Text
                style={[styles.nodeRing, gen === 0 && styles.rootRing]}
                numberOfLines={1}
              >
                {node.ring_series}
              </Text>
              {node.sex && (
                <View style={[styles.sexBadge, node.sex === 'Mascul' ? styles.sexMale : styles.sexFemale]}>
                  <Text style={styles.sexText}>{node.sex === 'Mascul' ? 'M' : 'F'}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.nodeDetails, gen === 0 && styles.rootDetails]}>
              {node.year || '—'} · {node.color || t('noColor')}
            </Text>
            {palmares.length > 0 && (
              <View style={styles.palmaresMini}>
                {palmares.slice(0, 3).map((p) => (
                  <View
                    key={p.id}
                    style={[styles.miniMedal, { backgroundColor: p.position === 1 ? Colors.goldLight : p.position === 2 ? '#F0F0F0' : p.position === 3 ? '#FAEBD7' : Colors.royalBluePale }]}
                  >
                    <Medal color={getMedalColor(p.position)} size={9} />
                    <Text style={[styles.miniMedalText, { color: getMedalColor(p.position) }]}>
                      {p.position === 1 ? '1' : p.position === 2 ? '2' : p.position === 3 ? '3' : String(p.position)}
                    </Text>
                  </View>
                ))}
                {palmares.length > 3 && (
                  <Text style={styles.moreText}>+{palmares.length - 3}</Text>
                )}
              </View>
            )}
            {gen === 0 && <Text style={styles.rootLabel}>{t('subject')}</Text>}
            {gen === 1 && <Text style={styles.genLabel}>{t('gen1')}</Text>}
            {gen === 2 && <Text style={styles.genLabel}>{t('gen2')}</Text>}
            {gen === 3 && <Text style={styles.genLabel}>{t('gen3')}</Text>}
          </View>
        </View>
        <View style={{ gap: 3 }}>
          {renderTreeNode(node.sire, gen + 1)}
          {renderTreeNode(node.dam, gen + 1)}
        </View>
      </View>
    );
  };

  const renderPalmaresSection = () => {
    if (!pigeon) return null;
    const palmares = palmaresMap[pigeon.id] || [];
    if (palmares.length === 0) return null;
    return (
      <View style={styles.palmaresSection}>
        <View style={styles.palmaresHeader}>
          <Award color={Colors.gold} size={20} />
          <Text style={styles.palmaresTitle}>{t('palmaresTitle')}</Text>
        </View>
        {palmares.map((p) => (
          <View key={p.id} style={[styles.palmaresRow, { borderLeftColor: getMedalColor(p.position) }]}>
            <View style={[styles.palmaresBadge, { backgroundColor: p.position === 1 ? Colors.goldLight : p.position === 2 ? '#F0F0F0' : p.position === 3 ? '#FAEBD7' : Colors.royalBluePale }]}>
              <Text style={[styles.palmaresPosition, { color: getMedalColor(p.position) }]}>
                {language === 'ro' ? `Locul ${p.position}` : p.position}
              </Text>
            </View>
            <View style={styles.palmaresInfo}>
              <Text style={styles.palmaresRace}>{p.race_name}</Text>
              <Text style={styles.palmaresDetails}>
                {p.year || '—'}{p.distance_km ? ` · ${p.distance_km} km` : ''}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const handleDownload = () => {
    Alert.alert(
      t('pedigreeDownload'),
      t('pedigreeDownloadMsg'),
      [{ text: t('understood') }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={Colors.royalBlue} size={22} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t('pedigreeTitle')}</Text>
        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
          <Download color={Colors.royalBlue} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {ancestryLoading && !ancestry ? (
          <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 40 }} />
        ) : ancestry ? (
          <View style={styles.certificateWrapper}>
            <View style={styles.certificateBorder}>
              <View style={styles.certificateInnerBorder}>
                <View style={styles.certificateHeader}>
                  <View style={styles.certificateGoldLine} />
                  <Text style={styles.certificateTitle}>{t('certificateTitle')}</Text>
                  <Text style={styles.certificateSubtitle}>{t('certificateSub')}</Text>
                  <View style={styles.certificateGoldLine} />
                </View>

                {pigeon?.is_champion && (
                  <View style={styles.championBanner}>
                    <Trophy color={Colors.gold} size={16} />
                    <Text style={styles.championBannerText}>{t('championBanner')}</Text>
                  </View>
                )}

                <View style={styles.pedigreeTree}>
                  {renderTreeNode(ancestry, 0)}
                </View>

                {renderPalmaresSection()}

                <View style={styles.certificateFooter}>
                  <View style={styles.certificateGoldLine} />
                  <Text style={styles.footerText}>
                    {t('docGenerated')} · {new Date().toLocaleDateString(language === 'ro' ? 'ro-RO' : 'en-US')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : null}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  downloadBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  certificateWrapper: {
    backgroundColor: Colors.cream,
    borderRadius: 16,
    overflow: 'hidden',
  },
  certificateBorder: {
    borderWidth: 2,
    borderColor: Colors.royalBlue,
    borderRadius: 14,
    margin: 6,
  },
  certificateInnerBorder: {
    borderWidth: 1,
    borderColor: Colors.royalBlueLight,
    borderRadius: 10,
    margin: 4,
    padding: 16,
  },
  certificateHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  certificateGoldLine: {
    width: '80%',
    height: 2,
    backgroundColor: Colors.gold,
    marginBottom: 10,
  },
  certificateTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: Colors.royalBlue,
    marginBottom: 4,
  },
  certificateSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  championBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.goldLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
    alignSelf: 'center',
  },
  championBannerText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.goldDark,
  },
  pedigreeTree: { gap: 3 },
  treeNode: { gap: 3 },
  nodeBox: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    position: 'relative',
  },
  rootNode: {
    backgroundColor: Colors.royalBlue,
    borderColor: Colors.royalBlue,
  },
  championNode: {
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  emptyNode: {
    backgroundColor: Colors.neutral100,
    borderColor: Colors.neutral200,
  },
  trophyCorner: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  nodeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 },
  nodeRing: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.text, flex: 1 },
  rootRing: { color: Colors.white, fontSize: 14 },
  sexBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sexMale: { backgroundColor: 'rgba(255,255,255,0.25)' },
  sexFemale: { backgroundColor: 'rgba(255,255,255,0.25)' },
  sexText: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.white },
  nodeDetails: { fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.textSecondary, marginTop: 3 },
  rootDetails: { color: 'rgba(255,255,255,0.8)' },
  palmaresMini: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  miniMedal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniMedalText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
  },
  moreText: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    color: Colors.textSecondary,
    alignSelf: 'center',
  },
  rootLabel: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.white, marginTop: 4 },
  genLabel: { fontFamily: 'Inter-Medium', fontSize: 9, color: Colors.textSecondary, marginTop: 4 },
  emptyNodeText: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight, fontStyle: 'italic' },
  palmaresSection: {
    marginTop: 20,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.goldLight,
  },
  palmaresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  palmaresTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: Colors.goldDark,
  },
  palmaresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderLeftWidth: 3,
    marginBottom: 6,
  },
  palmaresBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  palmaresPosition: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
  },
  palmaresInfo: { flex: 1 },
  palmaresRace: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  palmaresDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  certificateFooter: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 8,
  },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  lockedIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.text },
  lockedSubtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  upgradeBtn: {
    backgroundColor: Colors.royalBlue,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  upgradeBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },
});
