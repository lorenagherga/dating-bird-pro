import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  ChevronRight, Bird, Check, Gavel, X, Mars, Venus, Trophy, Crown, Megaphone,
} from 'lucide-react-native';
import {
  fetchPromotionFee,
  getPromotionText,
  requestAuctionPromotion,
} from '@/lib/promotion';
import { fetchCommissionRates, getCommissionRateForRole, type CommissionRates } from '@/lib/commission';
import { CommissionSummary } from '@/components/CommissionSummary';
import { fetchMyCommissionBalance } from '@/lib/commission-wallet';

interface PigeonOption {
  id: string;
  ring_series: string;
  color: string;
  sex: string;
  is_champion: boolean;
  year: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const DURATION_OPTIONS = [
  { days: 3, key: 'auc3Days' },
  { days: 5, key: 'auc5Days' },
  { days: 7, key: 'auc7Days' },
] as const;

export default function AuctionCreateScreen() {
  const { t, language } = useLanguage();
  const promoText = getPromotionText(language);
  const { profile, isAdmin, isAmbassador, commissionRole } = useAuth();
  const router = useRouter();
  const [pigeons, setPigeons] = useState<PigeonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPigeon, setSelectedPigeon] = useState<PigeonOption | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('50');
  const [minBidStep, setMinBidStep] = useState('10');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [duration, setDuration] = useState(7);
  const [creating, setCreating] = useState(false);
  const [promoteListing, setPromoteListing] = useState(false);
  const [promoFee, setPromoFee] = useState<number | null>(null);
  const [commissionRates, setCommissionRates] = useState<CommissionRates | null>(null);
  const [commissionAccepted, setCommissionAccepted] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const commissionRate = commissionRates ? getCommissionRateForRole(commissionRole, commissionRates) : null;

  useEffect(() => {
    fetchPromotionFee().then(setPromoFee).catch(() => setPromoFee(null));
    fetchCommissionRates().then(setCommissionRates).catch(() => setCommissionRates(null));
    fetchMyCommissionBalance().then(setWalletBalance).catch(() => setWalletBalance(null));
  }, []);
  const promoIsFree = isAdmin || isAmbassador;
  const startPriceValue = parseInt(startingPrice, 10) || 0;
  const requiredCommission = commissionRate !== null
    ? Math.round(startPriceValue * commissionRate) / 100
    : 0;
  const walletShortfall = !isAmbassador && walletBalance !== null && walletBalance < requiredCommission;
  const canPublish = isAmbassador || (commissionRate !== null && commissionAccepted && !walletShortfall);

  const commissionErrorMessage = (message: string) => {
    if (message.includes('commission_rate_changed')) return t('commRateChanged');
    if (message.includes('commission_not_accepted')) return t('commNotAccepted');
    if (message.includes('insufficient_commission_wallet')) {
      return 'Soldul din portofelul de comisioane nu acoperă comisionul necesar. Alimentează portofelul din Profil.';
    }
    return message;
  };

  const loadPigeons = useCallback(async () => {
    const { data } = await supabase
      .from('pigeons')
      .select('id, ring_series, color, sex, is_champion, year')
      .eq('status', 'În crescătorie')
      .order('ring_series', { ascending: true });
    setPigeons((data || []) as PigeonOption[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPigeons();
  }, [loadPigeons]);

  const handleCreate = async () => {
    if (!selectedPigeon) {
      Alert.alert(t('error'), t('aucSelectPigeon'));
      return;
    }
    if (!title.trim()) {
      Alert.alert(t('error'), t('aucAuctionTitle'));
      return;
    }
    const startPrice = parseInt(startingPrice, 10);
    const step = parseInt(minBidStep, 10);
    if (isNaN(startPrice) || startPrice < 1) {
      Alert.alert(t('error'), t('aucStartingPrice2'));
      return;
    }
    if (isNaN(step) || step < 1) {
      Alert.alert(t('error'), t('aucMinBidStep'));
      return;
    }

    if (!isAmbassador && (commissionRate === null || !commissionAccepted)) {
      Alert.alert(t('error'), commissionRate === null ? t('commRateUnavailable') : t('commAcceptRequired'));
      return;
    }

    setCreating(true);
    const endTime = new Date(Date.now() + duration * DAY_MS);

    const { data: created, error } = await supabase.from('auctions').insert({
      seller_id: profile?.id,
      pigeon_id: selectedPigeon.id,
      title: title.trim(),
      description: description.trim(),
      starting_price: startPrice,
      min_bid_step: step,
      current_price: startPrice,
      end_time: endTime.toISOString(),
      status: 'active',
      bid_count: 0,
      buy_now_price: buyNowPrice ? parseInt(buyNowPrice, 10) : null,
      commission_rate_accepted: isAmbassador ? null : commissionRate,
      commission_accepted_at: isAmbassador ? null : new Date().toISOString(),
    }).select('id').maybeSingle();

    if (!error && created?.id && promoteListing) {
      try {
        await requestAuctionPromotion(created.id, true);
      } catch {
        setCreating(false);
        Alert.alert(t('error'), promoText.error);
        router.replace('/(tabs)/auctions');
        return;
      }
    }

    setCreating(false);
    if (error) {
      Alert.alert(t('error'), commissionErrorMessage(error.message));
      return;
    }
    Alert.alert(t('aucCreated'), t('aucCreatedMsg'), [
      { text: 'OK', onPress: () => router.replace('/(tabs)/auctions') },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <X color={Colors.textSecondary} size={22} />
          <Text style={styles.backBtnText}>{t('aucCancel')}</Text>
        </TouchableOpacity>

        <ScreenHeader title={t('aucCreateTitle')} subtitle={t('aucCreateSub')} showBack />

        <Text style={styles.sectionLabel}>{t('aucSelectPigeon')}</Text>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 20 }} />
        ) : pigeons.length === 0 ? (
          <View style={styles.emptyPigeons}>
            <Bird color={Colors.textLight} size={32} />
            <Text style={styles.emptyPigeonsText}>{t('aucNoPigeonsAvail')}</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pigeonScroll}>
            <View style={{ flexDirection: 'row', gap: 10, paddingRight: 24 }}>
              {pigeons.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pigeonChip, selectedPigeon?.id === p.id && styles.pigeonChipActive]}
                  onPress={() => setSelectedPigeon(p)}
                >
                  {selectedPigeon?.id === p.id && (
                    <View style={styles.chipCheck}>
                      <Check color={Colors.white} size={12} />
                    </View>
                  )}
                  <View style={styles.chipHeader}>
                    {p.sex === 'Mascul' ? <Mars color={Colors.royalBlue} size={14} /> : <Venus color={Colors.error} size={14} />}
                    {p.is_champion && <Trophy color={Colors.gold} size={12} />}
                  </View>
                  <Text style={[styles.chipRing, selectedPigeon?.id === p.id && styles.chipRingActive]}>{p.ring_series}</Text>
                  <Text style={[styles.chipColor, selectedPigeon?.id === p.id && styles.chipColorActive]} numberOfLines={1}>{p.color}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {selectedPigeon && (
          <View style={styles.selectedCard}>
            <View style={styles.selectedIconBox}>
              <Bird color={Colors.royalBlue} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedRing}>{selectedPigeon.ring_series}</Text>
              <Text style={styles.selectedInfo}>{selectedPigeon.sex} · {selectedPigeon.color}</Text>
            </View>
            <Check color={Colors.success} size={22} />
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>{t('aucAuctionTitle')}</Text>
          <TextInput
            style={styles.formInput}
            value={title}
            onChangeText={setTitle}
            placeholder={t('aucTitlePlaceholder')}
            placeholderTextColor={Colors.textLight}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>{t('aucDescription')}</Text>
          <TextInput
            style={[styles.formInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('aucDescPlaceholder')}
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.formLabel}>{t('aucStartingPrice2')}</Text>
            <View style={styles.priceInputRow}>
              <TextInput
                style={styles.priceInput}
                value={startingPrice}
                onChangeText={setStartingPrice}
                keyboardType="numeric"
              />
              <Text style={styles.priceSuffix}>{t('aucLei')}</Text>
            </View>
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.formLabel}>{t('aucMinBidStep')}</Text>
            <View style={styles.priceInputRow}>
              <TextInput
                style={styles.priceInput}
                value={minBidStep}
                onChangeText={setMinBidStep}
                keyboardType="numeric"
              />
              <Text style={styles.priceSuffix}>{t('aucLei')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>{t('aucBuyNowPrice')}</Text>
          <View style={styles.priceInputRow}>
            <TextInput
              style={styles.priceInput}
              value={buyNowPrice}
              onChangeText={setBuyNowPrice}
              keyboardType="numeric"
              placeholder="2000"
              placeholderTextColor={Colors.textLight}
            />
            <Text style={styles.priceSuffix}>{t('aucLei')}</Text>
          </View>
          <Text style={styles.buyNowHint}>{t('aucBuyNowHint')}</Text>
        </View>

        {commissionRate === 0 && !isAmbassador && (
          <View style={styles.launchPromoBox}>
            <Text style={styles.launchPromoTitle}>Promoție Lansare: 0% comision (Gratuit)</Text>
            <Text style={styles.launchPromoBody}>
              Licitația ta nu are comision. Rata de 0% se păstrează până la încheierea licitației, chiar dacă platforma va stabili un comision ulterior.
            </Text>
          </View>
        )}

        {commissionRate !== null || isAmbassador ? (
          <View style={styles.commissionWrap}>
            <CommissionSummary
              rate={commissionRate ?? 0}
              role={commissionRole}
              amount={parseInt(startingPrice, 10) || 0}
            />
          </View>
        ) : (
          <Text style={styles.commissionError}>{t('commRateUnavailable')}</Text>
        )}

        {walletShortfall && (
          <Text style={styles.walletWarning}>
            Soldul din portofel ({walletBalance?.toFixed(2)} lei) nu acoperă comisionul de {requiredCommission.toFixed(2)} lei. Alimentează portofelul din Profil pentru a publica.
          </Text>
        )}

        <View style={styles.formGroup}>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.days}
                style={[styles.durationBtn, duration === opt.days && styles.durationBtnActive]}
                onPress={() => setDuration(opt.days)}
              >
                <Text style={[styles.durationBtnText, duration === opt.days && styles.durationBtnTextActive]}>
                  {t(opt.key)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.durationEndsText}>
            {t('aucEndsOn')}: {new Date(Date.now() + duration * DAY_MS).toLocaleString(language, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={styles.promoCard}>
          <TouchableOpacity
            style={styles.promoRow}
            onPress={() => setPromoteListing(v => !v)}
            activeOpacity={0.8}
          >
            <View style={[styles.promoCheck, promoteListing && styles.promoCheckOn]}>
              {promoteListing && <Megaphone color={Colors.royalBlueDark} size={14} />}
            </View>
            <View style={styles.promoTextBox}>
              <Text style={styles.promoTitle}>{promoText.optionTitle}</Text>
              <Text style={styles.promoHint}>{promoText.optionHint}</Text>
            </View>
            <Text style={styles.promoPrice}>
              {promoIsFree ? promoText.free : `${promoFee ?? 25} ${promoText.feeSuffix}`}
            </Text>
          </TouchableOpacity>
          {promoteListing && !promoIsFree && (
            <Text style={styles.promoNote}>{promoText.requested}</Text>
          )}
        </View>

        {!isAmbassador && (
          <TouchableOpacity
            style={styles.commissionAcceptRow}
            onPress={() => setCommissionAccepted(v => !v)}
            activeOpacity={0.8}
            disabled={commissionRate === null}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: commissionAccepted }}
          >
            <View style={[styles.promoCheck, commissionAccepted && styles.promoCheckOn]}>
              {commissionAccepted && <Check color={Colors.royalBlueDark} size={14} />}
            </View>
            <Text style={styles.commissionAcceptText}>
              {t('commAcceptLabel').replace('{rate}', String(commissionRate ?? '-'))}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.createBtn, !canPublish && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={creating || !canPublish}
        >
          {creating ? (
            <ActivityIndicator color={Colors.royalBlueDark} />
          ) : (
            <>
              <Gavel color={Colors.royalBlueDark} size={22} />
              <Text style={styles.createBtnText}>{t('aucCreateBtn')}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 50 },
  backBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textSecondary },
  sectionLabel: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text, marginBottom: 12 },
  pigeonScroll: { marginBottom: 16 },
  pigeonChip: {
    width: 130, backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: 12,
    borderWidth: 1.5, borderColor: Colors.borderLight, gap: 6,
  },
  pigeonChipActive: { borderColor: Colors.royalBlue, backgroundColor: Colors.royalBluePale },
  chipCheck: {
    position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.royalBlue, justifyContent: 'center', alignItems: 'center',
  },
  chipHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipRing: { fontFamily: 'Inter-Bold', fontSize: 13, color: Colors.text },
  chipRingActive: { color: Colors.royalBlue },
  chipColor: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textSecondary },
  chipColorActive: { color: Colors.royalBlueLight },
  emptyPigeons: { alignItems: 'center', gap: 10, paddingVertical: 30, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.borderLight },
  emptyPigeonsText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  selectedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white,
    borderRadius: BorderRadius.md, padding: 14, borderWidth: 1.5, borderColor: Colors.success, marginBottom: 20,
  },
  selectedIconBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.royalBluePale,
    justifyContent: 'center', alignItems: 'center',
  },
  selectedRing: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  selectedInfo: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  formGroup: { marginBottom: 16, gap: 6 },
  formRow: { flexDirection: 'row', gap: 12 },
  formLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.text },
  formInput: {
    fontFamily: 'Inter-Regular', fontSize: 16, backgroundColor: Colors.white, borderWidth: 1,
    borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceInput: {
    flex: 1, fontFamily: 'Inter-Bold', fontSize: 20, backgroundColor: Colors.white, borderWidth: 1,
    borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text,
  },
  priceSuffix: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.textSecondary },
  buyNowHint: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textLight, marginTop: 4 },
  durationRow: { flexDirection: 'row', gap: 8 },
  durationBtn: {
    flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.md, paddingVertical: 12,
    borderWidth: 1.5, borderColor: Colors.borderLight, alignItems: 'center',
  },
  durationBtnActive: { borderColor: Colors.royalBlue, backgroundColor: Colors.royalBlue },
  durationBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary },
  durationBtnTextActive: { color: Colors.white },
  durationEndsText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary, marginTop: 8 },
  promoCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: 16, gap: 8,
    borderWidth: 1, borderColor: Colors.gold, marginBottom: 16,
  },
  promoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  promoCheck: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  promoCheckOn: { backgroundColor: Colors.gold },
  promoTextBox: { flex: 1, gap: 2 },
  promoTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  promoHint: { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 18, color: Colors.textSecondary },
  promoPrice: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.royalBlueDark },
  promoNote: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.warning, marginLeft: 36 },
  createBtn: {
    flexDirection: 'row', backgroundColor: Colors.gold, borderRadius: BorderRadius.md,
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, ...Shadows.gold,
  },
  createBtnText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.royalBlueDark },
  createBtnDisabled: { opacity: 0.5 },
  commissionWrap: { marginBottom: 16 },
  launchPromoBox: {
    backgroundColor: Colors.successBg, borderColor: Colors.success, borderWidth: 1,
    borderRadius: BorderRadius.md, padding: 16, gap: 6, marginBottom: 16,
  },
  launchPromoTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.text },
  launchPromoBody: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  commissionError: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.error, marginBottom: 16 },
  walletWarning: { fontFamily: 'Inter-Medium', fontSize: 13, lineHeight: 19, color: Colors.error, marginBottom: 16 },
  commissionAcceptRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 8,
    backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  commissionAcceptText: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 14, lineHeight: 20, color: Colors.text },
});
