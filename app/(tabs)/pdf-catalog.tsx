import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  FileText, Check, Crown, Bird, FilePlus2, Download,
  Mars, Venus, Trophy, ChevronRight, Sparkles,
} from 'lucide-react-native';

interface PigeonRow {
  id: string;
  ring_series: string;
  year: number | null;
  sex: string;
  color: string;
  photo_url: string | null;
  is_champion: boolean;
  notes: string;
}

export default function PdfCatalogScreen() {
  const { t } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const router = useRouter();
  const [pigeons, setPigeons] = useState<PigeonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const hasAccess = isAdmin || profile?.subscription_plan === 'professional' || profile?.subscription_plan === 'standard' || profile?.subscription_plan === 'hobby';

  useEffect(() => {
    supabase
      .from('pigeons')
      .select('id, ring_series, year, sex, color, photo_url, is_champion, notes')
      .eq('status', 'În crescătorie')
      .order('ring_series', { ascending: true })
      .then(({ data }) => {
        setPigeons((data || []) as PigeonRow[]);
        setLoading(false);
      });
  }, []);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    setGenerated(false);
  };

  const selectAll = () => {
    setSelectedIds(new Set(pigeons.map(p => p.id)));
    setGenerated(false);
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
    setGenerated(false);
  };

  const handleGenerate = () => {
    if (selectedIds.size === 0) {
      Alert.alert(t('error'), t('pdfNoSelection'));
      return;
    }
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
      Alert.alert(t('pdfGenerated'), t('pdfGeneratedMsg').replace('N', String(selectedIds.size)));
    }, 2500);
  };

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ScreenHeader title={t('pdfTitle')} subtitle={t('pdfSub')} />
          <View style={styles.paywallContainer}>
            <View style={styles.paywallIcon}>
              <Crown color={Colors.gold} size={48} />
            </View>
            <Text style={styles.paywallTitle}>{t('pdfPaywall')}</Text>
            <Text style={styles.paywallSubtitle}>{t('pdfPaywallMsg')}</Text>
            <TouchableOpacity style={styles.paywallBtn} onPress={() => router.push('/(tabs)/profile')}>
              <Text style={styles.paywallBtnText}>{t('pdfPaywallCta')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const selectedPigeons = pigeons.filter(p => selectedIds.has(p.id));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('pdfTitle')} subtitle={t('pdfSub')} />

        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>
            {selectedIds.size} {t('pdfSelected')}
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity style={styles.selectionBtn} onPress={selectAll}>
              <Text style={styles.selectionBtnText}>{t('pdfSelectAll')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectionBtn} onPress={deselectAll}>
              <Text style={styles.selectionBtnText}>{t('pdfDeselectAll')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 40 }} />
        ) : pigeons.length === 0 ? (
          <View style={styles.emptyState}>
            <Bird color={Colors.textLight} size={48} />
            <Text style={styles.emptyText}>{t('pdfNoPigeons')}</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {pigeons.map(pigeon => {
              const isSelected = selectedIds.has(pigeon.id);
              return (
                <TouchableOpacity
                  key={pigeon.id}
                  style={[styles.pigeonCard, isSelected && styles.pigeonCardSelected]}
                  onPress={() => toggleSelect(pigeon.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.pigeonPhotoBox}>
                    {pigeon.photo_url ? (
                      <Image source={{ uri: pigeon.photo_url }} style={styles.pigeonPhoto} resizeMode="cover" />
                    ) : (
                      <Bird color={Colors.royalBlueLight} size={24} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.pigeonHeader}>
                      <Text style={styles.pigeonRing}>{pigeon.ring_series}</Text>
                      {pigeon.is_champion && (
                        <View style={styles.championBadge}>
                          <Trophy color={Colors.gold} size={11} />
                          <Text style={styles.championText}>{t('aucChampion')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.pigeonInfo}>
                      {pigeon.sex === 'Mascul' ? <Mars color={Colors.royalBlue} size={12} /> : <Venus color={Colors.error} size={12} />}
                      {' '}{pigeon.color} · {pigeon.year || '—'}
                    </Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Check color={Colors.white} size={16} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selectedIds.size > 0 && !generated && (
          <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={generating}>
            {generating ? (
              <ActivityIndicator color={Colors.royalBlueDark} />
            ) : (
              <>
                <FilePlus2 color={Colors.royalBlueDark} size={22} />
                <Text style={styles.generateBtnText}>{t('pdfGenerate')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {generated && selectedPigeons.length > 0 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>{t('pdfPreview')}</Text>

            <View style={styles.coverPage}>
              <View style={styles.coverBorder}>
                <View style={styles.coverIconBox}>
                  <Sparkles color={Colors.gold} size={32} />
                </View>
                <Text style={styles.coverTitle}>{t('pdfCoverTitle')}</Text>
                <Text style={styles.coverSub}>{t('pdfCoverSub')}</Text>
                <Text style={styles.coverCount}>{selectedPigeons.length} {t('pigeons')}</Text>
              </View>
            </View>

            {selectedPigeons.map((pigeon, i) => (
              <View key={pigeon.id} style={styles.catalogPage}>
                <View style={styles.catalogPageHeader}>
                  <Text style={styles.catalogPageNum}>{i + 1}</Text>
                  <Text style={styles.catalogPageTitle}>{t('pdfPigeonPage')}</Text>
                </View>
                <View style={styles.catalogPageBody}>
                  <View style={styles.catalogPhotoBox}>
                    {pigeon.photo_url ? (
                      <Image source={{ uri: pigeon.photo_url }} style={styles.catalogPhoto} resizeMode="cover" />
                    ) : (
                      <Bird color={Colors.royalBlueLight} size={36} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={styles.catalogRing}>{pigeon.ring_series}</Text>
                    <View style={styles.catalogInfoRow}>
                      <Text style={styles.catalogInfoLabel}>{t('pdfSex')}:</Text>
                      <Text style={styles.catalogInfoValue}>{pigeon.sex}</Text>
                    </View>
                    <View style={styles.catalogInfoRow}>
                      <Text style={styles.catalogInfoLabel}>{t('pdfColor')}:</Text>
                      <Text style={styles.catalogInfoValue}>{pigeon.color}</Text>
                    </View>
                    <View style={styles.catalogInfoRow}>
                      <Text style={styles.catalogInfoLabel}>{t('pdfYear')}:</Text>
                      <Text style={styles.catalogInfoValue}>{String(pigeon.year || '—')}</Text>
                    </View>
                    {pigeon.is_champion && (
                      <View style={styles.catalogChampionBadge}>
                        <Trophy color={Colors.gold} size={12} />
                        <Text style={styles.catalogChampionText}>{t('aucChampion')}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {pigeon.notes ? (
                  <Text style={styles.catalogNotes}>{pigeon.notes}</Text>
                ) : null}
              </View>
            ))}

            <TouchableOpacity style={styles.downloadBtn} onPress={() => Alert.alert(t('pdfGenerated'), t('pdfGeneratedMsg').replace('N', String(selectedIds.size)))}>
              <Download color={Colors.white} size={20} />
              <Text style={styles.downloadBtnText}>{t('pdfGenerate')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  paywallContainer: { alignItems: 'center', gap: 16, marginTop: 40, paddingHorizontal: 24 },
  paywallIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.goldPale, borderWidth: 2, borderColor: Colors.gold, justifyContent: 'center', alignItems: 'center' },
  paywallTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.text },
  paywallSubtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  paywallBtn: { backgroundColor: Colors.gold, borderRadius: BorderRadius.md, paddingVertical: 16, paddingHorizontal: 32, ...Shadows.gold },
  paywallBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.royalBlueDark },
  selectionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  selectionCount: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  selectionActions: { flexDirection: 'row', gap: 8 },
  selectionBtn: { backgroundColor: Colors.royalBluePale, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  selectionBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.royalBlue },
  emptyState: { alignItems: 'center', gap: 12, marginTop: 40 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary },
  pigeonCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 14, borderWidth: 1.5, borderColor: Colors.borderLight },
  pigeonCardSelected: { borderColor: Colors.royalBlue, backgroundColor: Colors.royalBluePale },
  pigeonPhotoBox: { width: 50, height: 50, borderRadius: 10, backgroundColor: Colors.royalBluePale, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  pigeonPhoto: { width: 50, height: 50, borderRadius: 10 },
  pigeonHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pigeonRing: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.text },
  championBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.goldPale, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  championText: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.goldDark },
  pigeonInfo: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: Colors.royalBlue, borderColor: Colors.royalBlue },
  generateBtn: { flexDirection: 'row', backgroundColor: Colors.gold, borderRadius: BorderRadius.md, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16, ...Shadows.gold },
  generateBtnText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.royalBlueDark },
  previewContainer: { marginTop: 24, gap: 12 },
  previewTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  coverPage: { backgroundColor: Colors.royalBlue, borderRadius: BorderRadius.lg, padding: 8, ...Shadows.card },
  coverBorder: { borderWidth: 2, borderColor: Colors.gold, borderRadius: BorderRadius.md, padding: 32, alignItems: 'center', gap: 12 },
  coverIconBox: { width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  coverTitle: { fontFamily: 'Inter-Bold', fontSize: 24, color: Colors.white },
  coverSub: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.goldLight },
  coverCount: { fontFamily: 'Inter-Regular', fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  catalogPage: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 20, borderWidth: 1, borderColor: Colors.borderLight, ...Shadows.card },
  catalogPageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  catalogPageNum: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.gold, backgroundColor: Colors.goldPale, width: 28, height: 28, borderRadius: 8, textAlign: 'center', textAlignVertical: 'center' },
  catalogPageTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textSecondary },
  catalogPageBody: { flexDirection: 'row', gap: 16 },
  catalogPhotoBox: { width: 80, height: 80, borderRadius: 12, backgroundColor: Colors.royalBluePale, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  catalogPhoto: { width: 80, height: 80, borderRadius: 12 },
  catalogRing: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text, marginBottom: 4 },
  catalogInfoRow: { flexDirection: 'row', gap: 6 },
  catalogInfoLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary },
  catalogInfoValue: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.text },
  catalogChampionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.goldPale, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  catalogChampionText: { fontFamily: 'Inter-Bold', fontSize: 11, color: Colors.goldDark },
  catalogNotes: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight, lineHeight: 19 },
  downloadBtn: { flexDirection: 'row', backgroundColor: Colors.royalBlue, borderRadius: BorderRadius.md, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, ...Shadows.button },
  downloadBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },
});
