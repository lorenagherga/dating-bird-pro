import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Zap, Crown, Sparkles, Check } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors, BorderRadius } from '@/lib/theme';
import type { PigeonCategory } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';

interface CategoryOption {
  key: PigeonCategory;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  icon: LucideIcon;
}

export const PIGEON_CATEGORY_OPTIONS: CategoryOption[] = [
  { key: 'voiajori', titleKey: 'onbVoiajori', descKey: 'onbVoiajoriDesc', icon: Zap },
  { key: 'frumusete', titleKey: 'onbFrumusete', descKey: 'onbFrumuseteDesc', icon: Crown },
  { key: 'joc_zbor', titleKey: 'onbJocZbor', descKey: 'onbJocZborDesc', icon: Sparkles },
];

interface Props {
  selected: Set<PigeonCategory>;
  onToggle: (key: PigeonCategory) => void;
  variant: 'onDark' | 'onLight';
}

export function PigeonCategoryPicker({ selected, onToggle, variant }: Props) {
  const { t } = useLanguage();
  const dark = variant === 'onDark';

  return (
    <View style={styles.list}>
      {PIGEON_CATEGORY_OPTIONS.map((option) => {
        const isSelected = selected.has(option.key);
        const Icon = option.icon;
        return (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.card,
              dark ? styles.cardDark : styles.cardLight,
              isSelected && (dark ? styles.cardDarkSelected : styles.cardLightSelected),
            ]}
            onPress={() => onToggle(option.key)}
            activeOpacity={0.75}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
          >
            <View style={styles.row}>
              <View
                style={[
                  styles.iconBox,
                  dark ? styles.iconBoxDark : styles.iconBoxLight,
                  isSelected && (dark ? styles.iconBoxDarkSelected : styles.iconBoxLightSelected),
                ]}
              >
                <Icon color={isSelected ? Colors.white : dark ? Colors.goldLight : Colors.royalBlue} size={26} />
              </View>
              <View style={styles.textBox}>
                <Text style={[styles.title, dark ? styles.titleDark : styles.titleLight]}>{t(option.titleKey)}</Text>
                <Text style={[styles.description, dark ? styles.descDark : styles.descLight]}>{t(option.descKey)}</Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  dark ? styles.checkboxDark : styles.checkboxLight,
                  isSelected && (dark ? styles.checkboxDarkSelected : styles.checkboxLightSelected),
                ]}
              >
                {isSelected && <Check color={dark ? Colors.royalBlueDark : Colors.white} size={16} />}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 14 },
  card: {
    borderRadius: BorderRadius.lg,
    padding: 20,
    borderWidth: 1.5,
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cardDarkSelected: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  cardLight: {
    backgroundColor: Colors.white,
    borderColor: Colors.borderLight,
  },
  cardLightSelected: {
    borderColor: Colors.royalBlue,
    backgroundColor: Colors.royalBluePale,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxDark: { backgroundColor: 'rgba(255,255,255,0.12)' },
  iconBoxDarkSelected: { backgroundColor: Colors.gold },
  iconBoxLight: { backgroundColor: Colors.royalBluePale },
  iconBoxLightSelected: { backgroundColor: Colors.royalBlue },
  textBox: { flex: 1 },
  title: { fontFamily: 'Inter-Bold', fontSize: 16, marginBottom: 2 },
  titleDark: { color: Colors.white },
  titleLight: { color: Colors.text },
  description: { fontFamily: 'Inter-Regular', fontSize: 13 },
  descDark: { color: 'rgba(255,255,255,0.7)' },
  descLight: { color: Colors.textSecondary },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxDark: { borderColor: 'rgba(255,255,255,0.3)' },
  checkboxDarkSelected: { borderColor: Colors.gold, backgroundColor: Colors.gold },
  checkboxLight: { borderColor: Colors.border },
  checkboxLightSelected: { borderColor: Colors.royalBlue, backgroundColor: Colors.royalBlue },
});
