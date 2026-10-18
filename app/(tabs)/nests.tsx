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
  Switch,
  FlatList,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useLanguage } from '@/lib/language-context';
import { Plus, X, Trash2, Pencil, Calendar, AlertCircle, Bird, Heart, ChevronDown, Check, Egg, Undo2 } from 'lucide-react-native';

interface NestRecord {
  id: string;
  nest_id: string;
  male_ring: string;
  female_ring: string;
  pairing_date: string | null;
  laying_date: string | null;
  hatching_date: string | null;
  chick_count: number;
  is_foster: boolean;
  foster_source_nest_id: string | null;
  eggs_moved_to_foster: boolean;
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
  const [fosterModalNest, setFosterModalNest] = useState<NestRecord | null>(null);
  const [fosterPickerVisible, setFosterPickerVisible] = useState(false);
  const [form, setForm] = useState({
    nest_id: '',
    male_ring: '',
    female_ring: '',
    pairing_date: '',
    laying_date: '',
    chick_count: '0',
    is_foster: false,
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
      is_foster: false,
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
      is_foster: nest.is_foster,
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
      is_foster: form.is_foster,
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

  const toggleFoster = async (nest: NestRecord, value: boolean) => {
    await supabase.from('nests').update({ is_foster: value }).eq('id', nest.id);
    loadNests();
  };

  const moveEggsToFoster = async (sourceNest: NestRecord, fosterNest: NestRecord) => {
    setSaving(true);
    await supabase.from('nests').update({ eggs_moved_to_foster: true }).eq('id', sourceNest.id);
    await supabase.from('nests').update({
      foster_source_nest_id: sourceNest.id,
      laying_date: sourceNest.laying_date,
      hatching_date: sourceNest.hatching_date,
    }).eq('id', fosterNest.id);
    setSaving(false);
    setFosterPickerVisible(false);
    setFosterModalNest(null);
    Alert.alert(
      t('eggsMovedTitle'),
      `${t('eggsMovedMsg')} ${sourceNest.nest_id} (${sourceNest.male_ring} × ${sourceNest.female_ring})`,
    );
    loadNests();
  };

  const cancelEggTransfer = async (fosterNest: NestRecord) => {
    if (!fosterNest.foster_source_nest_id) return;
    Alert.alert(t('cancelEggTransfer'), t('cancelEggTransferMsg'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirm'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('nests').update({ eggs_moved_to_foster: false }).eq('id', fosterNest.foster_source_nest_id);
          await supabase.from('nests').update({
            foster_source_nest_id: null,
            laying_date: null,
            hatching_date: null,
          }).eq('id', fosterNest.id);
          Alert.alert(t('success'), t('transferCancelled'));
          loadNests();
        },
      },
    ]);
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

  const fosterNests = nests.filter((n) => n.is_foster && !n.eggs_moved_to_foster && n.id !== fosterModalNest?.id);
  const getSourceNestName = (sourceId: string | null) => {
    if (!sourceId) return '';
    const source = nests.find((n) => n.id === sourceId);
    return source ? `${source.nest_id} (${source.male_ring} × ${source.female_ring})` : '';
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('bioCalendar')} subtitle={t('bioCalendarSub')} showBack />

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
                    <View style={[styles.nestIdBadge, nest.is_foster && styles.fosterBadge]}>
                      <Text style={styles.nestIdText}>{nest.nest_id}</Text>
                      {nest.is_foster && <Heart color={Colors.white} size={12} />}
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

                  <View style={styles.fosterSwitchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fosterSwitchLabel}>{t('fosterPair')}</Text>
                      <Text style={styles.fosterSwitchDesc}>{t('fosterPairDesc')}</Text>
                    </View>
                    <Switch
                      value={nest.is_foster}
                      onValueChange={(v) => toggleFoster(nest, v)}
                      trackColor={{ false: Colors.neutral200, true: Colors.gold }}
                      thumbColor={nest.is_foster ? Colors.white : Colors.white}
                    />
                  </View>

                  {!nest.is_foster && nest.laying_date && !nest.eggs_moved_to_foster && (
                    <TouchableOpacity
                      style={styles.moveEggsBtn}
                      onPress={() => {
                        setFosterModalNest(nest);
                        setFosterPickerVisible(true);
                      }}
                    >
                      <Egg color={Colors.white} size={18} />
                      <Text style={styles.moveEggsBtnText}>{t('moveEggsToFoster')}</Text>
                    </TouchableOpacity>
                  )}

                  {!nest.is_foster && nest.eggs_moved_to_foster && (
                    <View style={styles.eggsMovedBadge}>
                      <Egg color={Colors.gold} size={16} />
                      <Text style={styles.eggsMovedText}>{t('eggsAtFoster')}</Text>
                    </View>
                  )}

                  {nest.is_foster && nest.foster_source_nest_id && (
                    <View style={styles.fosteringBadge}>
                      <Heart color={Colors.royalBlue} size={16} />
                      <Text style={styles.fosteringText}>
                        {t('fosteringFor')} {getSourceNestName(nest.foster_source_nest_id)}
                      </Text>
                      <TouchableOpacity
                        style={styles.cancelTransferBtn}
                        onPress={() => cancelEggTransfer(nest)}
                      >
                        <Undo2 color={Colors.error} size={14} />
                      </TouchableOpacity>
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

            <View style={styles.fosterFormRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>{t('fosterPair')}</Text>
                <Text style={styles.fosterFormDesc}>{t('fosterPairDesc')}</Text>
              </View>
              <Switch
                value={form.is_foster}
                onValueChange={(v) => setForm({ ...form, is_foster: v })}
                trackColor={{ false: Colors.neutral200, true: Colors.gold }}
                thumbColor={Colors.white}
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

      <Modal visible={fosterPickerVisible} animationType="slide" transparent={true} onRequestClose={() => setFosterPickerVisible(false)}>
        <View style={styles.fosterPickerOverlay}>
          <View style={styles.fosterPickerCard}>
            <View style={styles.fosterPickerHeader}>
              <Text style={styles.fosterPickerTitle}>{t('selectFoster')}</Text>
              <TouchableOpacity onPress={() => setFosterPickerVisible(false)}>
                <X color={Colors.text} size={22} />
              </TouchableOpacity>
            </View>

            {fosterNests.length === 0 ? (
              <View style={styles.noFosterState}>
                <Heart color={Colors.textLight} size={36} />
                <Text style={styles.noFosterText}>{t('noFosterPairs')}</Text>
              </View>
            ) : (
              <FlatList
                data={fosterNests}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.fosterOption}
                    onPress={() => fosterModalNest && moveEggsToFoster(fosterModalNest, item)}
                  >
                    <View style={styles.fosterOptionIcon}>
                      <Heart color={Colors.gold} size={18} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fosterOptionId}>{item.nest_id}</Text>
                      <Text style={styles.fosterOptionPair}>{item.male_ring} × {item.female_ring}</Text>
                    </View>
                    <ChevronDown color={Colors.textLight} size={20} style={{ transform: [{ rotate: '-90deg' }] }} />
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 300 }}
              />
            )}

            {saving && (
              <View style={styles.fosterSavingRow}>
                <ActivityIndicator color={Colors.royalBlue} size="small" />
              </View>
            )}
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fosterBadge: { backgroundColor: Colors.gold },
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
  fosterSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  fosterSwitchLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  fosterSwitchDesc: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  moveEggsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
  },
  moveEggsBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.white },
  eggsMovedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.goldPale,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.goldLight,
  },
  eggsMovedText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.goldDark },
  fosteringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.royalBluePale,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.royalBlue,
  },
  fosteringText: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  cancelTransferBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
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
  fosterFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  fosterFormDesc: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  saveButton: {
    backgroundColor: Colors.royalBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.white },
  // Foster picker modal
  fosterPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fosterPickerCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  fosterPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  fosterPickerTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  noFosterState: { alignItems: 'center', gap: 12, paddingVertical: 30 },
  noFosterText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  fosterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
    marginBottom: 8,
  },
  fosterOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.goldPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fosterOptionId: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.text },
  fosterOptionPair: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  fosterSavingRow: { paddingVertical: 8, alignItems: 'center' },
});
