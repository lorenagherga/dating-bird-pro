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
import { Colors } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useLanguage } from '@/lib/language-context';
import { Plus, X, Trash2, Pencil, Calendar, AlertCircle, Bird } from 'lucide-react-native';

interface NestRecord {
  id: string;
  nest_id: string;
  male_ring: string;
  female_ring: string;
  pairing_date: string | null;
  laying_date: string | null;
  hatching_date: string | null;
  chick_count: number;
}

function formatDate(dateStr: string | null, locale: string = 'ro-RO'): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isHatchingNear(hatchingDate: string | null): 'past' | 'today' | 'soon' | 'future' | 'none' {
  if (!hatchingDate) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hatch = new Date(hatchingDate);
  hatch.setHours(0, 0, 0, 0);
  const diffDays = Math.round((hatch.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'past';
  if (diffDays === 0) return 'today';
  if (diffDays <= 7) return 'soon';
  return 'future';
}

export default function NestsScreen() {
  const { t, language } = useLanguage();
  const [nests, setNests] = useState<NestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNest, setEditingNest] = useState<NestRecord | null>(null);
  const [form, setForm] = useState({
    nest_id: '',
    male_ring: '',
    female_ring: '',
    pairing_date: '',
    laying_date: '',
    chick_count: '0',
  });
  const [saving, setSaving] = useState(false);

  const loadNests = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('nests')
      .select('*')
      .order('created_at', { ascending: false });
    setNests((data || []) as NestRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNests();
  }, [loadNests]);

  const calculateHatchingDate = (layingDate: string): string | null => {
    if (!layingDate) return null;
    const d = new Date(layingDate);
    d.setDate(d.getDate() + 18);
    return d.toISOString().split('T')[0];
  };

  const openAddModal = () => {
    setEditingNest(null);
    setForm({
      nest_id: `C${nests.length + 1}`,
      male_ring: '',
      female_ring: '',
      pairing_date: new Date().toISOString().split('T')[0],
      laying_date: '',
      chick_count: '0',
    });
    setModalVisible(true);
  };

  const openEditModal = (nest: NestRecord) => {
    setEditingNest(nest);
    setForm({
      nest_id: nest.nest_id,
      male_ring: nest.male_ring,
      female_ring: nest.female_ring,
      pairing_date: nest.pairing_date || '',
      laying_date: nest.laying_date || '',
      chick_count: String(nest.chick_count),
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.nest_id.trim() || !form.male_ring.trim() || !form.female_ring.trim()) {
      Alert.alert(t('error'), t('nestRequired'));
      return;
    }
    setSaving(true);

    const hatchingDate = calculateHatchingDate(form.laying_date);

    const payload = {
      nest_id: form.nest_id.trim(),
      male_ring: form.male_ring.trim(),
      female_ring: form.female_ring.trim(),
      pairing_date: form.pairing_date || null,
      laying_date: form.laying_date || null,
      hatching_date: hatchingDate,
      chick_count: parseInt(form.chick_count) || 0,
    };

    if (editingNest) {
      await supabase.from('nests').update(payload).eq('id', editingNest.id);
    } else {
      await supabase.from('nests').insert(payload);
    }

    setSaving(false);
    setModalVisible(false);
    loadNests();
  };

  const handleDelete = (nest: NestRecord) => {
    Alert.alert(`${t('delete')} ${nest.nest_id}`, `${t('deletePigeonConfirm')} ${nest.nest_id}?`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('nests').delete().eq('id', nest.id);
          loadNests();
        },
      },
    ]);
  };

  const hatchingAlertStyle = (status: string) => {
    if (status === 'today') return { bg: Colors.errorBg, text: Colors.error, label: t('hatchingToday') };
    if (status === 'soon') return { bg: Colors.warningBg, text: Colors.warning, label: t('hatchingSoon') };
    if (status === 'past') return { bg: Colors.neutral100, text: Colors.textSecondary, label: t('hatchingPast') };
    return { bg: Colors.royalBluePale, text: Colors.royalBlue, label: t('waiting') };
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('bioCalendar')} subtitle={t('bioCalendarSub')} />

        {loading ? (
          <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 40 }} />
        ) : nests.length === 0 ? (
          <View style={styles.emptyState}>
            <Bird color={Colors.textLight} size={48} />
            <Text style={styles.emptyTitle}>{t('noNests')}</Text>
            <Text style={styles.emptySubtitle}>{t('noNestsSub')}</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {nests.map((nest) => {
              const hatchStatus = isHatchingNear(nest.hatching_date);
              const alert = hatchingAlertStyle(hatchStatus);
              return (
                <View key={nest.id} style={styles.nestCard}>
                  <View style={styles.nestCardHeader}>
                    <View style={styles.nestIdBadge}>
                      <Text style={styles.nestIdText}>{nest.nest_id}</Text>
                    </View>
                    <View style={styles.nestActions}>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(nest)}>
                        <Pencil color={Colors.royalBlue} size={16} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(nest)}>
                        <Trash2 color={Colors.error} size={16} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.nestPair}>
                    <View style={styles.pairBox}>
                      <Text style={styles.pairLabel}>{t('male')}</Text>
                      <Text style={styles.pairRing}>{nest.male_ring}</Text>
                    </View>
                    <Text style={styles.pairX}>×</Text>
                    <View style={styles.pairBox}>
                      <Text style={styles.pairLabel}>{t('female')}</Text>
                      <Text style={styles.pairRing}>{nest.female_ring}</Text>
                    </View>
                  </View>

                  <View style={styles.nestDates}>
                    <View style={styles.dateItem}>
                      <Text style={styles.dateLabel}>{t('pairingDate')}</Text>
                      <Text style={styles.dateValue}>{formatDate(nest.pairing_date, language === 'ro' ? 'ro-RO' : 'en-US')}</Text>
                    </View>
                    <View style={styles.dateItem}>
                      <Text style={styles.dateLabel}>{t('layingDate')}</Text>
                      <Text style={styles.dateValue}>{formatDate(nest.laying_date, language === 'ro' ? 'ro-RO' : 'en-US')}</Text>
                    </View>
                    <View style={styles.dateItem}>
                      <Text style={styles.dateLabel}>{t('hatchingDate')}</Text>
                      <Text style={styles.dateValue}>{formatDate(nest.hatching_date, language === 'ro' ? 'ro-RO' : 'en-US')}</Text>
                    </View>
                    <View style={styles.dateItem}>
                      <Text style={styles.dateLabel}>{t('chicks')}</Text>
                      <Text style={styles.dateValue}>{nest.chick_count}</Text>
                    </View>
                  </View>

                  {hatchStatus !== 'none' && hatchStatus !== 'future' && (
                    <View style={[styles.alertBar, { backgroundColor: alert.bg }]}>
                      <AlertCircle color={alert.text} size={16} />
                      <Text style={[styles.alertText, { color: alert.text }]}>{alert.label}</Text>
                    </View>
                  )}
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
            <Text style={styles.modalTitle}>{editingNest ? t('editNest') : t('addNest')}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('nestId')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.nest_id}
                onChangeText={(v) => setForm({ ...form, nest_id: v })}
                placeholder="ex: C1"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>{t('maleRing')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.male_ring}
                  onChangeText={(v) => setForm({ ...form, male_ring: v })}
                  placeholder="RO-2024-001"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>{t('femaleRing')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.female_ring}
                  onChangeText={(v) => setForm({ ...form, female_ring: v })}
                  placeholder="RO-2024-002"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('pairingDate')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.pairing_date}
                onChangeText={(v) => setForm({ ...form, pairing_date: v })}
                placeholder="AAAA-LL-ZZ"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('layingDate')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.laying_date}
                onChangeText={(v) => setForm({ ...form, laying_date: v })}
                placeholder="AAAA-LL-ZZ"
                placeholderTextColor={Colors.textLight}
              />
              <Text style={styles.hintText}>{t('hatchingCalcHint')}</Text>
              {form.laying_date && (
                <View style={styles.calcPreview}>
                  <Calendar color={Colors.royalBlue} size={16} />
                  <Text style={styles.calcPreviewText}>
                    {t('hatchingEstimate')} {formatDate(calculateHatchingDate(form.laying_date), language === 'ro' ? 'ro-RO' : 'en-US')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('chickCount')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.chick_count}
                onChangeText={(v) => setForm({ ...form, chick_count: v })}
                placeholder="0"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>{editingNest ? t('save') : t('addNestBtn')}</Text>
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
  nestCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  nestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nestIdBadge: {
    backgroundColor: Colors.royalBlue,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  nestIdText: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.white },
  nestActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nestPair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  pairBox: {
    flex: 1,
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  pairLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  pairRing: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  pairX: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.royalBlue },
  nestDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.neutral50,
    borderRadius: 10,
    padding: 10,
  },
  dateLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textSecondary },
  dateValue: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text, marginTop: 2 },
  alertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  alertText: { fontFamily: 'Inter-SemiBold', fontSize: 13 },
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
  hintText: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  calcPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.royalBluePale,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  calcPreviewText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  saveButton: {
    backgroundColor: Colors.royalBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.white },
});
