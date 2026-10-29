import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { PLAN_LIMITS } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Crown, ChevronDown, Check, Dna, AlertTriangle, ShieldCheck, Camera } from 'lucide-react-native';
import { offspringOutcomes, groupByPhenotype } from '@/lib/genetics-engine/punnett';
import type { PhenotypeGroup } from '@/lib/genetics-engine/punnett';
import { describePhenotypeGroup, formatPercent } from '@/lib/genetics-engine/describe';
import type { TextLanguage } from '@/lib/genetics-engine/describe';
import { computeInbreeding } from '@/lib/genetics-engine/wright-coi';
import type { InbreedingResult } from '@/lib/genetics-engine/wright-coi';
import { fraction, multiplyFractions, fractionToNumber, addFractions, ZERO } from '@/lib/genetics-engine/fraction';
import type { Fraction } from '@/lib/genetics-engine/fraction';
import { readStoredGenotype, sexFromRegistry, buildPedigree } from '@/lib/genetics-engine/registry';
import type { RegistryPigeon } from '@/lib/genetics-engine/registry';
import type { Sex } from '@/lib/genetics-engine/loci';
import type { Language } from '@/lib/i18n';

type Bilingual = { ro: string; en: string };

const SEX_LABELS: Record<Sex, Bilingual> = {
  male: { ro: 'Masculi', en: 'Males' },
  female: { ro: 'Femele', en: 'Females' },
};

const GENOTYPE_ERRORS: Record<'missing' | 'invalid', Bilingual> = {
  missing: { ro: 'nu are încă un genotip salvat.', en: 'does not have a saved genotype yet.' },
  invalid: { ro: 'are un genotip salvat invalid.', en: 'has an invalid saved genotype.' },
};

const INBREEDING_LIMIT_PERCENT = 6.25;

type Level = 'green' | 'gold' | 'red';

const LEVEL_STYLES: Record<Level, { bg: string; border: string; text: string }> = {
  green: { bg: Colors.successBg, border: Colors.success, text: Colors.success },
  gold: { bg: Colors.warningBg, border: Colors.warning, text: Colors.warning },
  red: { bg: Colors.errorBg, border: Colors.error, text: Colors.error },
};

interface CalculationResult {
  groups: PhenotypeGroup[];
  sexShares: Record<Sex, Fraction>;
  inbreeding: InbreedingResult;
}

const bi = (obj: Bilingual, lang: Language): string => (lang === 'ro' ? obj.ro : obj.en);

function RegistryPicker({
  label,
  pigeons,
  selectedId,
  onSelect,
  placeholder,
  noGenotypeLabel,
}: {
  label: string;
  pigeons: RegistryPigeon[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  placeholder: string;
  noGenotypeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = pigeons.find((p) => p.id === selectedId);
  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <TouchableOpacity style={styles.pickerButton} onPress={() => setOpen(!open)}>
        <Text style={styles.pickerValue} numberOfLines={1}>
          {selected ? selected.ring_series : placeholder}
        </Text>
        <ChevronDown color={Colors.royalBlue} size={18} />
      </TouchableOpacity>
      {open && (
        <View style={styles.pickerList}>
          <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
            {pigeons.length === 0 ? (
              <Text style={styles.emptyText}>{placeholder}</Text>
            ) : (
              pigeons.map((p) => {
                const active = p.id === selectedId;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.pickerItem, active && styles.pickerItemActive]}
                    onPress={() => { onSelect(p.id); setOpen(false); }}
                  >
                    <Text style={[styles.pickerItemText, active && styles.pickerItemTextActive]} numberOfLines={1}>
                      {p.ring_series}
                      {p.color ? ` · ${p.color}` : ''}
                      {p.genotype === null ? ` · ${noGenotypeLabel}` : ''}
                    </Text>
                    {active && <Check color={Colors.royalBlue} size={16} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function SexResults({
  sex,
  share,
  groups,
  lang,
  textLang,
}: {
  sex: Sex;
  share: Fraction;
  groups: PhenotypeGroup[];
  lang: Language;
  textLang: TextLanguage;
}) {
  const conditionalOf = (group: PhenotypeGroup): Fraction =>
    multiplyFractions(group.probability, fraction(share.den, share.num));
  return (
    <View style={styles.sexSection}>
      <View style={styles.sexHeader}>
        <Text style={styles.sexTitle}>{bi(SEX_LABELS[sex], lang)}</Text>
        <Text style={styles.sexShare}>{formatPercent(share)}</Text>
      </View>
      {groups.map((group, index) => {
        const conditional = conditionalOf(group);
        const width = Math.min(fractionToNumber(conditional) * 100, 100);
        return (
          <View key={index} style={styles.resultItem}>
            <View style={styles.resultLabelRow}>
              <Text style={styles.resultLabel}>{describePhenotypeGroup(group, textLang)}</Text>
              <Text style={styles.resultPercent}>{formatPercent(conditional)}</Text>
            </View>
            <View style={styles.resultBarBg}>
              <View style={[styles.resultBar, { width: `${width}%` }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function CalculatorScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const { t, language } = useLanguage();
  const lang = language;
  const textLang: TextLanguage = lang === 'ro' ? 'ro' : 'en';
  const plan = profile?.subscription_plan || 'trial';
  const limits = PLAN_LIMITS[plan];

  const [pigeons, setPigeons] = useState<RegistryPigeon[]>([]);
  const [sireId, setSireId] = useState<string | null>(null);
  const [damId, setDamId] = useState<string | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmedPhoto, setConfirmedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!limits.hasGeneticCalculator) return;
    (async () => {
      const { data, error: loadError } = await supabase
        .from('pigeons')
        .select('id, ring_series, color, sex, sire_id, dam_id, genotype')
        .order('ring_series');
      if (loadError) {
        setError(lang === 'ro' ? 'Registrul nu a putut fi încărcat. Încearcă din nou.' : 'The registry could not be loaded. Please try again.');
        return;
      }
      setPigeons((data as RegistryPigeon[]) || []);
    })();
  }, [limits.hasGeneticCalculator, lang]);

  if (!limits.hasGeneticCalculator) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ScreenHeader title={t('calcTitle')} subtitle={t('calcSub')} />
          <View style={styles.lockedContainer}>
            <View style={styles.lockedIcon}>
              <Crown color={Colors.royalBlue} size={40} />
            </View>
            <Text style={styles.lockedTitle}>{t('premiumFeature')}</Text>
            <Text style={styles.lockedSubtitle}>{t('calcPremiumMsg')}</Text>
            <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/(tabs)/profile')}>
              <Text style={styles.upgradeBtnText}>{t('seePlans')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const males = pigeons.filter((p) => sexFromRegistry(p.sex) === 'male');
  const females = pigeons.filter((p) => sexFromRegistry(p.sex) === 'female');
  const pigeonById = new Map(pigeons.map((p) => [p.id, p]));

  const handleCalculate = () => {
    setError(null);
    setResult(null);
    setConfirmedPhoto(null);

    const sire = sireId ? pigeonById.get(sireId) : undefined;
    const dam = damId ? pigeonById.get(damId) : undefined;
    if (!sire || !dam) return;

    const sireGenotype = readStoredGenotype(sire.genotype, 'male');
    const damGenotype = readStoredGenotype(dam.genotype, 'female');
    const problems: string[] = [];
    if (!sireGenotype.ok) problems.push(`${sire.ring_series} ${bi(GENOTYPE_ERRORS[sireGenotype.reason], lang)}`);
    if (!damGenotype.ok) problems.push(`${dam.ring_series} ${bi(GENOTYPE_ERRORS[damGenotype.reason], lang)}`);
    if (problems.length > 0) {
      setError(problems.join(' '));
      return;
    }
    if (!sireGenotype.ok || !damGenotype.ok) return;

    let outcomes: ReturnType<typeof offspringOutcomes>;
    try {
      outcomes = offspringOutcomes(sireGenotype.parent, damGenotype.parent);
    } catch {
      setError(lang === 'ro'
        ? 'Acești doi părinți nu pot avea descendenți viabili.'
        : 'These two parents cannot produce viable offspring.');
      return;
    }
    const groups = groupByPhenotype(outcomes);
    const sexShares = {
      male: outcomes.filter((o) => o.sex === 'male').reduce((sum, o) => addFractions(sum, o.probability), ZERO),
      female: outcomes.filter((o) => o.sex === 'female').reduce((sum, o) => addFractions(sum, o.probability), ZERO),
    };
    const inbreeding = computeInbreeding(buildPedigree(pigeons), sire.id, dam.id);
    setResult({ groups, sexShares, inbreeding });
  };

  const handleUploadChickPhoto = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!picked.canceled && picked.assets[0]) {
      setUploadingPhoto(true);
      setConfirmedPhoto(picked.assets[0].uri);
      setUploadingPhoto(false);
    }
  };

  const inbreedingPercent = result ? fractionToNumber(result.inbreeding.coefficient) * 100 : 0;
  const inbreedingLevel: Level = inbreedingPercent === 0
    ? 'green'
    : inbreedingPercent <= INBREEDING_LIMIT_PERCENT ? 'gold' : 'red';
  const levelStyle = LEVEL_STYLES[inbreedingLevel];
  const sharedAncestors = result
    ? result.inbreeding.sharedAncestorIds.map((id) => pigeonById.get(id)?.ring_series ?? id)
    : [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('genProTitle')} subtitle={t('genProSub')} showBack />

        <View style={styles.calcCard}>
          <View style={styles.calcIconRow}>
            <Dna color={Colors.royalBlue} size={22} />
            <Text style={styles.calcCardTitle}>{t('father')} / {t('mother')}</Text>
          </View>
          <RegistryPicker
            label={t('father')}
            pigeons={males}
            selectedId={sireId}
            onSelect={setSireId}
            placeholder={t('genProNoMales')}
            noGenotypeLabel={lang === 'ro' ? 'fără genotip' : 'no genotype'}
          />
          <RegistryPicker
            label={t('mother')}
            pigeons={females}
            selectedId={damId}
            onSelect={setDamId}
            placeholder={t('genProNoFemales')}
            noGenotypeLabel={lang === 'ro' ? 'fără genotip' : 'no genotype'}
          />
        </View>

        <TouchableOpacity
          style={[styles.calcButton, (!sireId || !damId) && styles.calcButtonDisabled]}
          onPress={handleCalculate}
          disabled={!sireId || !damId}
        >
          <Text style={styles.calcButtonText}>{t('genProCalculate')}</Text>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorCard}>
            <AlertTriangle color={Colors.error} size={18} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {result && (
          <View style={[styles.inbreedingCard, { backgroundColor: levelStyle.bg, borderColor: levelStyle.border }]}>
            <View style={styles.inbreedingHeader}>
              <View style={[styles.inbreedingIcon, { backgroundColor: levelStyle.border }]}>
                {inbreedingLevel === 'red' ? (
                  <AlertTriangle color={Colors.white} size={18} />
                ) : inbreedingLevel === 'gold' ? (
                  <ShieldCheck color={Colors.white} size={18} />
                ) : (
                  <Check color={Colors.white} size={18} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inbreedingTitle, { color: levelStyle.text }]}>{t('genProInbreeding')}</Text>
                <Text style={[styles.inbreedingCOI, { color: levelStyle.text }]}>
                  {t('genProCOI')}: {inbreedingPercent.toFixed(2)}%
                </Text>
              </View>
            </View>
            {result.inbreeding.cycleDetected && (
              <Text style={[styles.inbreedingNote, { color: levelStyle.text }]}>
                {lang === 'ro'
                  ? 'Pedigree-ul conține o buclă; rezultatul poate fi incomplet.'
                  : 'The pedigree contains a loop; the result may be incomplete.'}
              </Text>
            )}
            {result.inbreeding.truncated && (
              <Text style={[styles.inbreedingNote, { color: levelStyle.text }]}>
                {lang === 'ro'
                  ? 'Adâncimea pedigree-ului a fost limitată; strămoșii îndepărtați nu au fost luați în calcul.'
                  : 'The pedigree depth limit was reached; distant ancestors were not counted.'}
              </Text>
            )}
            {sharedAncestors.length > 0 && (
              <Text style={styles.commonAncestors}>
                {t('genProCommonAncestors')}: {sharedAncestors.join(', ')}
              </Text>
            )}
          </View>
        )}

        {result && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>{t('genProResults')}</Text>
            <SexResults
              sex="male"
              share={result.sexShares.male}
              groups={result.groups.filter((g) => g.sex === 'male')}
              lang={lang}
              textLang={textLang}
            />
            <SexResults
              sex="female"
              share={result.sexShares.female}
              groups={result.groups.filter((g) => g.sex === 'female')}
              lang={lang}
              textLang={textLang}
            />

            <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadChickPhoto} disabled={uploadingPhoto}>
              {uploadingPhoto ? (
                <ActivityIndicator color={Colors.royalBlue} size="small" />
              ) : (
                <Camera color={Colors.royalBlue} size={20} />
              )}
              <Text style={styles.uploadBtnText}>{t('genProUploadChick')}</Text>
            </TouchableOpacity>
            {confirmedPhoto && (
              <View style={styles.confirmedPhotoBox}>
                <Image source={{ uri: confirmedPhoto }} style={styles.confirmedPhoto} resizeMode="cover" />
                <Text style={styles.confirmedLabel}>{t('genProChickSaved')}</Text>
              </View>
            )}

            <Text style={styles.disclaimer}>{t('genProDisclaimer')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 40 },
  lockedContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 16, paddingHorizontal: 24 },
  lockedIcon: { width: 80, height: 80, borderRadius: 20, backgroundColor: Colors.royalBluePale, justifyContent: 'center', alignItems: 'center' },
  lockedTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.text },
  lockedSubtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  upgradeBtn: { backgroundColor: Colors.royalBlue, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  upgradeBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },

  calcCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 16,
    gap: 16,
  },
  calcIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calcCardTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },

  pickerContainer: { gap: 6 },
  pickerLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.text },
  pickerButton: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.neutral50, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  pickerValue: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.text, flex: 1 },
  pickerList: { backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginTop: 4, maxHeight: 200, zIndex: 10, elevation: 5 },
  pickerScroll: { maxHeight: 200 },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  pickerItemActive: { backgroundColor: Colors.royalBluePale },
  pickerItemText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.text, flex: 1 },
  pickerItemTextActive: { color: Colors.royalBlue, fontFamily: 'Inter-SemiBold' },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight, padding: 16, fontStyle: 'italic' },

  calcButton: { backgroundColor: Colors.royalBlue, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  calcButtonDisabled: { opacity: 0.6 },
  calcButtonText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },

  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorBg, borderRadius: 14, padding: 14, marginBottom: 16 },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error, flex: 1, lineHeight: 20 },

  inbreedingCard: { borderRadius: 16, padding: 18, borderWidth: 2, marginBottom: 16 },
  inbreedingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  inbreedingIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  inbreedingTitle: { fontFamily: 'Inter-Bold', fontSize: 15 },
  inbreedingCOI: { fontFamily: 'Inter-SemiBold', fontSize: 13, marginTop: 2 },
  inbreedingNote: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 20, marginTop: 4 },
  commonAncestors: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 8 },

  resultsCard: { backgroundColor: Colors.white, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 16, gap: 20 },
  resultsTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  sexSection: { gap: 12 },
  sexHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  sexTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.text },
  sexShare: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary },
  resultItem: { gap: 8 },
  resultLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  resultLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text, flex: 1, marginRight: 8, lineHeight: 20 },
  resultPercent: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.royalBlue },
  resultBarBg: { height: 8, backgroundColor: Colors.neutral100, borderRadius: 4, overflow: 'hidden' },
  resultBar: { height: '100%', backgroundColor: Colors.royalBlue, borderRadius: 4 },

  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.royalBluePale, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: Colors.royalBlue },
  uploadBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.royalBlue },
  confirmedPhotoBox: { alignItems: 'center', gap: 8 },
  confirmedPhoto: { width: 120, height: 120, borderRadius: 16, borderWidth: 2, borderColor: Colors.gold },
  confirmedLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.success },

  disclaimer: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight, fontStyle: 'italic' },
});
