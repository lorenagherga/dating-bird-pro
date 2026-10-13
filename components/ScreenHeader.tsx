import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/lib/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.accentLine} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 50,
    marginBottom: 24,
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
    fontSize: 26,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
