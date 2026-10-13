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
  Image,
  SafeAreaView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { MedalType } from '@/lib/types';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Plus, Trash2, X, Trophy, Medal, Camera, Image as ImageIcon, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Trophy as TrophyType } from '@/lib/types';

const MEDAL_COLORS: Record<MedalType, string> = {
  gold: Colors.gold,
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

const MEDAL_BG: Record<MedalType, string> = {
  gold: Colors.goldLight,
  silver: '#F0F0F0',
  bronze: '#FAEBD7',
};

export default function VitrinaScreen() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [trophies, setTrophies] = useState<TrophyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [medalDropdown, setMedalDropdown] = useState(false);
  const [form, setForm] = useState({
    year: String(new Date().getFullYear()),
    category: '',
    medal: '' as string,
    description: '',
  });

  const loadTrophies = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('trophies')
      .select('*')
      .order('created_at', { ascending: false });
    setTrophies((data || []) as TrophyType[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTrophies();
  }, [loadTrophies]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisiune refuzată', 'Ai nevoie de permisiune pentru a accesa galeria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisiune refuzată', 'Ai nevoie de permisiune pentru a folosi camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      const userId = profile?.id;
      if (!userId) return null;
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${userId}/trophy_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('pigeon-photos')
        .upload(fileName, { uri } as any, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });
      if (uploadError) return null;
      const { data } = supabase.storage.from('pigeon-photos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch {
      return null;
    }
  };

  const handleAdd = async () => {
    if (!form.category.trim() || !profile?.id) return;
    setSaving(true);
    let photoUrl: string | null = null;
    if (photoUri) {
      const uploaded = await uploadPhoto(photoUri);
      if (uploaded) photoUrl = uploaded;
    }
    await supabase.from('trophies').insert({
      user_id: profile.id,
      photo_url: photoUrl,
      year: form.year ? parseInt(form.year) : null,
      category: form.category.trim(),
      medal: form.medal || null,
      description: form.description.trim(),
    });
    setSaving(false);
    setModalVisible(false);
    setPhotoUri(null);
    setForm({ year: String(new Date().getFullYear()), category: '', medal: '', description: '' });
    loadTrophies();
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      t('deleteTrophy'),
      t('deleteTrophyConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await supabase.from('trophies').delete().eq('id', id);
            loadTrophies();
          },
        },
      ]
    );
  };

  const getMedalColor = (medal: MedalType | null) => {
    if (!medal) return Colors.royalBlue;
    return MEDAL_COLORS[medal];
  };

  const getMedalBg = (medal: MedalType | null) => {
    if (!medal) return Colors.royalBluePale;
    return MEDAL_BG[medal];
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('vitrinaTitle')} subtitle={t('vitrinaSub')} />

        {loading ? (
          <ActivityIndicator size="large" color={Colors.gold} style={{ marginTop: 40 }} />
        ) : trophies.length === 0 ? (
          <View style={styles.emptyState}>
            <Trophy color={Colors.textLight} size={48} />
            <Text style={styles.emptyTitle}>{t('vitrinaEmpty')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('vitrinaEmptySub')}
            </Text>
          </View>
        ) : (
          <View style={styles.trophiesList}>
            {trophies.map((trophy) => {
              const medal = trophy.medal as MedalType | null;
              return (
                <View key={trophy.id} style={[styles.trophyCard, { borderLeftColor: getMedalColor(medal) }]}>
                  <View style={styles.trophyPhoto}>
                    {trophy.photo_url ? (
                      <Image source={{ uri: trophy.photo_url }} style={styles.photo} />
                    ) : (
                      <Trophy color={Colors.textLight} size={28} />
                    )}
                  </View>
                  <View style={styles.trophyInfo}>
                    <Text style={styles.trophyCategory}>{trophy.category}</Text>
                    <Text style={styles.trophyDetails}>
                      {trophy.year || '—'}
                    </Text>
                    {medal && (
                      <View style={[styles.medalBadge, { backgroundColor: getMedalBg(medal) }]}>
                        <Medal color={getMedalColor(medal)} size={12} />
                        <Text style={[styles.medalText, { color: getMedalColor(medal) }]}>
                          {medal === 'gold' ? t('medalGold') : medal === 'silver' ? t('medalSilver') : t('medalBronze')}
                        </Text>
                      </View>
                    )}
                    {trophy.description ? (
                      <Text style={styles.trophyDescription}>{trophy.description}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(trophy.id)}>
                    <Trash2 color={Colors.error} size={16} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Plus color={Colors.white} size={26} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('addTrophy')}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.photoSection}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.previewPhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Trophy color={Colors.textLight} size={40} />
                </View>
              )}
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                  <Camera color={Colors.royalBlue} size={18} />
                  <Text style={styles.photoBtnText}>Cameră</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                  <ImageIcon color={Colors.royalBlue} size={18} />
                  <Text style={styles.photoBtnText}>Galerie</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('trophyCategory')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.category}
                onChangeText={(v) => setForm({ ...form, category: v })}
                placeholder={t('trophyCategoryPlaceholder')}
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('trophyYear')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.year}
                onChangeText={(v) => setForm({ ...form, year: v })}
                placeholder="2024"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('trophyMedal')}</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setMedalDropdown(!medalDropdown)}
              >
                <Text style={[styles.dropdownButtonText, !form.medal && styles.dropdownPlaceholder]}>
                  {form.medal ? (form.medal === 'gold' ? t('medalGold') : form.medal === 'silver' ? t('medalSilver') : t('medalBronze')) : t('trophySelectMedal')}
                </Text>
                <ChevronDown color={Colors.textSecondary} size={20} />
              </TouchableOpacity>
              {medalDropdown && (
                <View style={styles.dropdownList}>
                  <TouchableOpacity
                    style={[styles.dropdownItem, !form.medal && styles.dropdownItemActive]}
                    onPress={() => { setForm({ ...form, medal: '' }); setMedalDropdown(false); }}
                  >
                    <Text style={[styles.dropdownItemText, !form.medal && styles.dropdownItemTextActive]}>{t('noMedal')}</Text>
                  </TouchableOpacity>
                  {(['gold', 'silver', 'bronze'] as MedalType[]).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.dropdownItem, form.medal === m && styles.dropdownItemActive]}
                      onPress={() => { setForm({ ...form, medal: m }); setMedalDropdown(false); }}
                    >
                      <View style={styles.dropdownMedalRow}>
                        <Medal color={MEDAL_COLORS[m]} size={16} />
                        <Text style={[styles.dropdownItemText, form.medal === m && styles.dropdownItemTextActive]}>
                          {m === 'gold' ? t('medalGold') : m === 'silver' ? t('medalSilver') : t('medalBronze')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('trophyDescription')}</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                placeholder={t('trophyDescPlaceholder')}
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleAdd} disabled={saving || !form.category.trim()}>
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>{t('addTrophyBtn')}</Text>
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
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  trophiesList: { gap: 14 },
  trophyCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderLeftWidth: 4,
  },
  trophyPhoto: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: Colors.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%', borderRadius: 14 },
  trophyInfo: { flex: 1, gap: 4 },
  trophyCategory: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text },
  trophyDetails: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
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
  trophyDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
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
  photoSection: { alignItems: 'center', marginBottom: 24, gap: 14 },
  photoPlaceholder: {
    width: 120,
    height: 90,
    borderRadius: 16,
    backgroundColor: Colors.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPhoto: { width: 120, height: 90, borderRadius: 16 },
  photoButtons: { flexDirection: 'row', gap: 12 },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.royalBlue,
  },
  photoBtnText: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.royalBlue },
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
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownButtonText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: Colors.text,
  },
  dropdownPlaceholder: { color: Colors.textLight },
  dropdownList: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dropdownItemActive: { backgroundColor: Colors.royalBluePale },
  dropdownItemText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.text,
  },
  dropdownItemTextActive: {
    color: Colors.royalBlue,
    fontFamily: 'Inter-SemiBold',
  },
  dropdownMedalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveButton: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.white },
});
