import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { PLAN_LIMITS } from '@/lib/types';
import type { Language } from '@/lib/i18n';
import { ScreenHeader } from '@/components/ScreenHeader';

type Bilingual = { ro: string; en: string };
const bi = (obj: Bilingual, lang: Language): string => lang === 'ro' ? obj.ro : obj.en;

type Selectable<T extends string> = { value: T; label: Bilingual };
import {
  Calculator,
  Crown,
  ChevronDown,
  Check,
  Dna,
  AlertTriangle,
  ShieldCheck,
  Camera,
  Eye,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import {
  ParentGenotype,
  OffspringResult,
  calculateOffspring,
  calculateInbreeding,
  findGeneticsAnswer,
  BASE_COLOR_NAMES,
  PATTERN_NAMES,
  EYE_COLOR_NAMES,
  BaseColor,
  Pattern,
  Dilution,
  Almond,
  Indigo,
  RecessiveRed,
  ToyStencil,
  Reduced,
  Slate,
  Kite,
  Spread,
  Crest,
  Muffs,
  EyeColor,
  InbreedingResult,
  LethalResult,
  PHENOTYPE_IMAGES,
  getPhenotypeImage,
} from '@/lib/genetics';

const BASE_OPTIONS: Selectable<BaseColor>[] = [
  { value: 'B', label: BASE_COLOR_NAMES.B },
  { value: 'BA', label: BASE_COLOR_NAMES.BA },
  { value: 'b', label: BASE_COLOR_NAMES.b },
];
const PATTERN_OPTIONS: Selectable<Pattern>[] = (['T-pattern', 'Checker', 'Bar', 'Barless'] as Pattern[]).map(p => ({
  value: p, label: PATTERN_NAMES[p],
}));
const DILUTION_OPTIONS: Selectable<Dilution>[] = [
  { value: 'normal', label: { ro: 'Normal', en: 'Normal' } },
  { value: 'dilute', label: { ro: 'Diluat', en: 'Dilute' } },
];
const ALMOND_OPTIONS: Selectable<Almond>[] = [
  { value: 'none', label: { ro: 'Nu', en: 'No' } },
  { value: 'almond', label: { ro: 'Almond (Migdală)', en: 'Almond' } },
  { value: 'de-roy', label: { ro: 'De Roy (Homozigot)', en: 'De Roy (Homozygous)' } },
];
const INDIGO_OPTIONS: Selectable<Indigo>[] = [
  { value: 'none', label: { ro: 'Nu', en: 'No' } },
  { value: 'hetero', label: { ro: 'Indigo (Heterozigot)', en: 'Indigo (Heterozygous)' } },
  { value: 'homo', label: { ro: 'Andaluzian (Homozigot)', en: 'Andalusian (Homozygous)' } },
];
const RR_OPTIONS: Selectable<RecessiveRed>[] = [
  { value: 'none', label: { ro: 'Nu', en: 'No' } },
  { value: 'carrier', label: { ro: 'Purtător', en: 'Carrier' } },
  { value: 'expressed', label: { ro: 'Exprimat (Roșu)', en: 'Expressed (Red)' } },
];
const TS_OPTIONS: Selectable<ToyStencil>[] = [
  { value: 'none', label: { ro: 'Nu', en: 'No' } },
  { value: 'hetero', label: { ro: 'Toy Stencil (Hetero)', en: 'Toy Stencil (Hetero)' } },
  { value: 'homo', label: { ro: 'Toy Stencil Extrem (Homo)', en: 'Extreme Toy Stencil (Homo)' } },
];
const REDUCED_OPTIONS: Selectable<Reduced>[] = [
  { value: 'none', label: { ro: 'Nu', en: 'No' } },
  { value: 'carrier', label: { ro: 'Purtător', en: 'Carrier' } },
  { value: 'expressed', label: { ro: 'Exprimat (Reduced)', en: 'Expressed (Reduced)' } },
];
const SLATE_OPTIONS: Selectable<Slate>[] = [
  { value: 'none', label: { ro: 'Nu', en: 'No' } },
  { value: 'carrier', label: { ro: 'Purtător', en: 'Carrier' } },
  { value: 'expressed', label: { ro: 'Exprimat (Slate)', en: 'Expressed (Slate)' } },
];
const KITE_OPTIONS: Selectable<Kite>[] = [
  { value: 'none', label: { ro: 'Nu', en: 'No' } },
  { value: 'present', label: { ro: 'Prezent', en: 'Present' } },
];
const SPREAD_OPTIONS: Selectable<Spread>[] = [
  { value: 'none', label: { ro: 'Nu', en: 'No' } },
  { value: 'present', label: { ro: 'Prezent (Spread)', en: 'Present (Spread)' } },
];
const CREST_OPTIONS: Selectable<Crest>[] = [
  { value: 'none', label: { ro: 'Nu', en: 'No' } },
  { value: 'carrier', label: { ro: 'Purtător', en: 'Carrier' } },
  { value: 'crested', label: { ro: 'Cu Moț', en: 'Crested' } },
];
const MUFFS_OPTIONS: Selectable<Muffs>[] = [
  { value: 'none', label: { ro: 'Nu', en: 'No' } },
  { value: 'present', label: { ro: 'Cu Picioare Plume', en: 'Muffed' } },
];
const EYE_OPTIONS: Selectable<EyeColor>[] = (['orange', 'pearl', 'bull', 'odd', 'crack'] as EyeColor[]).map(e => ({
  value: e, label: EYE_COLOR_NAMES[e],
}));

const RARITY_STYLES: Record<string, { bg: string; text: string; label: { ro: string; en: string } }> = {
  common: { bg: Colors.neutral100, text: Colors.textSecondary, label: { ro: 'Comun', en: 'Common' } },
  uncommon: { bg: Colors.royalBluePale, text: Colors.royalBlue, label: { ro: 'Mai rar', en: 'Uncommon' } },
  rare: { bg: Colors.goldPale, text: Colors.goldDark, label: { ro: 'Rar', en: 'Rare' } },
  'very-rare': { bg: Colors.errorBg, text: Colors.error, label: { ro: 'Foarte rar', en: 'Very Rare' } },
};

function GenotypeDropdown({
  label,
  value,
  options,
  onSelect,
  lang,
}: {
  label: string;
  value: string;
  options: Selectable<string>[];
  onSelect: (v: string) => void;
  lang: Language;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <TouchableOpacity style={styles.dropdownButton} onPress={() => setOpen(!open)}>
        <Text style={styles.dropdownValue}>
          {selected ? bi(selected.label, lang) : '—'}
        </Text>
        <ChevronDown color={Colors.royalBlue} size={18} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownList}>
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.dropdownItem, value === opt.value && styles.dropdownItemActive]}
                onPress={() => { onSelect(opt.value); setOpen(false); }}
              >
                <Text style={[styles.dropdownItemText, value === opt.value && styles.dropdownItemTextActive]}>
                  {bi(opt.label, lang)}
                </Text>
                {value === opt.value && <Check color={Colors.royalBlue} size={16} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function RegistryPicker({
  label,
  pigeons,
  selectedRing,
  onSelect,
  lang,
  placeholder,
}: {
  label: string;
  pigeons: { id: string; ring_series: string; color: string | null; sex: string }[];
  selectedRing: string | null;
  onSelect: (id: string, ring: string) => void;
  lang: Language;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <TouchableOpacity style={styles.dropdownButton} onPress={() => setOpen(!open)}>
        <Text style={styles.dropdownValue} numberOfLines={1}>
          {selectedRing || placeholder}
        </Text>
        <ChevronDown color={Colors.royalBlue} size={18} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownList}>
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
            {pigeons.length === 0 ? (
              <Text style={styles.emptyDropdownText}>{placeholder}</Text>
            ) : (
              pigeons.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.dropdownItem, selectedRing === p.ring_series && styles.dropdownItemActive]}
                  onPress={() => { onSelect(p.id, p.ring_series); setOpen(false); }}
                >
                  <Text style={[styles.dropdownItemText, selectedRing === p.ring_series && styles.dropdownItemTextActive]}>
                    {p.ring_series} {p.color ? `· ${p.color}` : ''}
                  </Text>
                  {selectedRing === p.ring_series && <Check color={Colors.royalBlue} size={16} />}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const DEFAULT_GENOTYPE: ParentGenotype = {
  base: 'B',
  baseCarrier: undefined,
  pattern: 'Bar',
  dilution: 'normal',
  almond: 'none',
  indigo: 'none',
  recessiveRed: 'none',
  toyStencil: 'none',
  reduced: 'none',
  slate: 'none',
  kite: 'none',
  spread: 'none',
  crest: 'none',
  muffs: 'none',
  eyeColor: 'orange',
  sex: 'male',
};

export default function CalculatorScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const { t, language } = useLanguage();
  const lang = language;
  const plan = profile?.subscription_plan || 'trial';
  const limits = PLAN_LIMITS[plan];

  const [mode, setMode] = useState<'manual' | 'registry'>('manual');
  const [sireGeno, setSireGeno] = useState<ParentGenotype>({ ...DEFAULT_GENOTYPE, sex: 'male' });
  const [damGeno, setDamGeno] = useState<ParentGenotype>({ ...DEFAULT_GENOTYPE, sex: 'female' });
  const [results, setResults] = useState<OffspringResult[] | null>(null);
  const [lethal, setLethal] = useState<LethalResult | null>(null);
  const [inbreeding, setInbreeding] = useState<InbreedingResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [pigeons, setPigeons] = useState<any[]>([]);
  const [sireId, setSireId] = useState<string | null>(null);
  const [damId, setDamId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmedPhoto, setConfirmedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'registry') {
      loadPigeons();
    }
  }, [mode]);

  const loadPigeons = async () => {
    const { data } = await supabase
      .from('pigeons')
      .select('id, ring_series, color, sex, sire_id, dam_id')
      .order('ring_series');
    setPigeons(data || []);
  };

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

  const updateSire = (field: keyof ParentGenotype, value: any) =>
    setSireGeno(prev => ({ ...prev, [field]: value }));
  const updateDam = (field: keyof ParentGenotype, value: any) =>
    setDamGeno(prev => ({ ...prev, [field]: value }));

  const handleCalculate = async () => {
    setCalculating(true);
    setResults(null);
    setLethal(null);
    setInbreeding(null);
    setConfirmedPhoto(null);

    // If registry mode, build genotype from pigeon data
    let sGeno = sireGeno;
    let dGeno = damGeno;

    if (mode === 'registry' && sireId && damId) {
      // Try to infer genotypes from color string
      sGeno = inferGenotypeFromColor(pigeons.find(p => p.id === sireId)?.color, 'male');
      dGeno = inferGenotypeFromColor(pigeons.find(p => p.id === damId)?.color, 'female');

      // Calculate inbreeding from pedigree
      const sireTree = await buildPedigreeTree(sireId, 8);
      const damTree = await buildPedigreeTree(damId, 8);
      const coi = calculateInbreeding(sireTree, damTree);
      setInbreeding(coi);
    }

    const { results: res, lethal: let_ } = calculateOffspring(sGeno, dGeno, lang);
    setResults(res);
    setLethal(let_);
    setCalculating(false);
  };

  const handleUploadChickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingPhoto(true);
      setConfirmedPhoto(result.assets[0].uri);
      setUploadingPhoto(false);
      Alert.alert(t('genProChickSaved'));
    }
  };

  const inbreedingColors: Record<string, { bg: string; border: string; text: string }> = {
    green: { bg: Colors.successBg, border: Colors.success, text: Colors.success },
    gold: { bg: Colors.warningBg, border: Colors.warning, text: Colors.warning },
    red: { bg: Colors.errorBg, border: Colors.error, text: Colors.error },
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('genProTitle')} subtitle={t('genProSub')} showBack />

        {/* Mode selector */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
            onPress={() => setMode('manual')}
          >
            <Calculator color={mode === 'manual' ? Colors.white : Colors.royalBlue} size={18} />
            <Text style={[styles.modeBtnText, mode === 'manual' && styles.modeBtnTextActive]}>
              {t('genProModeColors')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'registry' && styles.modeBtnActive]}
            onPress={() => setMode('registry')}
          >
            <Dna color={mode === 'registry' ? Colors.white : Colors.royalBlue} size={18} />
            <Text style={[styles.modeBtnText, mode === 'registry' && styles.modeBtnTextActive]}>
              {t('genProModeRegistry')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Registry mode */}
        {mode === 'registry' && (
          <View style={styles.calcCard}>
            <RegistryPicker
              label={t('father')}
              pigeons={pigeons.filter(p => p.sex === 'Mascul')}
              selectedRing={pigeons.find(p => p.id === sireId)?.ring_series || null}
              onSelect={(id) => setSireId(id)}
              lang={lang}
              placeholder={t('genProNoMales')}
            />
            <RegistryPicker
              label={t('mother')}
              pigeons={pigeons.filter(p => p.sex === 'Femelă')}
              selectedRing={pigeons.find(p => p.id === damId)?.ring_series || null}
              onSelect={(id) => setDamId(id)}
              lang={lang}
              placeholder={t('genProNoFemales')}
            />
            <Text style={styles.registryHint}>
              {lang === 'ro'
                ? 'Selectează masculul și femela din registru. Aplicația va analiza pedigree-ul pe 8 generații pentru a calcula consangvinitatea.'
                : 'Select male and female from registry. The app will analyze 8-generation pedigree to calculate inbreeding.'}
            </Text>
          </View>
        )}

        {/* Manual mode - genotype selectors */}
        {mode === 'manual' && (
          <View style={styles.calcCard}>
            <View style={styles.calcIconRow}>
              <Dna color={Colors.royalBlue} size={22} />
              <Text style={styles.calcCardTitle}>{t('father')} — {t('genProMale')}</Text>
            </View>
            <View style={styles.genotypeGrid}>
              <GenotypeDropdown label={t('genProBaseColor')} value={sireGeno.base} options={BASE_OPTIONS as any} onSelect={(v) => updateSire('base', v)} lang={lang} />
              <GenotypeDropdown label={t('genProPattern')} value={sireGeno.pattern} options={PATTERN_OPTIONS as any} onSelect={(v) => updateSire('pattern', v)} lang={lang} />
              <GenotypeDropdown label={t('genProDilution')} value={sireGeno.dilution} options={DILUTION_OPTIONS as any} onSelect={(v) => updateSire('dilution', v)} lang={lang} />
              <GenotypeDropdown label={t('genProAlmond')} value={sireGeno.almond} options={ALMOND_OPTIONS as any} onSelect={(v) => updateSire('almond', v)} lang={lang} />
              <GenotypeDropdown label={t('genProIndigo')} value={sireGeno.indigo} options={INDIGO_OPTIONS as any} onSelect={(v) => updateSire('indigo', v)} lang={lang} />
              <GenotypeDropdown label={t('genProRecessiveRed')} value={sireGeno.recessiveRed} options={RR_OPTIONS as any} onSelect={(v) => updateSire('recessiveRed', v)} lang={lang} />
            </View>

            <TouchableOpacity style={styles.advancedToggle} onPress={() => setShowAdvanced(!showAdvanced)}>
              <Text style={styles.advancedToggleText}>
                {showAdvanced
                  ? (lang === 'ro' ? '− Ascunde gene avansate' : '− Hide advanced genes')
                  : (lang === 'ro' ? '+ Arată gene avansate (Toy Stencil, Reduced, Slate, Kite, Spread, Moț, Muffs, Ochi)' : '+ Show advanced genes')}
              </Text>
            </TouchableOpacity>

            {showAdvanced && (
              <View style={styles.genotypeGrid}>
                <GenotypeDropdown label={t('genProToyStencil')} value={sireGeno.toyStencil} options={TS_OPTIONS as any} onSelect={(v) => updateSire('toyStencil', v)} lang={lang} />
                <GenotypeDropdown label={t('genProReduced')} value={sireGeno.reduced} options={REDUCED_OPTIONS as any} onSelect={(v) => updateSire('reduced', v)} lang={lang} />
                <GenotypeDropdown label={t('genProSlate')} value={sireGeno.slate} options={SLATE_OPTIONS as any} onSelect={(v) => updateSire('slate', v)} lang={lang} />
                <GenotypeDropdown label={t('genProKite')} value={sireGeno.kite} options={KITE_OPTIONS as any} onSelect={(v) => updateSire('kite', v)} lang={lang} />
                <GenotypeDropdown label={t('genProSpread')} value={sireGeno.spread} options={SPREAD_OPTIONS as any} onSelect={(v) => updateSire('spread', v)} lang={lang} />
                <GenotypeDropdown label={t('genProCrest')} value={sireGeno.crest} options={CREST_OPTIONS as any} onSelect={(v) => updateSire('crest', v)} lang={lang} />
                <GenotypeDropdown label={t('genProMuffs')} value={sireGeno.muffs} options={MUFFS_OPTIONS as any} onSelect={(v) => updateSire('muffs', v)} lang={lang} />
                <GenotypeDropdown label={t('genProEyeColor')} value={sireGeno.eyeColor} options={EYE_OPTIONS as any} onSelect={(v) => updateSire('eyeColor', v)} lang={lang} />
              </View>
            )}

            {/* Divider */}
            <View style={styles.parentsDivider} />

            <View style={styles.calcIconRow}>
              <Dna color={Colors.gold} size={22} />
              <Text style={styles.calcCardTitle}>{t('mother')} — {t('genProFemale')}</Text>
            </View>
            <View style={styles.genotypeGrid}>
              <GenotypeDropdown label={t('genProBaseColor')} value={damGeno.base} options={BASE_OPTIONS as any} onSelect={(v) => updateDam('base', v)} lang={lang} />
              <GenotypeDropdown label={t('genProPattern')} value={damGeno.pattern} options={PATTERN_OPTIONS as any} onSelect={(v) => updateDam('pattern', v)} lang={lang} />
              <GenotypeDropdown label={t('genProDilution')} value={damGeno.dilution} options={DILUTION_OPTIONS as any} onSelect={(v) => updateDam('dilution', v)} lang={lang} />
              <GenotypeDropdown label={t('genProAlmond')} value={damGeno.almond} options={ALMOND_OPTIONS as any} onSelect={(v) => updateDam('almond', v)} lang={lang} />
              <GenotypeDropdown label={t('genProIndigo')} value={damGeno.indigo} options={INDIGO_OPTIONS as any} onSelect={(v) => updateDam('indigo', v)} lang={lang} />
              <GenotypeDropdown label={t('genProRecessiveRed')} value={damGeno.recessiveRed} options={RR_OPTIONS as any} onSelect={(v) => updateDam('recessiveRed', v)} lang={lang} />
            </View>

            {showAdvanced && (
              <View style={styles.genotypeGrid}>
                <GenotypeDropdown label={t('genProToyStencil')} value={damGeno.toyStencil} options={TS_OPTIONS as any} onSelect={(v) => updateDam('toyStencil', v)} lang={lang} />
                <GenotypeDropdown label={t('genProReduced')} value={damGeno.reduced} options={REDUCED_OPTIONS as any} onSelect={(v) => updateDam('reduced', v)} lang={lang} />
                <GenotypeDropdown label={t('genProSlate')} value={damGeno.slate} options={SLATE_OPTIONS as any} onSelect={(v) => updateDam('slate', v)} lang={lang} />
                <GenotypeDropdown label={t('genProKite')} value={damGeno.kite} options={KITE_OPTIONS as any} onSelect={(v) => updateDam('kite', v)} lang={lang} />
                <GenotypeDropdown label={t('genProSpread')} value={damGeno.spread} options={SPREAD_OPTIONS as any} onSelect={(v) => updateDam('spread', v)} lang={lang} />
                <GenotypeDropdown label={t('genProCrest')} value={damGeno.crest} options={CREST_OPTIONS as any} onSelect={(v) => updateDam('crest', v)} lang={lang} />
                <GenotypeDropdown label={t('genProMuffs')} value={damGeno.muffs} options={MUFFS_OPTIONS as any} onSelect={(v) => updateDam('muffs', v)} lang={lang} />
                <GenotypeDropdown label={t('genProEyeColor')} value={damGeno.eyeColor} options={EYE_OPTIONS as any} onSelect={(v) => updateDam('eyeColor', v)} lang={lang} />
              </View>
            )}
          </View>
        )}

        {/* Calculate button */}
        <TouchableOpacity
          style={[styles.calcButton, calculating && styles.calcButtonDisabled]}
          onPress={handleCalculate}
          disabled={calculating || (mode === 'registry' && (!sireId || !damId))}
        >
          {calculating ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.calcButtonText}>{t('genProCalculate')}</Text>
          )}
        </TouchableOpacity>

        {/* Inbreeding alert */}
        {inbreeding && (
          <View style={[styles.inbreedingCard, { backgroundColor: inbreedingColors[inbreeding.color].bg, borderColor: inbreedingColors[inbreeding.color].border }]}>
            <View style={styles.inbreedingHeader}>
              <View style={[styles.inbreedingIcon, { backgroundColor: inbreedingColors[inbreeding.color].border }]}>
                {inbreeding.color === 'red' ? (
                  <AlertTriangle color={Colors.white} size={18} />
                ) : inbreeding.color === 'gold' ? (
                  <ShieldCheck color={Colors.white} size={18} />
                ) : (
                  <Check color={Colors.white} size={18} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inbreedingTitle, { color: inbreedingColors[inbreeding.color].text }]}>
                  {t('genProInbreeding')} · {bi(inbreeding.relationship, lang)}
                </Text>
                <Text style={[styles.inbreedingCOI, { color: inbreedingColors[inbreeding.color].text }]}>
                  {t('genProCOI')}: {inbreeding.coefficient}%
                </Text>
              </View>
            </View>
            {inbreeding.warning && (
              <Text style={[styles.inbreedingWarning, { color: inbreedingColors[inbreeding.color].text }]}>
                {bi(inbreeding.warning, lang)}
              </Text>
            )}
            {inbreeding.commonAncestors.length > 0 && (
              <Text style={styles.commonAncestors}>
                {t('genProCommonAncestors')}: {inbreeding.commonAncestors.join(', ')}
              </Text>
            )}
          </View>
        )}

        {/* Lethal mutation alert */}
        {lethal && lethal.detected && (
          <View style={styles.lethalCard}>
            <View style={styles.lethalHeader}>
              <AlertTriangle color={Colors.white} size={22} />
              <Text style={styles.lethalTitle}>{t('genProLethalDetected')}</Text>
            </View>
            <Text style={styles.lethalText}>{bi(lethal.warning!, lang)}</Text>
          </View>
        )}

        {/* Results */}
        {results && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>{t('genProResults')}</Text>
            {lethal && !lethal.detected && (
              <View style={styles.noLethalBadge}>
                <ShieldCheck color={Colors.success} size={14} />
                <Text style={styles.noLethalText}>{t('genProNoLethal')}</Text>
              </View>
            )}
            <View style={styles.resultsList}>
              {results.map((r, i) => {
                const rarityStyle = RARITY_STYLES[r.rarity];
                const imgKey = r.imageKey;
                const imgPath = imgKey ? getPhenotypeImage(imgKey) : null;
                return (
                  <View key={i} style={styles.resultItem}>
                    <View style={styles.resultImageRow}>
                      {imgPath && (
                        <Image source={{ uri: imgPath }} style={styles.resultImage} resizeMode="cover" />
                      )}
                      <View style={{ flex: 1 }}>
                        <View style={styles.resultLabelRow}>
                          <Text style={styles.resultLabel}>{bi(r.label, lang)}</Text>
                          <Text style={styles.resultPercent}>{r.percentage.toFixed(0)}%</Text>
                        </View>
                        <Text style={styles.resultDesc}>{bi(r.description, lang)}</Text>
                        <View style={[styles.rarityBadge, { backgroundColor: rarityStyle.bg }]}>
                          <Text style={[styles.rarityText, { color: rarityStyle.text }]}>
                            {bi(rarityStyle.label, lang)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.resultBarBg}>
                      <View style={[styles.resultBar, { width: `${Math.min(r.percentage, 100)}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Upload chick photo */}
            <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadChickPhoto}>
              <Camera color={Colors.royalBlue} size={20} />
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

// === HELPERS ===

function inferGenotypeFromColor(colorStr: string | null | undefined, sex: 'male' | 'female'): ParentGenotype {
  const base: ParentGenotype = { ...DEFAULT_GENOTYPE, sex };
  if (!colorStr) return base;
  const lower = colorStr.toLowerCase();

  if (lower.includes('almond') || lower.includes('migdal')) base.almond = 'almond';
  if (lower.includes('de roy') || lower.includes('deroy')) base.almond = 'de-roy';
  if (lower.includes('indigo')) base.indigo = 'hetero';
  if (lower.includes('andaluzian') || lower.includes('andalusian')) base.indigo = 'homo';
  if (lower.includes('roșu recesiv') || lower.includes('recessive red') || lower.includes('rosu recesiv')) base.recessiveRed = 'expressed';
  if (lower.includes('stencil') || lower.includes('toy')) base.toyStencil = 'hetero';
  if (lower.includes('reduced') || lower.includes('reduct') || lower.includes('redus')) base.reduced = 'expressed';
  if (lower.includes('slate') || lower.includes('ardezie')) base.slate = 'expressed';
  if (lower.includes('kite') || lower.includes('tăciune') || lower.includes('taciune')) base.kite = 'present';
  if (lower.includes('spread') || lower.includes('negru solid') || lower.includes('solid black')) base.spread = 'present';
  if (lower.includes('moț') || lower.includes('mot') || lower.includes('crest')) base.crest = 'crested';
  if (lower.includes('muff') || lower.includes('încălț') || lower.includes('incaltz') || lower.includes('plume')) base.muffs = 'present';
  if (lower.includes('bull') || lower.includes('negru ochi')) base.eyeColor = 'bull';
  if (lower.includes('pearl') || lower.includes('perlat')) base.eyeColor = 'pearl';
  if (lower.includes('odd') || lower.includes('sparți') || lower.includes('sparit')) base.eyeColor = 'odd';

  if (lower.includes('maro') || lower.includes('brown')) base.base = 'b';
  else if (lower.includes('roșu cenușiu') || lower.includes('ash red') || lower.includes('rosu cenusiu') || lower.includes('cenușiu roșu')) base.base = 'BA';
  else base.base = 'B';

  if (lower.includes('diluat') || lower.includes('dilute') || lower.includes('argintiu') || lower.includes('silver') || lower.includes('galben') || lower.includes('yellow') || lower.includes('kaki') || lower.includes('khaki')) base.dilution = 'dilute';

  if (lower.includes('tablă') || lower.includes('checker')) base.pattern = 'Checker';
  else if (lower.includes('fără bare') || lower.includes('barless')) base.pattern = 'Barless';
  else if (lower.includes('tip t') || lower.includes('t-pattern') || lower.includes('tpattern')) base.pattern = 'T-pattern';
  else base.pattern = 'Bar';

  return base;
}

async function buildPedigreeTree(pigeonId: string, generations: number): Promise<any> {
  const fetchPigeon = async (pid: string): Promise<any> => {
    const { data } = await supabase.from('pigeons').select('id, ring_series, sire_id, dam_id').eq('id', pid).maybeSingle();
    return data;
  };

  const build = async (pid: string | null, gen: number): Promise<any> => {
    if (!pid || gen > generations) return null;
    const p = await fetchPigeon(pid);
    if (!p) return null;
    return {
      id: p.id,
      ring: p.ring_series,
      sire_id: p.sire_id,
      dam_id: p.dam_id,
      sire: await build(p.sire_id, gen + 1),
      dam: await build(p.dam_id, gen + 1),
      gen,
    };
  };

  return build(pigeonId, 0);
}

// === STYLES ===
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 40 },
  lockedContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 16, paddingHorizontal: 24 },
  lockedIcon: { width: 80, height: 80, borderRadius: 20, backgroundColor: Colors.royalBluePale, justifyContent: 'center', alignItems: 'center' },
  lockedTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.text },
  lockedSubtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  upgradeBtn: { backgroundColor: Colors.royalBlue, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  upgradeBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },

  modeSelector: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  modeBtnActive: { backgroundColor: Colors.royalBlue, borderColor: Colors.royalBlue },
  modeBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  modeBtnTextActive: { color: Colors.white },

  calcCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 16,
  },
  calcIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  calcCardTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  genotypeGrid: { gap: 12 },
  parentsDivider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 16 },
  advancedToggle: { marginTop: 8, paddingVertical: 8 },
  advancedToggleText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue, textAlign: 'center' },
  registryHint: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 8, fontStyle: 'italic' },

  dropdownContainer: { gap: 6 },
  dropdownLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.text },
  dropdownButton: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.neutral50, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  dropdownValue: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.text, flex: 1 },
  dropdownList: { backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginTop: 4, maxHeight: 200, zIndex: 10, elevation: 5 },
  dropdownScroll: { maxHeight: 200 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  dropdownItemActive: { backgroundColor: Colors.royalBluePale },
  dropdownItemText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.text },
  dropdownItemTextActive: { color: Colors.royalBlue, fontFamily: 'Inter-SemiBold' },
  emptyDropdownText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight, padding: 16, fontStyle: 'italic' },

  calcButton: { backgroundColor: Colors.royalBlue, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  calcButtonDisabled: { opacity: 0.6 },
  calcButtonText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },

  inbreedingCard: { borderRadius: 16, padding: 18, borderWidth: 2, marginBottom: 16 },
  inbreedingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  inbreedingIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  inbreedingTitle: { fontFamily: 'Inter-Bold', fontSize: 15 },
  inbreedingCOI: { fontFamily: 'Inter-SemiBold', fontSize: 13, marginTop: 2 },
  inbreedingWarning: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 20 },
  commonAncestors: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 8 },

  lethalCard: { backgroundColor: Colors.error, borderRadius: 16, padding: 18, marginBottom: 16 },
  lethalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  lethalTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },
  lethalText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.white, lineHeight: 20 },

  resultsCard: { backgroundColor: Colors.white, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 16 },
  resultsTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text, marginBottom: 8 },
  noLethalBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.successBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 16 },
  noLethalText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.success },
  resultsList: { gap: 16 },
  resultItem: { gap: 8 },
  resultImageRow: { flexDirection: 'row', gap: 12 },
  resultImage: { width: 72, height: 72, borderRadius: 12, borderWidth: 1, borderColor: Colors.gold },
  resultLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  resultLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text, flex: 1, marginRight: 8 },
  resultPercent: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.royalBlue },
  resultDesc: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 17 },
  rarityBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  rarityText: { fontFamily: 'Inter-SemiBold', fontSize: 10 },
  resultBarBg: { height: 8, backgroundColor: Colors.neutral100, borderRadius: 4, overflow: 'hidden' },
  resultBar: { height: '100%', backgroundColor: Colors.royalBlue, borderRadius: 4 },

  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.royalBluePale, borderRadius: 14, paddingVertical: 14, marginTop: 16, borderWidth: 1, borderColor: Colors.royalBlue },
  uploadBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.royalBlue },
  confirmedPhotoBox: { alignItems: 'center', marginTop: 12 },
  confirmedPhoto: { width: 120, height: 120, borderRadius: 16, borderWidth: 2, borderColor: Colors.gold },
  confirmedLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.success, marginTop: 8 },

  disclaimer: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight, marginTop: 16, fontStyle: 'italic' },
});
