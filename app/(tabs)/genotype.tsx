import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Check, AlertTriangle } from 'lucide-react-native';
import { LOCI, LOCUS_IDS, isLethal } from '@/lib/genetics-engine/loci';
import type { LocusDef, LocusId, Sex } from '@/lib/genetics-engine/loci';
import { describeGenotype, LOCUS_TITLES } from '@/lib/genetics-engine/describe';
import type { TextLanguage } from '@/lib/genetics-engine/describe';
import { readStoredGenotype, sexFromRegistry } from '@/lib/genetics-engine/registry';

type Draft = Record<LocusId, (string | null)[]>;

interface PigeonForEdit {
  id: string;
  ring_series: string;
  sex: Sex;
  genotype: unknown;
}

const COPY: Record<TextLanguage, Record<string, string>> = {
  ro: {
    title: 'Genotip',
    loadError: 'Porumbelul nu a putut fi încărcat.',
    unknownSex: 'Sexul porumbelului nu este cunoscut, genotipul nu poate fi editat.',
    chooseAllele: 'Alege alela',
    incomplete: 'Completează toate genele pentru a vedea descrierea.',
    invalid: 'Genotipul nu este valid.',
    lethal: 'Două copii de opal dominant sunt letale. Această combinație nu poate fi salvată.',
    preview: 'Ce arată porumbelul',
    save: 'Salvează genotipul',
    saving: 'Se salvează...',
    saved: 'Salvat',
    saveError: 'Genotipul nu a putut fi salvat. Încearcă din nou.',
    hensHint: 'Femelele au o singură alelă pe cromozomul Z.',
  },
  en: {
    title: 'Genotype',
    loadError: 'The pigeon could not be loaded.',
    unknownSex: 'The pigeon sex is not recognised, so its genotype cannot be edited.',
    chooseAllele: 'Choose allele',
    incomplete: 'Fill in every gene to see the description.',
    invalid: 'The genotype is not valid.',
    lethal: 'Two copies of dominant opal are lethal. This combination cannot be saved.',
    preview: 'What the pigeon shows',
    save: 'Save genotype',
    saving: 'Saving...',
    saved: 'Saved',
    saveError: 'The genotype could not be saved. Please try again.',
    hensHint: 'Hens carry one allele on the Z chromosome.',
  },
};

function slotCount(locus: LocusDef, sex: Sex): number {
  return locus.chromosome === 'Z' && sex === 'female' ? 1 : 2;
}

function emptyDraft(sex: Sex): Draft {
  return Object.fromEntries(
    LOCUS_IDS.map((id) => [id, Array<string | null>(slotCount(LOCI[id], sex)).fill(null)])
  ) as Draft;
}

function draftFromLoci(loci: Partial<Record<LocusId, readonly string[]>>, sex: Sex): Draft {
  const draft = emptyDraft(sex);
  for (const id of LOCUS_IDS) {
    const alleles = loci[id];
    if (alleles) draft[id] = [...alleles];
  }
  return draft;
}

export default function GenotypeEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { language } = useLanguage();
  const textLang: TextLanguage = language === 'ro' ? 'ro' : 'en';
  const copy = COPY[textLang];

  const [pigeon, setPigeon] = useState<PigeonForEdit | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from('pigeons')
        .select('id, ring_series, sex, genotype')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) {
        setLoadError(copy.loadError);
        setLoading(false);
        return;
      }
      const sex = sexFromRegistry(data.sex);
      if (!sex) {
        setLoadError(copy.unknownSex);
        setLoading(false);
        return;
      }
      const stored = readStoredGenotype(data.genotype, sex);
      setPigeon({ id: data.id, ring_series: data.ring_series, sex, genotype: data.genotype });
      setDraft(stored.ok ? draftFromLoci(stored.parent.loci, sex) : emptyDraft(sex));
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.royalBlue} />
      </View>
    );
  }

  if (!pigeon || !draft) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={copy.title} showBack />
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }

  const complete = LOCUS_IDS.every((locusId) => draft[locusId].every((allele) => allele !== null));
  const raw = Object.fromEntries(
    LOCUS_IDS.map((locusId) => [locusId, draft[locusId].filter((allele): allele is string => allele !== null)])
  );
  const parsed = complete ? readStoredGenotype(raw, pigeon.sex) : null;
  const valid = parsed?.ok ? parsed.parent : null;
  const lethalLocus = valid ? LOCUS_IDS.find((locusId) => isLethal(LOCI[locusId], valid.loci[locusId] ?? [])) : undefined;
  const validationError = parsed && !parsed.ok ? copy.invalid : lethalLocus ? copy.lethal : null;

  const setAllele = (locusId: LocusId, slot: number, allele: string) => {
    setSaved(false);
    setDraft((prev) => prev && {
      ...prev,
      [locusId]: prev[locusId].map((current, index) => (index === slot ? allele : current)),
    });
  };

  const handleSave = async () => {
    if (!valid || lethalLocus) return;
    setSaving(true);
    setSaveError(null);
    const { data, error } = await supabase
      .from('pigeons')
      .update({ genotype: valid.loci })
      .eq('id', pigeon.id)
      .select('id');
    setSaving(false);
    if (error || !data || data.length === 0) {
      setSaveError(copy.saveError);
      return;
    }
    setSaved(true);
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={copy.title} subtitle={pigeon.ring_series} showBack />

        {pigeon.sex === 'female' && <Text style={styles.hint}>{copy.hensHint}</Text>}

        {LOCUS_IDS.map((locusId) => {
          const locus = LOCI[locusId];
          return (
            <View key={locusId} style={styles.card}>
              <Text style={styles.locusTitle}>{LOCUS_TITLES[locusId][textLang]}</Text>
              {draft[locusId].map((selected, slot) => (
                <View key={slot} style={styles.slotBlock}>
                  <Text style={styles.slotLabel}>
                    {slot + 1} · {copy.chooseAllele}
                  </Text>
                  <View style={styles.chipRow}>
                    {locus.alleles.map((allele) => {
                      const active = selected === allele.code;
                      return (
                        <TouchableOpacity
                          key={allele.code}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setAllele(locusId, slot, allele.code)}
                        >
                          {active && <Check color={Colors.white} size={14} />}
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {allele[textLang]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>{copy.preview}</Text>
          <Text style={styles.previewText}>
            {valid ? describeGenotype(valid.loci, textLang) : copy.incomplete}
          </Text>
        </View>

        {validationError && (
          <View style={styles.errorCard}>
            <AlertTriangle color={Colors.error} size={18} />
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        )}
        {saveError && <Text style={styles.errorText}>{saveError}</Text>}

        <TouchableOpacity
          style={[styles.saveButton, (!valid || !!lethalLocus || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!valid || !!lethalLocus || saving}
        >
          <Text style={styles.saveButtonText}>{saving ? copy.saving : saved ? copy.saved : copy.save}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 40, gap: 16 },
  hint: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  locusTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  slotBlock: { gap: 8 },
  slotLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.textSecondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.neutral50,
  },
  chipActive: { backgroundColor: Colors.royalBlue, borderColor: Colors.royalBlue },
  chipText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.text },
  chipTextActive: { color: Colors.white },
  previewCard: {
    backgroundColor: Colors.royalBluePale,
    borderRadius: 18,
    padding: 20,
    gap: 8,
  },
  previewTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  previewText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text, lineHeight: 24 },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorBg, borderRadius: 14, padding: 14 },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error, flex: 1, lineHeight: 20 },
  saveButton: { backgroundColor: Colors.royalBlue, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },
});
