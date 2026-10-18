import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Crown, MapPin, ChevronRight, Star, Bird, Plus, X, Sparkles, CheckCircle, Clock, XCircle } from 'lucide-react-native';

interface EliteBreeder {
  id: string;
  breeder_name: string;
  logo_url: string | null;
  county: string | null;
  categories: string[];
  description: string;
  is_featured: boolean;
  sort_order: number;
  user_id: string | null;
}

interface PartnerRequest {
  id: string;
  breeder_name: string;
  county: string | null;
  categories: string[];
  contact_link: string | null;
  status: string;
  created_at: string;
}

export default function PartnersScreen() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const router = useRouter();
  const [breeders, setBreeders] = useState<EliteBreeder[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myRequest, setMyRequest] = useState<PartnerRequest | null>(null);
  const [form, setForm] = useState({
    breeder_name: '',
    county: '',
    categories: '',
    contact_link: '',
  });

  const loadBreeders = useCallback(async () => {
    const { data } = await supabase
      .from('elite_breeders')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true });
    setBreeders((data || []) as EliteBreeder[]);
    setLoading(false);
  }, []);

  const loadMyRequest = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('partner_requests')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .maybeSingle();
    setMyRequest(data as PartnerRequest | null);
  }, [profile?.id]);

  useEffect(() => {
    loadBreeders();
    loadMyRequest();
  }, [loadBreeders, loadMyRequest]);

  const openForm = () => {
    setForm({
      breeder_name: profile?.breeder_name || '',
      county: '',
      categories: '',
      contact_link: '',
    });
    setFormVisible(true);
  };

  const handleSubmit = async () => {
    if (!form.breeder_name.trim() || !form.county.trim() || !form.categories.trim() || !form.contact_link.trim()) {
      Alert.alert(t('error'), t('formRequired'));
      return;
    }
    setSubmitting(true);
    const categories = form.categories.split(',').map((c) => c.trim()).filter(Boolean);
    const { error } = await supabase.from('partner_requests').insert({
      breeder_name: form.breeder_name.trim(),
      county: form.county.trim(),
      categories,
      contact_link: form.contact_link.trim(),
      user_id: profile?.id || null,
      status: 'pending',
    });
    setSubmitting(false);
    if (error) {
      Alert.alert(t('error'), t('formError'));
      return;
    }
    setFormVisible(false);
    Alert.alert(t('success'), t('formSubmittedMsg'));
    loadMyRequest();
  };

  const requestStatusConfig: Record<string, { color: string; bg: string; icon: typeof Clock; label: string }> = {
    pending: { color: Colors.warning, bg: Colors.warningBg, icon: Clock, label: t('requestPending') },
    approved: { color: Colors.success, bg: Colors.successBg, icon: CheckCircle, label: t('requestApproved') },
    rejected: { color: Colors.error, bg: Colors.errorBg, icon: XCircle, label: t('requestRejected') },
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('partnersTitle')} subtitle={t('partnersSub')} showBack />

        {/* My request status banner */}
        {myRequest && (
          <View style={[styles.myRequestBanner, { backgroundColor: requestStatusConfig[myRequest.status]?.bg || Colors.warningBg }]}>
            {(() => {
              const cfg = requestStatusConfig[myRequest.status] || requestStatusConfig.pending;
              const Icon = cfg.icon;
              return (
                <>
                  <Icon color={cfg.color} size={20} />
                  <View style={styles.myRequestInfo}>
                    <Text style={[styles.myRequestTitle, { color: cfg.color }]}>{cfg.label}</Text>
                    <Text style={styles.myRequestSub}>{myRequest.breeder_name}</Text>
                  </View>
                </>
              );
            })()}
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 40 }} />
        ) : breeders.length === 0 ? (
          <View style={styles.emptyState}>
            <Crown color={Colors.textLight} size={48} />
            <Text style={styles.emptyTitle}>{t('partnersNoData')}</Text>
            <Text style={styles.emptySubtitle}>{t('partnersNoDataSub')}</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {breeders.map((breeder) => (
              <TouchableOpacity
                key={breeder.id}
                style={styles.breederCard}
                onPress={() => router.push(`/(tabs)/partner-detail?id=${breeder.id}`)}
                activeOpacity={0.85}
              >
                {breeder.is_featured && (
                  <View style={styles.featuredBadge}>
                    <Star color={Colors.goldDark} size={10} />
                    <Text style={styles.featuredText}>{t('partnerFeatured')}</Text>
                  </View>
                )}
                <View style={styles.cardBody}>
                  <View style={styles.logoBox}>
                    {breeder.logo_url ? (
                      <Image source={{ uri: breeder.logo_url }} style={styles.logo} resizeMode="cover" />
                    ) : (
                      <Bird color={Colors.royalBlueLight} size={28} />
                    )}
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.breederName} numberOfLines={1}>{breeder.breeder_name}</Text>
                    {breeder.county && (
                      <View style={styles.countyRow}>
                        <MapPin color={Colors.textSecondary} size={13} />
                        <Text style={styles.countyText}>{breeder.county}</Text>
                      </View>
                    )}
                    <View style={styles.categoriesRow}>
                      {breeder.categories.slice(0, 3).map((cat, idx) => (
                        <View key={idx} style={styles.categoryChip}>
                          <Text style={styles.categoryText}>{cat}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <ChevronRight color={Colors.textLight} size={20} style={{ alignSelf: 'center' }} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Become Partner Card */}
        <TouchableOpacity
          style={styles.becomePartnerCard}
          onPress={openForm}
          disabled={!!myRequest && myRequest.status === 'pending'}
          activeOpacity={0.85}
        >
          <View style={styles.becomePartnerIcon}>
            <Sparkles color={Colors.gold} size={28} />
          </View>
          <Text style={styles.becomePartnerTitle}>{t('becomePartner')}</Text>
          <Text style={styles.becomePartnerSub}>{t('becomePartnerSub')}</Text>
          {myRequest && myRequest.status === 'pending' ? (
            <View style={styles.pendingNote}>
              <Clock color={Colors.warning} size={14} />
              <Text style={styles.pendingNoteText}>{t('requestPending')}</Text>
            </View>
          ) : (
            <View style={styles.becomePartnerBtn}>
              <Plus color={Colors.goldDark} size={18} />
              <Text style={styles.becomePartnerBtnText}>{t('becomePartnerApply')}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Application Form Modal */}
      <Modal visible={formVisible} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('becomePartnerApply')}</Text>
            <TouchableOpacity onPress={() => setFormVisible(false)}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('formBreederName')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.breeder_name}
                onChangeText={(v) => setForm({ ...form, breeder_name: v })}
                placeholder={t('formBreederNamePlaceholder')}
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('formCounty')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.county}
                onChangeText={(v) => setForm({ ...form, county: v })}
                placeholder={t('formCountyPlaceholder')}
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('formCategories')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.categories}
                onChangeText={(v) => setForm({ ...form, categories: v })}
                placeholder={t('formCategoriesPlaceholder')}
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('formContactLink')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.contact_link}
                onChangeText={(v) => setForm({ ...form, contact_link: v })}
                placeholder={t('formContactLinkPlaceholder')}
                placeholderTextColor={Colors.textLight}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color={Colors.goldDark} />
              ) : (
                <>
                  <Sparkles color={Colors.goldDark} size={20} />
                  <Text style={styles.submitBtnText}>{t('formSubmit')}</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 12 },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: Colors.text },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  myRequestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  myRequestInfo: { flex: 1, gap: 2 },
  myRequestTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15 },
  myRequestSub: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  breederCard: {
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
  featuredText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: Colors.goldDark,
  },
  cardBody: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: { width: 64, height: 64, borderRadius: 16 },
  cardInfo: { flex: 1, gap: 6 },
  breederName: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: Colors.text,
  },
  countyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.royalBluePale,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: Colors.royalBlue,
  },
  // Become Partner Card
  becomePartnerCard: {
    marginTop: 24,
    backgroundColor: Colors.goldPale,
    borderRadius: BorderRadius.lg,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    borderWidth: 2,
    borderColor: Colors.gold,
    borderStyle: 'dashed',
  },
  becomePartnerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.goldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  becomePartnerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  becomePartnerSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  becomePartnerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    marginTop: 4,
  },
  becomePartnerBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: Colors.goldDark,
  },
  pendingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.warningBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  pendingNoteText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.warning,
  },
  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 50,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.text },
  modalScroll: { padding: 24 },
  formGroup: { marginBottom: 16, gap: 6 },
  formLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.text },
  formInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.goldLight,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    marginTop: 8,
    borderWidth: 2,
    borderColor: Colors.gold,
    ...Shadows.gold,
  },
  submitBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: Colors.goldDark,
  },
});
