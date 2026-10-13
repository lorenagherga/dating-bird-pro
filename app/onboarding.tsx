import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows } from '@/lib/theme';
import type { PigeonType } from '@/lib/types';
import { Bird, Trophy, Sparkles, Check, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface OptionCard {
  type: PigeonType;
  title: string;
  description: string;
  icon: typeof Bird;
  features: string[];
}

const ro = {
  title: 'Ce fel de porumbei aveți?',
  subtitle: 'Selectează categoria pentru a personaliza aplicația',
  continue: 'Continuă',
  hint: 'Poți modifica această opțiune mai târziu din secțiunea Profil',
  racing: { title: 'Porumbei Voiajori', desc: 'Sport · Concursuri de distanță', features: ['Management concursuri', 'Clasări și coeficienți FCI', 'Meteo traseu', 'Registru complet'] },
  fancy: { title: 'Porumbei de Agrement', desc: 'Ornament · Zbor-Joc (Tippleri, Jucători)', features: ['Frumusețe și pedigree', 'Linii de sânge / joc', 'Tratamente și sănătate', 'Asistent AI specializat'] },
  both: { title: 'Ambele categorii', desc: 'Voiajori + Agrement · Toate modulele', features: ['Absolut toate funcțiile', 'Organizare separată pe linii', 'Concursuri + Frumusețe', 'Maximum de flexibilitate'] },
};

const en = {
  title: 'What kind of pigeons do you have?',
  subtitle: 'Select a category to personalize the app',
  continue: 'Continue',
  hint: 'You can change this option later in the Profile section',
  racing: { title: 'Racing Pigeons', desc: 'Sport · Distance racing', features: ['Race management', 'FCI rankings & coefficients', 'Route weather', 'Full registry'] },
  fancy: { title: 'Fancy Pigeons', desc: 'Ornament · Flying (Tipplers, Rollers)', features: ['Beauty & pedigree', 'Bloodlines / flying style', 'Treatments & health', 'Specialized AI assistant'] },
  both: { title: 'Both categories', desc: 'Racing + Fancy · All modules', features: ['Absolutely all features', 'Separate organization by line', 'Racing + Beauty', 'Maximum flexibility'] },
};

export default function OnboardingScreen() {
  const { setPigeonType } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const [selected, setSelected] = useState<PigeonType | null>(null);
  const [saving, setSaving] = useState(false);

  const L = language === 'ro' ? ro : en;

  const options: OptionCard[] = [
    { type: 'racing', title: L.racing.title, description: L.racing.desc, icon: Trophy, features: L.racing.features },
    { type: 'fancy', title: L.fancy.title, description: L.fancy.desc, icon: Sparkles, features: L.fancy.features },
    { type: 'both', title: L.both.title, description: L.both.desc, icon: Bird, features: L.both.features },
  ];

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    await setPigeonType(selected);
    setSaving(false);
    router.replace('/(tabs)');
  };

  return (
    <LinearGradient
      colors={[Colors.royalBlueDark, Colors.royalBlue, Colors.royalBlueLight]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Bird color={Colors.white} size={32} />
            </View>
            <Text style={styles.title}>{L.title}</Text>
            <Text style={styles.subtitle}>{L.subtitle}</Text>
          </View>

          <View style={styles.optionsContainer}>
            {options.map((option) => {
              const isSelected = selected === option.type;
              const Icon = option.icon;
              return (
                <TouchableOpacity
                  key={option.type}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() => setSelected(option.type)}
                  activeOpacity={0.75}
                >
                  <View style={styles.optionHeader}>
                    <View style={[styles.optionIconBox, isSelected && styles.optionIconBoxSelected]}>
                      <Icon
                        color={isSelected ? Colors.white : Colors.goldLight}
                        size={26}
                      />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>{option.title}</Text>
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    </View>
                    <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                      {isSelected && <Check color={Colors.white} size={16} />}
                    </View>
                  </View>

                  {isSelected && (
                    <View style={styles.featuresContainer}>
                      {option.features.map((feat, i) => (
                        <View key={i} style={styles.featureRow}>
                          <View style={styles.featureDot} />
                          <Text style={styles.featureText}>{feat}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.confirmButton, !selected && styles.confirmButtonDisabled, saving && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={!selected || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={Colors.royalBlueDark} />
            ) : (
              <>
                <Text style={styles.confirmButtonText}>{L.continue}</Text>
                <ArrowRight color={Colors.royalBlueDark} size={20} />
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>{L.hint}</Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'web' ? 20 : 40,
    marginBottom: 36,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 26,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 14,
    marginBottom: 28,
  },
  optionCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  optionCardSelected: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconBoxSelected: {
    backgroundColor: Colors.gold,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: Colors.white,
    marginBottom: 2,
  },
  optionDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  radioButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold,
  },
  featuresContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gold,
  },
  featureText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
    ...Shadows.button,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: Colors.royalBlueDark,
    letterSpacing: 0.3,
  },
  hint: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },
});
