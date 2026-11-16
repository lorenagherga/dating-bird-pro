import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import {
  fetchPartnerActiveAuctions,
  fetchPartnerListing,
  getPartnerKindLabel,
  type PartnerAuction,
  type PartnerListing,
} from '@/lib/partner-directory';
import { ArrowLeft, MapPin, Globe, Crown, Gavel, Bird, Clock } from 'lucide-react-native';

export default function PartnerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { language } = useLanguage();
  const [partner, setPartner] = useState<PartnerListing | null>(null);
  const [auctions, setAuctions] = useState<PartnerAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPartner = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const listing = await fetchPartnerListing(id);
      setPartner(listing);
      if (listing?.user_id) {
        setAuctions(await fetchPartnerActiveAuctions(listing.user_id));
      } else {
        setAuctions([]);
      }
    } catch {
      setError('Pagina partenerului nu a putut fi încărcată.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPartner();
  }, [loadPartner]);

  const formatEndTime = (iso: string) =>
    new Date(iso).toLocaleString(language === 'ro' ? 'ro-RO' : undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (error || !partner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
            <ArrowLeft color={Colors.royalBlue} size={22} />
          </TouchableOpacity>
        </View>
        <Text style={styles.errorText}>{error ?? 'Partenerul nu mai este disponibil.'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
          <ArrowLeft color={Colors.royalBlue} size={22} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{partner.breeder_name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.logoBox}>
            {partner.logo_url ? (
              <Image source={{ uri: partner.logo_url }} style={styles.logo} resizeMode="cover" />
            ) : (
              <Bird color={Colors.royalBlueLight} size={40} />
            )}
          </View>
          <Text style={styles.partnerName}>{partner.breeder_name}</Text>
          <View style={styles.metaRow}>
            <View style={styles.kindBadge}>
              <Crown color={Colors.goldDark} size={12} />
              <Text style={styles.kindText}>{getPartnerKindLabel(partner.partner_kind)}</Text>
            </View>
            {(partner.locality || partner.county) && (
              <View style={styles.localityRow}>
                <MapPin color={Colors.textSecondary} size={14} />
                <Text style={styles.localityText}>{partner.locality || partner.county}</Text>
              </View>
            )}
          </View>
        </View>

        {partner.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Despre</Text>
            <Text style={styles.descriptionText}>{partner.description}</Text>
          </View>
        ) : null}

        {partner.external_link ? (
          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => Linking.openURL(partner.external_link!)}
            accessibilityRole="link"
          >
            <Globe color={Colors.royalBlue} size={18} />
            <Text style={styles.linkText} numberOfLines={1}>{partner.external_link}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Licitații active</Text>
          {!partner.user_id ? (
            <Text style={styles.emptyText}>Acest partener nu are licitații publicate în aplicație.</Text>
          ) : auctions.length === 0 ? (
            <Text style={styles.emptyText}>Nu există licitații active în acest moment.</Text>
          ) : (
            <View style={styles.auctionList}>
              {auctions.map((auction) => (
                <TouchableOpacity
                  key={auction.id}
                  style={styles.auctionRow}
                  onPress={() => router.push(`/(tabs)/auction-detail?id=${auction.id}`)}
                  accessibilityRole="button"
                >
                  <Gavel color={Colors.goldDark} size={18} />
                  <View style={styles.auctionInfo}>
                    <Text style={styles.auctionTitle} numberOfLines={1}>{auction.title}</Text>
                    <View style={styles.auctionMeta}>
                      <Clock color={Colors.textSecondary} size={12} />
                      <Text style={styles.auctionMetaText}>{formatEndTime(auction.end_time)}</Text>
                      <Text style={styles.auctionMetaText}>· {auction.bid_count} oferte</Text>
                    </View>
                  </View>
                  <Text style={styles.auctionPrice}>{auction.current_price} lei</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topTitle: { flex: 1, fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text, textAlign: 'center' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },
  heroSection: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...Shadows.card,
  },
  logo: { width: 100, height: 100, borderRadius: 24 },
  partnerName: { fontFamily: 'Inter-Bold', fontSize: 24, color: Colors.text, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  kindText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.goldDark },
  localityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  localityText: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text, marginBottom: 12 },
  descriptionText: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.royalBluePale,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  linkText: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.royalBlue },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary },
  auctionList: { gap: 10 },
  auctionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.neutral50,
    borderRadius: BorderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  auctionInfo: { flex: 1, gap: 4 },
  auctionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  auctionMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  auctionMetaText: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  auctionPrice: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.royalBlue },
});
