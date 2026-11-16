import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TextInput } from 'react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Calculator } from 'lucide-react-native';

function parseWhole(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n >= 1 ? n : null;
}

export default function FciCalculatorScreen() {
  const { language } = useLanguage();
  const ro = language === 'ro';

  const [position, setPosition] = useState('');
  const [released, setReleased] = useState('');

  const result = useMemo(() => {
    const pos = parseWhole(position);
    const birds = parseWhole(released);
    if (pos === null || birds === null) return { coefficient: null, error: null };
    if (pos > birds) {
      return {
        coefficient: null,
        error: ro
          ? 'Poziția nu poate fi mai mare decât numărul de porumbei eliberați.'
          : 'Position cannot be greater than the number of birds released.',
      };
    }
    return { coefficient: ((pos / birds) * 1000).toFixed(2), error: null };
  }, [position, released, ro]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={ro ? 'Calcul puncte FCI' : 'FCI points calculator'}
        subtitle={ro ? 'Coeficient din poziție și număr de porumbei' : 'Coefficient from position and birds released'}
        showBack
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}>
              <Calculator color={Colors.royalBlue} size={20} strokeWidth={2} />
            </View>
            <Text style={styles.cardTitle}>{ro ? 'Date concurs' : 'Race data'}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{ro ? 'Poziția ta în clasament' : 'Your position in the ranking'}</Text>
            <TextInput
              style={styles.input}
              value={position}
              onChangeText={setPosition}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{ro ? 'Porumbei eliberați' : 'Birds released'}</Text>
            <TextInput
              style={styles.input}
              value={released}
              onChangeText={setReleased}
              keyboardType="number-pad"
              placeholder="500"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          {result.error && <Text style={styles.errorText}>{result.error}</Text>}
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>{ro ? 'Coeficient FCI' : 'FCI coefficient'}</Text>
          <Text style={styles.resultValue}>{result.coefficient ?? '—'}</Text>
          <Text style={styles.resultHint}>
            {ro
              ? 'Calculat ca (poziție / porumbei eliberați) × 1000, cu 2 zecimale.'
              : 'Calculated as (position / birds released) × 1000, rounded to 2 decimals.'}
          </Text>
        </View>

        <Text style={styles.disclaimer}>
          {ro
            ? 'Formula este cea standard FCI folosită și în palmares. Verifică regulamentul federației tale pentru cazuri speciale.'
            : 'This is the standard FCI formula also used in the record book. Check your federation rules for special cases.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 40, gap: 16 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 16,
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
  field: { gap: 8 },
  label: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.text },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 16,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 20, color: Colors.text },
  resultCard: {
    backgroundColor: Colors.goldLight,
    borderRadius: 16,
    padding: 16,
    gap: 4,
    alignItems: 'center',
  },
  resultLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.goldDark },
  resultValue: { fontFamily: 'Inter-Bold', fontSize: 32, color: Colors.text },
  resultHint: { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 18, color: Colors.textSecondary, textAlign: 'center' },
  disclaimer: { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 18, color: Colors.textSecondary },
});
