import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ArrowLeft, Plus, Trash2, X, Trophy, Award, Medal } from 'lucide-react-native';
import type { PigeonPalmares } from '@/lib/types';

export default function PalmaresScreen() {
  const { pigeonId, ring } = useLocalSearchParams<{ pigeonId: string; ring: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [results, setResults] = useState<PigeonPalmares[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    position: '1',
    race_name: '',
    year: String(new Date().getFullYear()),
    distance_km: '',
  });

  const loadResults = useCallback(async () => {
    if (!pigeonId) return;
    const { data } = await supabase
      .from('pigeon_palmares')
      .select('*')
      .eq('pigeon_id', pigeonId)
      .order('year', { ascending: false });
    setResults((data || []) as PigeonPalmares[]);
    setLoading(false);
  }, [pigeonId]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const handleAdd = async () => {
    if (!form.race_name.trim() || !pigeonId || !profile?.id) return;
    setSaving(true);
    await supabase.from('pigeon_palmares').insert({
      user_id: profile.id,
      pigeon_id: pigeonId,
      position: parseInt(form.position) || 1,
      race_name: form.race_name.trim(),
      year: form.year ? parseInt(form.year) : null,
      distance_km: form.distance_km ? parseInt(form.distance_km) : null,
    });
    setSaving(false);
    setModalVisible(false);
    setForm({ position: '1', race_name: '', year: String(new Date().getFullYear()), distance_km: '' });
    loadResults();
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      t('deleteResult'),
      t('deleteResultConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await supabase.from('pigeon_palmares').delete().eq('id', id);
            loadResults();
          },
        },
      ]
    );
  };

  const getMedalColor = (position: number) => {
    if (position === 1) return Colors.gold;
    if (position === 2) return '#C0C0C0';
    if (position === 3) return '#CD7F32';
    return Colors.royalBlue;
  };

  const getMedalBg = (position: number) => {
    if (position === 1) return Colors.goldLight;
    if (position === 2) return '#F0F0F0';
    if (position === 3) return '#FAEBD7';
    return Colors.royalBluePale;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={Colors.royalBlue} size={22} />
        </TouchableOpacity>
        <View style={styles.topTitleContainer}>
          <Text style={styles.topTitle}>{t('palmaresTitle2')}</Text>
          <Text style={styles.topSubtitle}>{ring}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Plus color={Colors.royalBlue} size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 40 }} />
        ) : results.length === 0 ? (
          <View style={styles.emptyState}>
            <Trophy color={Colors.textLight} size={48} />
            <Text style={styles.emptyTitle}>{t('palmaresEmpty')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('palmaresEmptySub')}
            </Text>
          </View>
        ) : (
          <View style={styles.resultsList}>
            {results.map((r) => (
              <View key={r.id} style={[styles.resultCard, { borderLeftColor: getMedalColor(r.position) }]}>
                <View style={[styles.positionBadge, { backgroundColor: getMedalBg(r.position) }]}>
                  <Text style={[styles.positionText, { color: getMedalColor(r.position) }]}>
                    {r.position === 1 ? '1' : r.position === 2 ? '2' : r.position === 3 ? '3' : String(r.position)}
                  </Text>
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.raceName}>{r.race_name}</Text>
                  <Text style={styles.resultDetails}>
                    {r.year || '—'}{r.distance_km ? ` · ${r.distance_km} km` : ''}
                  </Text>
                  {r.position <= 3 && (
                    <View style={[styles.medalBadge, { backgroundColor: getMedalBg(r.position) }]}>
                      <Medal color={getMedalColor(r.position)} size={12} />
                      <Text style={[styles.medalText, { color: getMedalColor(r.position) }]}>
                        {r.position === 1 ? t('medalGold') : r.position === 2 ? t('medalSilver') : t('medalBronze')}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(r.id)}>
                  <Trash2 color={Colors.error} size={16} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('addResult')}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('position')}</Text>
              <View style={styles.segmentedControl}>
                {['1', '2', '3', '4', '5'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.segment, form.position === p && styles.segmentActive]}
                    onPress={() => setForm({ ...form, position: p })}
                  >
                    <Text style={[styles.segmentText, form.position === p && styles.segmentTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('raceName')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.race_name}
                onChangeText={(v) => setForm({ ...form, race_name: v })}
                placeholder={t('raceNamePlaceholder')}
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>{t('year')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.year}
                  onChangeText={(v) => setForm({ ...form, year: v })}
                  placeholder="2024"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>{t('distance')}</Text>
                <TextInput
                  style={styles.formInput}
                  value={form.distance_km}
                  onChangeText={(v) => setForm({ ...form, distance_km: v })}
                  placeholder="350"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleAdd} disabled={saving || !form.race_name.trim()}>
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>{t('addResultBtn')}</Text>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
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
  topTitleContainer: { flex: 1, alignItems: 'center' },
  topTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  topSubtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  addBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 12 },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: Colors.text },
  emptySubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  resultsList: { gap: 12 },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderLeftWidth: 4,
  },
  positionBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
  },
  resultInfo: { flex: 1, gap: 4 },
  raceName: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text },
  resultDetails: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  medalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 2,
  },
  medalText: { fontFamily: 'Inter-SemiBold', fontSize: 11 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral100,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: Colors.royalBlue },
  segmentText: { fontFamily: 'Inter-Medium', fontSize: 16, color: Colors.textSecondary },
  segmentTextActive: { color: Colors.white },
  saveButton: {
    backgroundColor: Colors.royalBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.white },
});
