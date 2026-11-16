import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { CriterionIcon } from '@/components/CriterionIcon';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows } from '@/lib/theme';
import { STANDARD_CRITERIA, STANDARDS_COPY } from '@/lib/pigeon-standards';

export function StandardsChecklist() {
  const { language } = useLanguage();
  const copy = STANDARDS_COPY[language];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{copy.listTitle}</Text>
      <Text style={styles.hint}>{copy.hint}</Text>

      {STANDARD_CRITERIA.map((criterion) => {
        const open = expandedId === criterion.id;
        return (
          <View key={criterion.id} style={[styles.card, open && styles.cardOpen]}>
            <TouchableOpacity
              style={styles.head}
              activeOpacity={0.7}
              onPress={() => setExpandedId(open ? null : criterion.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
            >
              <View style={styles.iconBox}>
                <CriterionIcon name={criterion.icon} color={Colors.royalBlue} />
              </View>
              <Text style={styles.cardTitle}>{criterion.title[language]}</Text>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsText}>
                  {criterion.points} {copy.points}
                </Text>
              </View>
              <View style={open ? styles.chevronOpen : undefined}>
                <ChevronDown color={Colors.royalBlue} size={18} strokeWidth={2} />
              </View>
            </TouchableOpacity>

            {open && (
              <View style={styles.items}>
                {criterion.items[language].map((item) => (
                  <View key={item} style={styles.itemRow}>
                    <Check color={Colors.royalBlue} size={14} strokeWidth={2.5} style={styles.itemIcon} />
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  hint: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  cardOpen: { borderColor: Colors.royalBlueBorder, ...Shadows.card },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  pointsBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: Colors.goldLight },
  pointsText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.goldDark },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  items: {
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: 0,
  },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemIcon: { marginTop: 4 },
  itemText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21, color: Colors.text },
});
