import { useState, useRef, useEffect, useCallback } from 'react';
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
  Image,
  ImageBackground,
  TextInput,
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
  Check,
  Save,
  Mars,
  Venus,
  Sparkles,
  Languages,
  Eye,
  Edit3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ExtractedAncestor {
  ring: string;
  sex: 'Mascul' | 'Femelă';
  color: string;
  year?: number | null;
  rawText?: string;
}

interface ExtractedPedigree {
  ring: string;
  sex: 'Mascul' | 'Femelă';
  color: string;
  year?: number | null;
  gen1: ExtractedAncestor[];
  gen2: ExtractedAncestor[];
  gen3: ExtractedAncestor[];
  detectedLanguage: string;
  rawText: string;
  translated: boolean;
}

const RING_REGEX = /\b([A-Z]{2})[-\s]?(\d{2,4})[-\s]?(\d{1,7})\b/g;
const YEAR_REGEX = /\b(19|20)\d{2}\b/g;

const COLOR_TRANSLATIONS: Record<string, string> = {
  // English → Romanian
  'blue bar': 'Albastru barat',
  'blue checker': 'Albastru checker',
  'blue chequer': 'Albastru checker',
  'blue': 'Albastru',
  'red': 'Roșu',
  'red checker': 'Roșu checker',
  'ash red': 'Roșu cenușiu',
  'ash yellow': 'Galben cenușiu',
  'silver': 'Argintiu',
  'silver bar': 'Argintiu barat',
  'black': 'Negru',
  'spread': 'Spread',
  'spread black': 'Spread negru',
  'indigo': 'Indigo',
  'brown': 'Maro',
  'mealy': 'Cenușiu',
  'grizzle': 'Grizzle',
  'pied': 'Pied',
  'almond': 'Almond',
  'dun': 'Dun',
  'cream': 'Crem',
  'yellow': 'Galben',
  'recessive red': 'Roșu recessiv',
  'recessive yellow': 'Galben recessiv',
  'check': 'Checker',
  'checker': 'Checker',
  'chequer': 'Checker',
  'barless': 'Fără bară',
  'splash': 'Splash',
  'tiger': 'Tiger',
  'opal': 'Opal',
  'reduced': 'Reduced',
  'pencil': 'Pencil',
  // German → Romanian
  'blau gebändert': 'Albastru barat',
  'blau': 'Albastru',
  'blaugebändert': 'Albastru barat',
  'rot': 'Roșu',
  'gelb': 'Galben',
  'schwarz': 'Negru',
  'silber': 'Argintiu',
  'silber gebändert': 'Argintiu barat',
  'braun': 'Maro',
  // Dutch → Romanian
  'blauw': 'Albastru',
  'blauw gebandeerd': 'Albastru barat',
  'rood': 'Roșu',
  'geel': 'Galben',
  'zwart': 'Negru',
  'zilver': 'Argintiu',
  // French → Romanian
  'bleu': 'Albastru',
  'bleu barré': 'Albastru barat',
  'rouge': 'Roșu',
  'jaune': 'Galben',
  'noir': 'Negru',
  'argent': 'Argintiu',
  // Spanish → Romanian
  'azul': 'Albastru',
  'azul barrado': 'Albastru barat',
  'rojo': 'Roșu',
  'amarillo': 'Galben',
  'negro': 'Negro',
  'plata': 'Argintiu',
};

const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  en: ['sire', 'dam', 'father', 'mother', 'cock', 'hen', 'blue', 'red', 'silver', 'black', 'bar', 'checker'],
  de: ['vater', 'mutter', 'hahn', 'henne', 'blau', 'rot', 'gelb', 'schwarz', 'silber', 'braun'],
  nl: ['vader', 'moeder', 'doffer', 'duivin', 'blauw', 'rood', 'geel', 'zwart', 'zilver'],
  fr: ['père', 'mère', 'mâle', 'femelle', 'bleu', 'rouge', 'jaune', 'noir', 'argent'],
  es: ['padre', 'madre', 'macho', 'hembra', 'azul', 'rojo', 'amarillo', 'negro', 'plata'],
};

function detectLanguage(text: string): string {
  const lower = text.toLowerCase();
  let bestLang = 'en';
  let bestScore = 0;
  for (const [lang, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }
  return bestLang;
}

function translateColor(color: string): string {
  const lower = color.toLowerCase().trim();
  if (COLOR_TRANSLATIONS[lower]) return COLOR_TRANSLATIONS[lower];
  // Try partial match
  for (const [key, val] of Object.entries(COLOR_TRANSLATIONS)) {
    if (lower.includes(key)) return val;
  }
  return color;
}

function parsePedigreeText(text: string): ExtractedPedigree | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const allText = lines.join(' ');

  // Extract all ring numbers
  const rings: string[] = [];
  let match: RegExpExecArray | null;
  const ringRegex = new RegExp(RING_REGEX);
  while ((match = ringRegex.exec(allText)) !== null) {
    const ring = `${match[1]}-${match[2]}-${match[3]}`;
    if (!rings.includes(ring)) rings.push(ring);
  }

  if (rings.length === 0) return null;

  // Extract years
  const years: number[] = [];
  const yearRegex = new RegExp(YEAR_REGEX);
  while ((match = yearRegex.exec(allText)) !== null) {
    years.push(parseInt(match[0]));
  }

  // Detect sex keywords
  const lower = allText.toLowerCase();
  const hasMale = /\b(cock|male|mâle|mâ|macho|hahn|doffer|m)\b/i.test(allText);
  const hasFemale = /\b(hen|female|femelle|hembra|henne|duivin|f)\b/i.test(allText);

  // Try to find the root pigeon (usually the first or most prominent ring)
  const rootRing = rings[0];
  const rootSex: 'Mascul' | 'Femelă' = hasMale && !hasFemale ? 'Mascul' : hasFemale && !hasMale ? 'Femelă' : 'Mascul';

  // Find color near root ring
  const findColorNear = (ring: string): string => {
    const ringIdx = allText.indexOf(ring);
    if (ringIdx === -1) return '';
    const context = allText.substring(ringIdx, Math.min(ringIdx + 80, allText.length)).toLowerCase();
    for (const [key] of Object.entries(COLOR_TRANSLATIONS)) {
      if (context.includes(key)) return translateColor(key);
    }
    return '';
  };

  const rootColor = findColorNear(rootRing);

  // Build ancestor lists
  const remainingRings = rings.slice(1);
  const gen1: ExtractedAncestor[] = [];
  const gen2: ExtractedAncestor[] = [];
  const gen3: ExtractedAncestor[] = [];

  // Gen 1: parents (2 birds)
  for (let i = 0; i < Math.min(2, remainingRings.length); i++) {
    const ring = remainingRings[i];
    gen1.push({
      ring,
      sex: i === 0 ? 'Mascul' : 'Femelă',
      color: findColorNear(ring),
      year: years.length > 0 ? years[Math.min(i + 1, years.length - 1)] : null,
    });
  }

  // Gen 2: grandparents (4 birds)
  const gen2Start = 2;
  for (let i = 0; i < Math.min(4, remainingRings.length - gen2Start); i++) {
    const ring = remainingRings[gen2Start + i];
    gen2.push({
      ring,
      sex: i % 2 === 0 ? 'Mascul' : 'Femelă',
      color: findColorNear(ring),
      year: years.length > i + 2 ? years[i + 2] : null,
    });
  }

  // Gen 3: great-grandparents (8 birds)
  const gen3Start = 6;
  for (let i = 0; i < Math.min(8, remainingRings.length - gen3Start); i++) {
    const ring = remainingRings[gen3Start + i];
    gen3.push({
      ring,
      sex: i % 2 === 0 ? 'Mascul' : 'Femelă',
      color: findColorNear(ring),
      year: years.length > i + 6 ? years[i + 6] : null,
    });
  }

  const detectedLanguage = detectLanguage(allText);

  return {
    ring: rootRing,
    sex: rootSex,
    color: rootColor,
    year: years.length > 0 ? years[0] : null,
    gen1,
    gen2,
    gen3,
    detectedLanguage,
    rawText: text,
    translated: detectedLanguage !== 'ro' && detectedLanguage !== 'en',
  };
}

async function runOcr(imageUri: string, onProgress?: (p: number) => void): Promise<string> {
  const Tesseract = (await import('tesseract.js')).default;
  const result = await Tesseract.recognize(imageUri, 'eng+deu+fra+spa+nld', {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return result.data.text;
}

export default function ScanPedigreeScreen() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extracted, setExtracted] = useState<ExtractedPedigree | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingRing, setEditingRing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
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
      return () => { loop.stop(); };
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
        Alert.alert(t('error'), t('scanPedCameraDenied'));
        return;
      }
    }
    setCameraVisible(true);
  };

  const captureFromCamera = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePicture({ quality: 0.9 });
      setPhotoUri(photo.uri);
      setCameraVisible(false);
      setExtracted(null);
      setSaved(false);
      setOcrError(null);
    }
  };

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
      setExtracted(null);
      setSaved(false);
      setOcrError(null);
    }
  };

  const startScan = async () => {
    if (!photoUri) return;
    setExtracted(null);
    setSaved(false);
    setOcrError(null);
    setOcrProgress(0);
    setScanning(true);

    try {
      const ocrText = await runOcr(photoUri, (p) => setOcrProgress(p));
      const parsed = parsePedigreeText(ocrText);

      setScanning(false);

      if (!parsed) {
        setOcrError(t('scanPedOcrNoRings'));
        return;
      }

      setExtracted(parsed);
    } catch (err) {
      setScanning(false);
      const msg = err instanceof Error ? err.message : 'OCR error';
      setOcrError(`${t('scanPedOcrError')}: ${msg}`);
    }
  };

  const resetAll = () => {
    setPhotoUri(null);
    setExtracted(null);
    setSaved(false);
    setScanning(false);
    setOcrError(null);
    setOcrProgress(0);
    setShowRawText(false);
  };

  const updateAncestor = (gen: 'gen1' | 'gen2' | 'gen3', index: number, field: 'ring' | 'color', value: string) => {
    if (!extracted) return;
    const updated = { ...extracted };
    updated[gen] = [...updated[gen]];
    updated[gen][index] = { ...updated[gen][index], [field]: value };
    setExtracted(updated);
  };

  const updateRoot = (field: 'ring' | 'color' | 'sex', value: string) => {
    if (!extracted) return;
    setExtracted({ ...extracted, [field]: value });
  };

  const saveToRegistry = async () => {
    if (!extracted || !profile) return;
    setSaving(true);
    try {
      const userId = profile.id;
      const currentYear = new Date().getFullYear();
      const mainPigeon = await supabase
        .from('pigeons')
        .insert({
          user_id: userId,
          ring_series: extracted.ring,
          year: extracted.year || currentYear,
          sex: extracted.sex,
          color: extracted.color,
          status: 'În crescătorie',
          notes: `Importat prin OCR AI${extracted.detectedLanguage !== 'ro' ? ` (limba detectată: ${extracted.detectedLanguage.toUpperCase()})` : ''}`,
        })
        .select('id')
        .single();

      if (mainPigeon.data) {
        const mainId = mainPigeon.data.id;
        const gen1Ids: string[] = [];

        for (const ancestor of extracted.gen1) {
          if (!ancestor.ring) continue;
          const { data } = await supabase
            .from('pigeons')
            .insert({
              user_id: userId,
              ring_series: ancestor.ring,
              year: ancestor.year || currentYear - 1,
              sex: ancestor.sex,
              color: ancestor.color,
              status: 'În crescătorie',
              notes: 'Strămoș importat prin OCR AI',
            })
            .select('id')
            .single();
          if (data) gen1Ids.push(data.id);
        }

        if (gen1Ids.length >= 2) {
          await supabase.from('pigeons').update({ sire_id: gen1Ids[0], dam_id: gen1Ids[1] }).eq('id', mainId);
        }

        const gen2Ids: string[] = [];
        for (const ancestor of extracted.gen2) {
          if (!ancestor.ring) continue;
          const { data } = await supabase
            .from('pigeons')
            .insert({
              user_id: userId,
              ring_series: ancestor.ring,
              year: ancestor.year || currentYear - 2,
              sex: ancestor.sex,
              color: ancestor.color,
              status: 'În crescătorie',
              notes: 'Strămoș Gen2 importat prin OCR AI',
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
          if (!ancestor.ring) continue;
          const { data } = await supabase
            .from('pigeons')
            .insert({
              user_id: userId,
              ring_series: ancestor.ring,
              year: ancestor.year || currentYear - 3,
              sex: ancestor.sex,
              color: ancestor.color,
              status: 'În crescătorie',
              notes: 'Strămoș Gen3 importat prin OCR AI',
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

  const startEdit = (ring: string, currentVal: string) => {
    setEditingRing(ring);
    setEditValue(currentVal);
  };

  const saveEdit = (gen: 'gen1' | 'gen2' | 'gen3' | 'root', index: number, field: 'ring' | 'color') => {
    if (gen === 'root') {
      updateRoot(field, editValue);
    } else {
      updateAncestor(gen, index, field, editValue);
    }
    setEditingRing(null);
    setEditValue('');
  };

  const renderEditableField = (
    value: string,
    editKey: string,
    onEdit: () => void,
    onSave: () => void,
    style: any,
    placeholder = ''
  ) => {
    if (editingRing === editKey) {
      return (
        <View style={styles.editRow}>
          <TextInput
            style={styles.editInput}
            value={editValue}
            onChangeText={setEditValue}
            placeholder={placeholder}
            placeholderTextColor={Colors.textLight}
            autoFocus
          />
          <TouchableOpacity style={styles.editSaveBtn} onPress={onSave}>
            <Check color={Colors.success} size={16} />
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={onEdit} activeOpacity={0.7}>
        <Text style={style}>{value || t('scanPedTapEdit')}</Text>
      </TouchableOpacity>
    );
  };

  const renderAncestorRow = (a: ExtractedAncestor, idx: number, gen: 'gen1' | 'gen2' | 'gen3') => {
    const ringKey = `${gen}-${idx}-ring`;
    const colorKey = `${gen}-${idx}-color`;
    return (
      <View key={idx} style={styles.ancestorRow}>
        <View style={styles.sexIconBox}>
          {a.sex === 'Mascul' ? <Mars color={Colors.royalBlue} size={14} /> : <Venus color={Colors.error} size={14} />}
        </View>
        <View style={{ flex: 1 }}>
          {renderEditableField(
            a.ring,
            ringKey,
            () => startEdit(ringKey, a.ring),
            () => saveEdit(gen, idx, 'ring'),
            styles.ancestorRing,
            'RO-2024-123456'
          )}
        </View>
        <View style={{ flex: 1 }}>
          {renderEditableField(
            a.color,
            colorKey,
            () => startEdit(colorKey, a.color),
            () => saveEdit(gen, idx, 'color'),
            styles.ancestorColor,
            t('scanPedColorPh')
          )}
        </View>
        <Edit3 color={Colors.textLight} size={12} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('scanPedTitle')} subtitle={t('scanPedSub')} showBack />

        {!photoUri && !cameraVisible && (
          <View style={styles.introContainer}>
            <View style={styles.scanIconCircle}>
              <FileText color={Colors.gold} size={48} />
            </View>
            <Text style={styles.introTitle}>{t('scanPedTitle')}</Text>
            <Text style={styles.introSubtitle}>{t('scanPedOcrDesc')}</Text>

            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>{t('scanPedInstructions')}</Text>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot}><Text style={styles.instructionDotText}>1</Text></View>
                <Text style={styles.instructionText}>{t('scanPedInstr1')}</Text>
              </View>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot}><Text style={styles.instructionDotText}>2</Text></View>
                <Text style={styles.instructionText}>{t('scanPedOcrInstr2')}</Text>
              </View>
              <View style={styles.instructionRow}>
                <View style={styles.instructionDot}><Text style={styles.instructionDotText}>3</Text></View>
                <Text style={styles.instructionText}>{t('scanPedOcrInstr3')}</Text>
              </View>
            </View>

            <View style={styles.languagesBanner}>
              <Languages color={Colors.royalBlue} size={18} />
              <Text style={styles.languagesText}>{t('scanPedOcrLangs')}</Text>
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
                  {photoUri && (
                    <ImageBackground
                      source={{ uri: photoUri }}
                      style={styles.scanPhotoBg}
                      resizeMode="cover"
                    >
                      <View style={styles.scanDim}>
                        <View style={styles.scanArea}>
                          <Animated.View
                            style={[styles.scanLine, { transform: [{ translateY: scanLineTop }] }]}
                          />
                        </View>
                      </View>
                    </ImageBackground>
                  )}
                  <View style={styles.scanningInfoBox}>
                    <View style={styles.scanningInfo}>
                      <ScanLine color={Colors.gold} size={28} />
                      <Text style={styles.scanningText}>{t('scanPedOcrReading')}</Text>
                    </View>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${ocrProgress}%` }]} />
                      </View>
                      <Text style={styles.progressText}>{ocrProgress}%</Text>
                    </View>
                    <Text style={styles.scanningSubtext}>{t('scanPedOcrWait')}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.photoFrame}>
                  {photoUri && (
                    <Image source={{ uri: photoUri }} style={styles.photoImage} resizeMode="contain" />
                  )}
                </View>
              )}
            </View>

            {ocrError && !scanning && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{ocrError}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={startScan}>
                  <RefreshCw color={Colors.royalBlue} size={16} />
                  <Text style={styles.retryBtnText}>{t('scanPedRetry')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {!scanning && !extracted && !saved && !ocrError && (
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
                    <Text style={styles.resultsSub}>{t('scanPedOcrEditHint')}</Text>
                  </View>
                </View>

                {extracted.detectedLanguage !== 'ro' && extracted.detectedLanguage !== 'en' && (
                  <View style={styles.langDetectedBox}>
                    <Languages color={Colors.royalBlue} size={16} />
                    <Text style={styles.langDetectedText}>
                      {t('scanPedOcrDetected')}: {extracted.detectedLanguage.toUpperCase()} → {t('scanPedOcrTranslated')}
                    </Text>
                  </View>
                )}

                {/* Root bird card */}
                <View style={styles.birdCard}>
                  <View style={styles.birdHeader}>
                    <View style={styles.birdIconBox}>
                      {extracted.sex === 'Mascul' ? <Mars color={Colors.royalBlue} size={20} /> : <Venus color={Colors.error} size={20} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      {renderEditableField(
                        extracted.ring,
                        'root-ring',
                        () => startEdit('root-ring', extracted.ring),
                        () => saveEdit('root', 0, 'ring'),
                        styles.birdRing,
                        'RO-2024-123456'
                      )}
                      {renderEditableField(
                        extracted.color || '',
                        'root-color',
                        () => startEdit('root-color', extracted.color || ''),
                        () => saveEdit('root', 0, 'color'),
                        styles.birdColor,
                        t('scanPedColorPh')
                      )}
                    </View>
                    <View style={styles.aiBadge}>
                      <Sparkles color={Colors.gold} size={12} />
                      <Text style={styles.aiBadgeText}>OCR</Text>
                    </View>
                  </View>
                </View>

                {/* Generations */}
                {([
                  { key: 'gen1' as const, label: t('gen1') || 'Gen 1 · Părinți', data: extracted.gen1 },
                  { key: 'gen2' as const, label: t('gen2') || 'Gen 2 · Bunici', data: extracted.gen2 },
                  { key: 'gen3' as const, label: t('gen3') || 'Gen 3 · Străbunici', data: extracted.gen3 },
                ]).map((gen) => (
                  <View key={gen.key} style={styles.genCard}>
                    <Text style={styles.genTitle}>{gen.label} <Text style={styles.genCount}>({gen.data.length})</Text></Text>
                    {gen.data.length === 0 ? (
                      <Text style={styles.genEmpty}>{t('scanPedOcrNoGen')}</Text>
                    ) : (
                      gen.data.map((a, ai) => renderAncestorRow(a, ai, gen.key))
                    )}
                  </View>
                ))}

                {/* Raw OCR text toggle */}
                <TouchableOpacity
                  style={styles.rawToggleBtn}
                  onPress={() => setShowRawText(!showRawText)}
                >
                  <Eye color={Colors.textSecondary} size={16} />
                  <Text style={styles.rawToggleText}>{t('scanPedOcrRawText')}</Text>
                  {showRawText ? <ChevronUp color={Colors.textSecondary} size={16} /> : <ChevronDown color={Colors.textSecondary} size={16} />}
                </TouchableOpacity>

                {showRawText && (
                  <View style={styles.rawTextBox}>
                    <Text style={styles.rawTextContent}>{extracted.rawText}</Text>
                  </View>
                )}

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

// (TextInput imported at top of file)

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
  languagesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.royalBluePale,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  languagesText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
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
    height: 280,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  scanningOverlay: {
    height: 280,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.neutral900,
  },
  scanPhotoBg: { width: '100%', height: 200 },
  scanDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  scanArea: {
    width: SCREEN_WIDTH * 0.75,
    height: 160,
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
  scanningInfoBox: { padding: 16, alignItems: 'center', gap: 12 },
  scanningInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scanningText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.goldLight },
  scanningSubtext: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.goldLight, opacity: 0.7 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '80%' },
  progressBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  progressText: { fontFamily: 'Inter-Bold', fontSize: 13, color: Colors.goldLight, minWidth: 36 },
  errorBox: {
    backgroundColor: Colors.errorBg,
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginBottom: 16,
  },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.error, lineHeight: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  retryBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
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
  langDetectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.royalBluePale,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  langDetectedText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.royalBlue },
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
  genCount: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  genEmpty: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textLight, fontStyle: 'italic', paddingVertical: 8 },
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
  ancestorRing: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.text },
  ancestorColor: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editInput: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.royalBlue,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  editSaveBtn: { padding: 4 },
  rawToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.neutral100,
    borderRadius: 10,
  },
  rawToggleText: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary },
  rawTextBox: {
    backgroundColor: Colors.neutral100,
    borderRadius: 10,
    padding: 14,
    maxHeight: 200,
  },
  rawTextContent: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textSecondary, lineHeight: 16 },
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
