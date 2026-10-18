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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { useLanguage } from '@/lib/language-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  Eye,
  Camera,
  Image as ImageIcon,
  ScanLine,
  AlertTriangle,
  ShieldAlert,
  Activity,
  Pill,
  Clock,
  Beaker,
  RefreshCw,
  X,
  CheckCircle2,
  Stethoscope,
  Info,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_BOX_SIZE = SCREEN_WIDTH * 0.7;

interface DiagnosticResult {
  disease: string;
  probability: number;
  riskLevel: 'low' | 'medium' | 'high';
  isolation: string;
  treatments: { substance: string; duration: string; dosage: string }[];
}

const SIMULATED_RESULTS: DiagnosticResult[] = [
  {
    disease: 'Tricomoneză',
    probability: 87,
    riskLevel: 'high',
    isolation: 'Izolează pasărea imediat timp de 7-10 zile. Evită contactul cu restul efectivului.',
    treatments: [
      { substance: 'Ronidazol 10%', duration: '5-7 zile consecutive', dosage: '1g per 2 litri apă' },
      { substance: 'Metronidazol', duration: '5 zile', dosage: '25mg/kg greutate vie, în apă' },
    ],
  },
  {
    disease: 'Coccidioză',
    probability: 72,
    riskLevel: 'medium',
    isolation: 'Izolează pasărea timp de 5-7 zile. Dezinfectează cușca cu amoniac 10%.',
    treatments: [
      { substance: 'Toltrazuril 2,5%', duration: '2 zile, repetă după 7 zile', dosage: '1ml per litru apă' },
      { substance: 'Amprolium 20%', duration: '5-7 zile', dosage: '1g per litru apă' },
    ],
  },
  {
    disease: 'Ornitologie / Micoză respiratorie',
    probability: 64,
    riskLevel: 'medium',
    isolation: 'Izolează în boxă separată cu ventilație bună. Temperată 18-22°C.',
    treatments: [
      { substance: 'Doxiciclină 5%', duration: '7-10 zile consecutive', dosage: '1g per litru apă' },
      { substance: 'Itraconazol', duration: '14 zile', dosage: '10mg/kg greutate, în hrană' },
    ],
  },
  {
    disease: 'Poxviroză (Variolă aviară)',
    probability: 55,
    riskLevel: 'medium',
    isolation: 'Izolare strictă 14-21 zile. Vaccinare restul efectivului de urgență.',
    treatments: [
      { substance: 'Iod 2% (aplicare locală)', duration: '5-7 zile, de 2x/zi', dosage: 'Aplicare pe leziuni cu tampon' },
      { substance: 'Vitamina A + E', duration: '10 zile', dosage: 'Supliment în apă, suport imunitar' },
    ],
  },
  {
    disease: 'Salmoneloză (Paratifoidă)',
    probability: 80,
    riskLevel: 'high',
    isolation: 'Izolare strictă minimum 21 zile. Testarea întregului efectiv.',
    treatments: [
      { substance: 'Enrofloxacină 10%', duration: '10-14 zile consecutive', dosage: '1ml per 2 litri apă' },
      { substance: 'Trimetoprim + Sulfametoxazol', duration: '7 zile', dosage: '1 comprimat per litru apă' },
    ],
  },
];

function pickSimulatedResult(): DiagnosticResult {
  return SIMULATED_RESULTS[Math.floor(Math.random() * SIMULATED_RESULTS.length)];
}

function riskColor(level: 'low' | 'medium' | 'high'): string {
  if (level === 'low') return Colors.success;
  if (level === 'medium') return Colors.warning;
  return Colors.error;
}

function riskLabel(level: 'low' | 'medium' | 'high', t: (k: any) => string): string {
  if (level === 'low') return t('diagLowRisk');
  if (level === 'medium') return t('diagMediumRisk');
  return t('diagHighRisk');
}

export default function DiagnosticScreen() {
  const { t } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [saved, setSaved] = useState(false);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scanning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      const timer = setTimeout(() => {
        setScanning(false);
        setResult(pickSimulatedResult());
        loop.stop();
      }, 2800);
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
      setResult(null);
      setSaved(false);
    }
  };

  const cameraRef = useRef<any>(null);

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      setResult(null);
      setSaved(false);
    }
  };

  const startScan = () => {
    if (!photoUri) return;
    setResult(null);
    setSaved(false);
    setScanning(true);
  };

  const resetAll = () => {
    setPhotoUri(null);
    setResult(null);
    setSaved(false);
    setScanning(false);
  };

  const scanLineTop = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_BOX_SIZE - 2],
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('diagTitle')} subtitle={t('diagSub')} showBack />

        {!photoUri && !cameraVisible && (
          <View style={styles.introContainer}>
            <View style={styles.scanIconCircle}>
              <Eye color={Colors.gold} size={48} />
            </View>
            <Text style={styles.introTitle}>{t('diagTitle')}</Text>
            <Text style={styles.introSubtitle}>{t('diagNoResultSub')}</Text>

            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>{t('diagInstructions')}</Text>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot}><Text style={styles.instructionDotText}>1</Text></View>
                <Text style={styles.instructionText}>{t('diagInstr1')}</Text>
              </View>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot}><Text style={styles.instructionDotText}>2</Text></View>
                <Text style={styles.instructionText}>{t('diagInstr2')}</Text>
              </View>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot}><Text style={styles.instructionDotText}>3</Text></View>
                <Text style={styles.instructionText}>{t('diagInstr3')}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={takePhoto}>
              <Camera color={Colors.white} size={22} />
              <Text style={styles.primaryBtnText}>{t('diagCamera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={pickFromGallery}>
              <ImageIcon color={Colors.royalBlue} size={22} />
              <Text style={styles.secondaryBtnText}>{t('diagUpload')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {cameraVisible && (
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.cameraView} facing={facing}>
              <View style={styles.cameraOverlay}>
                <View style={styles.scanBox} />
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
                  <View style={styles.scanBoxLarge}>
                    <Animated.View
                      style={[styles.scanLine, { transform: [{ translateY: scanLineTop }] }]}
                    />
                  </View>
                  <View style={styles.scanningInfo}>
                    <Activity color={Colors.gold} size={28} />
                    <Text style={styles.scanningText}>{t('diagAnalyzing')}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.photoFrame}>
                  <View style={styles.photoPlaceholder}>
                    <Camera color={Colors.textLight} size={40} />
                    <Text style={styles.photoPlaceholderText}>Imagine încărcată</Text>
                  </View>
                </View>
              )}
            </View>

            {!scanning && !result && (
              <TouchableOpacity style={styles.primaryBtn} onPress={startScan}>
                <ScanLine color={Colors.white} size={22} />
                <Text style={styles.primaryBtnText}>{t('diagScan')}</Text>
              </TouchableOpacity>
            )}

            {result && (
              <View style={styles.resultsContainer}>
                <View style={styles.resultsHeader}>
                  <View style={styles.resultsIconBox}>
                    <Stethoscope color={Colors.royalBlue} size={24} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultsTitle}>{t('diagResults')}</Text>
                    <Text style={styles.resultsSub}>{t('diagSuggested')}</Text>
                  </View>
                  <View style={[styles.riskBadge, { backgroundColor: riskColor(result.riskLevel) + '20', borderColor: riskColor(result.riskLevel) }]}>
                    <Text style={[styles.riskBadgeText, { color: riskColor(result.riskLevel) }]}>
                      {riskLabel(result.riskLevel, t)}
                    </Text>
                  </View>
                </View>

                <View style={styles.resultCard}>
                  <View style={styles.resultRow}>
                    <View style={styles.resultIconBox}>
                      <ShieldAlert color={Colors.royalBlue} size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultLabel}>{t('diagDisease')}</Text>
                      <Text style={styles.resultValue}>{result.disease}</Text>
                    </View>
                  </View>

                  <View style={styles.probBarContainer}>
                    <View style={styles.probBarRow}>
                      <Text style={styles.probBarLabel}>{t('diagProbability')}</Text>
                      <Text style={styles.probBarValue}>{result.probability}%</Text>
                    </View>
                    <View style={styles.probBarBg}>
                      <View style={[styles.probBarFill, { width: `${result.probability}%`, backgroundColor: riskColor(result.riskLevel) }]} />
                    </View>
                  </View>

                  <View style={styles.resultRow}>
                    <View style={styles.resultIconBox}>
                      <AlertTriangle color={Colors.warning} size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultLabel}>{t('diagIsolation')}</Text>
                      <Text style={styles.resultValue}>{result.isolation}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.treatmentCard}>
                  <Text style={styles.treatmentTitle}>{t('diagTreatment')}</Text>
                  {result.treatments.map((tr, i) => (
                    <View key={i} style={styles.treatmentItem}>
                      <View style={styles.treatmentItemHeader}>
                        <Pill color={Colors.gold} size={18} />
                        <Text style={styles.treatmentSubstance}>{tr.substance}</Text>
                      </View>
                      <View style={styles.treatmentDetails}>
                        <View style={styles.treatmentDetailRow}>
                          <Clock color={Colors.textLight} size={14} />
                          <Text style={styles.treatmentDetailText}>{tr.duration}</Text>
                        </View>
                        <View style={styles.treatmentDetailRow}>
                          <Beaker color={Colors.textLight} size={14} />
                          <Text style={styles.treatmentDetailText}>{tr.dosage}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.warningCard}>
                  <Info color={Colors.warning} size={18} />
                  <Text style={styles.warningText}>{t('diagWarningMsg')}</Text>
                </View>

                <View style={styles.resultActions}>
                  <TouchableOpacity style={styles.retakeBtn} onPress={resetAll}>
                    <RefreshCw color={Colors.royalBlue} size={20} />
                    <Text style={styles.retakeBtnText}>{t('diagNewScan')}</Text>
                  </TouchableOpacity>
                </View>
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
  scanBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
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
    height: 260,
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
    height: 260,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.neutral900,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBoxLarge: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
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
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  resultsSub: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  riskBadgeText: { fontFamily: 'Inter-Bold', fontSize: 12 },
  resultCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 16,
  },
  resultRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  resultIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.textSecondary },
  resultValue: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text, marginTop: 2 },
  probBarContainer: { gap: 8 },
  probBarRow: { flexDirection: 'row', justifyContent: 'space-between' },
  probBarLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary },
  probBarValue: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  probBarBg: {
    height: 10,
    backgroundColor: Colors.neutral100,
    borderRadius: 5,
    overflow: 'hidden',
  },
  probBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  treatmentCard: {
    backgroundColor: Colors.goldPale,
    borderRadius: BorderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.goldLight,
    gap: 14,
  },
  treatmentTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.goldDark },
  treatmentItem: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: 14,
    gap: 10,
  },
  treatmentItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  treatmentSubstance: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text, flex: 1 },
  treatmentDetails: { gap: 6, paddingLeft: 26 },
  treatmentDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  treatmentDetailText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  warningCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.warningBg,
    borderRadius: BorderRadius.md,
    padding: 14,
    alignItems: 'flex-start',
  },
  warningText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.warning, lineHeight: 19 },
  resultActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  retakeBtn: {
    flex: 1,
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
});
