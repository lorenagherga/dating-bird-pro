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
import { LanguagePicker } from '@/components/LanguagePicker';
import { PigeonCategoryPicker } from '@/components/PigeonCategoryPicker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows } from '@/lib/theme';
import type { PigeonCategory } from '@/lib/types';
import { Bird, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function OnboardingScreen() {
  const { setPigeonCategories } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [selected, setSelected] = useState<Set<PigeonCategory>>(new Set());
  const [saving, setSaving] = useState(false);

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
    await setPigeonCategories(Array.from(selected));
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
          <View style={styles.topRow}>
            <LanguagePicker />
          </View>
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Bird color={Colors.white} size={32} />
            </View>
            <Text style={styles.title}>{t('onbTitle')}</Text>
            <Text style={styles.subtitle}>{t('onbSubtitle')}</Text>
          </View>

          <View style={styles.optionsContainer}>
            <PigeonCategoryPicker selected={selected} onToggle={toggleCategory} variant="onDark" />
          </View>

          {selected.size > 0 && (
            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>{t('onbModRaces')}</Text>
              {selected.has('voiajori') && (
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
              {selected.has('frumusete') && (
                <View style={styles.previewRow}>
                  <View style={styles.previewDot} />
                  <Text style={styles.previewText}>{t('onbModStandards')} — {t('onbModStandardsSub')}</Text>
                </View>
              )}
              {selected.has('joc_zbor') && (
                <View style={styles.previewRow}>
                  <View style={styles.previewDot} />
                  <Text style={styles.previewText}>{t('onbModBeauty')} — {t('onbModBeautySub')}</Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.confirmButton, (selected.size === 0 || saving) && styles.confirmButtonDisabled]}
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
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 24 },
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
  optionsContainer: { marginBottom: 20 },
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
