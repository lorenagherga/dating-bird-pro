import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Megaphone } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import {
  fetchPromotionFee,
  getPromotionText,
  setAuctionPromoted,
  updatePromotionFee,
} from '@/lib/promotion';

interface PromotableAuction {
  id: string;
  title: string;
  status: string;
  is_promoted: boolean;
  promotion_requested: boolean;
}

export function AdminPromotionCard() {
  const { language } = useLanguage();
  const text = getPromotionText(language);
  const [feeInput, setFeeInput] = useState('');
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeSaved, setFeeSaved] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [auctions, setAuctions] = useState<PromotableAuction[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAuctions = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    const { data, error } = await supabase
      .from('auctions')
      .select('id, title, status, is_promoted, promotion_requested')
      .order('is_promoted', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      setListError(text.error);
    } else {
      setAuctions((data || []) as PromotableAuction[]);
    }
    setListLoading(false);
  }, [text.error]);

  useEffect(() => {
    fetchPromotionFee()
      .then((fee) => setFeeInput(String(fee)))
      .catch(() => setFeeError(text.error))
      .finally(() => setFeeLoading(false));
    loadAuctions();
  }, [loadAuctions, text.error]);

  const handleSaveFee = async () => {
    const fee = Number(feeInput.trim().replace(',', '.'));
    if (feeInput.trim() === '' || !Number.isFinite(fee) || fee < 0 || fee > 100000) {
      setFeeSaved(false);
      setFeeError(text.error);
      return;
    }
    setFeeSaving(true);
    setFeeSaved(false);
    setFeeError(null);
    try {
      await updatePromotionFee(fee);
      setFeeSaved(true);
    } catch {
      setFeeError(text.error);
    } finally {
      setFeeSaving(false);
    }
  };

  const handleTogglePromoted = async (auction: PromotableAuction) => {
    setBusyId(auction.id);
    setListError(null);
    try {
      await setAuctionPromoted(auction.id, !auction.is_promoted);
      await loadAuctions();
    } catch {
      setListError(text.error);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Megaphone color={Colors.gold} size={20} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{text.adminTitle}</Text>
          <Text style={styles.hint}>{text.adminHint}</Text>
        </View>
      </View>

      <Text style={styles.label}>{text.adminFeeLabel}</Text>
      {feeLoading ? (
        <ActivityIndicator size="small" color={Colors.royalBlue} style={styles.spinner} />
      ) : (
        <>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={feeInput}
              onChangeText={(value) => {
                setFeeInput(value);
                setFeeSaved(false);
                setFeeError(null);
              }}
              keyboardType="decimal-pad"
              placeholder="25"
              placeholderTextColor={Colors.textLight}
            />
            <Text style={styles.suffix}>{text.feeSuffix}</Text>
          </View>
          {feeError && <Text style={styles.errorText}>{feeError}</Text>}
          {feeSaved && <Text style={styles.successText}>{text.saved}</Text>}
          <TouchableOpacity
            style={[styles.saveBtn, feeSaving && styles.disabled]}
            onPress={handleSaveFee}
            disabled={feeSaving}
            accessibilityRole="button"
          >
            {feeSaving ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>{text.adminFeeSave}</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.label}>{text.adminAuctionsTitle}</Text>
      {listLoading ? (
        <ActivityIndicator size="small" color={Colors.royalBlue} style={styles.spinner} />
      ) : listError ? (
        <Text style={styles.errorText}>{listError}</Text>
      ) : auctions.length === 0 ? (
        <Text style={styles.hint}>{text.adminNoAuctions}</Text>
      ) : (
        auctions.map((auction) => (
          <View key={auction.id} style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>{auction.title}</Text>
              {auction.is_promoted ? (
                <Text style={styles.promotedTag}>{text.adminPromotedLabel}</Text>
              ) : auction.promotion_requested ? (
                <Text style={styles.pendingTag}>{text.adminRequested}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.rowBtn, auction.is_promoted ? styles.rowBtnOff : styles.rowBtnOn, busyId === auction.id && styles.disabled]}
              onPress={() => handleTogglePromoted(auction)}
              disabled={busyId !== null}
              accessibilityRole="button"
            >
              {busyId === auction.id ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={auction.is_promoted ? styles.rowBtnOffText : styles.rowBtnOnText}>
                  {auction.is_promoted ? text.adminDeactivate : text.adminActivate}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 32,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    gap: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.goldPale,
    justifyContent: 'center', alignItems: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.text },
  hint: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  label: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary },
  spinner: { marginVertical: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, minWidth: 0, fontFamily: 'Inter-Bold', fontSize: 24, color: Colors.text,
    backgroundColor: Colors.neutral50, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 12,
  },
  suffix: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: Colors.textSecondary },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.error },
  successText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.success },
  saveBtn: {
    backgroundColor: Colors.royalBlue, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', minHeight: 48,
  },
  saveBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.white },
  disabled: { opacity: 0.6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: Colors.neutral100,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  promotedTag: { fontFamily: 'Inter-Bold', fontSize: 12, color: Colors.gold },
  pendingTag: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.warning },
  rowBtn: {
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    minWidth: 112, alignItems: 'center', justifyContent: 'center',
  },
  rowBtnOn: { backgroundColor: Colors.royalBlue },
  rowBtnOnText: { fontFamily: 'Inter-Bold', fontSize: 13, color: Colors.white },
  rowBtnOff: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.error },
  rowBtnOffText: { fontFamily: 'Inter-Bold', fontSize: 13, color: Colors.error },
});
