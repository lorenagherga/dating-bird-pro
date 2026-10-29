import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { supabase, SUPABASE_URL } from '@/lib/supabase';
import { Colors } from '@/lib/theme';
import { PLAN_LIMITS, GAME_STYLE_OPTIONS, GameStyle } from '@/lib/types';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Plus, Camera, Image as ImageIcon, Trash2, Pencil, X, Bird, Crown, GitBranch, ChevronDown, Trophy, Award, Download, Wifi, Dna } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { scrapeFederationResults, FEDERATION_NAMES, Federation, ScrapedResult } from '@/lib/federation-scraper';

interface PigeonRecord {
  id: string;
  ring_series: string | null;
  year: number | null;
  sex: string;
  color: string;
  status: string;
  sire_id: string | null;
  dam_id: string | null;
  sire_external_color: string | null;
  dam_external_color: string | null;
  photo_url: string | null;
  notes: string;
  game_style: GameStyle | null;
  is_champion: boolean;
}

export default function PigeonsScreen() {
  const { profile, pigeonType } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [pigeons, setPigeons] = useState<PigeonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPigeon, setEditingPigeon] = useState<PigeonRecord | null>(null);
  const [form, setForm] = useState({
    ring_series: '',
    year: '',
    sex: 'Mascul',
    color: '',
    status: 'În crescătorie',
    sire_id: '',
    dam_id: '',
    sire_external_color: '',
    dam_external_color: '',
    notes: '',
    game_style: '' as string,
    is_champion: false,
  });
  const [sireMode, setSireMode] = useState<'registry' | 'external'>('registry');
  const [damMode, setDamMode] = useState<'registry' | 'external'>('registry');
  const [fedModalVisible, setFedModalVisible] = useState(false);
  const [fedPigeon, setFedPigeon] = useState<PigeonRecord | null>(null);
  const [fedFederation, setFedFederation] = useState<Federation>('FNCPR');
  const [fedYear, setFedYear] = useState(String(new Date().getFullYear()));
  const [fedScanning, setFedScanning] = useState(false);
  const [fedScanStep, setFedScanStep] = useState(0);
  const [fedResults, setFedResults] = useState<ScrapedResult[] | null>(null);
  const [fedImporting, setFedImporting] = useState(false);
  const [gameStyleDropdown, setGameStyleDropdown] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showGameStyle = pigeonType === 'fancy' || pigeonType === 'both';
  const plan = profile?.subscription_plan || 'trial';
  const limits = PLAN_LIMITS[plan];

  const gameStyleLabel = (style: GameStyle): string => {
    const labels: Record<GameStyle, string> = {
      short: t('gsShort'),
      medium: t('gsMedium'),
      long: t('gsLong'),
      faller: t('gsFaller'),
      none: t('gsNone'),
    };
    return labels[style];
  };

  const loadPigeons = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pigeons')
      .select('*')
      .order('created_at', { ascending: false });
    setPigeons((data || []) as PigeonRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPigeons();
  }, [loadPigeons]);

  const canAddMore = pigeons.length < limits.pigeonLimit;

  const openAddModal = () => {
    if (!canAddMore) {
      Alert.alert(
        t('limitReached'),
        `${t('planTrial')} · ${limits.pigeonLimit} ${t('limitReachedMsg')}`,
        [
          { text: t('seePlans'), onPress: () => router.push('/(tabs)/profile') },
          { text: t('close') },
        ]
      );
      return;
    }
    setEditingPigeon(null);
    setForm({
      ring_series: '',
      year: String(new Date().getFullYear()),
      sex: 'Mascul',
      color: '',
      status: 'În crescătorie',
      sire_id: '',
      dam_id: '',
      sire_external_color: '',
      dam_external_color: '',
      notes: '',
      game_style: '',
      is_champion: false,
    });
    setSireMode('registry');
    setDamMode('registry');
    setGameStyleDropdown(false);
    setPhotoUri(null);
    setModalVisible(true);
  };

  const openEditModal = (pigeon: PigeonRecord) => {
    setEditingPigeon(pigeon);
    setForm({
      ring_series: pigeon.ring_series || '',
      year: pigeon.year ? String(pigeon.year) : '',
      sex: pigeon.sex,
      color: pigeon.color,
      status: pigeon.status,
      sire_id: pigeon.sire_id || '',
      dam_id: pigeon.dam_id || '',
      sire_external_color: pigeon.sire_external_color || '',
      dam_external_color: pigeon.dam_external_color || '',
      notes: pigeon.notes,
      game_style: pigeon.game_style || '',
      is_champion: pigeon.is_champion || false,
    });
    setSireMode(pigeon.sire_external_color ? 'external' : 'registry');
    setDamMode(pigeon.dam_external_color ? 'external' : 'registry');
    setGameStyleDropdown(false);
    setPhotoUri(pigeon.photo_url);
    setModalVisible(true);
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
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisiune refuzată', 'Ai nevoie de permisiune pentru a accesa galeria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
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
      const fileExt = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('pigeon-photos')
        .upload(filePath, blob, {
          contentType: blob.type || `image/${fileExt}`,
          upsert: false,
        });

      if (uploadError) return null;

      const { data } = supabase.storage
        .from('pigeon-photos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    if (!form.ring_series.trim() && !photoUri && !editingPigeon?.photo_url) {
      Alert.alert(t('error'), t('photoRequired'));
      return;
    }
    setSaving(true);

    let photoUrl = editingPigeon?.photo_url || null;
    if (photoUri && photoUri !== editingPigeon?.photo_url) {
      const uploaded = await uploadPhoto(photoUri);
      if (uploaded) photoUrl = uploaded;
    }

    let finalSireId = sireMode === 'registry' ? (form.sire_id || null) : null;
    let finalDamId = damMode === 'registry' ? (form.dam_id || null) : null;

    if (finalSireId && finalDamId) {
      const { data: sirePigeon } = await supabase.from('pigeons').select('ring_series').eq('id', finalSireId).maybeSingle();
      const { data: damPigeon } = await supabase.from('pigeons').select('ring_series').eq('id', finalDamId).maybeSingle();

      if (sirePigeon?.ring_series && damPigeon?.ring_series) {
        const { data: fosterNest } = await supabase
          .from('nests')
          .select('id, foster_source_nest_id')
          .eq('is_foster', true)
          .not('foster_source_nest_id', 'is', null)
          .eq('male_ring', sirePigeon.ring_series)
          .eq('female_ring', damPigeon.ring_series)
          .maybeSingle();

        if (fosterNest?.foster_source_nest_id) {
          const { data: sourceNest } = await supabase
            .from('nests')
            .select('male_ring, female_ring')
            .eq('id', fosterNest.foster_source_nest_id)
            .maybeSingle();

          if (sourceNest?.male_ring && sourceNest?.female_ring) {
            const { data: geneticSire } = await supabase.from('pigeons').select('id').eq('ring_series', sourceNest.male_ring).maybeSingle();
            const { data: geneticDam } = await supabase.from('pigeons').select('id').eq('ring_series', sourceNest.female_ring).maybeSingle();
            if (geneticSire?.id) finalSireId = geneticSire.id;
            if (geneticDam?.id) finalDamId = geneticDam.id;
          }
        }
      }
    }

    const payload = {
      ring_series: form.ring_series.trim() || null,
      year: form.year ? parseInt(form.year) : null,
      sex: form.sex,
      color: form.color.trim(),
      status: form.status,
      sire_id: finalSireId,
      dam_id: finalDamId,
      sire_external_color: sireMode === 'external' ? form.sire_external_color.trim() || null : null,
      dam_external_color: damMode === 'external' ? form.dam_external_color.trim() || null : null,
      photo_url: photoUrl,
      notes: form.notes.trim(),
      game_style: form.game_style || null,
      is_champion: form.is_champion,
    };

    if (editingPigeon) {
      await supabase.from('pigeons').update(payload).eq('id', editingPigeon.id);
    } else {
      await supabase.from('pigeons').insert(payload);
    }

    setSaving(false);
    setModalVisible(false);
    loadPigeons();
  };

  const openFedModal = (pigeon: PigeonRecord) => {
    setFedPigeon(pigeon);
    setFedFederation('FNCPR');
    setFedYear(String(new Date().getFullYear()));
    setFedScanning(false);
    setFedScanStep(0);
    setFedResults(null);
    setFedImporting(false);
    setFedModalVisible(true);
  };

  const startFedScan = async () => {
    if (!fedPigeon) return;
    setFedScanning(true);
    setFedScanStep(0);
    setFedResults(null);

    for (let step = 1; step <= 4; step++) {
      setFedScanStep(step);
      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 400));
    }

    const results = await scrapeFederationResults(fedFederation, parseInt(fedYear), fedPigeon.ring_series);
    setFedResults(results);
    setFedScanning(false);
  };

  const importFedResults = async () => {
    if (!fedResults || !fedResults.length || !fedPigeon || !profile?.id) return;
    setFedImporting(true);

    const rows = fedResults.map((r) => ({
      user_id: profile.id,
      pigeon_id: fedPigeon.id,
      position: r.position,
      race_name: r.race_name,
      year: r.year,
      distance_km: r.distance_km,
      birds_released: r.birds_released,
      fci_coefficient: r.fci_coefficient,
      federation: fedFederation,
      is_official_import: true,
    }));

    await supabase.from('pigeon_palmares').insert(rows);
    setFedImporting(false);
    setFedModalVisible(false);
    Alert.alert(t('success'), t('fedImported'));
  };

  const handleDelete = (pigeon: PigeonRecord) => {
    Alert.alert(
      t('deletePigeon'),
      `${t('deletePigeonConfirm')} "${pigeon.ring_series}"?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await supabase.from('pigeons').delete().eq('id', pigeon.id);
            loadPigeons();
          },
        },
      ]
    );
  };

  const renderPigeon = ({ item }: { item: PigeonRecord }) => (
    <View style={styles.pigeonCard}>
      <View style={styles.pigeonPhoto}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.photo} />
        ) : (
          <Bird color={Colors.textLight} size={28} />
        )}
      </View>
      <View style={styles.pigeonInfo}>
        <Text style={styles.pigeonRing}>{item.ring_series || '(fără inel)'}</Text>
        <Text style={styles.pigeonDetails}>
          {item.year || '—'} · {item.sex === 'Mascul' ? t('male') : t('female')} · {item.color || t('noColor')}
        </Text>
        <View style={[styles.statusBadge, item.status === 'În crescătorie' && styles.statusActive, item.status === 'Vândut' && styles.statusSold, item.status === 'Dispărut' && styles.statusLost]}>
          <Text style={styles.statusText}>{item.status === 'În crescătorie' ? t('statusActive') : item.status === 'Dispărut' ? t('statusLost') : t('statusSold')}</Text>
        </View>
        {item.game_style && showGameStyle && (
          <View style={styles.gameStyleBadge}>
            <Text style={styles.gameStyleText}>{gameStyleLabel(item.game_style)}</Text>
          </View>
        )}
        {item.is_champion && (
          <View style={styles.championBadge}>
            <Trophy color={Colors.gold} size={12} />
            <Text style={styles.championText}>{t('champion')}</Text>
          </View>
        )}
      </View>
      <View style={styles.pigeonActions}>
        <TouchableOpacity style={styles.iconBtnGold} onPress={() => openFedModal(item)}>
          <Download color={Colors.goldDark} size={18} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push(`/(tabs)/genotype?id=${item.id}`)}>
          <Dna color={Colors.royalBlue} size={18} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push(`/(tabs)/pedigree?id=${item.id}`)}>
          <GitBranch color={Colors.royalBlue} size={18} />
        </TouchableOpacity>
        {item.is_champion && (
          <TouchableOpacity style={styles.iconBtnGold} onPress={() => router.push(`/(tabs)/palmares?pigeonId=${item.id}&ring=${item.ring_series}`)}>
            <Award color={Colors.gold} size={18} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(item)}>
          <Pencil color={Colors.royalBlue} size={18} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}>
          <Trash2 color={Colors.error} size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('pigeonRegistry')} subtitle={`${pigeons.length} / ${limits.pigeonLimit === 999999 ? '∞' : limits.pigeonLimit} ${t('pigeonCount')}`} />

        {loading ? (
          <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 40 }} />
        ) : pigeons.length === 0 ? (
          <View style={styles.emptyState}>
            <Bird color={Colors.textLight} size={48} />
            <Text style={styles.emptyTitle}>{t('noPigeons')}</Text>
            <Text style={styles.emptySubtitle}>{t('noPigeonsSub')}</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {pigeons.map((p) => (
              <View key={p.id}>{renderPigeon({ item: p })}</View>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Plus color={Colors.white} size={26} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingPigeon ? t('editPigeon') : t('addPigeon')}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.photoSection}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.previewPhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Bird color={Colors.textLight} size={40} />
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
              <Text style={styles.formLabel}>{t('ringOptional')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.ring_series}
                onChangeText={(v) => setForm({ ...form, ring_series: v })}
                placeholder="ex: RO-2024-12345"
                placeholderTextColor={Colors.textLight}
              />
              <Text style={styles.optionalHint}>{t('ringOptionalHint')}</Text>
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
                <Text style={styles.formLabel}>{t('gender')}</Text>
                <View style={styles.segmentedControl}>
                  {['Mascul', 'Femelă'].map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.segment, form.sex === s && styles.segmentActive]}
                      onPress={() => setForm({ ...form, sex: s })}
                    >
                      <Text style={[styles.segmentText, form.sex === s && styles.segmentTextActive]}>{s === 'Mascul' ? t('male') : t('female')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('colorGenetics')}</Text>
              <TextInput
                style={styles.formInput}
                value={form.color}
                onChangeText={(v) => setForm({ ...form, color: v })}
                placeholder={t('colorPlaceholder')}
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('status')}</Text>
              <View style={styles.segmentedControl}>
                {['În crescătorie', 'Dispărut', 'Vândut'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.segment, form.status === s && styles.segmentActive]}
                    onPress={() => setForm({ ...form, status: s })}
                  >
                    <Text style={[styles.segmentText, form.status === s && styles.segmentTextActive]}>{s === 'În crescătorie' ? t('statusActive') : s === 'Dispărut' ? t('statusLost') : t('statusSold')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {showGameStyle && (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('gameStyle')}</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setGameStyleDropdown(!gameStyleDropdown)}
                >
                  <Text style={[styles.dropdownButtonText, !form.game_style && styles.dropdownPlaceholder]}>
                    {form.game_style ? gameStyleLabel(form.game_style as GameStyle) : t('gameStyleSelect')}
                  </Text>
                  <ChevronDown color={Colors.textSecondary} size={20} />
                </TouchableOpacity>
                {gameStyleDropdown && (
                  <View style={styles.dropdownList}>
                    <TouchableOpacity
                      style={[styles.dropdownItem, !form.game_style && styles.dropdownItemActive]}
                      onPress={() => { setForm({ ...form, game_style: '' }); setGameStyleDropdown(false); }}
                    >
                      <Text style={[styles.dropdownItemText, !form.game_style && styles.dropdownItemTextActive]}>{t('gameStyleNone')}</Text>
                    </TouchableOpacity>
                    {GAME_STYLE_OPTIONS.map((style) => (
                      <TouchableOpacity
                        key={style}
                        style={[styles.dropdownItem, form.game_style === style && styles.dropdownItemActive]}
                        onPress={() => { setForm({ ...form, game_style: style }); setGameStyleDropdown(false); }}
                      >
                        <Text style={[styles.dropdownItemText, form.game_style === style && styles.dropdownItemTextActive]}>
                          {gameStyleLabel(style)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setForm({ ...form, is_champion: !form.is_champion })}
              >
                <View style={[styles.checkbox, form.is_champion && styles.checkboxActive]}>
                  {form.is_champion && <Trophy color={Colors.white} size={14} />}
                </View>
                <View style={styles.checkboxLabelContainer}>
                  <Text style={styles.checkboxLabel}>{t('championCheckbox')}</Text>
                  <Text style={styles.checkboxSubtext}>{t('championSubtext')}</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('sire')}</Text>
              <View style={styles.parentModeRow}>
                <TouchableOpacity
                  style={[styles.parentModeBtn, sireMode === 'registry' && styles.parentModeBtnActive]}
                  onPress={() => setSireMode('registry')}
                >
                  <Text style={[styles.parentModeBtnText, sireMode === 'registry' && styles.parentModeBtnTextActive]}>{t('selectFromRegistry')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.parentModeBtn, sireMode === 'external' && styles.parentModeBtnActive]}
                  onPress={() => setSireMode('external')}
                >
                  <Text style={[styles.parentModeBtnText, sireMode === 'external' && styles.parentModeBtnTextActive]}>{t('externalParent')}</Text>
                </TouchableOpacity>
              </View>
              {sireMode === 'registry' ? (
                <View style={styles.pickerWrapper}>
                  {pigeons.filter(p => p.sex === 'Mascul').length === 0 ? (
                    <Text style={styles.pickerEmpty}>{t('noMale')}</Text>
                  ) : (
                    <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                      <TouchableOpacity
                        style={[styles.pickerItem, !form.sire_id && styles.pickerItemActive]}
                        onPress={() => setForm({ ...form, sire_id: '' })}
                      >
                        <Text style={[styles.pickerItemText, !form.sire_id && styles.pickerItemTextActive]}>{t('noFather')}</Text>
                      </TouchableOpacity>
                      {pigeons.filter(p => p.sex === 'Mascul').map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.pickerItem, form.sire_id === p.id && styles.pickerItemActive]}
                          onPress={() => setForm({ ...form, sire_id: p.id })}
                        >
                          <Text style={[styles.pickerItemText, form.sire_id === p.id && styles.pickerItemTextActive]}>
                            {p.ring_series || '(fără inel)'} {p.color ? `· ${p.color}` : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              ) : (
                <View>
                  <TextInput
                    style={styles.formInput}
                    value={form.sire_external_color}
                    onChangeText={(v) => setForm({ ...form, sire_external_color: v })}
                    placeholder={t('externalColorPlaceholder')}
                    placeholderTextColor={Colors.textLight}
                  />
                  <Text style={styles.optionalHint}>{t('externalParentHint')}</Text>
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('dam')}</Text>
              <View style={styles.parentModeRow}>
                <TouchableOpacity
                  style={[styles.parentModeBtn, damMode === 'registry' && styles.parentModeBtnActive]}
                  onPress={() => setDamMode('registry')}
                >
                  <Text style={[styles.parentModeBtnText, damMode === 'registry' && styles.parentModeBtnTextActive]}>{t('selectFromRegistry')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.parentModeBtn, damMode === 'external' && styles.parentModeBtnActive]}
                  onPress={() => setDamMode('external')}
                >
                  <Text style={[styles.parentModeBtnText, damMode === 'external' && styles.parentModeBtnTextActive]}>{t('externalParent')}</Text>
                </TouchableOpacity>
              </View>
              {damMode === 'registry' ? (
                <View style={styles.pickerWrapper}>
                  {pigeons.filter(p => p.sex === 'Femelă').length === 0 ? (
                    <Text style={styles.pickerEmpty}>{t('noFemale')}</Text>
                  ) : (
                    <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                      <TouchableOpacity
                        style={[styles.pickerItem, !form.dam_id && styles.pickerItemActive]}
                        onPress={() => setForm({ ...form, dam_id: '' })}
                      >
                        <Text style={[styles.pickerItemText, !form.dam_id && styles.pickerItemTextActive]}>{t('noMother')}</Text>
                      </TouchableOpacity>
                      {pigeons.filter(p => p.sex === 'Femelă').map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.pickerItem, form.dam_id === p.id && styles.pickerItemActive]}
                          onPress={() => setForm({ ...form, dam_id: p.id })}
                        >
                          <Text style={[styles.pickerItemText, form.dam_id === p.id && styles.pickerItemTextActive]}>
                            {p.ring_series || '(fără inel)'} {p.color ? `· ${p.color}` : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              ) : (
                <View>
                  <TextInput
                    style={styles.formInput}
                    value={form.dam_external_color}
                    onChangeText={(v) => setForm({ ...form, dam_external_color: v })}
                    placeholder={t('externalColorPlaceholder')}
                    placeholderTextColor={Colors.textLight}
                  />
                  <Text style={styles.optionalHint}>{t('externalParentHint')}</Text>
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('notes')}</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={form.notes}
                onChangeText={(v) => setForm({ ...form, notes: v })}
                placeholder={t('notesPlaceholder')}
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>{editingPigeon ? t('saveChanges') : t('addPigeonBtn')}</Text>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={fedModalVisible} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{t('fedSyncTitle')}</Text>
              <Text style={styles.fedModalSub}>{t('fedSyncSub')}</Text>
            </View>
            <TouchableOpacity onPress={() => setFedModalVisible(false)}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {fedPigeon && (
              <View style={styles.fedPigeonInfo}>
                <Text style={styles.fedPigeonRing}>{fedPigeon.ring_series || '(fără inel)'}</Text>
                <Text style={styles.fedPigeonDetails}>
                  {fedPigeon.year || '—'} · {fedPigeon.sex === 'Mascul' ? t('male') : t('female')} · {fedPigeon.color || t('noColor')}
                </Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('fedSelectFederation')}</Text>
              <View style={styles.fedFederationRow}>
                {(Object.keys(FEDERATION_NAMES) as Federation[]).map((fed) => (
                  <TouchableOpacity
                    key={fed}
                    style={[styles.fedFedBtn, fedFederation === fed && styles.fedFedBtnActive]}
                    onPress={() => setFedFederation(fed)}
                    disabled={fedScanning}
                  >
                    <Text style={[styles.fedFedBtnText, fedFederation === fed && styles.fedFedBtnTextActive]}>
                      {FEDERATION_NAMES[fed]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('fedSelectYear')}</Text>
              <TextInput
                style={styles.formInput}
                value={fedYear}
                onChangeText={(v) => setFedYear(v)}
                placeholder="2024"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
                editable={!fedScanning}
              />
            </View>

            {!fedScanning && !fedResults && (
              <TouchableOpacity style={styles.fedScanBtn} onPress={startFedScan}>
                <Wifi color={Colors.white} size={20} />
                <Text style={styles.fedScanBtnText}>{t('fedStartScan')}</Text>
              </TouchableOpacity>
            )}

            {fedScanning && (
              <View style={styles.fedScanningContainer}>
                <ActivityIndicator size="large" color={Colors.royalBlue} />
                <Text style={styles.fedScanningText}>{t('fedScanning')}</Text>
                <View style={styles.fedScanSteps}>
                  {[1, 2, 3, 4].map((step) => (
                    <View key={step} style={[styles.fedScanStep, fedScanStep >= step && styles.fedScanStepActive]}>
                      <Text style={[styles.fedScanStepText, fedScanStep >= step && styles.fedScanStepTextActive]}>
                        {step === 1 ? t('fedScanStep1') : step === 2 ? t('fedScanStep2') : step === 3 ? t('fedScanStep3') : t('fedScanStep4')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!fedScanning && fedResults && fedResults.length === 0 && (
              <View style={styles.fedNoResults}>
                <Text style={styles.fedNoResultsText}>{t('fedNoResults')}</Text>
              </View>
            )}

            {!fedScanning && fedResults && fedResults.length > 0 && (
              <View style={styles.fedResultsContainer}>
                <View style={styles.fedResultsHeader}>
                  <Text style={styles.fedResultsCount}>
                    {fedResults.length} {t('fedResultsFound')}
                  </Text>
                  <View style={styles.fedOfficialBadge}>
                    <Text style={styles.fedOfficialBadgeText}>{t('fedOfficial')}</Text>
                  </View>
                </View>

                {fedResults.map((r, idx) => (
                  <View key={idx} style={styles.fedResultCard}>
                    <View style={[styles.fedPositionBadge, r.position <= 3 && styles.fedPositionBadgeTop]}>
                      <Text style={styles.fedPositionText}>{r.position}</Text>
                    </View>
                    <View style={styles.fedResultInfo}>
                      <Text style={styles.fedRaceName}>{r.race_name}</Text>
                      <Text style={styles.fedResultDetails}>
                        {r.distance_km} km · {t('fedBirdsReleased')}: {r.birds_released}
                      </Text>
                      <View style={styles.fedFciRow}>
                        <View style={styles.fedFciBadge}>
                          <Text style={styles.fedFciText}>{t('fedFCICoeff')}: {r.fci_coefficient.toFixed(2)}</Text>
                        </View>
                        <View style={styles.fedFedBadge}>
                          <Text style={styles.fedFedText}>{fedFederation}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.fedImportBtn} onPress={importFedResults} disabled={fedImporting}>
                  {fedImporting ? (
                    <ActivityIndicator color={Colors.goldDark} />
                  ) : (
                    <>
                      <Download color={Colors.goldDark} size={20} />
                      <Text style={styles.fedImportBtnText}>{t('fedImportAll')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

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
    shadowColor: Colors.royalBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  pigeonCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pigeonPhoto: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%', borderRadius: 12 },
  pigeonInfo: { flex: 1, gap: 4 },
  pigeonRing: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text },
  pigeonDetails: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.neutral100,
  },
  statusActive: { backgroundColor: Colors.successBg },
  statusSold: { backgroundColor: Colors.warningBg },
  statusLost: { backgroundColor: Colors.errorBg },
  statusText: { fontFamily: 'Inter-Medium', fontSize: 11, color: Colors.textSecondary },
  pigeonActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
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
    height: 120,
    borderRadius: 20,
    backgroundColor: Colors.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPhoto: { width: 120, height: 120, borderRadius: 20 },
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
  segmentText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary },
  segmentTextActive: { color: Colors.white },
  pickerWrapper: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 8,
    maxHeight: 150,
  },
  pickerScroll: { maxHeight: 130 },
  pickerEmpty: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight, padding: 12, textAlign: 'center' },
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pickerItemActive: { backgroundColor: Colors.royalBluePale },
  pickerItemText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.text },
  pickerItemTextActive: { color: Colors.royalBlue, fontFamily: 'Inter-SemiBold' },
  saveButton: {
    backgroundColor: Colors.royalBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.white },
  gameStyleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.royalBluePale,
    marginTop: 4,
  },
  gameStyleText: { fontFamily: 'Inter-Medium', fontSize: 11, color: Colors.royalBlue },
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
  dropdownPlaceholder: {
    color: Colors.textLight,
  },
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
  dropdownItemActive: {
    backgroundColor: Colors.royalBluePale,
  },
  dropdownItemText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: Colors.text,
  },
  dropdownItemTextActive: {
    color: Colors.royalBlue,
    fontFamily: 'Inter-SemiBold',
  },
  championBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.goldLight,
    marginTop: 4,
  },
  championText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: Colors.goldDark,
  },
  optionalHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  parentModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  parentModeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.neutral50,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  parentModeBtnActive: {
    backgroundColor: Colors.royalBlue,
    borderColor: Colors.royalBlue,
  },
  parentModeBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  parentModeBtnTextActive: {
    color: Colors.white,
  },
  iconBtnGold: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.goldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  checkboxLabelContainer: {
    flex: 1,
    gap: 2,
  },
  checkboxLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  checkboxSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  // Federation import styles
  fedModalSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  fedPigeonInfo: {
    backgroundColor: Colors.royalBluePale,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  fedPigeonRing: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: Colors.royalBlue,
  },
  fedPigeonDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  fedFederationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fedFedBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  fedFedBtnActive: {
    backgroundColor: Colors.royalBlue,
    borderColor: Colors.royalBlue,
  },
  fedFedBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  fedFedBtnTextActive: {
    color: Colors.white,
  },
  fedScanBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.royalBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  fedScanBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: Colors.white,
  },
  fedScanningContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 16,
  },
  fedScanningText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: Colors.royalBlue,
  },
  fedScanSteps: {
    width: '100%',
    gap: 8,
  },
  fedScanStep: {
    backgroundColor: Colors.neutral100,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  fedScanStepActive: {
    backgroundColor: Colors.royalBluePale,
  },
  fedScanStepText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textLight,
  },
  fedScanStepTextActive: {
    color: Colors.royalBlue,
    fontFamily: 'Inter-SemiBold',
  },
  fedNoResults: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  fedNoResultsText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fedResultsContainer: {
    gap: 12,
    marginTop: 8,
  },
  fedResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fedResultsCount: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: Colors.text,
  },
  fedOfficialBadge: {
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  fedOfficialBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.goldDark,
  },
  fedResultCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  fedPositionBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral100,
  },
  fedPositionBadgeTop: {
    backgroundColor: Colors.goldLight,
  },
  fedPositionText: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: Colors.text,
  },
  fedResultInfo: {
    flex: 1,
    gap: 4,
  },
  fedRaceName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  fedResultDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  fedFciRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  fedFciBadge: {
    backgroundColor: Colors.royalBluePale,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fedFciText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: Colors.royalBlue,
  },
  fedFedBadge: {
    backgroundColor: Colors.goldPale,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fedFedText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: Colors.goldDark,
  },
  fedImportBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.goldLight,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  fedImportBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: Colors.goldDark,
  },
});
