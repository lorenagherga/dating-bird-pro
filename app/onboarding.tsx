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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import type { PigeonCategory } from '@/lib/types';
import { Bird, Trophy, Sparkles, Check, ArrowRight, Zap, Award, Crown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface CategoryOption {
  key: PigeonCategory;
  titleKey: string;
  descKey: string;
  icon: typeof Trophy;
}

export default function OnboardingScreen() {
  const { setPigeonCategories } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<PigeonCategory>>(new Set());
  const [saving, setSaving] = useState(false);

  const options: CategoryOption[] = [
    { key: 'racing_speed', titleKey: 'onbSpeed', descKey: 'onbSpeedDesc', icon: Zap },
    { key: 'racing_endurance', titleKey: 'onbEndurance', descKey: 'onbEnduranceDesc', icon: Trophy },
    { key: 'fancy_exhibition', titleKey: 'onbExhibition', descKey: 'onbExhibitionDesc', icon: Crown },
    { key: 'fancy_flying', titleKey: 'onbFlying', descKey: 'onbFlyingDesc', icon: Sparkles },
  ];

  const toggleCategory = (key: PigeonCategory) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selected.size === 0) {
      Alert.alert(t('error'), t('onbSelectAtLeast'));
      return;
    }
    setSaving(true);
    const categories = Array.from(selected);
    await setPigeonCategories(categories);
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
            <Text style={styles.welcomeText}>{t('onbWelcome').split('\n').map((line, i) => <Text key={i}>{i > 0 && '\n'}{line}</Text>)}</Text>
            <Text style={styles.title}>{t('onbTitle')}</Text>
            <Text style={styles.subtitle}>{t('onbSubtitle')}</Text>
          </View>

          <View style={styles.optionsContainer}>
            {options.map((option) => {
              const isSelected = selected.has(option.key);
              const Icon = option.icon;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() => toggleCategory(option.key)}
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
                      <Text style={styles.optionTitle}>{t(option.titleKey as any)}</Text>
                      <Text style={styles.optionDescription}>{t(option.descKey as any)}</Text>
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Check color={Colors.white} size={16} />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Personalization preview */}
          {selected.size > 0 && (
            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>{t('onbModRaces')}</Text>
              {(selected.has('racing_speed') || selected.has('racing_endurance')) && (
                <>
                  <View style={styles.previewRow}>
                    <View style={styles.previewDot} />
                    <Text style={styles.previewText}>{t('onbModRaces')} — {t('onbModRacesSub')}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <View style={styles.previewDot} />
                    <Text style={styles.previewText}>{t('onbModFci')} — {t('onbModFciSub')}</Text>
                  </View>
                </>
              )}
              {selected.has('fancy_exhibition') && (
                <View style={styles.previewRow}>
                  <View style={styles.previewDot} />
                  <Text style={styles.previewText}>{t('onbModStandards')} — {t('onbModStandardsSub')}</Text>
                </View>
              )}
              {selected.has('fancy_flying') && (
                <View style={styles.previewRow}>
                  <View style={styles.previewDot} />
                  <Text style={styles.previewText}>{t('onbModBeauty')} — {t('onbModBeautySub')}</Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.confirmButton, selected.size === 0 && styles.confirmButtonDisabled, saving && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={selected.size === 0 || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={Colors.royalBlueDark} />
            ) : (
              <>
                <Text style={styles.confirmButtonText}>{t('onbContinue')}</Text>
                <ArrowRight color={Colors.royalBlueDark} size={20} />
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>{t('onbHint')}</Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: Platform.OS === 'web' ? 20 : 40, marginBottom: 32 },
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
  welcomeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.goldLight,
    textAlign: 'center',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
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
    paddingHorizontal: 20,
  },
  optionsContainer: { gap: 14, marginBottom: 20 },
  optionCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  optionCardSelected: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  optionHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  optionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionIconBoxSelected: { backgroundColor: Colors.gold },
  optionTextContainer: { flex: 1 },
  optionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: Colors.white,
    marginBottom: 2,
  },
  optionDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold,
  },
  previewBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  previewTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: Colors.goldLight,
    marginBottom: 10,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  previewDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.gold },
  previewText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    flex: 1,
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
  confirmButtonDisabled: { opacity: 0.4 },
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
