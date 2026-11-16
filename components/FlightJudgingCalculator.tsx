import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows } from '@/lib/theme';
import {
  calculateFlightScore,
  validateFlightJudging,
  type FlightJudgingError,
  type FlightJudgingInput,
} from '@/lib/flight-judging';

const EMPTY_FORM = { duration: '', ceiling: '', style: '', descent: '', penalties: '' };

function parseNumber(value: string): number {
  return value.trim() === '' ? 0 : Number(value.replace(',', '.'));
}

export function FlightJudgingCalculator() {
  const { t } = useLanguage();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<FlightJudgingError | null>(null);
  const [score, setScore] = useState<number | null>(null);

  const update = (key: keyof typeof EMPTY_FORM) => (text: string) => {
    setForm((prev) => ({ ...prev, [key]: text }));
    setScore(null);
    setError(null);
  };

  const handleCalculate = () => {
    const input: FlightJudgingInput = {
      durationMinutes: parseNumber(form.duration),
      ceilingMinutes: parseNumber(form.ceiling),
      stylePoints: parseNumber(form.style),
      descentPenalty: parseNumber(form.descent),
      penalties: parseNumber(form.penalties),
    };
    const problem = validateFlightJudging(input);
    if (problem) {
      setError(problem);
      setScore(null);
      return;
    }
    setError(null);
    setScore(calculateFlightScore(input));
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setScore(null);
  };

  const errorMessage = (() => {
    if (!error) return null;
    if (error === 'duration') return t('fltJudgeErrDuration');
    if (error === 'ceiling') return t('fltJudgeErrCeiling');
    if (error === 'style') return t('fltJudgeErrStyle');
    return t('fltJudgeErrNegative');
  })();

  const fields: { key: keyof typeof EMPTY_FORM; label: string; placeholder: string }[] = [
    { key: 'duration', label: t('fltJudgeDuration'), placeholder: '45' },
    { key: 'ceiling', label: t('fltJudgeCeiling'), placeholder: '10' },
    { key: 'style', label: t('fltJudgeStyle'), placeholder: '7' },
    { key: 'descent', label: t('fltJudgeDescent'), placeholder: '0' },
    { key: 'penalties', label: t('fltJudgePenalties'), placeholder: '0' },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{t('fltJudgeTitle')}</Text>
      <Text style={styles.intro}>{t('fltJudgeIntro')}</Text>

      <View style={styles.card}>
        {fields.map((field) => (
          <View key={field.key} style={styles.field}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput
              style={styles.input}
              value={form[field.key]}
              onChangeText={update(field.key)}
              placeholder={field.placeholder}
              placeholderTextColor={Colors.textLight}
              keyboardType="decimal-pad"
            />
          </View>
        ))}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
            <RotateCcw color={Colors.royalBlue} size={16} strokeWidth={2} />
            <Text style={styles.resetText}>{t('fltJudgeReset')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.calcBtn} onPress={handleCalculate} activeOpacity={0.85}>
            <Text style={styles.calcText}>{t('fltJudgeCalc')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {score !== null ? (
        <View style={styles.result}>
          <Text style={styles.resultLabel}>{t('fltJudgeResult')}</Text>
          <Text style={styles.resultValue}>{score.toFixed(1)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginTop: 8 },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.text },
  intro: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.royalBlueBorder,
    ...Shadows.card,
  },
  field: { gap: 6 },
  label: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.neutral50,
  },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.neutral100,
  },
  resetText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.royalBlue },
  calcBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.royalBlue,
    ...Shadows.button,
  },
  calcText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.white },
  result: {
    backgroundColor: Colors.royalBlue,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 4,
  },
  resultLabel: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.goldLight },
  resultValue: { fontFamily: 'Inter-Bold', fontSize: 40, color: Colors.white },
});
