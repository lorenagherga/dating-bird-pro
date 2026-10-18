import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useLanguage } from '@/lib/language-context';
import { Gavel, Users, ChevronRight } from 'lucide-react-native';

export default function CommunityScreen() {
  const { t } = useLanguage();
  const router = useRouter();

  const cards = [
    {
      icon: <Gavel color={Colors.white} size={32} />,
      title: t('tabAuctions'),
      subtitle: t('aucSub'),
      route: '/(tabs)/auctions',
      gradient: Colors.royalBlue,
    },
    {
      icon: <Users color={Colors.white} size={32} />,
      title: t('tabPartners'),
      subtitle: t('partnersSub'),
      route: '/(tabs)/partners',
      gradient: Colors.success,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('communityTitle')} subtitle={t('communitySub')} />

        {cards.map((card) => (
          <TouchableOpacity
            key={card.route}
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(card.route as any)}
          >
            <View style={[styles.cardIconBox, { backgroundColor: card.gradient }]}>
              {card.icon}
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
            </View>
            <ChevronRight color={Colors.textLight} size={24} />
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 20,
    marginBottom: 16,
    gap: 16,
    ...Shadows.card,
  },
  cardIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
