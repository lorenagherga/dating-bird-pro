import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { PigeonCategoryPicker } from '@/components/PigeonCategoryPicker';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows } from '@/lib/theme';
import type { PigeonCategory } from '@/lib/types';

export function ProfileCategorySettings() {
  const { pigeonCategories, setPigeonCategories } = useAuth();
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Set<PigeonCategory>>(new Set(pigeonCategories ?? []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(new Set(pigeonCategories ?? []));
  }, [pigeonCategories]);

  const toggleCategory = (key: PigeonCategory) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setError(null);
    if (selected.size === 0) {
      setError(t('onbSelectAtLeast'));
      return;
    }
    setSaving(true);
    await setPigeonCategories(Array.from(selected));
    setSaving(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('profilePigeonTypesTitle')}</Text>
      <Text style={styles.subtitle}>{t('profilePigeonTypesSub')}</Text>

      <PigeonCategoryPicker selected={selected} onToggle={toggleCategory} variant="onLight" />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.saveButton, (saving || selected.size === 0) && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving || selected.size === 0}
        activeOpacity={0.85}
      >
        {saving ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <Text style={styles.saveButtonText}>{t('save')}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  title: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.text },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginTop: -8 },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error },
  saveButton: {
    backgroundColor: Colors.royalBlue,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    ...Shadows.button,
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.white },
});
