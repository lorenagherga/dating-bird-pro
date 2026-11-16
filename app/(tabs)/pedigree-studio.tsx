import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  Image,
  Switch,
  Share,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { GenerationSelector } from '@/components/GenerationSelector';
import { savePdf } from '@/lib/pdf/pdf-export';
import { buildPigeonPedigreePdf } from '@/lib/pdf/pdf-pigeon-documents';
import {
  buildPedigreeTree,
  clampGenerations,
  loadPedigreeData,
  type PedigreeData,
  type PedigreeNode,
} from '@/lib/pedigree/pedigree-tree';
import type { TranslationKey } from '@/lib/i18n';
import {
  ArrowLeft,
  Download,
  Crown,
  Bird,
  Trophy,
  Medal,
  Award,
  Image as ImageIcon,
  Settings,
  Share as ShareIcon,
  Mail,
  Printer,
  FileCode,
  Upload,
  X,
  Sparkles,
  Check,
  ChevronDown,
  ChevronRight,
  Link2,
  Layers,
  Palette,
} from 'lucide-react-native';

interface PedigreeSettings {
  id?: string;
  logo_url: string | null;
  background_url: string | null;
  template_size: string;
  accent_color: string;
  show_palmares: boolean;
  show_photos: boolean;
  generations: number;
  breeder_display_name: string | null;
  loft_address: string | null;
}

interface ImportPreview {
  ring: string;
  sex?: string;
  color?: string;
  year?: number;
  sire?: ImportPreview;
  dam?: ImportPreview;
}

export default function PedigreeStudioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, language } = useLanguage();
  const ro = language === 'ro';
  const { profile } = useAuth();
  const [data, setData] = useState<PedigreeData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [settings, setSettings] = useState<PedigreeSettings>({
    logo_url: null,
    background_url: null,
    template_size: 'standard',
    accent_color: '#0F2A6B',
    show_palmares: true,
    show_photos: true,
    generations: 4,
    breeder_display_name: profile?.breeder_name || null,
    loft_address: null,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importContent, setImportContent] = useState('');
  const [importFormat, setImportFormat] = useState('auto');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [creatingShare, setCreatingShare] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(id ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pigeon = data && selectedId ? data.pigeonById.get(selectedId) ?? null : null;
  const pigeonList = useMemo(
    () =>
      data
        ? Array.from(data.pigeonById.values()).sort((a, b) =>
            a.ring_series.localeCompare(b.ring_series, undefined, { numeric: true })
          )
        : [],
    [data]
  );
  const generations = clampGenerations(settings.generations);
  const ancestry = useMemo(
    () => (data && selectedId ? buildPedigreeTree(data, selectedId, generations) : null),
    [data, selectedId, generations]
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bgInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (id) setSelectedId(id);
  }, [id]);

  const loadAll = useCallback(async () => {
    setLoadError(false);
    try {
      const loaded = await loadPedigreeData();
      setData(loaded);
      setSelectedId((current) =>
        current && loaded.pigeonById.has(current)
          ? current
          : Array.from(loaded.pigeonById.keys())[0] ?? null
      );
    } catch {
      setLoadError(true);
    }
    setLoading(false);

    if (profile?.id) {
      const { data: sData } = await supabase
        .from('pedigree_settings')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();
      if (sData) {
        setSettings(sData as PedigreeSettings);
      }
    }
  }, [profile?.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveSettings = async (newSettings: PedigreeSettings) => {
    if (!profile?.id) return;
    setSettings(newSettings);
    const { error } = await supabase.from('pedigree_settings').upsert({
      user_id: profile.id,
      ...newSettings,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      Alert.alert(t('error'), t('pedStSettingsSaveError'));
    }
  };

  const handleLogoUpload = async () => {
    if (Platform.OS === 'web' && logoInputRef.current) {
      logoInputRef.current.value = '';
      logoInputRef.current.click();
    }
  };

  const handleLogoSelected = async (file: File) => {
    if (!profile?.id) return;
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const fileName = `logo-${profile.id}-${Date.now()}.${file.name.split('.').pop()}`;
        const { data, error } = await supabase.storage
          .from('pedigree-assets')
          .upload(fileName, decode(base64), { contentType: file.type });
        if (error) {
          // Try to create bucket or use existing
          const { data: pubData } = supabase.storage.from('pedigree-assets').getPublicUrl(fileName);
          Alert.alert(t('error'), t('pedStLogoUploadError'));
          return;
        }
        const url = supabase.storage.from('pedigree-assets').getPublicUrl(fileName).data.publicUrl;
        saveSettings({ ...settings, logo_url: url });
      };
      reader.readAsDataURL(file);
    } catch {
      Alert.alert(t('error'), t('pedStLogoUploadError'));
    }
  };

  const handleBgUpload = async () => {
    if (Platform.OS === 'web' && bgInputRef.current) {
      bgInputRef.current.value = '';
      bgInputRef.current.click();
    }
  };

  const handleBgSelected = async (file: File) => {
    if (!profile?.id) return;
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const fileName = `bg-${profile.id}-${Date.now()}.${file.name.split('.').pop()}`;
        await supabase.storage.from('pedigree-assets').upload(fileName, decode(base64), { contentType: file.type });
        const url = supabase.storage.from('pedigree-assets').getPublicUrl(fileName).data.publicUrl;
        saveSettings({ ...settings, background_url: url });
      };
      reader.readAsDataURL(file);
    } catch {
      Alert.alert(t('error'), t('pedStLogoUploadError'));
    }
  };

  const handleImportFile = () => {
    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleImportFileSelected = async (file: File) => {
    try {
      const content = await file.text();
      setImportContent(content);
      // Preview parse via edge function
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const response = await fetch(`${supabaseUrl}/functions/v1/pedigree-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'parse_only', content, format: importFormat }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setImportPreview(result.parsed);
    } catch (err) {
      Alert.alert(t('error'), err instanceof Error ? err.message : t('pedStImportError'));
    }
  };

  const handleImportConfirm = async () => {
    if (!importContent) return;
    setImporting(true);
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const response = await fetch(`${supabaseUrl}/functions/v1/pedigree-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'import', content: importContent, format: importFormat, translate_to: 'ro' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setImportOpen(false);
      setImportContent('');
      setImportPreview(null);
      Alert.alert(
        t('success'),
        t('pedStImportSuccess').replace('N', String(result.imported_count))
      );
      if (result.root_pigeon_id) {
        router.replace(`/(tabs)/pedigree-studio?id=${result.root_pigeon_id}`);
        setTimeout(() => loadAll(), 500);
      }
    } catch (err) {
      Alert.alert(t('error'), err instanceof Error ? err.message : t('pedStImportError'));
    }
    setImporting(false);
  };

  const handleCreateShare = async () => {
    if (!selectedId || !profile?.id) return;
    setCreatingShare(true);
    try {
      const { data, error } = await supabase
        .from('pedigree_shares')
        .insert({ user_id: profile.id, pigeon_id: selectedId, template_size: settings.template_size })
        .select('share_token')
        .single();
      if (error) throw error;
      const baseUrl = Platform.OS === 'web' ? window.location.origin : 'https://pigeonfan.ro';
      const url = `${baseUrl}/pedigree/${data.share_token}`;
      setShareUrl(url);
    } catch (err) {
      Alert.alert(t('error'), t('pedStShareError'));
    }
    setCreatingShare(false);
  };

  const handleShare = async () => {
    if (!shareUrl) {
      await handleCreateShare();
      return;
    }
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(shareUrl);
      Alert.alert(t('success'), t('pedStLinkCopied'));
    } else {
      await Share.share({ url: shareUrl, message: shareUrl });
    }
  };

  const handleEmail = async () => {
    if (!shareUrl) {
      await handleCreateShare();
    }
    const url = shareUrl || '';
    const subject = `${t('pedigreeTitle')} — ${pigeon?.ring_series || ''}`;
    const body = `${t('pedStEmailBody')}: ${url}`;
    if (Platform.OS === 'web') {
      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_self');
    } else {
      Linking.openURL(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    }
  };

  const handlePrint = () => {
    if (Platform.OS === 'web') {
      window.print();
    } else {
      Alert.alert(t('pedStPrint'), t('pedStPrintMsg'));
    }
  };

  const handleDownload = async () => {
    if (!profile?.id || !selectedId) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      const { doc, fileName } = await buildPigeonPedigreePdf(profile.id, selectedId, generations);
      await savePdf(doc, fileName);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  };

  const templateSizes = [
    { key: 'standard', label: t('pedStTemplateStandard'), desc: 'A4', icon: Layers },
    { key: 'xl', label: t('pedStTemplateXL'), desc: 'A3', icon: Layers },
    { key: 'xxl', label: t('pedStTemplateXXL'), desc: 'A2', icon: Layers },
  ];

  const getMedalColor = (position: number) => {
    if (position === 1) return Colors.gold;
    if (position === 2) return '#C0C0C0';
    if (position === 3) return '#CD7F32';
    return Colors.royalBlue;
  };

  const renderTreeNode = (node: PedigreeNode | null, gen: number): React.ReactNode => {
    if (gen >= generations) return null;
    if (!node) {
      return (
        <View style={[styles.treeNode, { marginLeft: gen * 8 }]}>
          <View style={[styles.nodeBox, styles.emptyNode]}>
            <Text style={styles.emptyNodeText}>{t('unknown')}</Text>
          </View>
        </View>
      );
    }
    const palmares = data?.palmaresByPigeon.get(node.id) ?? [];
    const showTrophy = node.is_champion || palmares.some(p => p.position <= 3);

    return (
      <View style={{ gap: 3 }}>
        <View style={[styles.treeNode, { marginLeft: gen * 8 }]}>
          <View style={[styles.nodeBox, gen === 0 && styles.rootNode, node.is_champion && styles.championNode]}>
            {showTrophy && (
              <View style={styles.trophyCorner}>
                <Trophy color={node.is_champion || palmares.some(p => p.position === 1) ? Colors.gold : Colors.royalBlue} size={14} />
              </View>
            )}
            <View style={styles.nodeContentRow}>
              {settings.show_photos && node.photo_url ? (
                <Image source={{ uri: node.photo_url }} style={styles.nodePhoto} resizeMode="cover" />
              ) : (
                <View style={styles.nodePhotoPlaceholder}>
                  <Bird color={gen === 0 ? 'rgba(255,255,255,0.6)' : Colors.textLight} size={16} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.nodeHeader}>
                  <Text style={[styles.nodeRing, gen === 0 && styles.rootRing]} numberOfLines={1}>{node.ring_series}</Text>
                  {node.sex && (
                    <View style={[styles.sexBadge, node.sex === 'Mascul' ? styles.sexMale : styles.sexFemale]}>
                      <Text style={styles.sexText}>{node.sex === 'Mascul' ? 'M' : 'F'}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.nodeDetails, gen === 0 && styles.rootDetails]}>
                  {node.year || '—'} · {node.color || t('noColor')}
                </Text>
              </View>
            </View>
            {settings.show_palmares && palmares.length > 0 && (
              <View style={styles.palmaresMini}>
                {palmares.slice(0, 3).map((p) => (
                  <View key={p.id} style={[styles.miniMedal, { backgroundColor: p.position === 1 ? Colors.goldLight : p.position === 2 ? '#F0F0F0' : p.position === 3 ? '#FAEBD7' : Colors.royalBluePale }]}>
                    <Medal color={getMedalColor(p.position)} size={9} />
                    <Text style={[styles.miniMedalText, { color: getMedalColor(p.position) }]}>{String(p.position)}</Text>
                  </View>
                ))}
                {palmares.length > 3 && <Text style={styles.moreText}>+{palmares.length - 3}</Text>}
              </View>
            )}
            {gen === 0 && <Text style={styles.rootLabel}>{t('subject')}</Text>}
          </View>
        </View>
        {gen + 1 < generations && (
          <View style={{ gap: 3 }}>
            {renderTreeNode(node.sire, gen + 1)}
            {renderTreeNode(node.dam, gen + 1)}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 60 }} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>{t('error')}</Text>
      </View>
    );
  }

  if (data && pigeonList.length === 0) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ScreenHeader title={t('pedStTitle')} showBack />
          <View style={styles.emptyBox}>
            <Bird color={Colors.royalBlue} size={40} />
            <Text style={styles.emptyTitle}>
              {ro ? 'Nu ai încă porumbei în registru' : 'You have no pigeons in your register yet'}
            </Text>
            <Text style={styles.emptyText}>
              {ro
                ? 'Adaugă primul porumbel pentru a genera arborele genealogic.'
                : 'Add your first pigeon to generate its pedigree tree.'}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/pigeons')} activeOpacity={0.8}>
              <Text style={styles.emptyBtnText}>{ro ? 'Adaugă porumbel' : 'Add pigeon'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!pigeon) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>{t('pedStNotFound')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('pedStTitle')} subtitle={pigeon.ring_series || ''} showBack />

        <TouchableOpacity style={styles.pigeonPicker} onPress={() => setPickerOpen(true)} activeOpacity={0.8}>
          <Bird color={Colors.royalBlue} size={18} />
          <View style={styles.pickerTextCol}>
            <Text style={styles.pickerLabel}>{ro ? 'Porumbel' : 'Pigeon'}</Text>
            <Text style={styles.pickerValue} numberOfLines={1}>{pigeon.ring_series || '-'}</Text>
          </View>
          <ChevronDown color={Colors.royalBlue} size={18} />
        </TouchableOpacity>

        {/* Action toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setImportOpen(true)}>
            <FileCode color={Colors.royalBlue} size={18} />
            <Text style={styles.toolBtnText}>{t('pedStImport')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setSettingsOpen(true)}>
            <Settings color={Colors.royalBlue} size={18} />
            <Text style={styles.toolBtnText}>{t('pedStCustomize')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.selectorBlock}>
          <GenerationSelector
            label={t('pedStGenerations')}
            value={generations}
            onChange={(value) => saveSettings({ ...settings, generations: value })}
          />
        </View>

        {/* Export toolbar */}
        <View style={styles.exportToolbar}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleDownload} disabled={downloading || !ancestry}>
            {downloading ? <ActivityIndicator size="small" color={Colors.white} /> : <Download color={Colors.white} size={16} />}
            <Text style={styles.exportBtnText}>{t('pedStDownload')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtnSecondary} onPress={handlePrint}>
            <Printer color={Colors.royalBlue} size={16} />
            <Text style={styles.exportBtnSecondaryText}>{t('pedStPrint')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtnSecondary} onPress={handleEmail}>
            <Mail color={Colors.royalBlue} size={16} />
            <Text style={styles.exportBtnSecondaryText}>{t('pedStEmail')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtnSecondary} onPress={handleShare}>
            <ShareIcon color={Colors.royalBlue} size={16} />
            <Text style={styles.exportBtnSecondaryText}>{t('pedStShare')}</Text>
          </TouchableOpacity>
        </View>

        {downloadError && <Text style={styles.errorText}>{t('error')}</Text>}

        {shareUrl && (
          <View style={styles.shareLinkBox}>
            <Link2 color={Colors.success} size={16} />
            <Text style={styles.shareLinkText} numberOfLines={1}>{shareUrl}</Text>
            <TouchableOpacity onPress={() => {
              if (Platform.OS === 'web') navigator.clipboard.writeText(shareUrl);
            }}>
              <Text style={styles.shareCopyBtn}>{t('pedStCopy')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Certificate preview */}
        <View style={styles.certificateWrapper}>
          <View style={styles.certificateBorder}>
            <View style={styles.certificateInnerBorder}>
              {/* Header with logo */}
              <View style={styles.certificateHeader}>
                {settings.logo_url && (
                  <Image source={{ uri: settings.logo_url }} style={styles.certLogo} resizeMode="contain" />
                )}
                <View style={styles.certGoldLine} />
                <Text style={styles.certificateTitle}>{t('certificateTitle')}</Text>
                <Text style={styles.certificateSubtitle}>{t('certificateSub')}</Text>
                <View style={styles.certGoldLine} />
                {settings.breeder_display_name && (
                  <Text style={styles.breederName}>{settings.breeder_display_name}</Text>
                )}
              </View>

              {/* Champion banner */}
              {pigeon.is_champion && (
                <View style={styles.championBanner}>
                  <Trophy color={Colors.gold} size={16} />
                  <Text style={styles.championBannerText}>{t('championBanner')}</Text>
                </View>
              )}

              {/* Pedigree tree */}
              <View style={styles.pedigreeTree}>
                {ancestry && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {renderTreeNode(ancestry, 0)}
                  </ScrollView>
                )}
              </View>

              {/* Footer */}
              <View style={styles.certificateFooter}>
                <View style={styles.certGoldLine} />
                <Text style={styles.footerText}>
                  {t('docGenerated')} · {new Date().toLocaleDateString('ro-RO')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Hidden file inputs for web */}
      {Platform.OS === 'web' && (
        <>
          <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoSelected(f); }} />
          <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBgSelected(f); }} />
          <input ref={fileInputRef} type="file" accept=".xml,.csv,.json,text/xml,text/csv,application/json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFileSelected(f); }} />
        </>
      )}

      {/* Settings Modal */}
      <Modal visible={settingsOpen} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('pedStCustomize')}</Text>
            <TouchableOpacity onPress={() => setSettingsOpen(false)}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Logo */}
            <View style={styles.setSection}>
              <Text style={styles.setSectionTitle}>{t('pedStLogo')}</Text>
              <View style={styles.logoPreviewRow}>
                {settings.logo_url ? (
                  <Image source={{ uri: settings.logo_url }} style={styles.logoPreview} resizeMode="contain" />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <ImageIcon color={Colors.textLight} size={24} />
                  </View>
                )}
                <TouchableOpacity style={styles.uploadSmallBtn} onPress={handleLogoUpload}>
                  <Upload color={Colors.royalBlue} size={16} />
                  <Text style={styles.uploadSmallBtnText}>{t('pedStUploadLogo')}</Text>
                </TouchableOpacity>
                {settings.logo_url && (
                  <TouchableOpacity onPress={() => saveSettings({ ...settings, logo_url: null })}>
                    <Text style={styles.removeLink}>{t('pedStRemove')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Template size */}
            <View style={styles.setSection}>
              <Text style={styles.setSectionTitle}>{t('pedStTemplate')}</Text>
              <View style={styles.templateRow}>
                {templateSizes.map((tpl) => (
                  <TouchableOpacity
                    key={tpl.key}
                    style={[styles.templateCard, settings.template_size === tpl.key && styles.templateCardActive]}
                    onPress={() => saveSettings({ ...settings, template_size: tpl.key })}
                  >
                    <tpl.icon color={settings.template_size === tpl.key ? Colors.goldDark : Colors.royalBlue} size={20} />
                    <Text style={[styles.templateLabel, settings.template_size === tpl.key && styles.templateLabelActive]}>{tpl.label}</Text>
                    <Text style={styles.templateDesc}>{tpl.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Toggles */}
            <View style={styles.setSection}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{t('pedStShowPalmares')}</Text>
                <Switch
                  value={settings.show_palmares}
                  onValueChange={(v) => saveSettings({ ...settings, show_palmares: v })}
                  trackColor={{ false: Colors.neutral200, true: Colors.royalBlue }}
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{t('pedStShowPhotos')}</Text>
                <Switch
                  value={settings.show_photos}
                  onValueChange={(v) => saveSettings({ ...settings, show_photos: v })}
                  trackColor={{ false: Colors.neutral200, true: Colors.royalBlue }}
                />
              </View>
            </View>

            {/* Breeder name */}
            <View style={styles.setSection}>
              <Text style={styles.setSectionTitle}>{t('pedStBreederName')}</Text>
              <TextInput
                style={styles.formInput}
                value={settings.breeder_display_name || ''}
                onChangeText={(v) => setSettings({ ...settings, breeder_display_name: v })}
                placeholder={profile?.breeder_name || ''}
                placeholderTextColor={Colors.textLight}
                onBlur={() => saveSettings(settings)}
              />
            </View>

            {/* Loft address */}
            <View style={styles.setSection}>
              <Text style={styles.setSectionTitle}>{t('pedStLoftAddress')}</Text>
              <TextInput
                style={styles.formInput}
                value={settings.loft_address || ''}
                onChangeText={(v) => setSettings({ ...settings, loft_address: v })}
                placeholder={t('pedStLoftAddressPh')}
                placeholderTextColor={Colors.textLight}
                onBlur={() => saveSettings(settings)}
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Pigeon picker modal */}
      <Modal visible={pickerOpen} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{ro ? 'Alege porumbelul' : 'Choose a pigeon'}</Text>
            <TouchableOpacity onPress={() => setPickerOpen(false)}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {pigeonList.map((p) => {
              const active = p.id === selectedId;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pickerItem, active && styles.pickerItemActive]}
                  onPress={() => {
                    setSelectedId(p.id);
                    setPickerOpen(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.pickerTextCol}>
                    <Text style={styles.pickerItemRing}>{p.ring_series || '-'}</Text>
                    <Text style={styles.pickerItemMeta}>
                      {p.year || '—'} · {p.color || t('noColor')}
                    </Text>
                  </View>
                  {active && <Check color={Colors.royalBlue} size={18} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Import Modal */}
      <Modal visible={importOpen} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('pedStImport')}</Text>
            <TouchableOpacity onPress={() => setImportOpen(false)}>
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalDesc}>{t('pedStImportDesc')}</Text>

            {/* Format selector */}
            <View style={styles.formatRow}>
              {[
                { key: 'auto', label: t('pedStFormatAuto') },
                { key: 'xml', label: 'XML / Columba' },
                { key: 'csv', label: 'CSV' },
                { key: 'json', label: 'JSON' },
              ].map((fmt) => (
                <TouchableOpacity
                  key={fmt.key}
                  style={[styles.formatBtn, importFormat === fmt.key && styles.formatBtnActive]}
                  onPress={() => setImportFormat(fmt.key)}
                >
                  <Text style={[styles.formatBtnText, importFormat === fmt.key && styles.formatBtnTextActive]}>{fmt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* File picker */}
            <TouchableOpacity style={styles.filePickBtn} onPress={handleImportFile}>
              <Upload color={Colors.royalBlue} size={20} />
              <Text style={styles.filePickBtnText}>
                {importPreview ? t('pedStFileLoaded') : t('pedStSelectFile')}
              </Text>
            </TouchableOpacity>

            {/* Preview */}
            {importPreview && (
              <View style={styles.previewBox}>
                <View style={styles.previewHeader}>
                  <Sparkles color={Colors.gold} size={18} />
                  <Text style={styles.previewTitle}>{t('pedStImportPreview')}</Text>
                </View>
                <View style={styles.previewTree}>
                  <ImportPreviewNode node={importPreview} depth={0} t={t} />
                </View>
              </View>
            )}

            {importPreview && (
              <TouchableOpacity style={styles.submitBtn} onPress={handleImportConfirm} disabled={importing}>
                {importing ? (
                  <ActivityIndicator color={Colors.goldDark} />
                ) : (
                  <>
                    <Check color={Colors.goldDark} size={20} />
                    <Text style={styles.submitBtnText}>{t('pedStImportConfirm')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function ImportPreviewNode({ node, depth, t }: { node: ImportPreview; depth: number; t: (k: TranslationKey) => string }) {
  return (
    <View style={{ marginLeft: depth * 12 }}>
      <View style={styles.previewNodeRow}>
        <View style={[styles.previewDot, { backgroundColor: node.sex === 'Mascul' ? Colors.royalBlue : Colors.error }]} />
        <Text style={styles.previewNodeRing}>{node.ring}</Text>
        {node.color && <Text style={styles.previewNodeColor}>{node.color}</Text>}
      </View>
      {node.sire && <ImportPreviewNode node={node.sire} depth={depth + 1} t={t} />}
      {node.dam && <ImportPreviewNode node={node.dam} depth={depth + 1} t={t} />}
    </View>
  );
}

function decode(base64: string): Uint8Array {
  const parts = base64.split(',');
  const data = parts.length > 1 ? parts[1] : parts[0];
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  notFound: { fontFamily: 'Inter-Medium', fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginTop: 60 },
  toolbar: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.royalBluePale,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.royalBlueLight,
  },
  toolBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  exportToolbar: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.royalBlue,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  exportBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.white },
  exportBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  exportBtnSecondaryText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.royalBlue },
  shareLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.successBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  shareLinkText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.success },
  shareCopyBtn: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.royalBlue },
  certificateWrapper: { backgroundColor: Colors.cream, borderRadius: 16, overflow: 'hidden' },
  certificateBorder: { borderWidth: 2, borderColor: Colors.royalBlue, borderRadius: 14, margin: 6 },
  certificateInnerBorder: { borderWidth: 1, borderColor: Colors.royalBlueLight, borderRadius: 10, margin: 4, padding: 16 },
  certificateHeader: { alignItems: 'center', marginBottom: 16 },
  certLogo: { width: 60, height: 60, marginBottom: 8 },
  certGoldLine: { width: '80%', height: 2, backgroundColor: Colors.gold, marginBottom: 10 },
  certificateTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.royalBlue, marginBottom: 4 },
  certificateSubtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, marginBottom: 10 },
  breederName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.goldDark, marginTop: 4 },
  championBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.goldLight, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 16, alignSelf: 'center' },
  championBannerText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.goldDark },
  pedigreeTree: { gap: 3 },
  treeNode: { gap: 3 },
  nodeBox: { backgroundColor: Colors.white, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.borderLight, position: 'relative' },
  rootNode: { backgroundColor: Colors.royalBlue, borderColor: Colors.royalBlue },
  championNode: { borderWidth: 2, borderColor: Colors.gold },
  emptyNode: { backgroundColor: Colors.neutral100, borderColor: Colors.neutral200 },
  trophyCorner: { position: 'absolute', top: 6, right: 6 },
  nodeContentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nodePhoto: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: Colors.borderLight },
  nodePhotoPlaceholder: { width: 36, height: 36, borderRadius: 8, backgroundColor: Colors.neutral100, justifyContent: 'center', alignItems: 'center' },
  nodeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 },
  nodeRing: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.text, flex: 1 },
  rootRing: { color: Colors.white, fontSize: 14 },
  sexBadge: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sexMale: { backgroundColor: 'rgba(255,255,255,0.25)' },
  sexFemale: { backgroundColor: 'rgba(255,255,255,0.25)' },
  sexText: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.white },
  nodeDetails: { fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.textSecondary, marginTop: 3 },
  rootDetails: { color: 'rgba(255,255,255,0.8)' },
  palmaresMini: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  miniMedal: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  miniMedalText: { fontFamily: 'Inter-Bold', fontSize: 9 },
  moreText: { fontFamily: 'Inter-Regular', fontSize: 9, color: Colors.textSecondary, alignSelf: 'center' },
  rootLabel: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.white, marginTop: 4 },
  emptyNodeText: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight, fontStyle: 'italic' },
  certificateFooter: { alignItems: 'center', marginTop: 20 },
  footerText: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight, marginTop: 8 },
  pigeonPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.royalBlueLight,
    marginBottom: 12,
  },
  pickerTextCol: { flex: 1, gap: 2 },
  pickerLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.textSecondary },
  pickerValue: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  pickerItemActive: { borderColor: Colors.royalBlue, backgroundColor: Colors.royalBluePale },
  pickerItemRing: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  pickerItemMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  emptyBox: { alignItems: 'center', gap: 12, marginTop: 40, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text, textAlign: 'center' },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.royalBlue, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  emptyBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.white },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 50, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.text },
  modalScroll: { padding: 24 },
  modalDesc: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  setSection: { marginBottom: 20 },
  setSectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text, marginBottom: 10 },
  logoPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoPreview: { width: 60, height: 60, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderLight },
  logoPlaceholder: { width: 60, height: 60, borderRadius: 10, backgroundColor: Colors.neutral100, justifyContent: 'center', alignItems: 'center' },
  uploadSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.royalBluePale, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  uploadSmallBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  removeLink: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.error },
  templateRow: { flexDirection: 'row', gap: 10 },
  templateCard: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: Colors.white, borderRadius: 12, paddingVertical: 16, borderWidth: 1.5, borderColor: Colors.borderLight },
  templateCardActive: { borderColor: Colors.gold, backgroundColor: Colors.goldPale },
  templateLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  templateLabelActive: { color: Colors.goldDark },
  templateDesc: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textSecondary },
  selectorBlock: { marginBottom: 16 },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error, textAlign: 'center', marginBottom: 12 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  toggleLabel: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.text },
  formInput: { fontFamily: 'Inter-Regular', fontSize: 16, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text },
  formatRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  formatBtn: { backgroundColor: Colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: Colors.borderLight },
  formatBtnActive: { borderColor: Colors.royalBlue, backgroundColor: Colors.royalBluePale },
  formatBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textSecondary },
  formatBtnTextActive: { color: Colors.royalBlue },
  filePickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.royalBluePale, borderRadius: 12, paddingVertical: 14, marginBottom: 16, borderWidth: 1.5, borderColor: Colors.royalBlueLight },
  filePickBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.royalBlue },
  previewBox: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 16 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  previewTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  previewTree: { gap: 4 },
  previewNodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  previewNodeRing: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.text },
  previewNodeColor: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textSecondary },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.goldLight, borderRadius: BorderRadius.md, paddingVertical: 16, marginTop: 4, borderWidth: 2, borderColor: Colors.gold, ...Shadows.gold },
  submitBtnText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.goldDark },
});
