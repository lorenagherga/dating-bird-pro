import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useLanguage } from '@/lib/language-context';
import { PigeonSilhouette } from '@/components/PigeonSilhouette';
import { ChevronRight, Crown, type LucideIcon } from 'lucide-react-native';

export interface HubItem {
  label: string;
  subtitle?: string;
  icon: LucideIcon;
  route: string;
  locked?: boolean;
}

export interface HubSection {
  title: string;
  items: HubItem[];
}

interface CategoryHubProps {
  title: string;
  subtitle: string;
  sections: HubSection[];
  children?: ReactNode;
}

export function CategoryHub({ title, subtitle, sections, children }: CategoryHubProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const handlePress = (item: HubItem) => {
    if (item.locked) {
      Alert.alert(t('premiumFeature'), t('premiumMsg'), [
        { text: t('seePlans'), onPress: () => router.push('/(tabs)/more') },
        { text: t('close') },
      ]);
      return;
    }
    router.push(item.route as any);
  };

  return (
    <View style={styles.container}>
      <PigeonSilhouette width={240} style={styles.backdrop} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={title} subtitle={subtitle} />

        {children}

        {sections
          .filter((section) => section.items.length > 0)
          .map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionCard}>
                <PigeonSilhouette width={96} style={styles.cardPigeon} />
                {section.items.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.route + item.label}
                      style={[styles.row, index < section.items.length - 1 && styles.rowBorder]}
                      onPress={() => handlePress(item)}
                      activeOpacity={0.6}
                    >
                      <View style={styles.iconBox}>
                        <Icon color={Colors.royalBlueAccent} size={22} />
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.rowLabel}>{item.label}</Text>
                        {item.subtitle ? <Text style={styles.rowSubtitle}>{item.subtitle}</Text> : null}
                      </View>
                      {item.locked ? (
                        <Crown color={Colors.gold} size={18} strokeWidth={1.5} />
                      ) : (
                        <ChevronRight color={Colors.royalBlueLight} size={20} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  backdrop: { position: 'absolute', top: 90, right: -70 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: Colors.royalBlueMist,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.royalBlueBorder,
    overflow: 'hidden',
    ...Shadows.card,
  },
  cardPigeon: { position: 'absolute', top: -6, right: -8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.royalBlueBorder },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.royalBlueSoft,
    borderWidth: 1,
    borderColor: Colors.royalBlueBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text },
  rowSubtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
});
