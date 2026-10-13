import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows } from '@/lib/theme';
import { PLAN_LABELS, PLAN_LIMITS } from '@/lib/types';
import {
  Bird,
  Calendar,
  Stethoscope,
  Calculator,
  MessageCircle,
  GitBranch,
  Crown,
  LogOut,
  Sparkles,
} from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ModuleCard {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  route: string;
  locked?: boolean;
}

export default function DashboardScreen() {
  const { profile, signOut, isAdmin, isVip, effectivePlan } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [pigeonCount, setPigeonCount] = useState(0);

  useEffect(() => {
    loadPigeonCount();
  }, []);

  const loadPigeonCount = async () => {
    const { count } = await supabase
      .from('pigeons')
      .select('*', { count: 'exact', head: true });
    setPigeonCount(count || 0);
  };

  const plan = effectivePlan;
  const limits = PLAN_LIMITS[plan];

  const handleNavigate = (route: string, locked?: boolean) => {
    if (locked) {
      Alert.alert(
        t('premiumFeature'),
        t('premiumMsg'),
        [
          { text: t('seePlans'), onPress: () => router.push('/(tabs)/profile') },
          { text: t('close') },
        ]
      );
      return;
    }
    router.push(route as any);
  };

  const modules: ModuleCard[] = [
    {
      title: t('modRegistry'),
      subtitle: t('modRegistrySub'),
      icon: <Bird color={Colors.white} size={26} strokeWidth={1.8} />,
      route: '/(tabs)/pigeons',
    },
    {
      title: t('modPedigree'),
      subtitle: t('modPedigreeSub'),
      icon: <GitBranch color={Colors.white} size={26} strokeWidth={1.8} />,
      route: '/(tabs)/pigeons',
      locked: !limits.hasPedigree,
    },
    {
      title: t('modCalendar'),
      subtitle: t('modCalendarSub'),
      icon: <Calendar color={Colors.white} size={26} strokeWidth={1.8} />,
      route: '/(tabs)/nests',
    },
    {
      title: t('modTreatments'),
      subtitle: t('modTreatmentsSub'),
      icon: <Stethoscope color={Colors.white} size={26} strokeWidth={1.8} />,
      route: '/(tabs)/treatments',
      locked: !limits.hasTreatments,
    },
    {
      title: t('modCalculator'),
      subtitle: t('modCalculatorSub'),
      icon: <Calculator color={Colors.white} size={26} strokeWidth={1.8} />,
      route: '/(tabs)/calculator',
      locked: !limits.hasGeneticCalculator,
    },
  ];

  const handleSignOut = () => {
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOutConfirmBtn'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>{t('appName')}</Text>
            <Text style={styles.taglineText}>{t('tagline')}</Text>
            <Text style={styles.welcomeText}>{profile?.breeder_name || t('breeder')}</Text>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut color={Colors.royalBlue} size={20} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pigeonCount}</Text>
            <Text style={styles.statLabel}>{t('pigeons')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{PLAN_LABELS[plan]}</Text>
            <Text style={styles.statLabel}>{t('subscription')}</Text>
          </View>
          {isAdmin && (
            <View style={[styles.statCard, styles.statCardGold]}>
              <Text style={[styles.statValue, { color: Colors.goldDark }]}>{t('admin')}</Text>
              <Text style={styles.statLabel}>{t('status')}</Text>
            </View>
          )}
          {isVip && !isAdmin && (
            <View style={[styles.statCard, styles.statCardGold]}>
              <Text style={[styles.statValue, { color: Colors.goldDark }]}>{t('vip')}</Text>
              <Text style={styles.statLabel}>{t('status')}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.assistantHero}
          onPress={() => router.push('/(tabs)/assistant')}
          activeOpacity={0.9}
        >
          <View style={styles.assistantHeroIcon}>
            <Sparkles color={Colors.white} size={28} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.assistantHeroTitle}>{t('modAssistant')}</Text>
            <Text style={styles.assistantHeroSub}>{t('assistantFreeSub')}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.modulesGrid}>
          {modules.map((mod, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.moduleCard, mod.locked && styles.moduleCardLocked]}
              onPress={() => handleNavigate(mod.route, mod.locked)}
              activeOpacity={0.85}
            >
              <View style={styles.moduleIcon}>
                {mod.icon}
                {mod.locked && (
                  <View style={styles.lockBadge}>
                    <Crown color={Colors.white} size={12} />
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.moduleTitle}>{mod.title}</Text>
                <Text style={styles.moduleSubtitle}>{mod.subtitle}</Text>
              </View>
              {mod.locked ? (
                <View style={styles.lockIconBox}>
                  <Crown color={Colors.gold} size={18} strokeWidth={1.5} />
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        {plan === 'free' && (
          <TouchableOpacity
            style={styles.upgradeBanner}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.85}
          >
            <Crown color={Colors.goldLight} size={22} strokeWidth={1.5} />
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeTitle}>{t('upgradeNow')}</Text>
              <Text style={styles.upgradeSubtitle}>
                {t('upgradeMsg')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    marginTop: 40,
  },
  appName: {
    fontFamily: 'Inter-Bold',
    fontSize: 26,
    color: Colors.royalBlue,
    letterSpacing: -0.5,
  },
  taglineText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.gold,
    marginTop: 4,
  },
  welcomeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  statCardGold: {
    borderColor: Colors.gold,
    borderWidth: 1.5,
    backgroundColor: Colors.goldPale,
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  assistantHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.royalBlueDark,
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    ...Shadows.gold,
  },
  assistantHeroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assistantHeroTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 19,
    color: Colors.white,
  },
  assistantHeroSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  modulesGrid: {
    gap: 14,
  },
  moduleCard: {
    backgroundColor: Colors.royalBlue,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 80,
    ...Shadows.button,
  },
  moduleCardLocked: {
    backgroundColor: Colors.neutral700,
  },
  moduleIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    color: Colors.white,
  },
  moduleSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.royalBlue,
  },
  lockIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.royalBlueDark,
    borderRadius: 18,
    padding: 20,
    marginTop: 28,
    borderWidth: 1,
    borderColor: Colors.gold,
    ...Shadows.gold,
  },
  upgradeTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.white,
  },
  upgradeSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
});
