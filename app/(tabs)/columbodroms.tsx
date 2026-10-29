import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  MapPin,
  ChevronRight,
  Building2,
  Users,
  Navigation,
  Globe,
  Star,
  Crown,
  RefreshCw,
} from 'lucide-react-native';

interface Columbodrom {
  id: string;
  name: string;
  location: string | null;
  country: string | null;
  logo_url: string | null;
  description: string;
  distance_km: number | null;
  capacity: number | null;
  website: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  season: string | null;
  entry_count?: number;
}

export default function ColumbodromsScreen() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const router = useRouter();
  const [columbodroms, setColumbodroms] = useState<Columbodrom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadColumbodroms = useCallback(async () => {
    const { data, error } = await supabase
      .from('columbodroms')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true });

    if (error) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const enriched = await Promise.all(
      (data || []).map(async (c: Columbodrom) => {
        const { count } = await supabase
          .from('columbodrom_entries')
          .select('id', { count: 'exact', head: true })
          .eq('columbodrom_id', c.id);
        return { ...c, entry_count: count || 0 };
      })
    );

    setColumbodroms(enriched);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadColumbodroms();
  }, [loadColumbodroms]);

  const onRefresh = () => {
    setRefreshing(true);
    loadColumbodroms();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.royalBlue]} />
        }
      >
        <ScreenHeader title={t('colTitle')} subtitle={t('colSub')} showBack />

        {loading ? (
          <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 40 }} />
        ) : columbodroms.length === 0 ? (
          <View style={styles.emptyState}>
            <Building2 color={Colors.textLight} size={48} />
            <Text style={styles.emptyTitle}>{t('colEmpty')}</Text>
            <Text style={styles.emptySubtitle}>{t('colEmptySub')}</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {columbodroms.map((col) => (
              <TouchableOpacity
                key={col.id}
                style={styles.card}
                onPress={() => router.push(`/(tabs)/columbodrom-detail?id=${col.id}` as any)}
                activeOpacity={0.85}
              >
                {col.is_featured && (
                  <View style={styles.featuredBadge}>
                    <Star color={Colors.goldDark} size={10} />
                    <Text style={styles.featuredText}>{t('colFeatured')}</Text>
                  </View>
                )}
                <View style={styles.cardBody}>
                  <View style={styles.logoBox}>
                    {col.logo_url ? (
                      <Building2 color={Colors.royalBlueLight} size={28} />
                    ) : (
                      <Building2 color={Colors.royalBlueLight} size={28} />
                    )}
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={2}>{col.name}</Text>
                    {col.location && (
                      <View style={styles.locationRow}>
                        <MapPin color={Colors.textSecondary} size={13} />
                        <Text style={styles.locationText}>{col.location}, {col.country}</Text>
                      </View>
                    )}
                    <View style={styles.metaRow}>
                      {col.distance_km != null && (
                        <View style={styles.metaChip}>
                          <Navigation color={Colors.royalBlue} size={11} />
                          <Text style={styles.metaText}>{col.distance_km} km</Text>
                        </View>
                      )}
                      {col.capacity != null && (
                        <View style={styles.metaChip}>
                          <Users color={Colors.royalBlue} size={11} />
                          <Text style={styles.metaText}>{col.capacity} {t('colBirdsCap')}</Text>
                        </View>
                      )}
                      <View style={[styles.metaChip, col.is_active ? styles.chipActive : styles.chipInactive]}>
                        <Text style={[styles.metaText, col.is_active ? styles.chipActiveText : styles.chipInactiveText]}>
                          {col.is_active ? t('colActive') : t('colInactive')}
                        </Text>
                      </View>
                    </View>
                    {col.entry_count != null && col.entry_count > 0 && (
                      <Text style={styles.entryCount}>{col.entry_count} {t('colEnrolled')}</Text>
                    )}
                  </View>
                  <ChevronRight color={Colors.textLight} size={20} style={{ alignSelf: 'center' }} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Crown color={Colors.gold} size={24} />
          <View style={styles.infoBody}>
            <Text style={styles.infoTitle}>{t('colPartnershipTitle')}</Text>
            <Text style={styles.infoSub}>{t('colPartnershipSub')}</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 12 },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: Colors.text },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.card,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  featuredText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: Colors.goldDark },
  cardBody: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1, gap: 6 },
  cardName: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text, lineHeight: 21 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.royalBluePale,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: Colors.royalBlue },
  chipActive: { backgroundColor: Colors.successBg },
  chipInactive: { backgroundColor: Colors.neutral100 },
  chipActiveText: { color: Colors.success },
  chipInactiveText: { color: Colors.textLight },
  entryCount: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.goldDark, marginTop: 2 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.goldPale,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: Colors.goldLight,
  },
  infoBody: { flex: 1, gap: 4 },
  infoTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.text },
  infoSub: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
});
