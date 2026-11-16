import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/lib/theme';
import { PIGEON_BREED_GROUPS, PIGEON_BREEDS } from '@/lib/pigeon-breeds';

interface Props {
  value: string;
  onChange: (breed: string) => void;
}

export function BreedPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(() => value !== '' && !PIGEON_BREEDS.includes(value));

  const selectListed = (breed: string) => {
    setCustom(false);
    setOpen(false);
    onChange(breed);
  };

  const selectCustom = () => {
    setCustom(true);
    setOpen(false);
    onChange('');
  };

  const isSelected = (breed: string) => !custom && value === breed;

  const buttonLabel = custom ? 'Altă rasă' : value || 'Selectează rasa';

  return (
    <View>
      <TouchableOpacity style={styles.button} onPress={() => setOpen(!open)} accessibilityRole="button">
        <Text style={[styles.buttonText, !value && !custom && styles.placeholder]}>{buttonLabel}</Text>
        <ChevronDown color={Colors.textSecondary} size={20} />
      </TouchableOpacity>

      {open && (
        <View style={styles.list}>
          <TouchableOpacity
            style={[styles.item, !value && !custom && styles.itemActive]}
            onPress={() => selectListed('')}
          >
            <Text style={[styles.itemText, !value && !custom && styles.itemTextActive]}>Fără rasă specificată</Text>
          </TouchableOpacity>
          {PIGEON_BREED_GROUPS.map(group => (
            <View key={group.title}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.breeds.map(breed => (
                <TouchableOpacity
                  key={breed}
                  style={[styles.item, isSelected(breed) && styles.itemActive]}
                  onPress={() => selectListed(breed)}
                >
                  <Text style={[styles.itemText, isSelected(breed) && styles.itemTextActive]}>{breed}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <TouchableOpacity
            style={[styles.item, custom && styles.itemActive]}
            onPress={selectCustom}
          >
            <Text style={[styles.itemText, custom && styles.itemTextActive]}>Altă rasă (scrie manual)</Text>
          </TouchableOpacity>
        </View>
      )}

      {custom && (
        <TextInput
          style={styles.customInput}
          value={value}
          onChangeText={onChange}
          placeholder="Scrie numele rasei"
          placeholderTextColor={Colors.textLight}
          maxLength={80}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.white,
  },
  buttonText: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.text, flex: 1 },
  placeholder: { color: Colors.textLight },
  list: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    maxHeight: 320,
    overflow: 'hidden',
  },
  groupTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: Colors.textSecondary,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  item: { paddingHorizontal: 14, paddingVertical: 10 },
  itemActive: { backgroundColor: Colors.royalBluePale },
  itemText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.text },
  itemTextActive: { fontFamily: 'Inter-SemiBold', color: Colors.royalBlue },
  customInput: {
    marginTop: 8,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.white,
  },
});
