import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors, BorderRadius } from '@/lib/theme';
import type { TimeRemaining } from '@/lib/auction-utils';

interface AuctionCountdownProps {
  remaining: TimeRemaining;
  urgent?: boolean;
  size?: 'large' | 'compact';
  tone?: 'dark' | 'light';
}

export function AuctionCountdown({ remaining, urgent = false, size = 'large', tone = 'light' }: AuctionCountdownProps) {
  const { t } = useLanguage();
  const units = [
    { value: remaining.days, label: t('aucCdDays') },
    { value: remaining.hours, label: t('aucCdHours') },
    { value: remaining.minutes, label: t('aucCdMinutes') },
    { value: remaining.seconds, label: t('aucCdSeconds') },
  ];
  const compact = size === 'compact';
  const isDark = tone === 'dark';

  return (
    <View style={styles.row}>
      {units.map((unit, index) => (
        <View key={unit.label} style={styles.unitWrap}>
          <View style={[
            styles.unit,
            compact && styles.unitCompact,
            isDark ? styles.unitDark : styles.unitLight,
            urgent && styles.unitUrgent,
          ]}>
            <Text style={[
              styles.value,
              compact && styles.valueCompact,
              isDark ? styles.valueDark : styles.valueLight,
              urgent && styles.valueUrgent,
            ]}>
              {String(unit.value).padStart(2, '0')}
            </Text>
          </View>
          <Text style={[styles.label, compact && styles.labelCompact, isDark ? styles.labelDark : styles.labelLight]}>
            {unit.label}
          </Text>
          {index < units.length - 1 && (
            <Text style={[styles.separator, compact && styles.separatorCompact, isDark ? styles.labelDark : styles.labelLight]}>:</Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 4 },
  unitWrap: { alignItems: 'center', flexDirection: 'column', position: 'relative' },
  unit: {
    minWidth: 52, paddingVertical: 8, paddingHorizontal: 6, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  unitCompact: { minWidth: 36, paddingVertical: 4, paddingHorizontal: 4, borderRadius: BorderRadius.sm },
  unitDark: { backgroundColor: 'rgba(255,255,255,0.12)' },
  unitLight: { backgroundColor: Colors.royalBluePale },
  unitUrgent: { backgroundColor: Colors.error },
  value: { fontFamily: 'Inter-Bold', fontSize: 24, fontVariant: ['tabular-nums'] },
  valueCompact: { fontSize: 15 },
  valueDark: { color: Colors.white },
  valueLight: { color: Colors.royalBlueDark },
  valueUrgent: { color: Colors.white },
  label: { fontFamily: 'Inter-Medium', fontSize: 10, marginTop: 4, letterSpacing: 0.4, textTransform: 'uppercase' },
  labelCompact: { fontSize: 8, marginTop: 2 },
  labelDark: { color: Colors.goldLight },
  labelLight: { color: Colors.textSecondary },
  separator: {
    position: 'absolute', right: -9, top: 10, fontFamily: 'Inter-Bold', fontSize: 18,
  },
  separatorCompact: { top: 4, fontSize: 13 },
});
