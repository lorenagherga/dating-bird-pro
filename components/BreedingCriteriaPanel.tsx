import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Check, Plus, X, Dna, Trophy, Zap, Route, Tag } from 'lucide-react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors, BorderRadius } from '@/lib/theme';
import type { MatchCriteria } from '@/lib/breeding-match';
import { GAME_STYLE_LABELS, GAME_STYLE_OPTIONS, type GameStyle } from '@/lib/types';

interface Props {
  criteria: MatchCriteria;
  onToggle: (key: keyof MatchCriteria) => void;
  playStyle: GameStyle | null;
  onPlayStyleChange: (style: GameStyle | null) => void;
  customCriteria: string[];
  onAddCustom: (text: string) => void;
  onRemoveCustom: (index: number) => void;
}

export function BreedingCriteriaPanel({
  criteria,
  onToggle,
  playStyle,
  onPlayStyleChange,
  customCriteria,
  onAddCustom,
  onRemoveCustom,
}: Props) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState('');

  const submitCustom = () => {
    const text = draft.trim();
    if (!text) return;
    onAddCustom(text);
    setDraft('');
  };

  const mainOptions: { key: keyof MatchCriteria; label: string; desc: string; icon: typeof Dna }[] = [
    { key: 'avoidKinship', label: t('bmCritKinship'), desc: t('bmCritKinshipDesc'), icon: Dna },
    { key: 'rewardPerformance', label: t('bmCritPerformance'), desc: t('bmCritPerformanceDesc'), icon: Trophy },
  ];

  const extraOptions: { key: keyof MatchCriteria; label: string; desc: string; icon: typeof Dna }[] = [
    { key: 'sameGameStyle', label: t('bmCritGameStyle'), desc: t('bmCritGameStyleDesc'), icon: Zap },
    { key: 'sameBreed', label: 'Aceeași rasă', desc: 'Prioritizează perechile din aceeași rasă', icon: Tag },
    { key: 'longDistance', label: t('bmCritLongDistance'), desc: t('bmCritLongDistanceDesc'), icon: Route },
  ];

  const renderOption = (opt: typeof mainOptions[number]) => {
    const checked = criteria[opt.key];
    const Icon = opt.icon;
    return (
      <TouchableOpacity
        key={opt.key}
        style={[styles.option, checked && styles.optionChecked]}
        onPress={() => onToggle(opt.key)}
        activeOpacity={0.8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <Check color={Colors.white} size={14} strokeWidth={3} />}
        </View>
        <Icon color={checked ? Colors.royalBlue : Colors.textLight} size={18} />
        <View style={styles.optionText}>
          <Text style={styles.optionLabel}>{opt.label}</Text>
          <Text style={styles.optionDesc}>{opt.desc}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{t('bmCriteriaTitle')}</Text>
      <Text style={styles.subtitle}>{t('bmCriteriaSub')}</Text>

      <View style={styles.list}>{mainOptions.map(renderOption)}</View>

      <Text style={styles.sectionLabel}>{t('bmCritExtra')}</Text>
      <View style={styles.list}>{extraOptions.map(renderOption)}</View>

      <Text style={styles.sectionLabel}>Stil de joc</Text>
      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[styles.filterChip, !playStyle && styles.filterChipActive]}
          onPress={() => onPlayStyleChange(null)}
          accessibilityRole="button"
        >
          <Text style={[styles.filterChipText, !playStyle && styles.filterChipTextActive]}>Toate</Text>
        </TouchableOpacity>
        {GAME_STYLE_OPTIONS.map(style => {
          const active = playStyle === style;
          return (
            <TouchableOpacity
              key={style}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => onPlayStyleChange(style)}
              accessibilityRole="button"
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {GAME_STYLE_LABELS[style]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>{t('bmCustomTitle')}</Text>
      <View style={styles.customRow}>
        <TextInput
          style={styles.customInput}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('bmCustomPlaceholder')}
          placeholderTextColor={Colors.textLight}
          onSubmitEditing={submitCustom}
          returnKeyType="done"
          maxLength={120}
        />
        <TouchableOpacity
          style={[styles.customAddBtn, !draft.trim() && styles.customAddBtnDisabled]}
          onPress={submitCustom}
          disabled={!draft.trim()}
          accessibilityRole="button"
        >
          <Plus color={Colors.white} size={16} />
          <Text style={styles.customAddText}>{t('bmCustomAdd')}</Text>
        </TouchableOpacity>
      </View>

      {customCriteria.length > 0 && (
        <View style={styles.chipsRow}>
          {customCriteria.map((c, i) => (
            <View key={`${c}-${i}`} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>{c}</Text>
              <TouchableOpacity onPress={() => onRemoveCustom(i)} hitSlop={8} accessibilityLabel={t('bmCustomRemove')}>
                <X color={Colors.royalBlue} size={14} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
    marginBottom: 16,
  },
  title: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: -6 },
  sectionLabel: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  list: { gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  optionChecked: { borderColor: Colors.royalBlue, backgroundColor: Colors.royalBluePale },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  checkboxChecked: { backgroundColor: Colors.royalBlue, borderColor: Colors.royalBlue },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  optionDesc: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  customRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  customInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.white,
  },
  customAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.royalBlue,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  customAddBtnDisabled: { opacity: 0.4 },
  customAddText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.white },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  filterChipActive: { borderColor: Colors.royalBlue, backgroundColor: Colors.royalBluePale },
  filterChipText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.royalBlue },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    backgroundColor: Colors.royalBluePale,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.royalBlue, flexShrink: 1 },
});
