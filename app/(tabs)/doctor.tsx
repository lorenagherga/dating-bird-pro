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
import { findVetAnswer, appendRegistryNote } from '@/lib/vet-knowledge';
import {
  Stethoscope, MessageCircle, Send, Globe, Plus, X, Trash2,
  Pencil, AlertCircle, Shield, Syringe, Calendar, Bell, ChevronRight,
  Microscope, Crown, ClipboardList,
  Info, CheckCircle2, Bird, Egg, Trophy,
} from 'lucide-react-native';

type Section = 'consult' | 'registry';

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

  const plan = profile?.subscription_plan || 'trial';
  const limits = PLAN_LIMITS[plan];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('doctorTitle')} subtitle={t('doctorSub')} showBack />

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
          : `Ultimul tratament tricomonoza: ${tr.admin_date} pentru ${tr.pigeon_ring}. Tratament: ${tr.treatment || 'nedocumentat'}.`;
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
      const vetAnswer = findVetAnswer(question, msgLang);
      if (vetAnswer) {
        const hasLocalData = contextData && contextData.length > 0 && !contextData.includes('Nu am găsit') && !contextData.includes('No specific');
        return vetAnswer + appendRegistryNote(!!hasLocalData, msgLang);
      }
      const noDataRo = 'Nu am găsit date specifice.';
      const noDataEn = "No specific data found.";
      const cleanContext = (contextData && contextData !== noDataRo && contextData !== noDataEn) ? contextData : '';
      return await callWebSearch(question, msgLang, cleanContext);
    }

    const geneticsAnswer = findGeneticsAnswer(question, msgLang);
    if (geneticsAnswer) return geneticsAnswer;

    const vetAnswer = findVetAnswer(question, msgLang);
    if (vetAnswer) {
      const hasLocalData = contextData && contextData.length > 0 && !contextData.includes('Nu am găsit') && !contextData.includes('No specific');
      return vetAnswer + appendRegistryNote(!!hasLocalData, msgLang);
    }

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

function RegistrySection({ t, language, limits, router, isAdmin }: { t: (k: any) => string; language: string; limits: any; router: any; isAdmin: boolean }) {
  const [treatments, setTreatments] = useState<TreatmentRecord[]>([]);
  const [pigeons, setPigeons] = useState<any[]>([]);
  const [nests, setNests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<TreatmentRecord | null>(null);
  const [form, setForm] = useState({ pigeon_ring: '', disease: '', symptoms: '', treatment: '', admin_date: '', booster_date: '' });
  const [saving, setSaving] = useState(false);
  const [regSubTab, setRegSubTab] = useState<'treatments' | 'pigeons' | 'nests'>('treatments');

  const hasAccess = isAdmin || limits.hasTreatments;

  const loadTreatments = useCallback(async () => {
    const { data } = await supabase.from('treatments').select('*').order('admin_date', { ascending: false });
    setTreatments((data || []) as TreatmentRecord[]);
  }, []);

  const loadPigeons = useCallback(async () => {
    const { data } = await supabase.from('pigeons').select('id, ring_series, sex, color, year, is_champion, photo_url, status').order('created_at', { ascending: false }).limit(50);
    setPigeons(data || []);
  }, []);

  const loadNests = useCallback(async () => {
    const { data } = await supabase.from('nests').select('id, nest_id, male_ring, female_ring, pairing_date, hatching_date, chick_count, is_foster').order('pairing_date', { ascending: false }).limit(50);
    setNests(data || []);
  }, []);

  useEffect(() => {
    if (hasAccess) {
      loadTreatments().finally(() => setLoading(false));
      loadPigeons();
      loadNests();
    } else {
      setLoading(false);
    }
  }, [loadTreatments, loadPigeons, loadNests, hasAccess]);

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
      <View style={styles.regSubToggle}>
        <TouchableOpacity
          style={[styles.regSubBtn, regSubTab === 'treatments' && styles.regSubBtnActive]}
          onPress={() => setRegSubTab('treatments')}
        >
          <Stethoscope color={regSubTab === 'treatments' ? Colors.white : Colors.royalBlue} size={16} />
          <Text style={[styles.regSubText, regSubTab === 'treatments' && styles.regSubTextActive]}>{t('doctorRegTreatments')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.regSubBtn, regSubTab === 'pigeons' && styles.regSubBtnActive]}
          onPress={() => setRegSubTab('pigeons')}
        >
          <Bird color={regSubTab === 'pigeons' ? Colors.white : Colors.royalBlue} size={16} />
          <Text style={[styles.regSubText, regSubTab === 'pigeons' && styles.regSubTextActive]}>{t('doctorRegPigeons')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.regSubBtn, regSubTab === 'nests' && styles.regSubBtnActive]}
          onPress={() => setRegSubTab('nests')}
        >
          <Egg color={regSubTab === 'nests' ? Colors.white : Colors.royalBlue} size={16} />
          <Text style={[styles.regSubText, regSubTab === 'nests' && styles.regSubTextActive]}>{t('doctorRegNests')}</Text>
        </TouchableOpacity>
      </View>

      {regSubTab === 'pigeons' ? (
        <View>
          <View style={styles.treatmentsHeader}>
            <Text style={styles.sectionTitle}>{t('pigeonRegistry')}</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(tabs)/pigeons')}>
              <ChevronRight color={Colors.royalBlue} size={18} />
              <Text style={styles.addBtnText}>{t('doctorViewFull')}</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 20 }} />
          ) : pigeons.length === 0 ? (
            <View style={styles.emptyState}>
              <Bird color={Colors.textLight} size={40} />
              <Text style={styles.emptyTitle}>{t('noPigeons')}</Text>
              <Text style={styles.emptySub}>{t('noPigeonsSub')}</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {pigeons.map(p => (
                <View key={p.id} style={styles.regMiniCard}>
                  <View style={styles.regMiniIconBox}>
                    {p.photo_url ? (
                      <Image source={{ uri: p.photo_url }} style={styles.regMiniPhoto} resizeMode="cover" />
                    ) : (
                      <Bird color={Colors.royalBlueLight} size={18} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.regMiniRing}>{p.ring_series}</Text>
                    <Text style={styles.regMiniInfo}>{p.sex === 'Mascul' ? t('male') : t('female')} · {p.color || '—'} · {p.year || '—'}</Text>
                  </View>
                  {p.is_champion && (
                    <View style={styles.regMiniChampion}>
                      <Trophy color={Colors.gold} size={12} />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      ) : regSubTab === 'nests' ? (
        <View>
          <View style={styles.treatmentsHeader}>
            <Text style={styles.sectionTitle}>{t('bioCalendar')}</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(tabs)/nests')}>
              <ChevronRight color={Colors.royalBlue} size={18} />
              <Text style={styles.addBtnText}>{t('doctorViewFull')}</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 20 }} />
          ) : nests.length === 0 ? (
            <View style={styles.emptyState}>
              <Egg color={Colors.textLight} size={40} />
              <Text style={styles.emptyTitle}>{t('noNests')}</Text>
              <Text style={styles.emptySub}>{t('noNestsSub')}</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {nests.map(n => (
                <View key={n.id} style={styles.regMiniCard}>
                  <View style={[styles.regMiniIconBox, n.is_foster && styles.regMiniIconFoster]}>
                    <Egg color={Colors.royalBlueLight} size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.regMiniRing}>{n.nest_id}{n.is_foster ? ' (Foster)' : ''}</Text>
                    <Text style={styles.regMiniInfo}>{n.male_ring} × {n.female_ring} · {t('chicks')}: {n.chick_count || 0}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
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
    )}
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
  regSubToggle: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  regSubBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: BorderRadius.md, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.borderLight },
  regSubBtnActive: { backgroundColor: Colors.royalBlue, borderColor: Colors.royalBlue },
  regSubText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: Colors.royalBlue },
  regSubTextActive: { color: Colors.white },
  regMiniCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: 12, borderWidth: 1, borderColor: Colors.borderLight },
  regMiniIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.royalBluePale, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' as const },
  regMiniIconFoster: { backgroundColor: Colors.goldPale },
  regMiniPhoto: { width: 42, height: 42, borderRadius: 12 },
  regMiniRing: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.text },
  regMiniInfo: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  regMiniChampion: { width: 26, height: 26, borderRadius: 8, backgroundColor: Colors.goldPale, justifyContent: 'center', alignItems: 'center' },
});
