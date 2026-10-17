import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  Eye, Camera, Image as ImageIcon, ScanLine, RefreshCw, Info,
  CheckCircle2, Crown, Bird, ChevronDown, Activity, Zap, Heart,
  Compass, Gauge, AlertCircle,
} from 'lucide-react-native';

interface PigeonOption {
  id: string;
  ring_series: string;
  color: string;
  sex: string;
  photo_url: string | null;
}

interface EyeResult {
  breeding: number;
  racing: number;
  vitality: number;
  orientation: number;
  endurance: number;
  speed: number;
  overall: number;
  recommendation: 'breeding' | 'racing' | 'balanced' | 'caution';
}

const { width: screenWidth } = Dimensions.get('window');
const scanBoxSize = screenWidth * 0.65;

export default function EyeSignScreen() {
  const { t } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const router = useRouter();
  const [pigeons, setPigeons] = useState<PigeonOption[]>([]);
  const [selectedPigeon, setSelectedPigeon] = useState<PigeonOption | null>(null);
  const [pigeonDropdown, setPigeonDropdown] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<EyeResult | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const cameraRef = useRef<any>(null);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const hasAccess = isAdmin || profile?.subscription_plan === 'professional' || profile?.subscription_plan === 'standard' || profile?.subscription_plan === 'hobby';

  useEffect(() => {
    supabase
      .from('pigeons')
      .select('id, ring_series, color, sex, photo_url')
      .eq('status', 'În crescătorie')
      .order('ring_series', { ascending: true })
      .then(({ data }) => setPigeons((data || []) as PigeonOption[]));
  }, []);

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
        const r = generateResult();
        setResult(r);
        loop.stop();
      }, 3000);
      return () => { clearTimeout(timer); loop.stop(); };
    }
  }, [scanning]);

  const generateResult = (): EyeResult => {
    const breeding = 65 + Math.floor(Math.random() * 30);
    const racing = 60 + Math.floor(Math.random() * 35);
    const vitality = 70 + Math.floor(Math.random() * 25);
    const orientation = 65 + Math.floor(Math.random() * 30);
    const endurance = 60 + Math.floor(Math.random() * 35);
    const speed = 55 + Math.floor(Math.random() * 40);
    const overall = Math.floor((breeding + racing + vitality + orientation + endurance + speed) / 6);
    let rec: EyeResult['recommendation'] = 'balanced';
    if (breeding > 85 && racing < 75) rec = 'breeding';
    else if (racing > 85 && breeding < 75) rec = 'racing';
    else if (overall < 65) rec = 'caution';
    return { breeding, racing, vitality, orientation, endurance, speed, overall, recommendation: rec };
  };

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
      setResult(null);
    }
  };

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      setResult(null);
    }
  };

  const startScan = () => {
    if (!photoUri) return;
    setResult(null);
    setScanning(true);
  };

  const resetAll = () => {
    setPhotoUri(null);
    setResult(null);
    setScanning(false);
  };

  const getRecText = (rec: EyeResult['recommendation']): string => {
    if (rec === 'breeding') return t('eyeRecBreeding');
    if (rec === 'racing') return t('eyeRecRacing');
    if (rec === 'balanced') return t('eyeRecBalanced');
    return t('eyeRecCaution');
  };

  const getRecColor = (rec: EyeResult['recommendation']): string => {
    if (rec === 'breeding') return Colors.royalBlue;
    if (rec === 'racing') return Colors.gold;
    if (rec === 'balanced') return Colors.success;
    return Colors.warning;
  };

  const scanLineTop = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, scanBoxSize - 2],
  });

  if (!hasAccess) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <ScreenHeader title={t('eyeTitle')} subtitle={t('eyeSub')} />
          <View style={styles.paywallContainer}>
            <View style={styles.paywallIcon}>
              <Crown color={Colors.gold} size={48} />
            </View>
            <Text style={styles.paywallTitle}>{t('eyePaywall')}</Text>
            <Text style={styles.paywallSubtitle}>{t('eyePaywallMsg')}</Text>
            <TouchableOpacity style={styles.paywallBtn} onPress={() => router.push('/(tabs)/profile')}>
              <Text style={styles.paywallBtnText}>{t('eyePaywallCta')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (cameraVisible) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.cameraView} facing="back">
          <View style={styles.cameraOverlay}>
            <View style={[styles.scanBox, { width: scanBoxSize, height: scanBoxSize }]} />
            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.captureBtn} onPress={captureFromCamera}>
                <View style={styles.captureInner} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeCameraBtn} onPress={() => setCameraVisible(false)}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('eyeTitle')} subtitle={t('eyeSub')} />

        <TouchableOpacity style={styles.pigeonSelector} onPress={() => setPigeonDropdown(!pigeonDropdown)}>
          <View style={styles.pigeonSelectorIcon}>
            <Bird color={Colors.royalBlue} size={18} />
          </View>
          <Text style={styles.pigeonSelectorText}>
            {selectedPigeon ? selectedPigeon.ring_series : t('eyeSelectPigeon')}
          </Text>
          <ChevronDown color={Colors.textSecondary} size={18} style={{ transform: [{ rotate: pigeonDropdown ? '180deg' : '0deg' }] }} />
        </TouchableOpacity>

        {pigeonDropdown && (
          <View style={styles.dropdownList}>
            {pigeons.length === 0 ? (
              <Text style={styles.dropdownEmpty}>{t('pdfNoPigeons')}</Text>
            ) : pigeons.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.dropdownItem, selectedPigeon?.id === p.id && styles.dropdownItemActive]}
                onPress={() => { setSelectedPigeon(p); setPigeonDropdown(false); }}
              >
                <Text style={styles.dropdownItemRing}>{p.ring_series}</Text>
                <Text style={styles.dropdownItemInfo}>{p.sex} · {p.color}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!photoUri ? (
          <View style={styles.introContainer}>
            <View style={styles.scanIconCircle}>
              <Eye color={Colors.gold} size={48} />
            </View>
            <Text style={styles.introTitle}>{t('eyeTitle')}</Text>
            <Text style={styles.introSubtitle}>{t('eyeSub')}</Text>

            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>{t('eyeInstructions')}</Text>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot}><Text style={styles.instructionDotText}>1</Text></View>
                <Text style={styles.instructionText}>{t('eyeInstr1')}</Text>
              </View>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot}><Text style={styles.instructionDotText}>2</Text></View>
                <Text style={styles.instructionText}>{t('eyeInstr2')}</Text>
              </View>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot}><Text style={styles.instructionDotText}>3</Text></View>
                <Text style={styles.instructionText}>{t('eyeInstr3')}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto}>
              <Camera color={Colors.white} size={22} />
              <Text style={styles.primaryBtnText}>{t('eyeCamera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={pickFromGallery}>
              <ImageIcon color={Colors.royalBlue} size={22} />
              <Text style={styles.secondaryBtnText}>{t('eyeUpload')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={styles.photoCard}>
              {scanning ? (
                <View style={styles.scanningOverlay}>
                  <View style={[styles.scanBoxLarge, { width: scanBoxSize, height: scanBoxSize }]}>
                    <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLineTop }] }]} />
                  </View>
                  <View style={styles.scanningInfo}>
                    <Activity color={Colors.gold} size={28} />
                    <Text style={styles.scanningText}>{t('eyeScanning')}</Text>
                  </View>
                </View>
              ) : (
                <Image source={{ uri: photoUri }} style={styles.photoFrame} resizeMode="cover" />
              )}
            </View>

            {!scanning && !result && (
              <TouchableOpacity style={styles.primaryBtn} onPress={startScan}>
                <ScanLine color={Colors.white} size={22} />
                <Text style={styles.primaryBtnText}>{t('eyeScan')}</Text>
              </TouchableOpacity>
            )}

            {result && (
              <View style={styles.resultsContainer}>
                <View style={styles.resultsHeader}>
                  <View style={styles.resultsIconBox}>
                    <Eye color={Colors.royalBlue} size={24} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultsTitle}>{t('eyeResults')}</Text>
                    <Text style={styles.resultsSub}>{selectedPigeon?.ring_series || ''}</Text>
                  </View>
                  <View style={[styles.overallBadge, { backgroundColor: getRecColor(result.recommendation) + '20', borderColor: getRecColor(result.recommendation) }]}>
                    <Text style={[styles.overallBadgeText, { color: getRecColor(result.recommendation) }]}>{result.overall}</Text>
                  </View>
                </View>

                <View style={styles.scoreCard}>
                  <ScoreBar label={t('eyeBreeding')} value={result.breeding} icon={<Heart color={Colors.royalBlue} size={16} />} color={Colors.royalBlue} />
                  <ScoreBar label={t('eyeRacing')} value={result.racing} icon={<Zap color={Colors.gold} size={16} />} color={Colors.gold} />
                  <ScoreBar label={t('eyeVitality')} value={result.vitality} icon={<Activity color={Colors.success} size={16} />} color={Colors.success} />
                  <ScoreBar label={t('eyeOrientation')} value={result.orientation} icon={<Compass color={Colors.royalBlueLight} size={16} />} color={Colors.royalBlueLight} />
                  <ScoreBar label={t('eyeEndurance')} value={result.endurance} icon={<Heart color={Colors.warning} size={16} />} color={Colors.warning} />
                  <ScoreBar label={t('eyeSpeed')} value={result.speed} icon={<Gauge color={Colors.error} size={16} />} color={Colors.error} />
                </View>

                <View style={[styles.recCard, { borderColor: getRecColor(result.recommendation) }]}>
                  <View style={[styles.recIconBox, { backgroundColor: getRecColor(result.recommendation) + '20' }]}>
                    {result.recommendation === 'caution' ? <AlertCircle color={getRecColor(result.recommendation)} size={20} /> : <CheckCircle2 color={getRecColor(result.recommendation)} size={20} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recLabel}>{t('eyeRecommendation')}</Text>
                    <Text style={[styles.recText, { color: getRecColor(result.recommendation) }]}>{getRecText(result.recommendation)}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.retakeBtn} onPress={resetAll}>
                  <RefreshCw color={Colors.royalBlue} size={20} />
                  <Text style={styles.retakeBtnText}>{t('eyeNewScan')}</Text>
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

function ScoreBar({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreLabel}>{label}</Text>
          <Text style={[styles.scoreValue, { color }]}>{value}%</Text>
        </View>
        <View style={styles.scoreBarBg}>
          <View style={[styles.scoreBarFill, { width: `${value}%`, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 100 },
  paywallContainer: { alignItems: 'center', gap: 16, marginTop: 40, paddingHorizontal: 24 },
  paywallIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.goldPale, borderWidth: 2, borderColor: Colors.gold, justifyContent: 'center', alignItems: 'center' },
  paywallTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.text },
  paywallSubtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  paywallBtn: { backgroundColor: Colors.gold, borderRadius: BorderRadius.md, paddingVertical: 16, paddingHorizontal: 32, ...Shadows.gold },
  paywallBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.royalBlueDark },
  pigeonSelector: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: 14, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 8 },
  pigeonSelectorIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.royalBluePale, justifyContent: 'center', alignItems: 'center' },
  pigeonSelectorText: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  dropdownList: { backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 16, maxHeight: 200 },
  dropdownEmpty: { padding: 16, fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  dropdownItemActive: { backgroundColor: Colors.royalBluePale },
  dropdownItemRing: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  dropdownItemInfo: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  introContainer: { alignItems: 'center', gap: 16, marginTop: 20 },
  scanIconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.goldPale, borderWidth: 2, borderColor: Colors.gold, justifyContent: 'center', alignItems: 'center' },
  introTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.text, marginTop: 4 },
  introSubtitle: { fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  instructionsCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 20, borderWidth: 1, borderColor: Colors.borderLight, width: '100%', gap: 14, marginTop: 8 },
  instructionsTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text, marginBottom: 4 },
  instructionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  instructionDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.royalBluePale, justifyContent: 'center', alignItems: 'center' },
  instructionDotText: { fontFamily: 'Inter-Bold', fontSize: 13, color: Colors.royalBlue },
  instructionText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary },
  primaryBtn: { flexDirection: 'row', backgroundColor: Colors.royalBlue, borderRadius: BorderRadius.md, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', ...Shadows.button },
  primaryBtnText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.white },
  secondaryBtn: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadius.md, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: Colors.royalBlue, width: '100%' },
  secondaryBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.royalBlue },
  cameraContainer: { flex: 1 },
  cameraView: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanBox: { borderWidth: 2, borderColor: Colors.gold, borderRadius: 12 },
  cameraControls: { position: 'absolute', bottom: 30, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30 },
  captureBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: Colors.gold },
  captureInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.royalBlue },
  closeCameraBtn: { position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  closeText: { color: Colors.white, fontSize: 18 },
  photoCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 12, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 16 },
  photoFrame: { height: 280, borderRadius: BorderRadius.md },
  scanningOverlay: { height: 280, borderRadius: BorderRadius.md, backgroundColor: Colors.neutral900, justifyContent: 'center', alignItems: 'center' },
  scanBoxLarge: { borderWidth: 2, borderColor: Colors.gold, borderRadius: 12, overflow: 'hidden' },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: Colors.gold, shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 4 },
  scanningInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  scanningText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.goldLight },
  resultsContainer: { gap: 14, marginTop: 8 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultsIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.royalBluePale, justifyContent: 'center', alignItems: 'center' },
  resultsTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  resultsSub: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  overallBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  overallBadgeText: { fontFamily: 'Inter-Bold', fontSize: 18 },
  scoreCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 18, borderWidth: 1, borderColor: Colors.borderLight, gap: 16 },
  scoreRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  scoreIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.neutral50, justifyContent: 'center', alignItems: 'center' },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  scoreLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary },
  scoreValue: { fontFamily: 'Inter-Bold', fontSize: 15 },
  scoreBarBg: { height: 8, backgroundColor: Colors.neutral100, borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 4 },
  recCard: { flexDirection: 'row', gap: 12, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 2 },
  recIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  recLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.textSecondary },
  recText: { fontFamily: 'Inter-SemiBold', fontSize: 14, marginTop: 4, lineHeight: 19 },
  retakeBtn: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.royalBlue },
  retakeBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.royalBlue },
});
