import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Megaphone } from 'lucide-react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { fetchFreeLaunchSettings, getFreeLaunchBannerDays } from '@/lib/free-launch';

export function FreeLaunchBanner() {
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<{ message: string; days: number } | null>(null);

  useEffect(() => {
    let active = true;
    fetchFreeLaunchSettings()
      .then((settings) => {
        if (!active) return;
        const days = getFreeLaunchBannerDays(settings);
        setNotice(days === null ? null : { message: settings.message, days });
      })
      .catch(() => {
        if (active) setNotice(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!notice) return null;

  const isRo = language === 'ro';
  const daysText = isRo
    ? `${notice.days === 0 ? 'Ultima zi' : `Mai sunt ${notice.days} ${notice.days === 1 ? 'zi' : 'zile'}`}`
    : `${notice.days === 0 ? 'Last day' : `${notice.days} ${notice.days === 1 ? 'day' : 'days'} left`}`;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 8 }]} accessibilityRole="alert">
      <Megaphone color={Colors.white} size={16} />
      <Text style={styles.text}>
        {notice.message ? `${notice.message} ` : ''}
        <Text style={styles.days}>{daysText}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.royalBlue,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  text: {
    flexShrink: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: Colors.white,
    textAlign: 'center',
  },
  days: {
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
});
