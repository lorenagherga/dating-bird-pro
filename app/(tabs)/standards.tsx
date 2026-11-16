import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Award } from 'lucide-react-native';
import { CriterionIcon } from '@/components/CriterionIcon';
import { STANDARD_CRITERIA, STANDARDS_COPY } from '@/lib/pigeon-standards';

const TOTAL_POINTS = STANDARD_CRITERIA.reduce((sum, c) => sum + c.points, 0);

export default function StandardsScreen() {
  const { language } = useLanguage();
  const copy = STANDARDS_COPY[language];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={copy.title} subtitle={copy.subtitle} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{copy.intro}</Text>

        {STANDARD_CRITERIA.map((criterion) => {
          return (
            <View key={criterion.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <CriterionIcon name={criterion.icon} color={Colors.royalBlue} />
                </View>
                <Text style={styles.cardTitle}>{criterion.title[language]}</Text>
                <View style={styles.pointsBadge}>
                  <Text style={styles.pointsText}>
                    {criterion.points} {copy.points}
                  </Text>
                </View>
              </View>
              {criterion.items[language].map((item) => (
                <View key={item} style={styles.itemRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.totalCard}>
          <Award color={Colors.goldDark} size={24} strokeWidth={2} />
          <View style={styles.totalTextBox}>
            <Text style={styles.totalLabel}>{copy.total}</Text>
            <Text style={styles.totalValue}>
              {TOTAL_POINTS} {copy.points}
            </Text>
          </View>
        </View>

        <Text style={styles.disclaimer}>{copy.disclaimer}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 40, gap: 16 },
  intro: { fontFamily: 'Inter-Regular', fontSize: 15, lineHeight: 22, color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text },
  pointsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.goldLight,
  },
  pointsText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.goldDark },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.royalBlue,
    marginTop: 7,
  },
  itemText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21, color: Colors.text },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.goldLight,
    borderRadius: 16,
    padding: 16,
  },
  totalTextBox: { flex: 1, gap: 2 },
  totalLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.goldDark },
  totalValue: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.text },
  disclaimer: { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 18, color: Colors.textSecondary },
});
