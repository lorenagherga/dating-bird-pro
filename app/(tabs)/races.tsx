import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Trophy } from 'lucide-react-native';

export default function RacesScreen() {
  const { profile } = useAuth();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('racesTitle')} subtitle={profile?.breeder_name || ''} showBack />
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Trophy color={Colors.royalBlue} size={36} />
        </View>
        <Text style={styles.title}>{t('racesModule')}</Text>
        <Text style={styles.description}>
          {t('racesDesc')}
        </Text>
        <View style={styles.featuresCard}>
          <Text style={styles.featureTitle}>{t('racesFeatures')}</Text>
          <Text style={styles.featureItem}>{t('racesF1')}</Text>
          <Text style={styles.featureItem}>{t('racesF2')}</Text>
          <Text style={styles.featureItem}>{t('racesF3')}</Text>
          <Text style={styles.featureItem}>{t('racesF4')}</Text>
          <Text style={styles.featureItem}>{t('racesF5')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  featuresCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    width: '100%',
    maxWidth: 400,
  },
  featureTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.text,
    marginBottom: 12,
  },
  featureItem: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
});
