import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { PLAN_LIMITS } from '@/lib/types';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Plus, X, Trash2, Pencil, Stethoscope, Crown, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface TreatmentRecord {
  id: string;
  pigeon_ring: string;
  disease: string;
  symptoms: string;
  treatment: string;
  admin_date: string | null;
  booster_date: string | null;
}

function formatDate(dateStr: string | null, language: string = 'ro'): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const locale = language === 'ro' ? 'ro-RO' : 'en-US';
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isBoosterNear(boosterDate: string | null): boolean {
  if (!boosterDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const booster = new Date(boosterDate);
  booster.setHours(0, 0, 0, 0);
  const diff = Math.round((booster.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= 7;
}

export default function TreatmentsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const { t, language } = useLanguage();
  const [treatments, setTreatments] = useState<TreatmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<TreatmentRecord | null>(null);
  const [form, setForm] = useState({
    pigeon_ring: '',
    disease: '',
    symptoms: '',
    treatment: '',
    admin_date: '',
    booster_date: '',
  });
  const [saving, setSaving] = useState(false);

  const plan = profile?.subscription_plan || 'trial';
  const limits = PLAN_LIMITS[plan];

  const loadTreatments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('treatments')
      .select('*')
      .order('admin_date', { ascending: false });
    setTreatments((data || []) as TreatmentRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (limits.hasTreatments) {
      loadTreatments();
    } else {
      setLoading(false);
    }
  }, [loadTreatments, limits.hasTreatments]);

  if (!limits.hasTreatments) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ScreenHeader title={t('treatmentsTitle')} subtitle={t('treatmentsSub')} />
          <View style={styles.lockedContainer}>
            <View style={styles.lockedIcon}>
              <Crown color={Colors.royalBlue} size={40} />
            </View>
            <Text style={styles.lockedTitle}>{t('premiumModule')}</Text>
            <Text style={styles.lockedSubtitle}>
              {t('treatmentsPremiumMsg')}
            </Text>
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.upgradeBtnText}>{t('seePlans')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const openAddModal = () => {
    setEditingTreatment(null);
    setForm({
      pigeon_ring: '',
      disease: '',
      symptoms: '',
      treatment: '',
      admin_date: new Date().toISOString().split('T')[0],
      booster_date: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (treatment: TreatmentRecord) => {
    setEditingTreatment(treatment);
    setForm({
      pigeon_ring: treatment.pigeon_ring,
      disease: treatment.disease,
      symptoms: treatment.symptoms,
      treatment: treatment.treatment,
      admin_date: treatment.admin_date || '',
      booster_date: treatment.booster_date || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.pigeon_ring.trim() || !form.disease.trim()) {
      Alert.alert(t('error'), t('treatmentRequired'));
      return;
    }
    setSaving(true);
    const payload = {
      pigeon_ring: form.pigeon_ring.trim(),
      disease: form.disease.trim(),
      symptoms: form.symptoms.trim(),
      treatment: form.treatment.trim(),
      admin_date: form.admin_date || null,
      booster_date: form.booster_date || null,
    };
    if (editingTreatment) {
      await supabase.from('treatments').update(payload).eq('id', editingTreatment.id);
    } else {
      await supabase.from('treatments').insert(payload);
    }
    setSaving(false);
    setModalVisible(false);
    loadTreatments();
  };

  const handleDelete = (treatment: TreatmentRecord) => {
    Alert.alert(t('deleteTreatment'), `${t('deleteTreatmentConfirm')} "${treatment.disease}"?`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('treatments').delete().eq('id', treatment.id);
          loadTreatments();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('treatmentsTitle')} subtitle={t('treatmentsSub')} showBack />

        {loading ? (
          <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 40 }} />
        ) : treatments.length === 0 ? (
          <View style={styles.emptyState}>
            <Stethoscope color={Colors.textLight} size={48} />
            <Text style={styles.emptyTitle}>{t('noTreatments')}</Text>
            <Text style={styles.emptySubtitle}>{t('noTreatmentsSub')}</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {treatments.map((treatment) => {
              const boosterNear = isBoosterNear(treatment.booster_date);
              return (
                <View key={treatment.id} style={styles.treatmentCard}>
                  {boosterNear && (
                    <View style={styles.boosterAlert}>
                      <AlertCircle color={Colors.warning} size={16} />
                      <Text style={styles.boosterAlertText}>{t('boosterNear')} {formatDate(treatment.booster_date, language)}</Text>
                    </View>
                  )}
                  <View style={styles.treatmentHeader}>
                    <View style={styles.diseaseBadge}>
                      <Text style={styles.diseaseText}>{treatment.disease}</Text>
                    </View>
                    <View style={styles.treatmentActions}>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(treatment)}>
                        <Pencil color={Colors.royalBlue} size={16} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(treatment)}>
                        <Trash2 color={Colors.error} size={16} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.treatmentInfo}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Porumbel:</Text>
                      <Text style={styles.infoValue}>{treatment.pigeon_ring}</Text>
                    </View>
                    {treatment.symptoms ? (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t('symptoms')}:</Text>
                        <Text style={styles.infoValue}>{treatment.symptoms}</Text>
                      </View>
                    ) : null}
                    {treatment.treatment ? (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t('treatmentApplied')}:</Text>
                        <Text style={styles.infoValue}>{treatment.treatment}</Text>
                      </View>
                    ) : null}
                    <View style={styles.datesRow}>
                      <View style={styles.dateBox}>
                        <Text style={styles.dateLabel}>{t('adminDate')}</Text>
                        <Text style={styles.dateVal}>{formatDate(treatment.admin_date, language)}</Text>
                      </View>
                      <View style={styles.dateBox}>
                        <Text style={styles.dateLabel}>{t('boosterDate')}</Text>
                        <Text style={styles.dateVal}>{formatDate(treatment.booster_date, language)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Plus color={Colors.white} size={26} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingTreatment ? t('editTreatment') : t('addTreatment')}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('pigeonRing')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.pigeon_ring}
                onChangeText={(v) => setForm({ ...form, pigeon_ring: v })}
                placeholder="RO-2024-001"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('disease')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.disease}
                onChangeText={(v) => setForm({ ...form, disease: v })}
                placeholder={t('diseasePlaceholder')}
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('symptoms')}</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={form.symptoms}
                onChangeText={(v) => setForm({ ...form, symptoms: v })}
                placeholder={t('symptomsPlaceholder')}
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('treatmentApplied')}</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={form.treatment}
                onChangeText={(v) => setForm({ ...form, treatment: v })}
                placeholder={t('treatmentPlaceholder')}
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Data Administrării</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.admin_date}
                  onChangeText={(v) => setForm({ ...form, admin_date: v })}
                  placeholder="AAAA-LL-ZZ"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Data Rapelului</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.booster_date}
                  onChangeText={(v) => setForm({ ...form, booster_date: v })}
                  placeholder="AAAA-LL-ZZ"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>{editingTreatment ? t('save') : t('addTreatmentBtn')}</Text>
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
  lockedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 16,
    paddingHorizontal: 24,
  },
  lockedIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.text },
  lockedSubtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  upgradeBtn: {
    backgroundColor: Colors.royalBlue,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  upgradeBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.royalBlue,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: Colors.royalBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  treatmentCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  boosterAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.warningBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  boosterAlertText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.warning },
  treatmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diseaseBadge: {
    backgroundColor: Colors.royalBluePale,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  diseaseText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.royalBlue },
  treatmentActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  treatmentInfo: { gap: 6 },
  infoRow: { flexDirection: 'row', gap: 6 },
  infoLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary },
  infoValue: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.text, flex: 1 },
  datesRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  dateBox: {
    flex: 1,
    backgroundColor: Colors.neutral50,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  dateLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textSecondary },
  dateVal: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text, marginTop: 2 },
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
  formRow: { flexDirection: 'row', gap: 12 },
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
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: Colors.royalBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.white },
});
