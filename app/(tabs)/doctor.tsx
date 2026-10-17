import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows, BorderRadius } from '@/lib/theme';
import { PLAN_LIMITS, GAME_STYLE_LABELS, GameStyle } from '@/lib/types';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { Language } from '@/lib/i18n';
import { findGeneticsAnswer } from '@/lib/genetics';
import {
  Stethoscope, Camera, MessageCircle, Send, Globe, Plus, X, Trash2,
  Pencil, AlertCircle, Shield, Syringe, Calendar, Bell, ChevronRight,
  Microscope, Activity, Crown, Eye, ClipboardList, ScanLine,
  AlertTriangle, ShieldAlert, Pill, Clock, Beaker, RefreshCw,
  Info, CheckCircle2, Image as ImageIcon,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';

type Section = 'consult' | 'diagnostic' | 'registry';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  has_web_search?: boolean;
}

interface TreatmentRecord {
  id: string;
  pigeon_ring: string;
  disease: string;
  symptoms: string;
  treatment: string;
  admin_date: string | null;
  booster_date: string | null;
}

interface PreventionItem {
  key: string;
  name: string;
  desc: string;
  schedule: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

function formatDate(dateStr: string | null, language: string = 'ro'): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const locale = language === 'ro' ? 'ro-RO' : 'en-US';
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isBoosterNear(boosterDate: string | null): boolean {
  if (!boosterDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const booster = new Date(boosterDate);
  booster.setHours(0, 0, 0, 0);
  const diff = Math.round((booster.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= 7;
}

function isBoosterOverdue(boosterDate: string | null): boolean {
  if (!boosterDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const booster = new Date(boosterDate);
  booster.setHours(0, 0, 0, 0);
  return booster.getTime() < today.getTime();
}

function detectMessageLanguage(text: string): 'ro' | 'en' {
  const lower = text.toLowerCase();
  const roWords = ['câți', 'cati', 'porumbel', 'porumbei', 'mascul', 'femel', 'cuib', 'pui', 'tratament', 'boală', 'boala', 'hrănire', 'hranire', 'antrenament', 'reproducere', 'împerechere', 'imperechere', 'joc', 'rapel', 'vaccin', 'tricomone', 'ecloz', 'ouă', 'oua', 'săptămâna', 'saptamana', 'crescător', 'crescator', 'zbor', 'distanță', 'distanta', 'campion', 'palmares'];
  const enWords = ['how many', 'pigeon', 'male', 'female', 'nest', 'chick', 'treatment', 'disease', 'feeding', 'training', 'breeding', 'pairing', 'racing', 'booster', 'vaccine', 'trichomon', 'hatching', 'egg', 'week', 'breeder', 'flight', 'distance', 'champion'];
  let roCount = 0, enCount = 0;
  for (const w of roWords) if (lower.includes(w)) roCount++;
  for (const w of enWords) if (lower.includes(w)) enCount++;
  if (roCount > enCount) return 'ro';
  if (enCount > roCount) return 'en';
  return 'ro';
}

export default function DoctorScreen() {
  const { t, language } = useLanguage();
  const { profile, isAdmin } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<Section>('consult');

  const plan = profile?.subscription_plan || 'free';
  const limits = PLAN_LIMITS[plan];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('doctorTitle')} subtitle={t('doctorSub')} />

        <View style={styles.sectionToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, section === 'consult' && styles.toggleBtnActive]}
            onPress={() => setSection('consult')}
          >
            <Stethoscope color={section === 'consult' ? Colors.white : Colors.royalBlue} size={18} />
            <Text style={[styles.toggleBtnText, section === 'consult' && styles.toggleBtnTextActive]}>
              {t('doctorConsult')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, section === 'diagnostic' && styles.toggleBtnActive]}
            onPress={() => setSection('diagnostic')}
          >
            <Eye color={section === 'diagnostic' ? Colors.white : Colors.royalBlue} size={18} />
            <Text style={[styles.toggleBtnText, section === 'diagnostic' && styles.toggleBtnTextActive]}>
              {t('diagTitle')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, section === 'registry' && styles.toggleBtnActive]}
            onPress={() => setSection('registry')}
          >
            <ClipboardList color={section === 'registry' ? Colors.white : Colors.royalBlue} size={18} />
            <Text style={[styles.toggleBtnText, section === 'registry' && styles.toggleBtnTextActive]}>
              {t('doctorRegistry')}
            </Text>
          </TouchableOpacity>
        </View>

        {section === 'consult' ? (
          <ConsultSection t={t} language={language} router={router} />
        ) : section === 'diagnostic' ? (
          <DiagnosticSection t={t} />
        ) : (
          <RegistrySection t={t} language={language} limits={limits} router={router} isAdmin={isAdmin} />
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function ConsultSection({ t, language, router }: { t: (k: any) => string; language: string; router: any }) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);
    setMessages((data || []) as ChatMsg[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const fetchContextData = async (question: string, msgLang: Language): Promise<string> => {
    const lowerQ = question.toLowerCase();
    let context = '';
    if (lowerQ.includes('tratament') || lowerQ.includes('vaccin') || lowerQ.includes('boal') || lowerQ.includes('tricomone') || lowerQ.includes('treatment') || lowerQ.includes('vaccine') || lowerQ.includes('disease')) {
      const { data: treatments } = await supabase.from('treatments').select('*').order('admin_date', { ascending: false }).limit(10);
      if (treatments && treatments.length > 0) {
        context += msgLang === 'en'
          ? `Recent treatments: ${treatments.map((tr: any) => `${tr.disease} for ${tr.pigeon_ring} on ${tr.admin_date}`).join('; ')}. `
          : `Ultimele tratamente: ${treatments.map((tr: any) => `${tr.disease} pentru ${tr.pigeon_ring} la ${tr.admin_date}`).join('; ')}. `;
      }
    }
    if (lowerQ.includes('rapel') || lowerQ.includes('booster') || lowerQ.includes('săptămâna') || lowerQ.includes('saptamana')) {
      const today = new Date();
      const weekLater = new Date(today);
      weekLater.setDate(weekLater.getDate() + 7);
      const { data: upcoming } = await supabase.from('treatments').select('*').gte('booster_date', today.toISOString().split('T')[0]).lte('booster_date', weekLater.toISOString().split('T')[0]);
      if (upcoming && upcoming.length > 0) {
        context += msgLang === 'en'
          ? `Boosters in 7 days: ${upcoming.map((tr: any) => `${tr.disease} for ${tr.pigeon_ring} on ${tr.booster_date}`).join('; ')}. `
          : `Rapeluri în 7 zile: ${upcoming.map((tr: any) => `${tr.disease} pentru ${tr.pigeon_ring} pe ${tr.booster_date}`).join('; ')}. `;
      }
    }
    return context;
  };

  const isWebSearchQuery = (question: string): boolean => {
    const lowerQ = question.toLowerCase();
    const geneticsKeywords = ['almond', 'migdal', 'de roy', 'deroy', 'indigo', 'andaluzian', 'andalusian', 'recessive red', 'roșu recesiv', 'rosu recesiv', 'toy stencil', 'stencil', 'reduced', 'reduct', 'redus', 'slate', 'ardezie', 'kite', 'tăciune', 'taciune', 'spread', 'negru solid', 'consangvin', 'inbreeding', 'linebreeding', 'coeficient', 'genetic'];
    if (geneticsKeywords.some(kw => lowerQ.includes(kw))) return false;
    const webKeywords = ['boal', 'disease', 'tricom', 'trichomon', 'salmonel', 'coryza', 'variola', 'pox', 'respirat', 'tratament', 'treatment', 'medica', 'vaccin', 'vaccine', 'antibiot', 'hrăn', 'hranire', 'feed', 'diet', 'nutri', 'reproduc', 'breed', 'împerech', 'imperech', 'pair', 'cuib', 'nest', 'ecloz', 'hatch', 'concurs', 'race', 'zbor', 'flight', 'antrenament', 'train', 'distan', 'voiaj', 'regulament', 'regulation', 'fci', 'clasar', 'rank', 'coeficient', 'ce să', 'ce sa', 'what should', 'how to', 'cum să', 'cum sa', 'best', 'cel mai bun', 'scheme', 'protocol', 'preven', 'recuper', 'remedii', 'remedy'];
    return webKeywords.some(kw => lowerQ.includes(kw));
  };

  const callWebSearch = async (question: string, msgLang: Language, loftContext: string): Promise<string> => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/pigeon-web-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ question, language: msgLang, loftContext }),
      });
      if (!response.ok) throw new Error(`Search failed (${response.status})`);
      const data = await response.json();
      if (data.response) return data.response;
      throw new Error('Invalid response');
    } catch {
      return msgLang === 'en'
        ? `I couldn't search right now. ${loftContext ? `Records: ${loftContext}` : ''}\n\nAsk about: feeding, diseases, treatments, breeding, vaccines.`
        : `Nu am putut căuta momentan. ${loftContext ? `Registre: ${loftContext}` : ''}\n\nÎntreabă despre: hrănire, boli, tratamente, reproducere, vaccinuri.`;
    }
  };

  const generateResponse = async (question: string): Promise<string> => {
    const msgLang = detectMessageLanguage(question);
    const contextData = await fetchContextData(question, msgLang);
    const lowerQ = question.toLowerCase();

    if (lowerQ.includes('câți masculi') || lowerQ.includes('cati masculi') || lowerQ.includes('how many males')) {
      const { count } = await supabase.from('pigeons').select('*', { count: 'exact', head: true }).eq('sex', 'Mascul');
      return msgLang === 'en' ? `You have ${count || 0} males.` : `Ai ${count || 0} masculi.`;
    }
    if (lowerQ.includes('câte femele') || lowerQ.includes('cate femele') || lowerQ.includes('how many females')) {
      const { count } = await supabase.from('pigeons').select('*', { count: 'exact', head: true }).eq('sex', 'Femelă');
      return msgLang === 'en' ? `You have ${count || 0} females.` : `Ai ${count || 0} femele.`;
    }
    if (lowerQ.includes('câți porumbei') || lowerQ.includes('cati porumbei') || lowerQ.includes('how many pigeons') || lowerQ.includes('total pigeons')) {
      const { count } = await supabase.from('pigeons').select('*', { count: 'exact', head: true });
      return msgLang === 'en' ? `You have ${count || 0} pigeons total.` : `Ai ${count || 0} porumbei în total.`;
    }
    if (lowerQ.includes('tricomone') || lowerQ.includes('trichomon') || lowerQ.includes('tratament') || lowerQ.includes('treatment')) {
      const { data: treatments } = await supabase.from('treatments').select('*').ilike('disease', '%tricom%').order('admin_date', { ascending: false }).limit(1);
      if (treatments && treatments.length > 0) {
        const tr = treatments[0] as any;
        return msgLang === 'en'
          ? `Last trichomoniasis treatment: ${tr.admin_date} for ${tr.pigeon_ring}. Treatment: ${tr.treatment || 'undocumented'}.`
          : `Ultimul tratament tricomoneză: ${tr.admin_date} pentru ${tr.pigeon_ring}. Tratament: ${tr.treatment || 'nedocumentat'}.`;
      }
    }
    if (lowerQ.includes('vaccin') || lowerQ.includes('rapel') || lowerQ.includes('vaccine') || lowerQ.includes('booster')) {
      const today = new Date();
      const weekLater = new Date(today);
      weekLater.setDate(weekLater.getDate() + 7);
      const { data: upcoming } = await supabase.from('treatments').select('*').gte('booster_date', today.toISOString().split('T')[0]).lte('booster_date', weekLater.toISOString().split('T')[0]);
      if (upcoming && upcoming.length > 0) {
        return msgLang === 'en'
          ? `Next 7 days: ${upcoming.length} booster(s): ${upcoming.map((tr: any) => `${tr.disease} for ${tr.pigeon_ring} on ${tr.booster_date}`).join(', ')}.`
          : `Următoarele 7 zile: ${upcoming.length} rapel(uri): ${upcoming.map((tr: any) => `${tr.disease} pentru ${tr.pigeon_ring} pe ${tr.booster_date}`).join(', ')}.`;
      }
      return msgLang === 'en' ? `No boosters in the next 7 days.` : `Nu ai rapeluri în următoarele 7 zile.`;
    }

    if (isWebSearchQuery(question)) {
      const noDataRo = 'Nu am găsit date specifice.';
      const noDataEn = "No specific data found.";
      const cleanContext = (contextData && contextData !== noDataRo && contextData !== noDataEn) ? contextData : '';
      return await callWebSearch(question, msgLang, cleanContext);
    }

    const geneticsAnswer = findGeneticsAnswer(question, msgLang);
    if (geneticsAnswer) return geneticsAnswer;

    if (contextData) {
      return msgLang === 'en'
        ? `Records: ${contextData}\n\nAsk about diseases, treatments, feeding, breeding, vaccines.`
        : `Registre: ${contextData}\n\nÎntreabă despre boli, tratamente, hrănire, reproducere, vaccinuri.`;
    }

    return msgLang === 'en'
      ? `I'm the Pigeon Doctor AI. I can help with:\n\n• Diseases, symptoms and treatments\n• Vaccination schedules and boosters\n• Feeding and breeding advice\n• Web search for latest info\n\nAsk me anything!`
      : `Sunt Doctorul AI pentru porumbei. Te ajut cu:\n\n• Boli, simptome și tratamente\n• Scheme de vaccinare și rapeluri\n• Sfaturi hrănire și reproducere\n• Căutare web pentru informații noi\n\nÎntreabă-mă orice!`;
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const userMessage = input.trim();
    setInput('');
    setSending(true);
    const { data: savedUserMsg } = await supabase.from('chat_messages').insert({ role: 'user', content: userMessage }).select().single();
    if (savedUserMsg) setMessages(prev => [...prev, savedUserMsg as ChatMsg]);
    const response = await generateResponse(userMessage);
    const wasWebSearch = response.includes('🌐') || response.includes('web') || response.includes('Web');
    const { data: savedAssistantMsg } = await supabase.from('chat_messages').insert({ role: 'assistant', content: response }).select().single();
    if (savedAssistantMsg) {
      const msg = savedAssistantMsg as ChatMsg;
      if (wasWebSearch) msg.has_web_search = true;
      setMessages(prev => [...prev, msg]);
    }
    setSending(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = ({ item }: { item: ChatMsg }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        <View style={[styles.msgBubble, isUser ? styles.userBubble : (item.has_web_search ? styles.webBubble : styles.assistantBubble)]}>
          {!isUser && (
            <View style={styles.assistantIcon}>
              {item.has_web_search ? <Globe color={Colors.white} size={14} /> : <MessageCircle color={Colors.white} size={14} />}
            </View>
          )}
          <Text style={[styles.msgText, isUser ? styles.userText : styles.assistantText]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <View>
      <View style={styles.chatHeader}>
        <View style={styles.chatHeaderIcon}>
          <MessageCircle color={Colors.royalBlue} size={18} />
        </View>
        <Text style={styles.chatHeaderText}>{t('doctorChat')}</Text>
        <View style={styles.freeBadge}>
          <Text style={styles.freeBadgeText}>{t('doctorUnlimited')}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 30 }} />
      ) : (
        <View style={styles.chatContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            scrollEnabled={false}
          />
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t('doctorAskPlaceholder')}
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]} onPress={handleSend} disabled={!input.trim() || sending}>
            {sending ? <ActivityIndicator color={Colors.white} size="small" /> : <Send color={Colors.white} size={20} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function DiagnosticSection({ t }: { t: (k: any) => string }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const cameraRef = useRef<any>(null);
  const scanAnim = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = Dimensions.get('window');
  const scanBoxSize = screenWidth * 0.7;

  interface DiagnosticResult {
    disease: string;
    probability: number;
    riskLevel: 'low' | 'medium' | 'high';
    isolation: string;
    treatments: { substance: string; duration: string; dosage: string }[];
  }

  const SIMULATED_RESULTS: DiagnosticResult[] = [
    { disease: 'Tricomoneză', probability: 87, riskLevel: 'high', isolation: 'Izolează pasărea imediat timp de 7-10 zile. Evită contactul cu restul efectivului.', treatments: [{ substance: 'Ronidazol 10%', duration: '5-7 zile consecutive', dosage: '1g per 2 litri apă' }, { substance: 'Metronidazol', duration: '5 zile', dosage: '25mg/kg greutate vie, în apă' }] },
    { disease: 'Coccidioză', probability: 72, riskLevel: 'medium', isolation: 'Izolează pasărea timp de 5-7 zile. Dezinfectează cușca cu amoniac 10%.', treatments: [{ substance: 'Toltrazuril 2,5%', duration: '2 zile, repetă după 7 zile', dosage: '1ml per litru apă' }, { substance: 'Amprolium 20%', duration: '5-7 zile', dosage: '1g per litru apă' }] },
    { disease: 'Ornitologie / Micoză respiratorie', probability: 64, riskLevel: 'medium', isolation: 'Izolează în boxă separată cu ventilație bună. Temperată 18-22°C.', treatments: [{ substance: 'Doxiciclină 5%', duration: '7-10 zile consecutive', dosage: '1g per litru apă' }, { substance: 'Itraconazol', duration: '14 zile', dosage: '10mg/kg greutate, în hrană' }] },
    { disease: 'Poxviroză (Variolă aviară)', probability: 55, riskLevel: 'medium', isolation: 'Izolare strictă 14-21 zile. Vaccinare restul efectivului de urgență.', treatments: [{ substance: 'Iod 2% (aplicare locală)', duration: '5-7 zile, de 2x/zi', dosage: 'Aplicare pe leziuni cu tampon' }, { substance: 'Vitamina A + E', duration: '10 zile', dosage: 'Supliment în apă, suport imunitar' }] },
    { disease: 'Salmoneloză (Paratifoidă)', probability: 80, riskLevel: 'high', isolation: 'Izolare strictă minimum 21 zile. Testarea întregului efectiv.', treatments: [{ substance: 'Enrofloxacină 10%', duration: '10-14 zile consecutive', dosage: '1ml per 2 litri apă' }, { substance: 'Trimetoprim + Sulfametoxazol', duration: '7 zile', dosage: '1 comprimat per litru apă' }] },
  ];

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
        setResult(SIMULATED_RESULTS[Math.floor(Math.random() * SIMULATED_RESULTS.length)]);
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

  const riskColor = (level: 'low' | 'medium' | 'high'): string => {
    if (level === 'low') return Colors.success;
    if (level === 'medium') return Colors.warning;
    return Colors.error;
  };

  const riskLabel = (level: 'low' | 'medium' | 'high'): string => {
    if (level === 'low') return t('diagLowRisk');
    if (level === 'medium') return t('diagMediumRisk');
    return t('diagHighRisk');
  };

  const scanLineTop = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, scanBoxSize - 2],
  });

  if (cameraVisible) {
    return (
      <View style={diagStyles.cameraContainer}>
        <CameraView ref={cameraRef} style={diagStyles.cameraView} facing={facing}>
          <View style={diagStyles.cameraOverlay}>
            <View style={[diagStyles.scanBox, { width: scanBoxSize, height: scanBoxSize }]} />
            <View style={diagStyles.cameraControls}>
              <TouchableOpacity style={diagStyles.captureBtn} onPress={captureFromCamera}>
                <View style={diagStyles.captureInner} />
              </TouchableOpacity>
              <TouchableOpacity style={diagStyles.flipBtn} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
                <RefreshCw color={Colors.white} size={22} />
              </TouchableOpacity>
              <TouchableOpacity style={diagStyles.closeCameraBtn} onPress={() => setCameraVisible(false)}>
                <X color={Colors.white} size={24} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View>
      {!photoUri ? (
        <View style={diagStyles.introContainer}>
          <View style={diagStyles.scanIconCircle}>
            <Eye color={Colors.gold} size={48} />
          </View>
          <Text style={diagStyles.introTitle}>{t('diagTitle')}</Text>
          <Text style={diagStyles.introSubtitle}>{t('diagNoResultSub')}</Text>

          <View style={diagStyles.instructionsCard}>
            <Text style={diagStyles.instructionsTitle}>{t('diagInstructions')}</Text>
            <View style={diagStyles.instructionRow}>
              <View style={diagStyles.instructionDot}><Text style={diagStyles.instructionDotText}>1</Text></View>
              <Text style={diagStyles.instructionText}>{t('diagInstr1')}</Text>
            </View>
            <View style={diagStyles.instructionRow}>
              <View style={diagStyles.instructionDot}><Text style={diagStyles.instructionDotText}>2</Text></View>
              <Text style={diagStyles.instructionText}>{t('diagInstr2')}</Text>
            </View>
            <View style={diagStyles.instructionRow}>
              <View style={diagStyles.instructionDot}><Text style={diagStyles.instructionDotText}>3</Text></View>
              <Text style={diagStyles.instructionText}>{t('diagInstr3')}</Text>
            </View>
          </View>

          <TouchableOpacity style={diagStyles.primaryBtn} onPress={takePhoto}>
            <Camera color={Colors.white} size={22} />
            <Text style={diagStyles.primaryBtnText}>{t('diagCamera')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={diagStyles.secondaryBtn} onPress={pickFromGallery}>
            <ImageIcon color={Colors.royalBlue} size={22} />
            <Text style={diagStyles.secondaryBtnText}>{t('diagUpload')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <View style={diagStyles.photoCard}>
            {scanning ? (
              <View style={diagStyles.scanningOverlay}>
                <View style={[diagStyles.scanBoxLarge, { width: scanBoxSize, height: scanBoxSize }]}>
                  <Animated.View style={[diagStyles.scanLine, { transform: [{ translateY: scanLineTop }] }]} />
                </View>
                <View style={diagStyles.scanningInfo}>
                  <Activity color={Colors.gold} size={28} />
                  <Text style={diagStyles.scanningText}>{t('diagAnalyzing')}</Text>
                </View>
              </View>
            ) : photoUri ? (
              <Image source={{ uri: photoUri }} style={diagStyles.photoFrame} resizeMode="cover" />
            ) : (
              <View style={diagStyles.photoFrame}>
                <Camera color={Colors.textLight} size={40} />
                <Text style={diagStyles.photoPlaceholderText}>Imagine încărcată</Text>
              </View>
            )}
          </View>

          {!scanning && !result && (
            <TouchableOpacity style={diagStyles.primaryBtn} onPress={startScan}>
              <ScanLine color={Colors.white} size={22} />
              <Text style={diagStyles.primaryBtnText}>{t('diagScan')}</Text>
            </TouchableOpacity>
          )}

          {result && (
            <View style={diagStyles.resultsContainer}>
              <View style={diagStyles.resultsHeader}>
                <View style={diagStyles.resultsIconBox}>
                  <Stethoscope color={Colors.royalBlue} size={24} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={diagStyles.resultsTitle}>{t('diagResults')}</Text>
                  <Text style={diagStyles.resultsSub}>{t('diagSuggested')}</Text>
                </View>
                <View style={[diagStyles.riskBadge, { backgroundColor: riskColor(result.riskLevel) + '20', borderColor: riskColor(result.riskLevel) }]}>
                  <Text style={[diagStyles.riskBadgeText, { color: riskColor(result.riskLevel) }]}>
                    {riskLabel(result.riskLevel)}
                  </Text>
                </View>
              </View>

              <View style={diagStyles.resultCard}>
                <View style={diagStyles.resultRow}>
                  <View style={diagStyles.resultIconBox}>
                    <ShieldAlert color={Colors.royalBlue} size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={diagStyles.resultLabel}>{t('diagDisease')}</Text>
                    <Text style={diagStyles.resultValue}>{result.disease}</Text>
                  </View>
                </View>

                <View style={diagStyles.probBarContainer}>
                  <View style={diagStyles.probBarRow}>
                    <Text style={diagStyles.probBarLabel}>{t('diagProbability')}</Text>
                    <Text style={diagStyles.probBarValue}>{result.probability}%</Text>
                  </View>
                  <View style={diagStyles.probBarBg}>
                    <View style={[diagStyles.probBarFill, { width: `${result.probability}%`, backgroundColor: riskColor(result.riskLevel) }]} />
                  </View>
                </View>

                <View style={diagStyles.resultRow}>
                  <View style={diagStyles.resultIconBox}>
                    <AlertTriangle color={Colors.warning} size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={diagStyles.resultLabel}>{t('diagIsolation')}</Text>
                    <Text style={diagStyles.resultValue}>{result.isolation}</Text>
                  </View>
                </View>
              </View>

              <View style={diagStyles.treatmentCard}>
                <Text style={diagStyles.treatmentTitle}>{t('diagTreatment')}</Text>
                {result.treatments.map((tr, i) => (
                  <View key={i} style={diagStyles.treatmentItem}>
                    <View style={diagStyles.treatmentItemHeader}>
                      <Pill color={Colors.gold} size={18} />
                      <Text style={diagStyles.treatmentSubstance}>{tr.substance}</Text>
                    </View>
                    <View style={diagStyles.treatmentDetails}>
                      <View style={diagStyles.treatmentDetailRow}>
                        <Clock color={Colors.textLight} size={14} />
                        <Text style={diagStyles.treatmentDetailText}>{tr.duration}</Text>
                      </View>
                      <View style={diagStyles.treatmentDetailRow}>
                        <Beaker color={Colors.textLight} size={14} />
                        <Text style={diagStyles.treatmentDetailText}>{tr.dosage}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <View style={diagStyles.warningCard}>
                <Info color={Colors.warning} size={18} />
                <Text style={diagStyles.warningText}>{t('diagWarningMsg')}</Text>
              </View>

              <View style={diagStyles.resultActions}>
                <TouchableOpacity style={diagStyles.retakeBtn} onPress={resetAll}>
                  <RefreshCw color={Colors.royalBlue} size={20} />
                  <Text style={diagStyles.retakeBtnText}>{t('diagNewScan')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const diagStyles = StyleSheet.create({
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
  cameraContainer: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  cameraView: { height: 400, borderRadius: BorderRadius.lg },
  cameraOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanBox: { borderWidth: 2, borderColor: Colors.gold, borderRadius: 12, backgroundColor: 'transparent' },
  cameraControls: { position: 'absolute', bottom: 20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30 },
  captureBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: Colors.gold },
  captureInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.royalBlue },
  flipBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(15,42,107,0.7)', justifyContent: 'center', alignItems: 'center' },
  closeCameraBtn: { position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  photoCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 12, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 16 },
  photoFrame: { height: 260, borderRadius: BorderRadius.md, overflow: 'hidden' },
  photoPlaceholderText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight },
  scanningOverlay: { height: 260, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: Colors.neutral900, justifyContent: 'center', alignItems: 'center' },
  scanBoxLarge: { borderWidth: 2, borderColor: Colors.gold, borderRadius: 12, overflow: 'hidden' },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: Colors.gold, shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8, elevation: 4 },
  scanningInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  scanningText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.goldLight },
  resultsContainer: { gap: 14, marginTop: 8 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultsIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.royalBluePale, justifyContent: 'center', alignItems: 'center' },
  resultsTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  resultsSub: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  riskBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5 },
  riskBadgeText: { fontFamily: 'Inter-Bold', fontSize: 12 },
  resultCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 18, borderWidth: 1, borderColor: Colors.borderLight, gap: 16 },
  resultRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  resultIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.royalBluePale, justifyContent: 'center', alignItems: 'center' },
  resultLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.textSecondary },
  resultValue: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text, marginTop: 2 },
  probBarContainer: { gap: 8 },
  probBarRow: { flexDirection: 'row', justifyContent: 'space-between' },
  probBarLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.textSecondary },
  probBarValue: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  probBarBg: { height: 10, backgroundColor: Colors.neutral100, borderRadius: 5, overflow: 'hidden' },
  probBarFill: { height: '100%', borderRadius: 5 },
  treatmentCard: { backgroundColor: Colors.goldPale, borderRadius: BorderRadius.lg, padding: 18, borderWidth: 1, borderColor: Colors.goldLight, gap: 14 },
  treatmentTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.goldDark },
  treatmentItem: { backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: 14, gap: 10 },
  treatmentItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  treatmentSubstance: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text, flex: 1 },
  treatmentDetails: { gap: 6, paddingLeft: 26 },
  treatmentDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  treatmentDetailText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  warningCard: { flexDirection: 'row', gap: 10, backgroundColor: Colors.warningBg, borderRadius: BorderRadius.md, padding: 14, alignItems: 'flex-start' },
  warningText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.warning, lineHeight: 19 },
  resultActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  retakeBtn: { flex: 1, flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.royalBlue },
  retakeBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.royalBlue },
});

function RegistrySection({ t, language, limits, router, isAdmin }: { t: (k: any) => string; language: string; limits: any; router: any; isAdmin: boolean }) {
  const [treatments, setTreatments] = useState<TreatmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<TreatmentRecord | null>(null);
  const [form, setForm] = useState({ pigeon_ring: '', disease: '', symptoms: '', treatment: '', admin_date: '', booster_date: '' });
  const [saving, setSaving] = useState(false);

  const hasAccess = isAdmin || limits.hasTreatments;

  const loadTreatments = useCallback(async () => {
    const { data } = await supabase.from('treatments').select('*').order('admin_date', { ascending: false });
    setTreatments((data || []) as TreatmentRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hasAccess) loadTreatments();
    else setLoading(false);
  }, [loadTreatments, hasAccess]);

  const preventionItems: PreventionItem[] = [
    { key: 'salmonella', name: t('doctorPrevSalmonella'), desc: t('doctorPrevSalmonellaDesc'), schedule: '2x/an', icon: <Shield color={Colors.white} size={20} />, color: Colors.royalBlue, bg: Colors.royalBluePale },
    { key: 'tricomonoza', name: t('doctorPrevTricomonoza'), desc: t('doctorPrevTricomonozaDesc'), schedule: 'Lunar', icon: <Syringe color={Colors.white} size={20} />, color: Colors.gold, bg: Colors.goldPale },
    { key: 'paramixo', name: t('doctorPrevParamixo'), desc: t('doctorPrevParamixoDesc'), schedule: '1x/an', icon: <Calendar color={Colors.white} size={20} />, color: Colors.success, bg: Colors.successBg },
  ];

  const upcomingAlerts = treatments.filter(tr => isBoosterNear(tr.booster_date));
  const overdueAlerts = treatments.filter(tr => isBoosterOverdue(tr.booster_date));

  if (!hasAccess) {
    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockedIcon}>
          <Crown color={Colors.gold} size={40} />
        </View>
        <Text style={styles.lockedTitle}>{t('premiumModule')}</Text>
        <Text style={styles.lockedSubtitle}>{t('treatmentsPremiumMsg')}</Text>
        <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/(tabs)/profile')}>
          <Text style={styles.upgradeBtnText}>{t('seePlans')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const openAddModal = () => {
    setEditingTreatment(null);
    setForm({ pigeon_ring: '', disease: '', symptoms: '', treatment: '', admin_date: new Date().toISOString().split('T')[0], booster_date: '' });
    setModalVisible(true);
  };

  const openEditModal = (tr: TreatmentRecord) => {
    setEditingTreatment(tr);
    setForm({ pigeon_ring: tr.pigeon_ring, disease: tr.disease, symptoms: tr.symptoms, treatment: tr.treatment, admin_date: tr.admin_date || '', booster_date: tr.booster_date || '' });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.pigeon_ring.trim() || !form.disease.trim()) {
      Alert.alert(t('error'), t('treatmentRequired'));
      return;
    }
    setSaving(true);
    const payload = { pigeon_ring: form.pigeon_ring.trim(), disease: form.disease.trim(), symptoms: form.symptoms.trim(), treatment: form.treatment.trim(), admin_date: form.admin_date || null, booster_date: form.booster_date || null };
    if (editingTreatment) await supabase.from('treatments').update(payload).eq('id', editingTreatment.id);
    else await supabase.from('treatments').insert(payload);
    setSaving(false);
    setModalVisible(false);
    loadTreatments();
  };

  const handleDelete = (tr: TreatmentRecord) => {
    Alert.alert(t('deleteTreatment'), `${t('deleteTreatmentConfirm')} "${tr.disease}"?`, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => { await supabase.from('treatments').delete().eq('id', tr.id); loadTreatments(); } },
    ]);
  };

  return (
    <View>
      {(upcomingAlerts.length > 0 || overdueAlerts.length > 0) && (
        <View style={styles.alertsContainer}>
          <Text style={styles.alertsTitle}>{t('doctorAlerts')}</Text>
          {overdueAlerts.map(tr => (
            <View key={tr.id} style={styles.alertCardOverdue}>
              <View style={styles.alertIconBox}><AlertCircle color={Colors.error} size={18} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{t('doctorAlertTitle')} — {tr.disease}</Text>
                <Text style={styles.alertSub}>{tr.pigeon_ring} · {t('doctorAlertOverdue')} · {formatDate(tr.booster_date, language)}</Text>
              </View>
            </View>
          ))}
          {upcomingAlerts.map(tr => (
            <View key={tr.id} style={styles.alertCardUpcoming}>
              <View style={styles.alertIconBox}><Bell color={Colors.warning} size={18} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{t('doctorAlertTitle')} — {tr.disease}</Text>
                <Text style={styles.alertSub}>{tr.pigeon_ring} · {t('doctorAlertUpcoming')} · {formatDate(tr.booster_date, language)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {upcomingAlerts.length === 0 && overdueAlerts.length === 0 && (
        <View style={styles.noAlertsCard}>
          <Shield color={Colors.success} size={20} />
          <Text style={styles.noAlertsText}>{t('doctorNoAlerts')}</Text>
        </View>
      )}

      <View style={styles.preventionCard}>
        <View style={styles.preventionHeader}>
          <Calendar color={Colors.gold} size={20} />
          <Text style={styles.preventionTitle}>{t('doctorPrevention')}</Text>
        </View>
        {preventionItems.map(item => (
          <View key={item.key} style={styles.prevItem}>
            <View style={[styles.prevIcon, { backgroundColor: item.color }]}>{item.icon}</View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.prevHeader}>
                <Text style={styles.prevName}>{item.name}</Text>
                <View style={[styles.prevScheduleBadge, { backgroundColor: item.bg }]}><Text style={[styles.prevScheduleText, { color: item.color }]}>{item.schedule}</Text></View>
              </View>
              <Text style={styles.prevDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.treatmentsHeader}>
        <Text style={styles.sectionTitle}>{t('doctorRegistry')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Plus color={Colors.royalBlue} size={18} />
          <Text style={styles.addBtnText}>{t('doctorAddTreatment')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 20 }} />
      ) : treatments.length === 0 ? (
        <View style={styles.emptyState}>
          <Stethoscope color={Colors.textLight} size={40} />
          <Text style={styles.emptyTitle}>{t('noTreatments')}</Text>
          <Text style={styles.emptySub}>{t('noTreatmentsSub')}</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {treatments.map(tr => {
            const boosterNear = isBoosterNear(tr.booster_date);
            return (
              <View key={tr.id} style={styles.treatmentCard}>
                {boosterNear && (
                  <View style={styles.boosterAlert}>
                    <AlertCircle color={Colors.warning} size={14} />
                    <Text style={styles.boosterAlertText}>{t('boosterNear')} {formatDate(tr.booster_date, language)}</Text>
                  </View>
                )}
                <View style={styles.trHeader}>
                  <View style={styles.diseaseBadge}><Text style={styles.diseaseText}>{tr.disease}</Text></View>
                  <View style={styles.trActions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(tr)}><Pencil color={Colors.royalBlue} size={14} /></TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(tr)}><Trash2 color={Colors.error} size={14} /></TouchableOpacity>
                  </View>
                </View>
                <View style={styles.trInfo}>
                  <View style={styles.trRow}>
                    <Text style={styles.trLabel}>{t('pigeonRing')}:</Text>
                    <Text style={styles.trValue}>{tr.pigeon_ring}</Text>
                  </View>
                  {tr.symptoms ? <Text style={styles.trSymptoms}>{tr.symptoms}</Text> : null}
                  {tr.treatment ? <Text style={styles.trTreatment}>{tr.treatment}</Text> : null}
                  <View style={styles.datesRow}>
                    <View style={styles.dateBox}><Text style={styles.dateLabel}>{t('adminDate')}</Text><Text style={styles.dateVal}>{formatDate(tr.admin_date, language)}</Text></View>
                    <View style={styles.dateBox}><Text style={styles.dateLabel}>{t('boosterDate')}</Text><Text style={styles.dateVal}>{formatDate(tr.booster_date, language)}</Text></View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingTreatment ? t('editTreatment') : t('addTreatment')}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><X color={Colors.text} size={24} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('pigeonRing')}</Text>
              <TextInput style={styles.formInput} value={form.pigeon_ring} onChangeText={v => setForm({ ...form, pigeon_ring: v })} placeholder="RO-2024-001" placeholderTextColor={Colors.textLight} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('disease')}</Text>
              <TextInput style={styles.formInput} value={form.disease} onChangeText={v => setForm({ ...form, disease: v })} placeholder={t('diseasePlaceholder')} placeholderTextColor={Colors.textLight} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('symptoms')}</Text>
              <TextInput style={[styles.formInput, styles.textArea]} value={form.symptoms} onChangeText={v => setForm({ ...form, symptoms: v })} placeholder={t('doctorSymptomsDesc')} placeholderTextColor={Colors.textLight} multiline numberOfLines={3} />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{t('treatmentApplied')}</Text>
              <TextInput style={[styles.formInput, styles.textArea]} value={form.treatment} onChangeText={v => setForm({ ...form, treatment: v })} placeholder={t('treatmentPlaceholder')} placeholderTextColor={Colors.textLight} multiline numberOfLines={3} />
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>{t('adminDate')}</Text>
                <TextInput style={styles.formInput} value={form.admin_date} onChangeText={v => setForm({ ...form, admin_date: v })} placeholder="AAAA-LL-ZZ" placeholderTextColor={Colors.textLight} />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>{t('boosterDate')}</Text>
                <TextInput style={styles.formInput} value={form.booster_date} onChangeText={v => setForm({ ...form, booster_date: v })} placeholder="AAAA-LL-ZZ" placeholderTextColor={Colors.textLight} />
              </View>
            </View>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveButtonText}>{editingTreatment ? t('save') : t('addTreatmentBtn')}</Text>}
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
  sectionToggle: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: BorderRadius.md, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  toggleBtnActive: { backgroundColor: Colors.royalBlue, borderColor: Colors.royalBlue, ...Shadows.button },
  toggleBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.royalBlue },
  toggleBtnTextActive: { color: Colors.white },
  photoDiagCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.royalBlue,
    borderRadius: BorderRadius.lg, padding: 18, marginBottom: 20, ...Shadows.gold,
  },
  photoDiagIconBox: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  photoDiagTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },
  photoDiagDesc: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.goldLight, marginTop: 2 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 4 },
  chatHeaderIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.royalBluePale, justifyContent: 'center', alignItems: 'center' },
  chatHeaderText: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  freeBadge: { backgroundColor: Colors.successBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  freeBadgeText: { fontFamily: 'Inter-Bold', fontSize: 11, color: Colors.success },
  chatContainer: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 8, maxHeight: 350 },
  chatList: { padding: 14, gap: 10 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgBubble: { maxWidth: '85%', borderRadius: 14, padding: 12, flexDirection: 'row', gap: 8 },
  userBubble: { backgroundColor: Colors.royalBlue },
  assistantBubble: { backgroundColor: Colors.neutral50, borderWidth: 1, borderColor: Colors.borderLight },
  webBubble: { backgroundColor: Colors.goldPale, borderWidth: 1, borderColor: Colors.gold },
  assistantIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.royalBlue, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  msgText: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 20 },
  userText: { color: Colors.white },
  assistantText: { color: Colors.text, flex: 1 },
  inputContainer: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.borderLight, alignItems: 'flex-end' },
  input: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 15, backgroundColor: Colors.neutral50, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: Colors.text, maxHeight: 80 },
  sendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.gold, justifyContent: 'center', alignItems: 'center', ...Shadows.gold },
  sendBtnDisabled: { backgroundColor: Colors.neutral300 },
  alertsContainer: { gap: 8, marginBottom: 16 },
  alertsTitle: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.text, marginBottom: 4 },
  alertCardOverdue: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.errorBg, borderRadius: BorderRadius.md, padding: 12, borderWidth: 1, borderColor: Colors.error },
  alertCardUpcoming: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.warningBg, borderRadius: BorderRadius.md, padding: 12, borderWidth: 1, borderColor: Colors.warning },
  alertIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center' },
  alertTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  alertSub: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  noAlertsCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.successBg, borderRadius: BorderRadius.md, padding: 14, borderWidth: 1, borderColor: Colors.success, marginBottom: 16 },
  noAlertsText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.success, flex: 1 },
  preventionCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 18, borderWidth: 1, borderColor: Colors.borderLight, marginBottom: 20, ...Shadows.card },
  preventionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  preventionTitle: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  prevItem: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  prevIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  prevHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prevName: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text, flex: 1 },
  prevScheduleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  prevScheduleText: { fontFamily: 'Inter-Bold', fontSize: 11 },
  prevDesc: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  treatmentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.royalBluePale, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  addBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  treatmentCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: 14, borderWidth: 1, borderColor: Colors.borderLight, gap: 10 },
  boosterAlert: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.warningBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  boosterAlertText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.warning },
  trHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  diseaseBadge: { backgroundColor: Colors.royalBluePale, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  diseaseText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.royalBlue },
  trActions: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 28, height: 28, borderRadius: 7, backgroundColor: Colors.neutral100, justifyContent: 'center', alignItems: 'center' },
  trInfo: { gap: 4 },
  trRow: { flexDirection: 'row', gap: 4 },
  trLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.textSecondary },
  trValue: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.text },
  trSymptoms: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  trTreatment: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.text, lineHeight: 17 },
  datesRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  dateBox: { flex: 1, backgroundColor: Colors.neutral50, borderRadius: 8, padding: 8, alignItems: 'center' },
  dateLabel: { fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.textSecondary },
  dateVal: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.text, marginTop: 2 },
  emptyState: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text },
  emptySub: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  lockedContainer: { alignItems: 'center', gap: 16, marginTop: 40, paddingHorizontal: 24 },
  lockedIcon: { width: 80, height: 80, borderRadius: 20, backgroundColor: Colors.goldPale, justifyContent: 'center', alignItems: 'center' },
  lockedTitle: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.text },
  lockedSubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  upgradeBtn: { backgroundColor: Colors.royalBlue, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, ...Shadows.button },
  upgradeBtnText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 50, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.text },
  modalScroll: { padding: 24 },
  formGroup: { marginBottom: 16, gap: 6 },
  formRow: { flexDirection: 'row', gap: 12 },
  formLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.text },
  formInput: { fontFamily: 'Inter-Regular', fontSize: 16, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  saveButton: { backgroundColor: Colors.royalBlue, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, ...Shadows.button },
  saveButtonText: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.white },
});
