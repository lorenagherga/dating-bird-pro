import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useCountdown, formatTimeRemaining, isUrgent } from '@/lib/auction-utils';
import { Gavel, Plus, Crown, Bird, TrendingUp, Clock, Trophy, ChevronRight, Sparkles, Zap } from 'lucide-react-native';

interface AuctionRow {
  id: string;
  title: string;
  starting_price: number;
  current_price: number;
  min_bid_step: number;
  end_time: string;
  bid_count: number;
  status: string;
  seller_id: string;
  buy_now_price: number | null;
  pigeon: {
    ring_series: string;
    color: string;
    sex: string;
    is_champion: boolean;
    photo_url: string | null;
  } | null;
  seller: { breeder_name: string } | null;
}

type TabFilter = 'all' | 'mine' | 'ended';

export default function AuctionsScreen() {
  const { t } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const router = useRouter();
  const [auctions, setAuctions] = useState<AuctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TabFilter>('all');
  const [showPaywall, setShowPaywall] = useState(false);

  const hasAccess = isAdmin || profile?.subscription_plan === 'professional' || profile?.subscription_plan === 'standard' || profile?.subscription_plan === 'hobby';

  const loadAuctions = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('auctions')
      .select(`
        id, title, starting_price, current_price, min_bid_step, end_time, bid_count, status, seller_id, buy_now_price,
        pigeon:pigeons(ring_series, color, sex, is_champion, photo_url),
        seller:profiles!auctions_seller_id_profiles_fkey(breeder_name)
      `)
      .order('created_at', { ascending: false });

    if (filter === 'mine') {
      query = query.eq('seller_id', profile?.id || '');
    } else if (filter === 'ended') {
      query = query.eq('status', 'ended');
    } else {
      query = query.eq('status', 'active');
    }

    const { data } = await query;
    setAuctions((data || []) as unknown as AuctionRow[]);
    setLoading(false);
  }, [filter, profile?.id]);

  useEffect(() => {
    loadAuctions();
  }, [loadAuctions]);

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ScreenHeader title={t('aucTitle')} subtitle={t('aucSub')} />
          <View style={styles.paywallContainer}>
            <View style={styles.paywallIcon}>
              <Crown color={Colors.gold} size={48} />
            </View>
            <Text style={styles.paywallTitle}>{t('aucPaywall')}</Text>
            <Text style={styles.paywallSubtitle}>{t('aucPaywallMsg')}</Text>
            <View style={styles.trialBadge}>
              <Sparkles color={Colors.gold} size={16} />
              <Text style={styles.trialText}>30 {t('aucTrialDaysLeft')}</Text>
            </View>
            <TouchableOpacity
              style={styles.paywallBtn}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.paywallBtnText}>{t('aucPaywallCta')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={undefined}>
        <ScreenHeader title={t('aucTitle')} subtitle={t('aucSub')} />

        <View style={styles.filterRow}>
          {([
            { key: 'all' as TabFilter, label: t('aucAllAuctions') },
            { key: 'mine' as TabFilter, label: t('aucYourAuctions') },
            { key: 'ended' as TabFilter, label: t('aucEndedAuctions') },
          ]).map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterBtnText, filter === f.key && styles.filterBtnTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 40 }} />
        ) : auctions.length === 0 ? (
          <View style={styles.emptyState}>
            <Gavel color={Colors.textLight} size={48} />
            <Text style={styles.emptyTitle}>{t('aucNoAuctions')}</Text>
            <Text style={styles.emptySubtitle}>{t('aucNoAuctionsSub')}</Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/(tabs)/auction-create')}>
              <Plus color={Colors.white} size={20} />
              <Text style={styles.createBtnText}>{t('aucCreate')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {auctions.map(auction => (
              <AuctionCard key={auction.id} auction={auction} t={t} onPress={() => router.push(`/(tabs)/auction-detail?id=${auction.id}`)} />
            ))}
          </View>
        )}

        {auctions.length > 0 && (
          <TouchableOpacity style={styles.fab} onPress={() => router.push('/(tabs)/auction-create')}>
            <Plus color={Colors.white} size={26} />
          </TouchableOpacity>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function AuctionCard({ auction, t, onPress }: { auction: AuctionRow; t: (k: any) => string; onPress: () => void }) {
  const remaining = useCountdown(auction.end_time);
  const isEnded = auction.status === 'ended' || remaining.ended;
  const urgent = isUrgent(remaining);
  const pigeon = auction.pigeon;
  const hasBuyNow = auction.buy_now_price !== null && auction.buy_now_price > 0;

  return (
    <TouchableOpacity style={styles.auctionCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardLeft}>
        <View style={styles.pigeonPhotoBox}>
          {pigeon?.photo_url ? (
            <Image source={{ uri: pigeon.photo_url }} style={styles.pigeonPhoto} resizeMode="cover" />
          ) : (
            <Bird color={Colors.royalBlueLight} size={28} />
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          {pigeon?.is_champion && (
            <View style={styles.championBadge}>
              <Trophy color={Colors.gold} size={12} />
              <Text style={styles.championText}>{t('aucChampion')}</Text>
            </View>
          )}
          {hasBuyNow && (
            <View style={styles.buyNowBadge}>
              <Zap color={Colors.white} size={10} />
              <Text style={styles.buyNowBadgeText}>{t('aucBuyNow')}</Text>
            </View>
          )}
        </View>

        <Text style={styles.auctionTitle} numberOfLines={2}>{auction.title}</Text>

        {pigeon && (
          <Text style={styles.pigeonInfo}>{pigeon.ring_series} · {pigeon.color}</Text>
        )}

        <View style={styles.cardStats}>
          <View style={styles.statBox}>
            <TrendingUp color={Colors.royalBlue} size={14} />
            <Text style={styles.statValue}>{auction.current_price} {t('aucLei')}</Text>
          </View>
          <View style={styles.statBox}>
            <Gavel color={Colors.textSecondary} size={14} />
            <Text style={styles.statLabel}>{auction.bid_count} {auction.bid_count === 1 ? t('aucBid') : t('aucBids')}</Text>
          </View>
        </View>

        <View style={styles.timeRow}>
          <Clock color={isEnded ? Colors.textLight : urgent ? Colors.error : Colors.gold} size={14} />
          <Text style={[styles.timeText, isEnded && styles.timeEnded, urgent && !isEnded && styles.timeUrgent]}>
            {isEnded ? t('aucEnded2') : formatTimeRemaining(remaining, t)}
          </Text>
        </View>
      </View>

      <ChevronRight color={Colors.textLight} size={20} style={{ alignSelf: 'center' }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: Colors.royalBlue,
    borderColor: Colors.royalBlue,
  },
  filterBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textSecondary },
  filterBtnTextActive: { color: Colors.white },
  paywallContainer: { alignItems: 'center', gap: 16, marginTop: 40, paddingHorizontal: 24 },
  paywallIcon: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.goldPale, borderWidth: 2, borderColor: Colors.gold,
    justifyContent: 'center', alignItems: 'center',
  },
  paywallTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.text },
  paywallSubtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  trialBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.goldPale, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
  },
  trialText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.goldDark },
  paywallBtn: {
    backgroundColor: Colors.gold, borderRadius: BorderRadius.md,
    paddingVertical: 16, paddingHorizontal: 32, ...Shadows.gold,
  },
  paywallBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.royalBlueDark },
  emptyState: { alignItems: 'center', gap: 12, marginTop: 40 },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: Colors.text },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  createBtn: {
    flexDirection: 'row', backgroundColor: Colors.royalBlue, borderRadius: BorderRadius.md,
    paddingVertical: 14, paddingHorizontal: 28, alignItems: 'center', gap: 8, marginTop: 8, ...Shadows.button,
  },
  createBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.white },
  fab: {
    position: 'absolute', right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.royalBlue, justifyContent: 'center', alignItems: 'center',
    elevation: 5, shadowColor: Colors.royalBlue, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12,
  },
  auctionCard: {
    flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadius.lg,
    padding: 14, borderWidth: 1, borderColor: Colors.borderLight, gap: 12, ...Shadows.card,
  },
  cardLeft: { justifyContent: 'center' },
  pigeonPhotoBox: {
    width: 70, height: 70, borderRadius: 14, backgroundColor: Colors.royalBluePale,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  pigeonPhoto: { width: 70, height: 70, borderRadius: 14 },
  photoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, gap: 6 },
  cardHeader: { flexDirection: 'row', gap: 6 },
  championBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.goldPale, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  championText: { fontFamily: 'Inter-Bold', fontSize: 11, color: Colors.goldDark },
  buyNowBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.error, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  buyNowBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.white },
  auctionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  pigeonInfo: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  cardStats: { flexDirection: 'row', gap: 14, marginTop: 2 },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.royalBlue },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.gold },
  timeUrgent: { color: Colors.error, fontFamily: 'Inter-Bold' },
  timeEnded: { color: Colors.textLight },
});
