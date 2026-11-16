import { StyleSheet, Text, View } from 'react-native';
import { BadgeCheck, Percent } from 'lucide-react-native';
import { useLanguage } from '@/lib/language-context';
import { Colors, BorderRadius } from '@/lib/theme';
import { calculateCommission } from '@/lib/commission';
import type { CommissionRole } from '@/lib/types';

interface CommissionSummaryProps {
  rate: number;
  role: CommissionRole;
  amount?: number;
}

export function CommissionSummary({ rate, role, amount }: CommissionSummaryProps) {
  const { t } = useLanguage();

  if (role === 'ambassador') {
    return (
      <View style={[styles.box, styles.boxAmbassador]}>
        <BadgeCheck color={Colors.goldDark} size={18} />
        <View style={styles.textBox}>
          <Text style={styles.titleAmbassador}>{t('commBenefitTitle')}</Text>
          <Text style={styles.body}>{t('commBenefitBody')}</Text>
          {amount !== undefined && (
            <Text style={styles.bodyStrong}>{t('commBenefitNet')}: {amount} {t('aucLei')}</Text>
          )}
        </View>
      </View>
    );
  }

  const commission = amount !== undefined ? calculateCommission(amount, rate) : null;
  const net = commission !== null && amount !== undefined ? Math.round((amount - commission) * 100) / 100 : null;
  const amountSuffix = commission !== null ? ` (${commission} ${t('aucLei')})` : '';
  const netSuffix = net !== null ? ` | Vei primi net: ${net} ${t('aucLei')}` : '';

  if (role === 'partner') {
    return (
      <View style={[styles.box, styles.boxPartner]}>
        <BadgeCheck color={Colors.success} size={18} />
        <View style={styles.textBox}>
          <Text style={styles.title}>
            Tarif preferențial Partener: {rate}% comision{amountSuffix}{netSuffix}.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.box, styles.boxStandard]}>
      <Percent color={Colors.royalBlue} size={18} />
      <View style={styles.textBox}>
        <Text style={styles.title}>
          Comision platformă: {rate}%{amountSuffix}{netSuffix}.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: BorderRadius.md,
    padding: 16, borderWidth: 1,
  },
  boxStandard: { backgroundColor: Colors.royalBluePale, borderColor: Colors.royalBlueBorder },
  boxPartner: { backgroundColor: Colors.successBg, borderColor: Colors.success },
  boxAmbassador: { backgroundColor: Colors.goldPale, borderColor: Colors.gold },
  textBox: { flex: 1, gap: 4 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text, lineHeight: 20 },
  titleAmbassador: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.goldDark, lineHeight: 20 },
  body: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  bodyStrong: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.text, lineHeight: 20 },
});
