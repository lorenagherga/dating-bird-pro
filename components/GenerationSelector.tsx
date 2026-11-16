import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/lib/theme';
import { MAX_GENERATIONS, MIN_GENERATIONS } from '@/lib/pedigree/pedigree-tree';

const OPTIONS = Array.from({ length: MAX_GENERATIONS - MIN_GENERATIONS + 1 }, (_, index) => MIN_GENERATIONS + index);

interface GenerationSelectorProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function GenerationSelector({ label, value, onChange }: GenerationSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {OPTIONS.map((option) => {
          const active = option === value;
          return (
            <TouchableOpacity
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(option)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary },
  row: { gap: 8, paddingVertical: 2 },
  chip: {
    minWidth: 44,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: { backgroundColor: Colors.royalBlue, borderColor: Colors.royalBlue },
  chipText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  chipTextActive: { color: Colors.white },
});
