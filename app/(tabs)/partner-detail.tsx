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
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ArrowLeft, MapPin, Phone, Mail, Globe, Crown, Gavel, Star, Bird, Award } from 'lucide-react-native';

interface EliteBreeder {
  id: string;
  breeder_name: string;
  logo_url: string | null;
  county: string | null;
  categories: string[];
  description: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  user_id: string | null;
  is_featured: boolean;
}

export default function PartnerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();
  const [breeder, setBreeder] = useState<EliteBreeder | null>(null);
  const [loading, setLoading] = useState(true);
  const [auctionCount, setAuctionCount] = useState(0);

  const loadBreeder = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('elite_breeders')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    setBreeder(data as EliteBreeder | null);
    setLoading(false);

    if (data?.user_id) {
      const { count } = await supabase
        .from('auctions')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', (data as EliteBreeder).user_id!)
        .eq('status', 'active');
      setAuctionCount(count || 0);
    }
  }, [id]);

  useEffect(() => {
    loadBreeder();
  }, [loadBreeder]);

  const handleViewAuctions = () => {
    if (breeder?.user_id) {
      router.push(`/(tabs)/auctions?sellerId=${breeder.user_id}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!breeder) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={Colors.royalBlue} size={22} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{breeder.breeder_name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero section */}
        <View style={styles.heroSection}>
          <View style={styles.logoBox}>
            {breeder.logo_url ? (
              <Image source={{ uri: breeder.logo_url }} style={styles.logo} resizeMode="cover" />
            ) : (
              <Bird color={Colors.royalBlueLight} size={40} />
            )}
          </View>
          <Text style={styles.breederName}>{breeder.breeder_name}</Text>
          {breeder.county && (
            <View style={styles.countyRow}>
              <MapPin color={Colors.textSecondary} size={14} />
              <Text style={styles.countyText}>{breeder.county}</Text>
            </View>
          )}
          {breeder.is_featured && (
            <View style={styles.featuredBadge}>
              <Star color={Colors.goldDark} size={12} />
              <Text style={styles.featuredText}>{t('partnerFeatured')}</Text>
            </View>
          )}
        </View>

        {/* Categories */}
        {breeder.categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('partnerCategories')}</Text>
            <View style={styles.categoriesRow}>
              {breeder.categories.map((cat, idx) => (
                <View key={idx} style={styles.categoryChip}>
                  <Award color={Colors.gold} size={12} />
                  <Text style={styles.categoryText}>{cat}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        {breeder.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('partnerDescription')}</Text>
            <Text style={styles.descriptionText}>{breeder.description}</Text>
          </View>
        ) : null}

        {/* Contact */}
        {(breeder.phone || breeder.email || breeder.website) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('partnerContact')}</Text>
            {breeder.phone && (
              <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${breeder.phone}`)}>
                <Phone color={Colors.royalBlue} size={18} />
                <Text style={styles.contactText}>{breeder.phone}</Text>
              </TouchableOpacity>
            )}
            {breeder.email && (
              <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${breeder.email}`)}>
                <Mail color={Colors.royalBlue} size={18} />
                <Text style={styles.contactText}>{breeder.email}</Text>
              </TouchableOpacity>
            )}
            {breeder.website && (
              <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(breeder.website!)}>
                <Globe color={Colors.royalBlue} size={18} />
                <Text style={styles.contactText}>{breeder.website}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Auction button */}
        <TouchableOpacity
          style={[styles.auctionBtn, auctionCount === 0 && styles.auctionBtnDisabled]}
          onPress={handleViewAuctions}
          disabled={!breeder.user_id}
        >
          <Gavel color={auctionCount > 0 ? Colors.goldDark : Colors.textLight} size={22} />
          <Text style={[styles.auctionBtnText, auctionCount === 0 && styles.auctionBtnTextDisabled]}>
            {t('partnerViewAuctions')}
          </Text>
          {auctionCount > 0 && (
            <View style={styles.auctionCountBadge}>
              <Text style={styles.auctionCountText}>{auctionCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {!breeder.user_id && (
          <Text style={styles.noAuctionsText}>{t('partnerNoAuctions')}</Text>
        )}

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
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
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
  breederName: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: Colors.text,
    textAlign: 'center',
  },
  countyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  featuredText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.goldDark,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.goldPale,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  categoryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.goldDark,
  },
  descriptionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  contactText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: Colors.royalBlue,
  },
  auctionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.goldLight,
    borderRadius: BorderRadius.md,
    paddingVertical: 18,
    marginTop: 8,
    borderWidth: 2,
    borderColor: Colors.gold,
    ...Shadows.gold,
  },
  auctionBtnDisabled: {
    backgroundColor: Colors.neutral100,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  auctionBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: Colors.goldDark,
  },
  auctionBtnTextDisabled: {
    color: Colors.textLight,
  },
  auctionCountBadge: {
    backgroundColor: Colors.royalBlue,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  auctionCountText: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: Colors.white,
  },
  noAuctionsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 12,
  },
});
