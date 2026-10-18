import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  MapPin, Wind, Cloud, CloudRain, Sun, Navigation,
  Gauge, Clock, AlertTriangle, Crown, Zap, TrendingDown,
  Compass, Activity,
} from 'lucide-react-native';

type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'windy';
type WindType = 'none' | 'headwind' | 'tailwind';

const { width: screenWidth } = Dimensions.get('window');

export default function CopilotScreen() {
  const { t } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const router = useRouter();
  const [releaseHour, setReleaseHour] = useState('07');
  const [releaseMin, setReleaseMin] = useState('00');
  const [distance, setDistance] = useState('300');
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [wind, setWind] = useState<WindType>('none');
  const [simulating, setSimulating] = useState(false);
  const [simData, setSimData] = useState<SimResult | null>(null);
  const [progressAnim] = useState(new Animated.Value(0));
  const hasAccess = isAdmin || profile?.subscription_plan === 'trial' || profile?.subscription_plan === 'pro';

  interface SimResult {
    speed: number;
    arrivalMinutes: number;
    fatigueIndex: number;
    windEffect: number;
    weatherEffect: number;
    recommendation: 'good' | 'moderate' | 'hard' | 'rest';
  }

  const runSimulation = () => {
    const dist = parseInt(distance, 10) || 100;
    setSimulating(true);
    setSimData(null);
    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    setTimeout(() => {
      let baseSpeed = 75;
      if (weather === 'cloudy') baseSpeed -= 5;
      if (weather === 'rainy') baseSpeed -= 15;
      if (weather === 'windy') baseSpeed -= 8;
      if (wind === 'headwind') baseSpeed -= 12;
      if (wind === 'tailwind') baseSpeed += 10;
      baseSpeed = Math.max(45, Math.min(95, baseSpeed));

      const arrivalMin = Math.round((dist / baseSpeed) * 60);
      let fatigue = Math.round((dist / baseSpeed) * 8 + (100 - baseSpeed) * 0.3);
      if (wind === 'headwind') fatigue += 15;
      if (weather === 'rainy') fatigue += 10;
      fatigue = Math.max(5, Math.min(100, fatigue));

      let windEffect = 0;
      if (wind === 'headwind') windEffect = -12;
      if (wind === 'tailwind') windEffect = 10;

      let weatherEffect = 0;
      if (weather === 'cloudy') weatherEffect = -5;
      if (weather === 'rainy') weatherEffect = -15;
      if (weather === 'windy') weatherEffect = -8;

      let rec: SimResult['recommendation'] = 'good';
      if (fatigue > 75) rec = 'rest';
      else if (fatigue > 55) rec = 'hard';
      else if (fatigue > 35) rec = 'moderate';

      setSimData({
        speed: baseSpeed,
        arrivalMinutes: arrivalMin,
        fatigueIndex: fatigue,
        windEffect,
        weatherEffect,
        recommendation: rec,
      });
      setSimulating(false);
    }, 2500);
  };

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ScreenHeader title={t('copilotTitle')} subtitle={t('copilotSub')} />
          <View style={styles.paywallContainer}>
            <View style={styles.paywallIcon}>
              <Crown color={Colors.gold} size={48} />
            </View>
            <Text style={styles.paywallTitle}>{t('copilotPaywall')}</Text>
            <Text style={styles.paywallSubtitle}>{t('copilotPaywallMsg')}</Text>
            <TouchableOpacity style={styles.paywallBtn} onPress={() => router.push('/(tabs)/profile')}>
              <Text style={styles.paywallBtnText}>{t('copilotPaywallCta')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const fatigueColor = (idx: number): string => {
    if (idx <= 30) return Colors.success;
    if (idx <= 55) return Colors.warning;
    if (idx <= 75) return Colors.error;
    return '#8B0000';
  };

  const fatigueLabel = (idx: number): string => {
    if (idx <= 30) return t('copilotFatigueLow');
    if (idx <= 55) return t('copilotFatigueMedium');
    if (idx <= 75) return t('copilotFatigueHigh');
    return t('copilotFatigueCritical');
  };

  const recText = (rec: SimResult['recommendation']): string => {
    if (rec === 'good') return t('copilotRecGood');
    if (rec === 'moderate') return t('copilotRecModerate');
    if (rec === 'hard') return t('copilotRecHard');
    return t('copilotRecRest');
  };

  const recColor = (rec: SimResult['recommendation']): string => {
    if (rec === 'good') return Colors.success;
    if (rec === 'moderate') return Colors.warning;
    if (rec === 'hard') return Colors.error;
    return '#8B0000';
  };

  const formatArrival = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const startH = parseInt(releaseHour, 10) || 0;
    const startM = parseInt(releaseMin, 10) || 0;
    let endH = startH + h;
    let endM = startM + m;
    endH = endH + Math.floor(endM / 60);
    endM = endM % 60;
    endH = endH % 24;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('copilotTitle')} subtitle={t('copilotSub')} showBack />

        <View style={styles.inputCard}>
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('copilotReleaseTime')}</Text>
              <View style={styles.timeInputRow}>
                <TextInputStyle value={releaseHour} onChange={setReleaseHour} max={23} />
                <Text style={styles.timeColon}>:</Text>
                <TextInputStyle value={releaseMin} onChange={setReleaseMin} max={59} />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('copilotDistance')}</Text>
              <View style={styles.distanceInputRow}>
                <TextInputNum value={distance} onChange={setDistance} />
                <Text style={styles.distanceSuffix}>km</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionLabel}>{t('copilotWeather')}</Text>
          <View style={styles.weatherRow}>
            {([
              { key: 'sunny' as WeatherType, icon: <Sun color={weather === 'sunny' ? Colors.white : Colors.gold} size={20} />, label: t('copilotSunny') },
              { key: 'cloudy' as WeatherType, icon: <Cloud color={weather === 'cloudy' ? Colors.white : Colors.textSecondary} size={20} />, label: t('copilotCloudy') },
              { key: 'rainy' as WeatherType, icon: <CloudRain color={weather === 'rainy' ? Colors.white : Colors.royalBlueLight} size={20} />, label: t('copilotRainy') },
              { key: 'windy' as WeatherType, icon: <Wind color={weather === 'windy' ? Colors.white : Colors.textSecondary} size={20} />, label: t('copilotWindy') },
            ]).map(w => (
              <TouchableOpacity
                key={w.key}
                style={[styles.weatherBtn, weather === w.key && styles.weatherBtnActive]}
                onPress={() => setWeather(w.key)}
              >
                {w.icon}
                <Text style={[styles.weatherBtnText, weather === w.key && styles.weatherBtnTextActive]}>{w.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>{t('copilotWindEffect')}</Text>
          <View style={styles.windRow}>
            {([
              { key: 'none' as WindType, label: '—', desc: 'Fără vânt' },
              { key: 'headwind' as WindType, icon: <Wind color={Colors.error} size={16} />, label: t('copilotHeadwind') },
              { key: 'tailwind' as WindType, icon: <Wind color={Colors.success} size={16} />, label: t('copilotTailwind') },
            ]).map(w => (
              <TouchableOpacity
                key={w.key}
                style={[styles.windBtn, wind === w.key && styles.windBtnActive]}
                onPress={() => setWind(w.key)}
              >
                {w.icon || <Text style={styles.windBtnIconText}>{w.label}</Text>}
                <Text style={[styles.windBtnText, wind === w.key && styles.windBtnTextActive]}>{w.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.simulateBtn} onPress={runSimulation} disabled={simulating}>
          {simulating ? (
            <>
              <ActivityIndicator color={Colors.royalBlueDark} size="small" />
              <Text style={styles.simulateBtnText}>{t('copilotSimulating')}</Text>
            </>
          ) : (
            <>
              <Navigation color={Colors.royalBlueDark} size={22} />
              <Text style={styles.simulateBtnText}>{t('copilotSimulate')}</Text>
            </>
          )}
        </TouchableOpacity>

        {simulating && (
          <View style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
              <Animated.View style={[styles.mapProgress, { width: progressWidth as any }]} />
              <View style={styles.mapContent}>
                <MapPin color={Colors.gold} size={32} />
                <Text style={styles.mapLoadingText}>{t('copilotSimulating')}</Text>
              </View>
            </View>
          </View>
        )}

        {simData && !simulating && (
          <View style={styles.resultsContainer}>
            <View style={styles.mapCard}>
              <View style={styles.mapVisual}>
                <View style={styles.mapStartPoint}>
                  <View style={styles.mapStartDot} />
                  <Text style={styles.mapStartLabel}>START</Text>
                </View>
                <View style={styles.mapFlightPath} />
                <View style={styles.mapEndPoint}>
                  <MapPin color={Colors.error} size={20} />
                  <Text style={styles.mapEndLabel}>FINISH</Text>
                </View>
              </View>
              <View style={styles.mapInfoRow}>
                <View style={styles.mapInfoBox}>
                  <Text style={styles.mapInfoLabel}>{t('copilotFlockPosition')}</Text>
                  <Text style={styles.mapInfoValue}>{parseInt(distance, 10)} km</Text>
                </View>
                <View style={styles.mapInfoDivider} />
                <View style={styles.mapInfoBox}>
                  <Text style={styles.mapInfoLabel}>{t('copilotRemaining')}</Text>
                  <Text style={styles.mapInfoValue}>0 km</Text>
                </View>
              </View>
            </View>

            <View style={styles.statsCard}>
              <View style={styles.statRow}>
                <View style={styles.statIconBox}>
                  <Gauge color={Colors.royalBlue} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statLabel}>{t('copilotFlightSpeed')}</Text>
                  <Text style={styles.statValue}>{simData.speed} km/h</Text>
                </View>
              </View>
              <View style={styles.statRow}>
                <View style={styles.statIconBox}>
                  <Clock color={Colors.gold} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statLabel}>{t('copilotEstimatedArrival')}</Text>
                  <Text style={styles.statValue}>{formatArrival(simData.arrivalMinutes)}</Text>
                </View>
              </View>
              <View style={styles.statRow}>
                <View style={styles.statIconBox}>
                  <Wind color={simData.windEffect < 0 ? Colors.error : Colors.success} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statLabel}>{t('copilotWindEffect')}</Text>
                  <Text style={[styles.statValue, { color: simData.windEffect < 0 ? Colors.error : Colors.success }]}>
                    {simData.windEffect > 0 ? '+' : ''}{simData.windEffect} km/h
                  </Text>
                </View>
              </View>
              <View style={styles.statRow}>
                <View style={styles.statIconBox}>
                  <Cloud color={simData.weatherEffect < 0 ? Colors.error : Colors.success} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statLabel}>{t('copilotWeatherEffect')}</Text>
                  <Text style={[styles.statValue, { color: simData.weatherEffect < 0 ? Colors.error : Colors.success }]}>
                    {simData.weatherEffect > 0 ? '+' : ''}{simData.weatherEffect} km/h
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.fatigueCard}>
              <View style={styles.fatigueHeader}>
                <View style={styles.fatigueIconBox}>
                  <Activity color={fatigueColor(simData.fatigueIndex)} size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fatigueLabel}>{t('copilotFatigueIndex')}</Text>
                  <Text style={[styles.fatigueValue, { color: fatigueColor(simData.fatigueIndex) }]}>
                    {simData.fatigueIndex}/100 · {fatigueLabel(simData.fatigueIndex)}
                  </Text>
                </View>
              </View>
              <View style={styles.fatigueBarBg}>
                <View style={[styles.fatigueBarFill, { width: `${simData.fatigueIndex}%`, backgroundColor: fatigueColor(simData.fatigueIndex) }]} />
              </View>
            </View>

            <View style={[styles.recCard, { borderColor: recColor(simData.recommendation) }]}>
              <View style={[styles.recIconBox, { backgroundColor: recColor(simData.recommendation) + '20' }]}>
                {simData.recommendation === 'good' ? <Zap color={recColor(simData.recommendation)} size={20} /> : <AlertTriangle color={recColor(simData.recommendation)} size={20} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recLabel}>{t('copilotRecommendation')}</Text>
                <Text style={[styles.recText, { color: recColor(simData.recommendation) }]}>{recText(simData.recommendation)}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function TextInputStyle({ value, onChange, max }: { value: string; onChange: (v: string) => void; max: number }) {
  const handleChange = (v: string) => {
    const num = parseInt(v, 10) || 0;
    if (num >= 0 && num <= max) onChange(String(num).padStart(2, '0'));
  };
  return (
    <View style={localStyles.timeInput}>
      <Text style={localStyles.timeInputText}>{value}</Text>
      <View style={localStyles.timeInputBtns}>
        <TouchableOpacity onPress={() => handleChange(String((parseInt(value, 10) || 0) + 1))}>
          <Text style={localStyles.timeInputBtn}>▲</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleChange(String((parseInt(value, 10) || 0) - 1))}>
          <Text style={localStyles.timeInputBtn}>▼</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TextInputNum({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={localStyles.distanceInput}>
      <Text style={localStyles.distanceInputText}>{value}</Text>
    </View>
  );
}

const localStyles = StyleSheet.create({
  timeInput: { alignItems: 'center', gap: 2 },
  timeInputText: { fontFamily: 'Inter-Bold', fontSize: 28, color: Colors.royalBlue },
  timeInputBtns: { flexDirection: 'row', gap: 8 },
  timeInputBtn: { fontSize: 12, color: Colors.textSecondary },
  distanceInput: { alignItems: 'center' },
  distanceInputText: { fontFamily: 'Inter-Bold', fontSize: 28, color: Colors.royalBlue },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  paywallContainer: { alignItems: 'center', gap: 16, marginTop: 40, paddingHorizontal: 24 },
  paywallIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.goldPale, borderWidth: 2, borderColor: Colors.gold, justifyContent: 'center', alignItems: 'center' },
  paywallTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.text },
  paywallSubtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  paywallBtn: { backgroundColor: Colors.gold, borderRadius: BorderRadius.md, paddingVertical: 16, paddingHorizontal: 32, ...Shadows.gold },
  paywallBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.royalBlueDark },
  inputCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 20, borderWidth: 1, borderColor: Colors.borderLight, gap: 16, marginBottom: 16, ...Shadows.card },
  inputRow: { flexDirection: 'row', gap: 16 },
  inputGroup: { flex: 1 },
  inputLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  timeInputRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.royalBluePale, borderRadius: 12, padding: 12 },
  timeColon: { fontFamily: 'Inter-Bold', fontSize: 28, color: Colors.royalBlue },
  distanceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.royalBluePale, borderRadius: 12, padding: 12 },
  distanceSuffix: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.textSecondary },
  sectionLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text, marginTop: 4 },
  weatherRow: { flexDirection: 'row', gap: 8 },
  weatherBtn: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: Colors.neutral50, borderRadius: 12, paddingVertical: 12, borderWidth: 1.5, borderColor: Colors.borderLight },
  weatherBtnActive: { backgroundColor: Colors.royalBlue, borderColor: Colors.royalBlue },
  weatherBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: Colors.textSecondary },
  weatherBtnTextActive: { color: Colors.white },
  windRow: { flexDirection: 'row', gap: 8 },
  windBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.neutral50, borderRadius: 12, paddingVertical: 12, borderWidth: 1.5, borderColor: Colors.borderLight },
  windBtnActive: { backgroundColor: Colors.royalBlue, borderColor: Colors.royalBlue },
  windBtnIconText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.textSecondary },
  windBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textSecondary },
  windBtnTextActive: { color: Colors.white },
  simulateBtn: { flexDirection: 'row', backgroundColor: Colors.gold, borderRadius: BorderRadius.md, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16, ...Shadows.gold },
  simulateBtnText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.royalBlueDark },
  mapContainer: { marginBottom: 16 },
  mapPlaceholder: { height: 200, backgroundColor: Colors.royalBluePale, borderRadius: BorderRadius.lg, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  mapProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Colors.royalBluePale },
  mapContent: { alignItems: 'center', gap: 10 },
  mapLoadingText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.royalBlue },
  resultsContainer: { gap: 14 },
  mapCard: { backgroundColor: Colors.royalBlue, borderRadius: BorderRadius.lg, padding: 20, ...Shadows.card },
  mapVisual: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 },
  mapStartPoint: { alignItems: 'center', gap: 4 },
  mapStartDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.gold, borderWidth: 2, borderColor: Colors.white },
  mapStartLabel: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.goldLight },
  mapFlightPath: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },
  mapEndPoint: { alignItems: 'center', gap: 4 },
  mapEndLabel: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.goldLight },
  mapInfoRow: { flexDirection: 'row', alignItems: 'center' },
  mapInfoBox: { flex: 1, alignItems: 'center' },
  mapInfoLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.goldLight, marginBottom: 4 },
  mapInfoValue: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.white },
  mapInfoDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  statsCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 18, borderWidth: 1, borderColor: Colors.borderLight, gap: 14 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.royalBluePale, justifyContent: 'center', alignItems: 'center' },
  statLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary },
  statValue: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text, marginTop: 2 },
  fatigueCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 18, borderWidth: 1, borderColor: Colors.borderLight },
  fatigueHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  fatigueIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.neutral50, justifyContent: 'center', alignItems: 'center' },
  fatigueLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary },
  fatigueValue: { fontFamily: 'Inter-Bold', fontSize: 16, marginTop: 2 },
  fatigueBarBg: { height: 12, backgroundColor: Colors.neutral100, borderRadius: 6, overflow: 'hidden' },
  fatigueBarFill: { height: '100%', borderRadius: 6 },
  recCard: { flexDirection: 'row', gap: 12, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 2 },
  recIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  recLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.textSecondary },
  recText: { fontFamily: 'Inter-SemiBold', fontSize: 14, marginTop: 4, lineHeight: 19 },
});
