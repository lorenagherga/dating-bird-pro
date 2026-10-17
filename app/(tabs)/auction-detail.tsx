import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  useCountdown,
  formatLiveCountdown,
  isUrgent,
  shouldExtendEndTime,
  ANTI_SNIPE_EXTENSION_MS,
} from '@/lib/auction-utils';
import {
  Gavel, TrendingUp, Clock, Trophy, ChevronRight, Crown,
  Bird, User, Award, FileText, CheckCircle2, AlertCircle, X, Mars, Venus,
  Zap, Flame, Shield,
} from 'lucide-react-native';

interface BidRow {
  id: string;
  amount: number;
  bidder_id: string;
  created_at: string;
  bidder: { breeder_name: string } | null;
}

interface AuctionDetail {
  id: string;
  title: string;
  description: string;
  starting_price: number;
  current_price: number;
  min_bid_step: number;
  end_time: string;
  bid_count: number;
  status: string;
  seller_id: string;
  winner_id: string | null;
  buy_now_price: number | null;
  pigeon: {
    id: string;
    ring_series: string;
    color: string;
    sex: string;
    is_champion: boolean;
    year: number | null;
    photo_url: string | null;
    notes: string;
  } | null;
  seller: { breeder_name: string; email: string } | null;
}

export default function AuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const router = useRouter();
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [bids, setBids] = useState<BidRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidModal, setBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [placingBid, setPlacingBid] = useState(false);
  const [bidSuccess, setBidSuccess] = useState(false);
  const [outbidAlert, setOutbidAlert] = useState(false);
  const [outbidRing, setOutbidRing] = useState('');
  const [antiSnipeMsg, setAntiSnipeMsg] = useState(false);
  const [buyNowModal, setBuyNowModal] = useState(false);
  const [buyNowProcessing, setBuyNowProcessing] = useState(false);
  const [buyNowSuccess, setBuyNowSuccess] = useState(false);
  const prevTopBidRef = useRef<number | null>(null);
  const myLastBidRef = useRef<number | null>(null);

  const loadAuction = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('auctions')
      .select(`
        id, title, description, starting_price, current_price, min_bid_step, end_time,
        bid_count, status, seller_id, winner_id, buy_now_price,
        pigeon:pigeons(id, ring_series, color, sex, is_champion, year, photo_url, notes),
        seller:profiles!auctions_seller_id_profiles_fkey(breeder_name, email)
      `)
      .eq('id', id)
      .maybeSingle();
    setAuction(data as unknown as AuctionDetail);

    const { data: bidData } = await supabase
      .from('auction_bids')
      .select(`
        id, amount, bidder_id, created_at,
        bidder:profiles!auction_bids_bidder_id_profiles_fkey(breeder_name)
      `)
      .eq('auction_id', id)
      .order('amount', { ascending: false });
    setBids((bidData || []) as unknown as BidRow[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadAuction();
  }, [loadAuction]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`auction-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions', filter: `id=eq.${id}` }, () => {
        loadAuction();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auction_bids', filter: `auction_id=eq.${id}` }, (payload) => {
        const newBid = payload.new as any;
        if (myLastBidRef.current !== null && newBid.amount > myLastBidRef.current && newBid.bidder_id !== profile?.id) {
          setOutbidRing(auction?.pigeon?.ring_series || '');
          setOutbidAlert(true);
          setTimeout(() => setOutbidAlert(false), 6000);
        }
        myLastBidRef.current = null;
        loadAuction();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, loadAuction, profile?.id, auction?.pigeon?.ring_series]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 80 }} />
      </View>
    );
  }

  if (!auction) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 80, color: Colors.textSecondary }}>
          {t('aucEnded2')}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{t('aucCancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const remaining = useCountdown(auction.end_time);
  const urgent = isUrgent(remaining);
  const isEnded = auction.status === 'ended' || remaining.ended;
  const isOwner = auction.seller_id === profile?.id;
  const minBid = auction.current_price + auction.min_bid_step;
  const isWinner = auction.winner_id === profile?.id;
  const hasBuyNow = auction.buy_now_price !== null && auction.buy_now_price > 0;

  const openBidModal = () => {
    setBidAmount(String(minBid));
    setBidModal(true);
  };

  const handlePlaceBid = async () => {
    const amount = parseInt(bidAmount, 10);
    if (isNaN(amount) || amount < minBid) {
      Alert.alert(t('error'), t('aucBidTooLow'));
      return;
    }
    setPlacingBid(true);
    const { error: bidError } = await supabase
      .from('auction_bids')
      .insert({ auction_id: auction.id, amount });
    if (bidError) {
      Alert.alert(t('error'), t('aucBidError'));
      setPlacingBid(false);
      return;
    }
    myLastBidRef.current = amount;

    let newEndTime = auction.end_time;
    if (shouldExtendEndTime(auction.end_time)) {
      newEndTime = new Date(Date.now() + (Date.parse(auction.end_time) - Date.now()) + ANTI_SNIPE_EXTENSION_MS).toISOString();
      setAntiSnipeMsg(true);
      setTimeout(() => setAntiSnipeMsg(false), 5000);
    }

    await supabase
      .from('auctions')
      .update({ current_price: amount, bid_count: auction.bid_count + 1, end_time: newEndTime })
      .eq('id', auction.id);

    setPlacingBid(false);
    setBidModal(false);
    setBidSuccess(true);
    setTimeout(() => setBidSuccess(false), 3000);
    loadAuction();
  };

  const handleBuyNow = () => {
    if (!auction.buy_now_price) return;
    Alert.alert(t('aucBuyNowConfirm'), `${t('aucBuyNowConfirmMsg')} ${auction.buy_now_price} ${t('aucLei')}`, [
      { text: t('aucCancel'), style: 'cancel' },
      {
        text: t('aucBuyNow'),
        style: 'destructive',
        onPress: async () => {
          setBuyNowProcessing(true);
          await supabase
            .from('auctions')
            .update({
              status: 'ended',
              winner_id: profile?.id,
              current_price: auction.buy_now_price,
              end_time: new Date().toISOString(),
            })
            .eq('id', auction.id);
          setBuyNowProcessing(false);
          setBuyNowModal(false);
          setBuyNowSuccess(true);
          setTimeout(() => setBuyNowSuccess(false), 4000);
          loadAuction();
        },
      },
    ]);
  };

  const handleEndAuction = () => {
    Alert.alert(t('aucEndConfirm'), t('aucEndConfirmMsg'), [
      { text: t('aucCancel'), style: 'cancel' },
      {
        text: t('aucEndNow'),
        style: 'destructive',
        onPress: async () => {
          const winner = bids[0]?.bidder_id || null;
          await supabase
            .from('auctions')
            .update({ status: 'ended', winner_id: winner })
            .eq('id', auction.id);
          loadAuction();
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(t('aucDelete'), t('aucDeleteConfirm'), [
      { text: t('aucCancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('auctions').delete().eq('id', auction.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronRight color={Colors.royalBlue} size={20} style={{ transform: [{ rotate: '180deg' }] }} />
          <Text style={styles.backBtnText}>{t('aucAllAuctions')}</Text>
        </TouchableOpacity>

        <Text style={styles.detailTitle}>{auction.title}</Text>
        <Text style={styles.detailDesc}>{auction.description}</Text>

        {auction.pigeon && (
          <View style={styles.pigeonCard}>
            <View style={styles.pigeonPhotoBox}>
              {auction.pigeon.photo_url ? (
                <Image source={{ uri: auction.pigeon.photo_url }} style={styles.pigeonPhoto} resizeMode="cover" />
              ) : (
                <Bird color={Colors.royalBlue} size={36} />
              )}
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.pigeonHeader}>
                <Text style={styles.pigeonRing}>{auction.pigeon.ring_series}</Text>
                {auction.pigeon.is_champion && (
                  <View style={styles.championBadge}>
                    <Trophy color={Colors.gold} size={12} />
                    <Text style={styles.championText}>{t('aucChampion')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.pigeonInfoRow}>
                {auction.pigeon.sex === 'Mascul' ? <Mars color={Colors.royalBlue} size={14} /> : <Venus color={Colors.error} size={14} />}
                <Text style={styles.pigeonInfoText}>{auction.pigeon.sex} · {auction.pigeon.color}</Text>
                {auction.pigeon.year && <Text style={styles.pigeonYear}>{auction.pigeon.year}</Text>}
              </View>
              {auction.pigeon.notes ? <Text style={styles.pigeonNotes}>{auction.pigeon.notes}</Text> : null}
            </View>
          </View>
        )}

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>{t('aucCurrentBid')}</Text>
              <Text style={styles.priceValue}>{auction.current_price} {t('aucLei')}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceBox}>
              <Text style={styles.priceLabel}>{t('aucMinBid')}</Text>
              <Text style={styles.priceValue}>{auction.min_bid_step} {t('aucLei')}</Text>
            </View>
            {hasBuyNow && (
              <>
                <View style={styles.priceDivider} />
                <View style={styles.priceBox}>
                  <Text style={styles.priceLabel}>{t('aucBuyNow')}</Text>
                  <Text style={[styles.priceValue, { color: Colors.gold }]}>{auction.buy_now_price} {t('aucLei')}</Text>
                </View>
              </>
            )}
          </View>

          <View style={[styles.timeCard, urgent && !isEnded && styles.timeCardUrgent]}>
            <View style={styles.timeCardLeft}>
              <Clock color={isEnded ? Colors.textLight : urgent ? Colors.white : Colors.gold} size={18} />
              <Text style={[styles.timeText, isEnded && styles.timeEnded, urgent && !isEnded && styles.timeTextUrgent]}>
                {isEnded ? t('aucEnded2') : formatLiveCountdown(remaining)}
              </Text>
            </View>
            {urgent && !isEnded && (
              <View style={styles.urgentBadge}>
                <Flame color={Colors.white} size={12} />
                <Text style={styles.urgentBadgeText}>{t('aucLiveCountdown')}</Text>
              </View>
            )}
          </View>

          <View style={styles.bidCountRow}>
            <Gavel color={Colors.goldLight} size={16} />
            <Text style={styles.bidCountText}>{auction.bid_count} {auction.bid_count === 1 ? t('aucBid') : t('aucBids')}</Text>
            <View style={styles.antiSnipeBadge}>
              <Shield color={Colors.goldLight} size={12} />
              <Text style={styles.antiSnipeText}>Anti-Snipe 3min</Text>
            </View>
          </View>
        </View>

        {auction.seller && (
          <View style={styles.sellerCard}>
            <View style={styles.sellerIconBox}>
              <User color={Colors.royalBlue} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerLabel}>{t('aucSeller')}</Text>
              <Text style={styles.sellerName}>{auction.seller.breeder_name}</Text>
            </View>
          </View>
        )}

        {isEnded && (
          <View style={[styles.resultCard, isWinner ? styles.resultWon : styles.resultLost]}>
            <View style={styles.resultIconBox}>
              {isWinner ? <Trophy color={Colors.gold} size={24} /> : <Award color={Colors.textLight} size={24} />}
            </View>
            <Text style={[styles.resultText, isWinner && styles.resultWonText]}>
              {isWinner ? t('aucYouWon') : t('aucYouLost')}
            </Text>
          </View>
        )}

        <View style={styles.bidHistoryCard}>
          <Text style={styles.bidHistoryTitle}>{t('aucBidHistory')}</Text>
          {bids.length === 0 ? (
            <Text style={styles.noBidsText}>{t('aucNoBids')}</Text>
          ) : (
            bids.map((bid, i) => (
              <View key={bid.id} style={styles.bidRow}>
                <View style={styles.bidRankBox}>
                  <Text style={styles.bidRank}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bidBidder}>{bid.bidder?.breeder_name || '—'}</Text>
                  <Text style={styles.bidDate}>{new Date(bid.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <Text style={styles.bidAmount}>{bid.amount} {t('aucLei')}</Text>
              </View>
            ))
          )}
        </View>

        {!isEnded && !isOwner && (
          <View style={styles.actionBtnRow}>
            <TouchableOpacity style={styles.goldBidBtn} onPress={openBidModal}>
              <Gavel color={Colors.royalBlueDark} size={22} />
              <Text style={styles.goldBidBtnText}>{t('aucPlaceBid')}</Text>
            </TouchableOpacity>
            {hasBuyNow && (
              <TouchableOpacity style={styles.buyNowBtn} onPress={handleBuyNow} disabled={buyNowProcessing}>
                {buyNowProcessing ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <Zap color={Colors.white} size={20} />
                    <Text style={styles.buyNowBtnText}>{t('aucBuyNow')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {!isEnded && isOwner && (
          <TouchableOpacity style={styles.endBtn} onPress={handleEndAuction}>
            <Text style={styles.endBtnText}>{t('aucEndNow')}</Text>
          </TouchableOpacity>
        )}

        {isOwner && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>{t('aucDelete')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.pedigreeBtn} onPress={() => {
          if (auction.pigeon?.id) {
            router.push(`/(tabs)/pedigree?id=${auction.pigeon.id}`);
          }
        }}>
          <FileText color={Colors.royalBlue} size={20} />
          <Text style={styles.pedigreeBtnText}>{t('aucViewPedigree8')}</Text>
          <ChevronRight color={Colors.royalBlue} size={18} />
        </TouchableOpacity>

        {bidSuccess && (
          <View style={styles.successOverlay}>
            <View style={styles.successCard}>
              <CheckCircle2 color={Colors.success} size={48} />
              <Text style={styles.successTitle}>{t('aucBidPlaced')}</Text>
              <Text style={styles.successSubtitle}>{t('aucBidPlacedMsg')}</Text>
            </View>
          </View>
        )}

        {buyNowSuccess && (
          <View style={styles.successOverlay}>
            <View style={[styles.successCard, { borderColor: Colors.gold, borderWidth: 2 }]}>
              <Zap color={Colors.gold} size={48} />
              <Text style={styles.successTitle}>{t('aucBuyNowSuccess')}</Text>
              <Text style={styles.successSubtitle}>{t('aucBuyNowSuccessMsg')}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {outbidAlert && (
        <View style={styles.outbidBanner}>
          <AlertCircle color={Colors.white} size={22} />
          <View style={{ flex: 1 }}>
            <Text style={styles.outbidTitle}>{t('aucOutbidTitle')}</Text>
            <Text style={styles.outbidMsg}>{t('aucOutbidMsg')} {outbidRing}</Text>
          </View>
        </View>
      )}

      {antiSnipeMsg && (
        <View style={styles.antiSnipeBanner}>
          <Shield color={Colors.white} size={20} />
          <Text style={styles.antiSnipeBannerText}>{t('aucAntiSnipeMsg')}</Text>
        </View>
      )}

      <Modal visible={bidModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('aucPlaceBid')}</Text>
              <TouchableOpacity onPress={() => setBidModal(false)}>
                <X color={Colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>{t('aucYourBid')}</Text>
              <View style={styles.bidInputRow}>
                <TextInput
                  style={styles.bidInput}
                  value={bidAmount}
                  onChangeText={setBidAmount}
                  keyboardType="numeric"
                  placeholder={String(minBid)}
                  placeholderTextColor={Colors.textLight}
                />
                <Text style={styles.bidInputSuffix}>{t('aucLei')}</Text>
              </View>
              <Text style={styles.modalHint}>{t('aucMinBid')}: {minBid} {t('aucLei')}</Text>
              <TouchableOpacity style={styles.confirmBidBtn} onPress={handlePlaceBid} disabled={placingBid}>
                {placingBid ? (
                  <ActivityIndicator color={Colors.royalBlueDark} />
                ) : (
                  <Text style={styles.confirmBidBtnText}>{t('aucConfirmBid')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 50, marginBottom: 16 },
  backBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.royalBlue },
  detailTitle: { fontFamily: 'Inter-Bold', fontSize: 24, color: Colors.text, marginBottom: 6 },
  detailDesc: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary, marginBottom: 20, lineHeight: 22 },
  pigeonCard: {
    flexDirection: 'row', gap: 14, backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: 16, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 16, ...Shadows.card,
  },
  pigeonPhotoBox: {
    width: 70, height: 70, borderRadius: 14, backgroundColor: Colors.royalBluePale,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  pigeonPhoto: { width: 70, height: 70, borderRadius: 14 },
  pigeonHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pigeonRing: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  championBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.goldPale, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  championText: { fontFamily: 'Inter-Bold', fontSize: 11, color: Colors.goldDark },
  pigeonInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pigeonInfoText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  pigeonYear: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textLight },
  pigeonNotes: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  priceCard: {
    backgroundColor: Colors.royalBlue, borderRadius: BorderRadius.lg, padding: 20, marginBottom: 16, ...Shadows.card,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  priceBox: { flex: 1, alignItems: 'center' },
  priceLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.goldLight, marginBottom: 4 },
  priceValue: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.white },
  priceDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  timeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 10,
  },
  timeCardUrgent: { backgroundColor: Colors.error, borderWidth: 1.5, borderColor: '#FF6B6B' },
  timeCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.goldLight, fontVariant: ['tabular-nums'] },
  timeTextUrgent: { color: Colors.white, fontSize: 18 },
  timeEnded: { color: 'rgba(255,255,255,0.5)' },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  urgentBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.white },
  bidCountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  bidCountText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.goldLight },
  antiSnipeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  antiSnipeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.goldLight },
  sellerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 16,
  },
  sellerIconBox: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.royalBluePale,
    justifyContent: 'center', alignItems: 'center',
  },
  sellerLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  sellerName: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text, marginTop: 2 },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: BorderRadius.lg,
    padding: 18, marginBottom: 16,
  },
  resultWon: { backgroundColor: Colors.goldPale, borderWidth: 1, borderColor: Colors.gold },
  resultLost: { backgroundColor: Colors.neutral100, borderWidth: 1, borderColor: Colors.borderLight },
  resultIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center' },
  resultText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.textSecondary, flex: 1 },
  resultWonText: { color: Colors.goldDark },
  bidHistoryCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 18,
    borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 16,
  },
  bidHistoryTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text, marginBottom: 14 },
  noBidsText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight, textAlign: 'center', paddingVertical: 10 },
  bidRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  bidRankBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.royalBluePale, justifyContent: 'center', alignItems: 'center' },
  bidRank: { fontFamily: 'Inter-Bold', fontSize: 13, color: Colors.royalBlue },
  bidBidder: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  bidDate: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textLight, marginTop: 2 },
  bidAmount: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.royalBlue },
  actionBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  goldBidBtn: {
    flex: 1, flexDirection: 'row', backgroundColor: Colors.gold, borderRadius: BorderRadius.md,
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 10, ...Shadows.gold,
  },
  goldBidBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.royalBlueDark },
  buyNowBtn: {
    flex: 1, flexDirection: 'row', backgroundColor: Colors.error, borderRadius: BorderRadius.md,
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  buyNowBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },
  endBtn: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.md, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.warning, marginBottom: 10,
  },
  endBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.warning },
  deleteBtn: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.md, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.error, marginBottom: 12,
  },
  deleteBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.error },
  pedigreeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white,
    borderRadius: BorderRadius.md, paddingVertical: 14, paddingHorizontal: 18,
    borderWidth: 1, borderColor: Colors.royalBlue,
  },
  pedigreeBtnText: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.royalBlue },
  successOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  successCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: 32, alignItems: 'center', gap: 12,
  },
  successTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.text },
  successSubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  outbidBanner: {
    position: 'absolute', top: 60, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.error, borderRadius: BorderRadius.lg, padding: 16,
    ...Shadows.card, elevation: 8,
  },
  outbidTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.white },
  outbidMsg: { fontFamily: 'Inter-Regular', fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  antiSnipeBanner: {
    position: 'absolute', top: 60, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.royalBlue, borderRadius: BorderRadius.lg, padding: 14,
    ...Shadows.card, elevation: 8,
  },
  antiSnipeBannerText: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.white },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  modalBody: { padding: 20, gap: 12 },
  modalLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.text },
  bidInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bidInput: {
    flex: 1, fontFamily: 'Inter-Bold', fontSize: 24, backgroundColor: Colors.neutral50,
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, color: Colors.text,
  },
  bidInputSuffix: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: Colors.textSecondary },
  modalHint: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  confirmBidBtn: {
    backgroundColor: Colors.gold, borderRadius: BorderRadius.md, paddingVertical: 16,
    alignItems: 'center', marginTop: 8, ...Shadows.gold,
  },
  confirmBidBtnText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.royalBlueDark },
});
