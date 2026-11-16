import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { PLAN_LIMITS } from '@/lib/types';
import { savePdf } from '@/lib/pdf/pdf-export';
import { buildPigeonPedigreePdf } from '@/lib/pdf/pdf-pigeon-documents';
import {
  loadPedigreeData,
  buildPedigreeTree,
  type PalmaresEntry,
  type PedigreeData,
  type PedigreeNode,
} from '@/lib/pedigree/pedigree-tree';
import { GenerationSelector } from '@/components/GenerationSelector';
import { ArrowLeft, Download, Crown, Bird, Trophy, Medal, Award } from 'lucide-react-native';
import { LanguagePicker } from '@/components/LanguagePicker';

const DEFAULT_GENERATIONS = 4;

export default function PedigreeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const ro = language === 'ro';
  const [data, setData] = useState<PedigreeData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [generations, setGenerations] = useState(DEFAULT_GENERATIONS);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const plan = profile?.subscription_plan || 'trial';
  const limits = PLAN_LIMITS[plan];

  useEffect(() => {
    let cancelled = false;
    loadPedigreeData()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const ancestry = useMemo(
    () => (data && id ? buildPedigreeTree(data, id, generations) : null),
    [data, id, generations]
  );

  const retryLoad = () => {
    setLoadError(null);
    setReloadKey((key) => key + 1);
  };

  if (!data && !loadError) {
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

  const handleDownload = async () => {
    if (!profile?.id || !id) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const { doc, fileName } = await buildPigeonPedigreePdf(profile.id, id, generations);
      await savePdf(doc, fileName);
    } catch (err) {
      setDownloadError(
        err instanceof Error && err.message
          ? err.message
          : ro ? 'Descărcarea PDF a eșuat. Încercați din nou.' : 'PDF download failed. Please try again.'
      );
    } finally {
      setDownloading(false);
    }
  };

  const getMedalColor = (position: number) => {
    if (position === 1) return Colors.gold;
    if (position === 2) return '#C0C0C0';
    if (position === 3) return '#CD7F32';
    return Colors.royalBlue;
  };

  const palmaresFor = (pigeonId: string): PalmaresEntry[] => data?.palmaresByPigeon.get(pigeonId) ?? [];

  const renderTreeNode = (node: PedigreeNode | null, gen: number): React.ReactNode => {
    if (gen >= generations) return null;
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
    const palmares = palmaresFor(node.id);
    const hasPodium = palmares.some((p) => p.position <= 3);
    const showTrophy = isChampion || hasPodium;

    const genLabel = gen === 1 ? t('gen1') : gen === 2 ? t('gen2') : gen === 3 ? t('gen3') : `Gen ${gen}`;

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
            <View style={styles.nodeContentRow}>
              {node.photo_url ? (
                <Image source={{ uri: node.photo_url }} style={styles.nodePhoto} resizeMode="cover" />
              ) : (
                <View style={styles.nodePhotoPlaceholder}>
                  <Bird color={gen === 0 ? 'rgba(255,255,255,0.6)' : Colors.textLight} size={16} />
                </View>
              )}
              <View style={{ flex: 1 }}>
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
              </View>
            </View>
            {palmares.length > 0 && (
              <View style={styles.palmaresMini}>
                {palmares.slice(0, 3).map((p) => (
                  <View
                    key={p.id}
                    style={[styles.miniMedal, { backgroundColor: p.position === 1 ? Colors.goldLight : p.position === 2 ? '#F0F0F0' : p.position === 3 ? '#FAEBD7' : Colors.royalBluePale }]}
                  >
                    <Medal color={getMedalColor(p.position)} size={9} />
                    <Text style={[styles.miniMedalText, { color: getMedalColor(p.position) }]}>
                      {String(p.position)}
                    </Text>
                  </View>
                ))}
                {palmares.length > 3 && (
                  <Text style={styles.moreText}>+{palmares.length - 3}</Text>
                )}
              </View>
            )}
            {gen === 0 && <Text style={styles.rootLabel}>{t('subject')}</Text>}
            {gen >= 1 && <Text style={styles.genLabel}>{genLabel}</Text>}
          </View>
        </View>
        {gen + 1 < generations && (
          <View style={{ gap: 3 }}>
            {renderTreeNode(node.sire, gen + 1)}
            {renderTreeNode(node.dam, gen + 1)}
          </View>
        )}
      </View>
    );
  };

  const renderPalmaresSection = (pigeonId: string) => {
    const palmares = palmaresFor(pigeonId);
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
                {ro ? `Locul ${p.position}` : p.position}
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

  const renderBody = () => {
    if (loadError) {
      return (
        <View style={styles.stateBox}>
          <Text style={styles.errorText}>
            {ro ? 'Arborele nu a putut fi încărcat.' : 'The pedigree could not be loaded.'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={retryLoad} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>{ro ? 'Încearcă din nou' : 'Try again'}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (!ancestry || !id) {
      return (
        <View style={styles.stateBox}>
          <Text style={styles.errorText}>
            {ro ? 'Porumbelul nu a fost găsit.' : 'This pigeon was not found.'}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.certificateWrapper}>
        <View style={styles.certificateBorder}>
          <View style={styles.certificateInnerBorder}>
            <View style={styles.certificateHeader}>
              <View style={styles.certificateGoldLine} />
              <Text style={styles.certificateTitle}>{t('certificateTitle')}</Text>
              <Text style={styles.certificateSubtitle}>{t('certificateSub')}</Text>
              <View style={styles.certificateGoldLine} />
            </View>

            {ancestry.is_champion && (
              <View style={styles.championBanner}>
                <Trophy color={Colors.gold} size={16} />
                <Text style={styles.championBannerText}>{t('championBanner')}</Text>
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.pedigreeTree}>
                {renderTreeNode(ancestry, 0)}
              </View>
            </ScrollView>

            {renderPalmaresSection(ancestry.id)}

            <View style={styles.certificateFooter}>
              <View style={styles.certificateGoldLine} />
              <Text style={styles.footerText}>
                {t('docGenerated')} · {new Date().toLocaleDateString(ro ? 'ro-RO' : 'en-US')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={Colors.royalBlue} size={22} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t('pedigreeTitle')}</Text>
        <LanguagePicker />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.controls}>
          <GenerationSelector
            label={ro ? 'Generații afișate' : 'Generations shown'}
            value={generations}
            onChange={setGenerations}
          />
          <TouchableOpacity
            style={[styles.downloadBtn, downloading && styles.downloadBtnDisabled]}
            onPress={handleDownload}
            disabled={downloading || !ancestry}
            activeOpacity={0.8}
          >
            {downloading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Download color={Colors.white} size={18} />
            )}
            <Text style={styles.downloadBtnText}>
              {ro ? `Descarcă PDF (${generations} generații)` : `Download PDF (${generations} generations)`}
            </Text>
          </TouchableOpacity>
          {downloadError && <Text style={styles.errorText}>{downloadError}</Text>}
        </View>

        {renderBody()}
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
  scrollContent: { padding: 16, paddingBottom: 40 },
  controls: { gap: 16, marginBottom: 16 },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: Colors.royalBlue,
    paddingHorizontal: 16,
  },
  downloadBtnDisabled: { opacity: 0.6 },
  downloadBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.white },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.error, textAlign: 'center' },
  stateBox: { alignItems: 'center', gap: 16, marginTop: 40 },
  retryBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.royalBlue,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.royalBlue },
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
    minWidth: 240,
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
  nodeContentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nodePhoto: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: Colors.borderLight },
  nodePhotoPlaceholder: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.neutral100, justifyContent: 'center', alignItems: 'center' },
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
