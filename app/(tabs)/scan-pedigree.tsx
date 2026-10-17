import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  ScanLine,
  Camera,
  Image as ImageIcon,
  FileText,
  RefreshCw,
  X,
  CheckCircle2,
  Save,
  Eye,
  Mars,
  Venus,
  Sparkles,
  Info,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ExtractedAncestor {
  ring: string;
  sex: 'Mascul' | 'Femelă';
  color: string;
}

interface ExtractedPedigree {
  ring: string;
  sex: 'Mascul' | 'Femelă';
  color: string;
  gen1: ExtractedAncestor[];
  gen2: ExtractedAncestor[];
  gen3: ExtractedAncestor[];
}

function generateSimulatedPedigree(): ExtractedPedigree {
  const colors = ['Albastru barat', 'Roșu cenușiu', 'Negru spread', 'Albastru exemplar', 'Argintiu barat', 'Indigo', 'Gal recessiv'];
  const sexes: ('Mascul' | 'Femelă')[] = ['Mascul', 'Femelă'];
  const ringPrefix = ['RO', 'BE', 'NL', 'DE'];
  const year = 2020 + Math.floor(Math.random() * 5);

  const gen = (n: number): ExtractedAncestor[] =>
    Array.from({ length: n }, (_, i) => ({
      ring: `${ringPrefix[Math.floor(Math.random() * ringPrefix.length)]}-${year - Math.floor(Math.random() * 3)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      sex: sexes[i % 2],
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

  return {
    ring: `${ringPrefix[0]}-${year}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    sex: sexes[Math.floor(Math.random() * 2)],
    color: colors[Math.floor(Math.random() * colors.length)],
    gen1: gen(2),
    gen2: gen(4),
    gen3: gen(8),
  };
}

export default function ScanPedigreeScreen() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedPedigree | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const cameraRef = useRef<any>(null);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scanning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      );
      loop.start();
      const timer = setTimeout(() => {
        setScanning(false);
        setExtracted(generateSimulatedPedigree());
        loop.stop();
      }, 3200);
      return () => { clearTimeout(timer); loop.stop(); };
    }
  }, [scanning]);

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      pickFromGallery();
      return;
    }
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(t('error'), 'Permisiune cameră refuzată.');
        return;
      }
    }
    setCameraVisible(true);
  };

  const captureFromCamera = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePicture({ quality: 0.8 });
      setPhotoUri(photo.uri);
      setCameraVisible(false);
      setExtracted(null);
      setSaved(false);
    }
  };

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      setExtracted(null);
      setSaved(false);
    }
  };

  const startScan = () => {
    if (!photoUri) return;
    setExtracted(null);
    setSaved(false);
    setScanning(true);
  };

  const resetAll = () => {
    setPhotoUri(null);
    setExtracted(null);
    setSaved(false);
    setScanning(false);
  };

  const saveToRegistry = async () => {
    if (!extracted || !profile) return;
    setSaving(true);
    try {
      const userId = profile.id;
      const mainPigeon = await supabase
        .from('pigeons')
        .insert({
          user_id: userId,
          ring_series: extracted.ring,
          year: new Date().getFullYear(),
          sex: extracted.sex,
          color: extracted.color,
          status: 'În crescătorie',
          notes: 'Importat prin scanare pedigree AI',
        })
        .select('id')
        .single();

      if (mainPigeon.data) {
        const mainId = mainPigeon.data.id;
        const gen1Ids: string[] = [];

        for (const ancestor of extracted.gen1) {
          const { data } = await supabase
            .from('pigeons')
            .insert({
              user_id: userId,
              ring_series: ancestor.ring,
              year: new Date().getFullYear() - 1,
              sex: ancestor.sex,
              color: ancestor.color,
              status: 'În crescătorie',
              notes: 'Strămoș importat prin scanare AI',
            })
            .select('id')
            .single();
          if (data) gen1Ids.push(data.id);
        }

        if (gen1Ids.length >= 2) {
          await supabase
            .from('pigeons')
            .update({ sire_id: gen1Ids[0], dam_id: gen1Ids[1] })
            .eq('id', mainId);
        }

        const gen2Ids: string[] = [];
        for (const ancestor of extracted.gen2) {
          const { data } = await supabase
            .from('pigeons')
            .insert({
              user_id: userId,
              ring_series: ancestor.ring,
              year: new Date().getFullYear() - 2,
              sex: ancestor.sex,
              color: ancestor.color,
              status: 'În crescătorie',
              notes: 'Strămoș Gen2 importat prin scanare AI',
            })
            .select('id')
            .single();
          if (data) gen2Ids.push(data.id);
        }

        if (gen2Ids.length >= 2) {
          await supabase.from('pigeons').update({ sire_id: gen2Ids[0], dam_id: gen2Ids[1] }).eq('id', gen1Ids[0]);
        }
        if (gen2Ids.length >= 4) {
          await supabase.from('pigeons').update({ sire_id: gen2Ids[2], dam_id: gen2Ids[3] }).eq('id', gen1Ids[1]);
        }

        const gen3Ids: string[] = [];
        for (const ancestor of extracted.gen3) {
          const { data } = await supabase
            .from('pigeons')
            .insert({
              user_id: userId,
              ring_series: ancestor.ring,
              year: new Date().getFullYear() - 3,
              sex: ancestor.sex,
              color: ancestor.color,
              status: 'În crescătorie',
              notes: 'Strămoș Gen3 importat prin scanare AI',
            })
            .select('id')
            .single();
          if (data) gen3Ids.push(data.id);
        }

        if (gen3Ids.length >= 2) {
          await supabase.from('pigeons').update({ sire_id: gen3Ids[0], dam_id: gen3Ids[1] }).eq('id', gen2Ids[0]);
        }
        if (gen3Ids.length >= 4) {
          await supabase.from('pigeons').update({ sire_id: gen3Ids[2], dam_id: gen3Ids[3] }).eq('id', gen2Ids[1]);
        }
        if (gen3Ids.length >= 6) {
          await supabase.from('pigeons').update({ sire_id: gen3Ids[4], dam_id: gen3Ids[5] }).eq('id', gen2Ids[2]);
        }
        if (gen3Ids.length >= 8) {
          await supabase.from('pigeons').update({ sire_id: gen3Ids[6], dam_id: gen3Ids[7] }).eq('id', gen2Ids[3]);
        }
      }

      setSaved(true);
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || 'Eroare la salvare.');
    }
    setSaving(false);
  };

  const scanLineTop = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  const renderAncestorRow = (a: ExtractedAncestor, idx: number) => (
    <View key={idx} style={styles.ancestorRow}>
      <View style={styles.sexIconBox}>
        {a.sex === 'Mascul' ? <Mars color={Colors.royalBlue} size={14} /> : <Venus color={Colors.error} size={14} />}
      </View>
      <Text style={styles.ancestorRing}>{a.ring}</Text>
      <Text style={styles.ancestorColor}>{a.color}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('scanPedTitle')} subtitle={t('scanPedSub')} />

        {!photoUri && !cameraVisible && (
          <View style={styles.introContainer}>
            <View style={styles.scanIconCircle}>
              <FileText color={Colors.gold} size={48} />
            </View>
            <Text style={styles.introTitle}>{t('scanPedTitle')}</Text>
            <Text style={styles.introSubtitle}>{t('scanPedNoDataSub')}</Text>

            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>{t('scanPedInstructions')}</Text>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot}><Text style={styles.instructionDotText}>1</Text></View>
                <Text style={styles.instructionText}>{t('scanPedInstr1')}</Text>
              </View>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot}><Text style={styles.instructionDotText}>2</Text></View>
                <Text style={styles.instructionText}>{t('scanPedInstr2')}</Text>
              </View>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot}><Text style={styles.instructionDotText}>3</Text></View>
                <Text style={styles.instructionText}>{t('scanPedInstr3')}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto}>
              <Camera color={Colors.white} size={22} />
              <Text style={styles.primaryBtnText}>{t('scanPedCamera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={pickFromGallery}>
              <ImageIcon color={Colors.royalBlue} size={22} />
              <Text style={styles.secondaryBtnText}>{t('scanPedUpload')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {cameraVisible && (
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.cameraView} facing={facing}>
              <View style={styles.cameraOverlay}>
                <View style={styles.scanRect} />
                <View style={styles.cameraControls}>
                  <TouchableOpacity style={styles.captureBtn} onPress={captureFromCamera}>
                    <View style={styles.captureInner} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.flipBtn}
                    onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
                  >
                    <RefreshCw color={Colors.white} size={22} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeCameraBtn}
                    onPress={() => setCameraVisible(false)}
                  >
                    <X color={Colors.white} size={24} />
                  </TouchableOpacity>
                </View>
              </View>
            </CameraView>
          </View>
        )}

        {photoUri && !cameraVisible && (
          <View>
            <View style={styles.photoCard}>
              {scanning ? (
                <View style={styles.scanningOverlay}>
                  <View style={styles.scanArea}>
                    <Animated.View
                      style={[styles.scanLine, { transform: [{ translateY: scanLineTop }] }]}
                    />
                  </View>
                  <View style={styles.scanningInfo}>
                    <ScanLine color={Colors.gold} size={28} />
                    <Text style={styles.scanningText}>{t('scanPedAnalyzing')}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.photoFrame}>
                  <View style={styles.photoPlaceholder}>
                    <FileText color={Colors.textLight} size={40} />
                    <Text style={styles.photoPlaceholderText}>Pedigree încărcat</Text>
                  </View>
                </View>
              )}
            </View>

            {!scanning && !extracted && !saved && (
              <TouchableOpacity style={styles.primaryBtn} onPress={startScan}>
                <ScanLine color={Colors.white} size={22} />
                <Text style={styles.primaryBtnText}>{t('diagScan')}</Text>
              </TouchableOpacity>
            )}

            {extracted && !saved && (
              <View style={styles.resultsContainer}>
                <View style={styles.resultsHeader}>
                  <View style={styles.resultsIconBox}>
                    <Sparkles color={Colors.gold} size={22} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultsTitle}>{t('scanPedExtracted')}</Text>
                    <Text style={styles.resultsSub}>{t('scanPedPreview')}</Text>
                  </View>
                </View>

                <View style={styles.birdCard}>
                  <View style={styles.birdHeader}>
                    <View style={styles.birdIconBox}>
                      {extracted.sex === 'Mascul' ? <Mars color={Colors.royalBlue} size={20} /> : <Venus color={Colors.error} size={20} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.birdRing}>{extracted.ring}</Text>
                      <Text style={styles.birdColor}>{extracted.color}</Text>
                    </View>
                    <View style={styles.aiBadge}>
                      <Sparkles color={Colors.gold} size={12} />
                      <Text style={styles.aiBadgeText}>AI</Text>
                    </View>
                  </View>
                </View>

                {([
                  { label: t('gen1') || 'Gen 1 · Părinți', data: extracted.gen1 },
                  { label: t('gen2') || 'Gen 2 · Bunici', data: extracted.gen2 },
                  { label: t('gen3') || 'Gen 3 · Străbunici', data: extracted.gen3 },
                ] as const).map((gen, gi) => (
                  <View key={gi} style={styles.genCard}>
                    <Text style={styles.genTitle}>{gen.label}</Text>
                    {gen.data.map((a, ai) => renderAncestorRow(a, ai))}
                  </View>
                ))}

                <TouchableOpacity style={styles.goldSaveBtn} onPress={saveToRegistry} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color={Colors.royalBlueDark} />
                  ) : (
                    <>
                      <Save color={Colors.royalBlueDark} size={22} />
                      <Text style={styles.goldSaveBtnText}>{t('scanPedSaveRegistry')}</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.retakeBtn} onPress={resetAll}>
                  <RefreshCw color={Colors.royalBlue} size={20} />
                  <Text style={styles.retakeBtnText}>{t('scanPedRetake')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {saved && (
              <View style={styles.savedContainer}>
                <View style={styles.savedIconCircle}>
                  <CheckCircle2 color={Colors.success} size={56} />
                </View>
                <Text style={styles.savedTitle}>{t('scanPedSaved')}</Text>
                <Text style={styles.savedSubtitle}>{t('scanPedSavedMsg')}</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={resetAll}>
                  <ScanLine color={Colors.white} size={22} />
                  <Text style={styles.primaryBtnText}>{t('scanPedRetake')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  introContainer: { alignItems: 'center', gap: 16, marginTop: 20 },
  scanIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.goldPale,
    borderWidth: 2,
    borderColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.text, marginTop: 4 },
  introSubtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  instructionsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    width: '100%',
    gap: 14,
    marginTop: 8,
  },
  instructionsTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text, marginBottom: 4 },
  instructionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  instructionDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionDotText: { fontFamily: 'Inter-Bold', fontSize: 13, color: Colors.royalBlue },
  instructionText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.royalBlue,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    ...Shadows.button,
  },
  primaryBtnText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.white },
  secondaryBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.royalBlue,
    width: '100%',
  },
  secondaryBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.royalBlue },
  cameraContainer: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  cameraView: { height: 400, borderRadius: BorderRadius.lg },
  cameraOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanRect: {
    width: SCREEN_WIDTH * 0.8,
    height: 200,
    borderWidth: 2,
    borderColor: Colors.gold,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  captureBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.gold,
  },
  captureInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.royalBlue },
  flipBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15,42,107,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeCameraBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 16,
  },
  photoFrame: {
    height: 240,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: Colors.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  photoPlaceholderText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight },
  scanningOverlay: {
    height: 240,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.neutral900,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: SCREEN_WIDTH * 0.75,
    height: 200,
    borderWidth: 2,
    borderColor: Colors.gold,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  scanningInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  scanningText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.goldLight },
  resultsContainer: { gap: 14, marginTop: 8 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.goldPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  resultsSub: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  birdCard: {
    backgroundColor: Colors.royalBlue,
    borderRadius: BorderRadius.lg,
    padding: 18,
    ...Shadows.card,
  },
  birdHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  birdIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  birdRing: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.white },
  birdColor: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.goldLight, marginTop: 2 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  aiBadgeText: { fontFamily: 'Inter-Bold', fontSize: 12, color: Colors.goldLight },
  genCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 8,
  },
  genTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.royalBlue, marginBottom: 4 },
  ancestorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sexIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: Colors.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ancestorRing: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.text, flex: 1 },
  ancestorColor: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, flex: 1 },
  goldSaveBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.md,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    ...Shadows.gold,
  },
  goldSaveBtnText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.royalBlueDark },
  retakeBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.royalBlue,
  },
  retakeBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.royalBlue },
  savedContainer: { alignItems: 'center', gap: 16, marginTop: 30 },
  savedIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.text },
  savedSubtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
});
