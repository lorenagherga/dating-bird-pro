import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { PLAN_LABELS, PLAN_LIMITS } from '@/lib/types';
import {
  Bird,
  Calendar,
  Stethoscope,
  Calculator,
  GitBranch,
  Crown,
  LogOut,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Trophy,
  Award,
  Zap,
} from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface ModuleCard {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  route: string;
  locked?: boolean;
}

export default function DashboardScreen() {
  const { profile, signOut, isAdmin, isVip, effectivePlan, pigeonCategories } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [pigeonCount, setPigeonCount] = useState(0);
  const [swallowArrival, setSwallowArrival] = useState(false);
  const [swallowDeparture, setSwallowDeparture] = useState(false);
  const [swallowArrivalDate, setSwallowArrivalDate] = useState<string | null>(null);
  const [swallowDepartureDate, setSwallowDepartureDate] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadPigeonCount();
    loadSwallowStatus();
  }, []);

  const loadPigeonCount = async () => {
    const { count } = await supabase
      .from('pigeons')
      .select('*', { count: 'exact', head: true });
    setPigeonCount(count || 0);
  };

  const loadSwallowStatus = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('swallow_monitor')
      .select('*')
      .eq('user_id', profile.id)
      .eq('year', currentYear);
    if (data) {
      for (const row of data) {
        if (row.event_type === 'arrival') {
          setSwallowArrival(true);
          setSwallowArrivalDate(row.event_date);
        } else if (row.event_type === 'departure') {
          setSwallowDeparture(true);
          setSwallowDepartureDate(row.event_date);
        }
      }
    }
  }, [profile?.id, currentYear]);

  const handleSwallowToggle = async (eventType: 'arrival' | 'departure', enabled: boolean) => {
    if (!profile?.id) return;
    if (enabled) {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('swallow_monitor').upsert({
        user_id: profile.id,
        event_type: eventType,
        event_date: today,
        year: currentYear,
      }, { onConflict: 'user_id,event_type,year' });
      if (error) return;
      if (eventType === 'arrival') {
        setSwallowArrival(true);
        setSwallowArrivalDate(today);
      } else {
        setSwallowDeparture(true);
        setSwallowDepartureDate(today);
      }
    } else {
      const { error } = await supabase
        .from('swallow_monitor')
        .delete()
        .eq('user_id', profile.id)
        .eq('event_type', eventType)
        .eq('year', currentYear);
      if (error) return;
      if (eventType === 'arrival') {
        setSwallowArrival(false);
        setSwallowArrivalDate(null);
      } else {
        setSwallowDeparture(false);
        setSwallowDepartureDate(null);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === 'ro' ? 'ro-RO' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const plan = effectivePlan;
  const limits = PLAN_LIMITS[plan];

  const hasRacing = pigeonCategories?.some(c => c.startsWith('racing_')) ?? false;
  const hasFancy = pigeonCategories?.some(c => c.startsWith('fancy_')) ?? false;
  // Default: show all modules if no categories selected yet
  const showAll = !pigeonCategories || pigeonCategories.length === 0;

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
    // Registry — always shown
    {
      title: t('modRegistry'),
      subtitle: t('modRegistrySub'),
      icon: <Bird color={Colors.white} size={26} strokeWidth={1.8} />,
      route: '/(tabs)/pigeons',
    },
    // Pedigree — always shown
    {
      title: t('modPedigree'),
      subtitle: t('modPedigreeSub'),
      icon: <GitBranch color={Colors.white} size={26} strokeWidth={1.8} />,
      route: '/(tabs)/pigeons',
      locked: !limits.hasPedigree,
    },
    // Races & Training — only for racing categories
    ...(showAll || hasRacing ? [{
      title: t('onbModRaces'),
      subtitle: t('onbModRacesSub'),
      icon: <Trophy color={Colors.white} size={26} strokeWidth={1.8} /> as React.ReactNode,
      route: '/(tabs)/races',
    }] : []),
    // FCI Calculator — only for racing categories
    ...(showAll || hasRacing ? [{
      title: t('onbModFci'),
      subtitle: t('onbModFciSub'),
      icon: <Zap color={Colors.white} size={26} strokeWidth={1.8} /> as React.ReactNode,
      route: '/(tabs)/palmares',
    }] : []),
    // Standards & Judging — only for fancy exhibition
    ...(showAll || pigeonCategories?.includes('fancy_exhibition') ? [{
      title: t('onbModStandards'),
      subtitle: t('onbModStandardsSub'),
      icon: <Award color={Colors.white} size={26} strokeWidth={1.8} /> as React.ReactNode,
      route: '/(tabs)/vitrina',
    }] : []),
    // Flying & Performance — only for fancy flying
    ...(showAll || pigeonCategories?.includes('fancy_flying') ? [{
      title: t('onbModBeauty'),
      subtitle: t('onbModBeautySub'),
      icon: <Sparkles color={Colors.white} size={26} strokeWidth={1.8} /> as React.ReactNode,
      route: '/(tabs)/vitrina',
    }] : []),
    // Calendar (Nests) — always shown
    {
      title: t('modCalendar'),
      subtitle: t('modCalendarSub'),
      icon: <Calendar color={Colors.white} size={26} strokeWidth={1.8} />,
      route: '/(tabs)/nests',
    },
    // Genetic Calculator — always shown (locked by plan)
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
            onPress={() => router.push('/(tabs)/doctor')}
            activeOpacity={0.9}
          >
            <View style={styles.assistantHeroIcon}>
              <Stethoscope color={Colors.white} size={28} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.assistantHeroTitle}>{t('doctorTitle')}</Text>
              <Text style={styles.assistantHeroSub}>{t('doctorSub')}</Text>
            </View>
          </TouchableOpacity>

        {/* Swallow Monitor — Regula Rândunicii */}
        <View style={styles.swallowCard}>
          <View style={styles.swallowHeader}>
            <View style={styles.swallowIconBox}>
              <Bird color={Colors.gold} size={22} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.swallowTitle}>{t('swallowMonitorTitle')}</Text>
              <Text style={styles.swallowSub}>{t('swallowMonitorSub')}</Text>
            </View>
          </View>

          <View style={styles.swallowToggles}>
            <View style={styles.swallowToggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.swallowToggleLabel}>{t('swallowArrival')}</Text>
                {swallowArrivalDate && (
                  <Text style={styles.swallowDateText}>{t('swallowRecordedOn')} {formatDate(swallowArrivalDate)}</Text>
                )}
              </View>
              <Switch
                value={swallowArrival}
                onValueChange={(v) => handleSwallowToggle('arrival', v)}
                trackColor={{ false: Colors.border, true: Colors.success }}
                thumbColor={swallowArrival ? Colors.white : Colors.white}
              />
            </View>
            <View style={styles.swallowDivider} />
            <View style={styles.swallowToggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.swallowToggleLabel}>{t('swallowDeparture')}</Text>
                {swallowDepartureDate && (
                  <Text style={styles.swallowDateText}>{t('swallowRecordedOn')} {formatDate(swallowDepartureDate)}</Text>
                )}
              </View>
              <Switch
                value={swallowDeparture}
                onValueChange={(v) => handleSwallowToggle('departure', v)}
                trackColor={{ false: Colors.border, true: Colors.warning }}
                thumbColor={swallowDeparture ? Colors.white : Colors.white}
              />
            </View>
          </View>

          {/* Alert banners */}
          {swallowDeparture && (
            <View style={styles.swallowRiskBanner}>
              <AlertTriangle color={Colors.error} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={styles.swallowRiskTitle}>{t('swallowRiskActive')}</Text>
                <Text style={styles.swallowRiskMsg}>{t('swallowRiskMsg')}</Text>
              </View>
            </View>
          )}
          {swallowArrival && !swallowDeparture && (
            <View style={styles.swallowSafeBanner}>
              <ShieldCheck color={Colors.success} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={styles.swallowSafeTitle}>{t('swallowSafeSeason')}</Text>
                <Text style={styles.swallowSafeMsg}>{t('swallowSafeMsg')}</Text>
              </View>
            </View>
          )}
        </View>

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

        {plan === 'trial' && (
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
  // Swallow Monitor
  swallowCard: {
    backgroundColor: Colors.royalBlueDark,
    borderRadius: BorderRadius.lg,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    ...Shadows.gold,
  },
  swallowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  swallowIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swallowTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: Colors.white,
  },
  swallowSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  swallowToggles: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  swallowToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  swallowToggleLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.white,
  },
  swallowDateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  swallowDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  swallowRiskBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.errorBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  swallowRiskTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: Colors.error,
  },
  swallowRiskMsg: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.error,
    marginTop: 2,
    lineHeight: 18,
  },
  swallowSafeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.successBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  swallowSafeTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: Colors.success,
  },
  swallowSafeMsg: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.success,
    marginTop: 2,
    lineHeight: 18,
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
