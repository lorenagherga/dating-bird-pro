import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BorderRadius, Colors } from '@/lib/theme';
import { ArrowLeft } from 'lucide-react-native';
import { LanguagePicker } from '@/components/LanguagePicker';
import { NotificationBell } from '@/components/NotificationBell';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function ScreenHeader({ title, subtitle, showBack, onBack }: ScreenHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push('/(tabs)/more' as any);
      }
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        {showBack && (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft color={Colors.white} size={24} strokeWidth={2} />
          </TouchableOpacity>
        )}
        <View style={styles.titleBox}>
          <View style={styles.accentLine} />
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.actions}>
          <NotificationBell />
          <LanguagePicker />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 50,
    marginBottom: 24,
    backgroundColor: Colors.royalBlue,
    borderRadius: BorderRadius.xl,
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  titleBox: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentLine: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.gold,
    marginBottom: 12,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 19,
    lineHeight: 24,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.royalBluePale,
    marginTop: 4,
  },
});
