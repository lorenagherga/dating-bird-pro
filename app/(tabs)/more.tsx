import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import {
  Calendar,
  Calculator,
  ScanLine,
  FileText,
  Trophy,
  Navigation,
  Award,
  User,
  Shield,
  Stethoscope,
  ChevronRight,
  Building2,
  Route as RouteIcon,
  Crown,
  Heart,
} from 'lucide-react-native';

interface MoreItem {
  icon: React.ReactNode;
  label: string;
  route: string;
  adminOnly?: boolean;
}

export default function MoreScreen() {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const router = useRouter();

  const breedingItems: MoreItem[] = [
    { icon: <Calendar color={Colors.royalBlue} size={22} />, label: t('tabNests'), route: '/(tabs)/nests' },
    { icon: <Crown color={Colors.royalBlue} size={22} />, label: t('tabPedSt'), route: '/(tabs)/pedigree-studio' },
    { icon: <Heart color={Colors.royalBlue} size={22} />, label: t('tabBreedMatch'), route: '/(tabs)/breeding-match' },
    { icon: <Calculator color={Colors.royalBlue} size={22} />, label: t('tabGenetic'), route: '/(tabs)/calculator' },
    { icon: <ScanLine color={Colors.royalBlue} size={22} />, label: t('tabScanPedigree'), route: '/(tabs)/scan-pedigree' },
    { icon: <FileText color={Colors.royalBlue} size={22} />, label: t('tabPdfCatalog'), route: '/(tabs)/pdf-catalog' },
    { icon: <Stethoscope color={Colors.royalBlue} size={22} />, label: t('tabDoctor'), route: '/(tabs)/doctor' },
  ];

  const competitionItems: MoreItem[] = [
    { icon: <Trophy color={Colors.royalBlue} size={22} />, label: t('tabRaces'), route: '/(tabs)/races' },
    { icon: <Building2 color={Colors.royalBlue} size={22} />, label: t('tabColumbodroms'), route: '/(tabs)/columbodroms' },
    { icon: <RouteIcon color={Colors.royalBlue} size={22} />, label: t('tabGpsTracks'), route: '/(tabs)/gps-tracks' },
    { icon: <Navigation color={Colors.royalBlue} size={22} />, label: t('tabCopilot'), route: '/(tabs)/copilot' },
    { icon: <Award color={Colors.royalBlue} size={22} />, label: t('tabVitrina'), route: '/(tabs)/vitrina' },
  ];

  const accountItems: MoreItem[] = [
    { icon: <User color={Colors.royalBlue} size={22} />, label: t('tabProfile'), route: '/(tabs)/profile' },
    { icon: <Shield color={Colors.royalBlue} size={22} />, label: t('tabAdmin'), route: '/(tabs)/admin', adminOnly: true },
  ];

  const renderSection = (title: string, items: MoreItem[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        {items
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item, index) => (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.itemRow,
                index < items.filter((i) => !i.adminOnly || isAdmin).length - 1 && styles.itemRowBorder,
              ]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.6}
            >
              <View style={styles.itemIconBox}>{item.icon}</View>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <ChevronRight color={Colors.textLight} size={20} />
            </TouchableOpacity>
          ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('moreTitle')} subtitle={t('moreSub')} />

        {renderSection(t('moreSectionBreeding'), breedingItems)}
        {renderSection(t('moreSectionCompetitions'), competitionItems)}
        {renderSection(t('moreSectionAccount'), accountItems)}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.card,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemLabel: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
});
