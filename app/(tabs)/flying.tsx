import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Wind, RotateCw, ChevronsUp, Sparkles, Check } from 'lucide-react-native';

type FlyingLang = 'ro' | 'en';

const COPY: Record<FlyingLang, {
  title: string;
  subtitle: string;
  intro: string;
  typesTitle: string;
  criteriaTitle: string;
  criteria: string[];
  disclaimer: string;
}> = {
  ro: {
    title: 'Zbor & Performanță',
    subtitle: 'Tipleri, rolleri, zboruri de performanță',
    intro: 'Porumbeii de zbor sportiv (fancy) sunt crescuți pentru manevre spectaculoase în aer. Mai jos sunt principalele tipuri de zbor și ce se urmărește la fiecare.',
    typesTitle: 'Tipuri de zbor',
    criteriaTitle: 'Ce urmărim la un zbor bun',
    criteria: [
      'Control și stabilitate în grup',
      'Răspuns rapid la comenzile conducătorului',
      'Durată și consistență a manevrelor',
      'Revenire sigură la porumbelar',
    ],
    disclaimer: 'Definițiile și criteriile variază între cluburi. Verificați regulamentul clubului dumneavoastră.',
  },
  en: {
    title: 'Flying & Performance',
    subtitle: 'Tipplers, rollers, performance flying',
    intro: 'Fancy flying pigeons are bred for spectacular manoeuvres in the air. Below are the main flying types and what is looked for in each.',
    typesTitle: 'Flying types',
    criteriaTitle: 'What a good flight looks like',
    criteria: [
      'Control and stability within the group',
      'Quick response to the handler',
      'Duration and consistency of manoeuvres',
      'Safe return to the loft',
    ],
    disclaimer: 'Definitions and criteria vary between clubs. Check your club rules.',
  },
};

const FLYING_TYPES: {
  id: string;
  icon: typeof Wind;
  title: Record<FlyingLang, string>;
  description: Record<FlyingLang, string>;
}[] = [
  {
    id: 'tipplers',
    icon: Wind,
    title: { ro: 'Tipleri', en: 'Tipplers' },
    description: {
      ro: 'Zboară în grup la altitudine și execută căderi bruște, urmate de revenire rapidă în zbor. Se apreciază ritmul și controlul căderilor.',
      en: 'Fly in a group at height and make sudden drops, followed by a quick recovery. Rhythm and control of the drops are judged.',
    },
  },
  {
    id: 'rollers',
    icon: RotateCw,
    title: { ro: 'Rolleri', en: 'Rollers' },
    description: {
      ro: 'Execută rostogoliri în aer, în serii scurte, fără să piardă altitudinea. Se apreciază numărul de rostogoliri și continuitatea.',
      en: 'Perform rolling somersaults in short series without losing height. Number of rolls and continuity are valued.',
    },
  },
  {
    id: 'high-flyers',
    icon: ChevronsUp,
    title: { ro: 'Zburători înalți', en: 'High flyers' },
    description: {
      ro: 'Urcă la altitudine mare și rămân în zbor susținut, de regulă în cerc. Se apreciază durata și stabilitatea zborului.',
      en: 'Climb to great height and stay in sustained flight, usually circling. Duration and steadiness are valued.',
    },
  },
  {
    id: 'tumblers',
    icon: Sparkles,
    title: { ro: 'Culbutanți', en: 'Tumblers' },
    description: {
      ro: 'Execută culbuturi înapoi în zbor. Se apreciază curățenia și frecvența culbuturilor.',
      en: 'Perform backward somersaults in flight. Cleanness and frequency of the flips are valued.',
    },
  },
];

export default function FlyingScreen() {
  const { language } = useLanguage();
  const lang: FlyingLang = language === 'ro' ? 'ro' : 'en';
  const copy = COPY[lang];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={copy.title} subtitle={copy.subtitle} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{copy.intro}</Text>

        <Text style={styles.sectionTitle}>{copy.typesTitle}</Text>
        {FLYING_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <View key={type.id} style={styles.card}>
              <View style={styles.iconBox}>
                <Icon color={Colors.royalBlue} size={20} strokeWidth={2} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{type.title[lang]}</Text>
                <Text style={styles.cardText}>{type.description[lang]}</Text>
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>{copy.criteriaTitle}</Text>
        <View style={styles.criteriaCard}>
          {copy.criteria.map((item) => (
            <View key={item} style={styles.criteriaRow}>
              <Check color={Colors.royalBlue} size={16} strokeWidth={2.5} />
              <Text style={styles.criteriaText}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.disclaimer}>{copy.disclaimer}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 40, gap: 16 },
  intro: { fontFamily: 'Inter-Regular', fontSize: 15, lineHeight: 22, color: Colors.textSecondary },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text, marginTop: 8 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text },
  cardText: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
  criteriaCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  criteriaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  criteriaText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21, color: Colors.text },
  disclaimer: { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 18, color: Colors.textSecondary },
});
