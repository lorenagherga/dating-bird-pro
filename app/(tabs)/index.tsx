import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { LanguagePicker } from '@/components/LanguagePicker';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { PLAN_LABELS } from '@/lib/types';
import {
  Bird,
  Calendar,
  Stethoscope,
  Bot,
  Crown,
  LogOut,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PigeonSilhouette } from '@/components/PigeonSilhouette';
import { TreatmentDueAlerts } from '@/components/TreatmentDueAlerts';

const QUICK_ACTIONS = [
  { route: '/(tabs)/pigeons', icon: Bird, labelRo: 'Registrul porumbeilor', labelEn: 'Pigeon registry' },
  { route: '/(tabs)/nests', icon: Calendar, labelRo: 'Calendarul cuibului', labelEn: 'Nest calendar' },
  { route: '/(tabs)/doctor', icon: Stethoscope, labelRo: 'Întreabă doctorul', labelEn: 'Ask the doctor' },
  { route: '/(tabs)/assistant', icon: Bot, labelRo: 'Asistent AI', labelEn: 'AI assistant' },
];

export default function DashboardScreen() {
  const { profile, signOut, isAdmin, isVip, effectivePlan } = useAuth();
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

  const handleSignOut = () => {
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOutConfirmBtn'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <View style={styles.container}>
      <PigeonSilhouette width={220} style={{ position: 'absolute', top: 110, right: -50 }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AnnouncementBanner />
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>{t('appName')}</Text>
            <Text style={styles.taglineText}>{t('tagline')}</Text>
            <Text style={styles.welcomeText}>{profile?.breeder_name || t('breeder')}</Text>
          </View>
          <View style={styles.headerActions}>
            <LanguagePicker />
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <LogOut color={Colors.white} size={20} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>

        <TreatmentDueAlerts />

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

        <View style={styles.quickSection}>
          <Text style={styles.quickTitle}>{language === 'ro' ? 'Acțiuni rapide' : 'Quick actions'}</Text>
          <View style={styles.quickCard}>
            {QUICK_ACTIONS.map((action, index) => {
              const Icon = action.icon;
              return (
                <TouchableOpacity
                  key={action.route}
                  style={[styles.quickRow, index < QUICK_ACTIONS.length - 1 && styles.quickRowBorder]}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.6}
                >
                  <View style={styles.quickIcon}>
                    <Icon color={Colors.royalBlue} size={20} />
                  </View>
                  <Text style={styles.quickLabel}>{language === 'ro' ? action.labelRo : action.labelEn}</Text>
                  <ChevronRight color={Colors.textLight} size={20} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    marginTop: 40,
    backgroundColor: Colors.royalBlue,
    borderRadius: BorderRadius.xl,
    padding: 20,
  },
  appName: {
    fontFamily: 'Inter-Bold',
    fontSize: 26,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  taglineText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.goldLight,
    marginTop: 4,
  },
  welcomeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.royalBluePale,
    marginTop: 2,
  },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
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
  quickSection: { marginBottom: 20 },
  quickTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.card,
  },
  quickRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14 },
  quickRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLabel: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
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
