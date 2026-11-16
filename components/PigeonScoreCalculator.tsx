import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Minus, Plus, RotateCcw } from 'lucide-react-native';
import { CriterionIcon } from '@/components/CriterionIcon';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows } from '@/lib/theme';
import { STANDARD_CRITERIA, STANDARDS_COPY, type StandardsCopy } from '@/lib/pigeon-standards';

const STEP = 0.5;
const MAX_TOTAL = STANDARD_CRITERIA.reduce((sum, c) => sum + c.points, 0);

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function gradeLabel(total: number, copy: StandardsCopy): string {
  const percent = (total / MAX_TOTAL) * 100;
  if (percent >= 90) return copy.excellent;
  if (percent >= 80) return copy.veryGood;
  if (percent >= 70) return copy.good;
  if (percent >= 60) return copy.fair;
  return copy.weak;
}

export function PigeonScoreCalculator() {
  const { language } = useLanguage();
  const copy = STANDARDS_COPY[language];
  const [scores, setScores] = useState<Record<string, number>>({});

  const total = STANDARD_CRITERIA.reduce((sum, c) => sum + (scores[c.id] ?? 0), 0);
  const progress = Math.min(total / MAX_TOTAL, 1);

  const adjust = (id: string, max: number, delta: number) => {
    setScores((prev) => {
      const next = Math.min(max, Math.max(0, (prev[id] ?? 0) + delta));
      return { ...prev, [id]: next };
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{copy.calcTitle}</Text>
      <Text style={styles.intro}>{copy.calcIntro}</Text>

      <View style={styles.summary}>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryLabel}>{copy.result}</Text>
            <Text style={styles.summaryValue}>
              {formatScore(total)} <Text style={styles.summaryMax}>/ {MAX_TOTAL}</Text>
            </Text>
          </View>
          <View style={styles.gradePill}>
            <Text style={styles.gradeText}>{gradeLabel(total, copy)}</Text>
          </View>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        <TouchableOpacity style={styles.resetBtn} onPress={() => setScores({})} activeOpacity={0.7}>
          <RotateCcw color={Colors.white} size={14} strokeWidth={2} />
          <Text style={styles.resetText}>{copy.reset}</Text>
        </TouchableOpacity>
      </View>

      {STANDARD_CRITERIA.map((criterion) => {
        const value = scores[criterion.id] ?? 0;
        return (
          <View key={criterion.id} style={styles.row}>
            <View style={styles.rowHead}>
              <View style={styles.iconBox}>
                <CriterionIcon name={criterion.icon} color={Colors.royalBlue} size={18} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{criterion.title[language]}</Text>
                <Text style={styles.rowMax}>
                  {copy.max} {criterion.points} {copy.points}
                </Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={[styles.stepBtn, value <= 0 && styles.stepBtnDisabled]}
                  disabled={value <= 0}
                  onPress={() => adjust(criterion.id, criterion.points, -STEP)}
                  accessibilityRole="button"
                  accessibilityLabel="-"
                  hitSlop={6}
                >
                  <Minus color={Colors.royalBlue} size={16} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.stepValue}>{formatScore(value)}</Text>
                <TouchableOpacity
                  style={[styles.stepBtn, value >= criterion.points && styles.stepBtnDisabled]}
                  disabled={value >= criterion.points}
                  onPress={() => adjust(criterion.id, criterion.points, STEP)}
                  accessibilityRole="button"
                  accessibilityLabel="+"
                  hitSlop={6}
                >
                  <Plus color={Colors.royalBlue} size={16} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.rowTrack}>
              <View style={[styles.rowFill, { width: `${(value / criterion.points) * 100}%` }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16 },
  intro: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  summary: {
    backgroundColor: Colors.royalBlue,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.royalBlueDark,
    ...Shadows.button,
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  summaryLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.goldLight },
  summaryValue: { fontFamily: 'Inter-Bold', fontSize: 32, color: Colors.white, marginTop: 2 },
  summaryMax: { fontFamily: 'Inter-Medium', fontSize: 16, color: Colors.goldLight },
  gradePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: Colors.gold },
  gradeText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlueDark },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: Colors.gold },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  resetText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.white },
  row: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  rowMax: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepValue: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text, minWidth: 40, textAlign: 'center' },
  rowTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.neutral100, overflow: 'hidden' },
  rowFill: { height: 6, borderRadius: 3, backgroundColor: Colors.royalBlue },
});
