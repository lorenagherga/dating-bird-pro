import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { Colors } from '@/lib/theme';
import { GAME_STYLE_LABELS, GameStyle } from '@/lib/types';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Send, MessageCircle, Globe } from 'lucide-react-native';
import { useLanguage } from '@/lib/language-context';
import type { Language } from '@/lib/i18n';
import { findGeneticsAnswer } from '@/lib/genetics';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  has_web_search?: boolean;
}

function detectMessageLanguage(text: string): 'ro' | 'en' {
  const lower = text.toLowerCase();
  const roWords = ['câți', 'cati', 'porumbel', 'porumbei', 'mascul', 'femel', 'cuib', 'pui', 'tratament', 'boală', 'boala', 'hrănire', 'hranire', 'antrenament', 'reproducere', 'împerechere', 'imperechere', 'joc', 'rapel', 'vaccin', 'tricomone', 'ecloz', 'ouă', 'oua', 'săptămâna', 'saptamana', 'crescător', 'crescator', 'zbor', 'distanță', 'distanta', 'campion', 'palmares'];
  const enWords = ['how many', 'pigeon', 'male', 'female', 'nest', 'chick', 'treatment', 'disease', 'feeding', 'training', 'breeding', 'pairing', 'racing', 'booster', 'vaccine', 'trichomon', 'hatching', 'egg', 'week', 'breeder', 'flight', 'distance', 'champion', 'long distance', 'short distance'];
  let roCount = 0, enCount = 0;
  for (const w of roWords) if (lower.includes(w)) roCount++;
  for (const w of enWords) if (lower.includes(w)) enCount++;
  if (roCount > enCount) return 'ro';
  if (enCount > roCount) return 'en';
  return 'ro'; // default to Romanian if unclear
}

export default function AssistantScreen() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);
    setMessages((data || []) as ChatMsg[]);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const fetchContextData = async (question: string, msgLang: Language): Promise<string> => {
    const lowerQ = question.toLowerCase();
    let context = '';

    if (lowerQ.includes('mascul') || lowerQ.includes('masculi') || lowerQ.includes('male') || lowerQ.includes('males')) {
      const { count } = await supabase
        .from('pigeons')
        .select('*', { count: 'exact', head: true })
        .eq('sex', 'Mascul');
      context += msgLang === 'en'
        ? `Total males in registry: ${count || 0}. `
        : `Număr total masculi în registru: ${count || 0}. `;
    }

    if (lowerQ.includes('femel') || lowerQ.includes('femele') || lowerQ.includes('female') || lowerQ.includes('females')) {
      const { count } = await supabase
        .from('pigeons')
        .select('*', { count: 'exact', head: true })
        .eq('sex', 'Femelă');
      context += msgLang === 'en'
        ? `Total females in registry: ${count || 0}. `
        : `Număr total femele în registru: ${count || 0}. `;
    }

    if (lowerQ.includes('porumb') || lowerQ.includes('câți') || lowerQ.includes('cati') || lowerQ.includes('total') || lowerQ.includes('pigeon') || lowerQ.includes('pigeons') || lowerQ.includes('how many') || lowerQ.includes('count')) {
      const { count } = await supabase
        .from('pigeons')
        .select('*', { count: 'exact', head: true });
      context += msgLang === 'en'
        ? `Total pigeons in registry: ${count || 0}. `
        : `Număr total porumbei în registru: ${count || 0}. `;

      const { count: activeCount } = await supabase
        .from('pigeons')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'În crescătorie');
      context += msgLang === 'en'
        ? `Active pigeons in loft: ${activeCount || 0}. `
        : `Porumbei activi în crescătorie: ${activeCount || 0}. `;
    }

    if (lowerQ.includes('tratament') || lowerQ.includes('vaccin') || lowerQ.includes('boal') || lowerQ.includes('tricomone') || lowerQ.includes('treatment') || lowerQ.includes('vaccine') || lowerQ.includes('disease') || lowerQ.includes('trichomon')) {
      const { data: treatments } = await supabase
        .from('treatments')
        .select('*')
        .order('admin_date', { ascending: false })
        .limit(10);
      if (treatments && treatments.length > 0) {
        if (msgLang === 'en') {
          context += `Recent treatments: ${treatments.map((t: any) => `${t.disease} for ${t.pigeon_ring} on ${t.admin_date}, booster ${t.booster_date || 'unspecified'}`).join('; ')}. `;
        } else {
          context += `Ultimele tratamente: ${treatments.map((t: any) => `${t.disease} pentru ${t.pigeon_ring} la data ${t.admin_date}, rapel ${t.booster_date || 'nespecificat'}`).join('; ')}. `;
        }
      } else {
        context += msgLang === 'en' ? `No treatments registered. ` : `Nu există tratamente înregistrate. `;
      }
    }

    if (lowerQ.includes('cuib') || lowerQ.includes('pui') || lowerQ.includes('ou') || lowerQ.includes('ecloz') || lowerQ.includes('nest') || lowerQ.includes('chick') || lowerQ.includes('egg') || lowerQ.includes('hatching')) {
      const { data: nests } = await supabase
        .from('nests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (nests && nests.length > 0) {
        if (msgLang === 'en') {
          context += `Active nests: ${nests.map((n: any) => `${n.nest_id} (${n.male_ring} x ${n.female_ring}), estimated hatching ${n.hatching_date || 'undefined'}`).join('; ')}. `;
        } else {
          context += `Cuiburi active: ${nests.map((n: any) => `${n.nest_id} (${n.male_ring} x ${n.female_ring}), ecloziune estimată ${n.hatching_date || 'nedefinită'}`).join('; ')}. `;
        }
      } else {
        context += msgLang === 'en' ? `No nests registered. ` : `Nu există cuiburi înregistrate. `;
      }
    }

    if (lowerQ.includes('rapel') || lowerQ.includes('săptămâna') || lowerQ.includes('saptamana') || lowerQ.includes('booster') || lowerQ.includes('week')) {
      const today = new Date();
      const weekLater = new Date(today);
      weekLater.setDate(weekLater.getDate() + 7);
      const { data: upcomingBoosters } = await supabase
        .from('treatments')
        .select('*')
        .gte('booster_date', today.toISOString().split('T')[0])
        .lte('booster_date', weekLater.toISOString().split('T')[0]);
      if (upcomingBoosters && upcomingBoosters.length > 0) {
        if (msgLang === 'en') {
          context += `Boosters in the next 7 days: ${upcomingBoosters.map((t: any) => `${t.disease} for ${t.pigeon_ring} on ${t.booster_date}`).join('; ')}. `;
        } else {
          context += `Rapeluri în următoarele 7 zile: ${upcomingBoosters.map((t: any) => `${t.disease} pentru ${t.pigeon_ring} pe ${t.booster_date}`).join('; ')}. `;
        }
      } else {
        context += msgLang === 'en' ? `No boosters scheduled in the next 7 days. ` : `Nu sunt rapeluri programate în următoarele 7 zile. `;
      }
    }

    return context || (msgLang === 'en'
      ? 'I could not find specific data for this question in the user\'s records.'
      : 'Nu am găsit date specifice pentru această întrebare în registrele utilizatorului.');
  };

  const isLocalDataQuery = (question: string): boolean => {
    const lowerQ = question.toLowerCase();
    const localKeywords = [
      'câți masculi', 'cati masculi', 'masculi am', 'how many males', 'males do i have', 'males have',
      'câte femele', 'cate femele', 'femele am', 'how many females', 'females do i have', 'females have',
      'câți porumbei', 'cati porumbei', 'porumbei am', 'how many pigeons', 'pigeons do i have', 'pigeons have', 'total pigeons',
      'joc', 'racing', 'race', 'style', 'listă', 'lista', 'genereaz', 'list', 'generate', 'statistics', 'stats',
      'rapel', 'booster', 'săptămâna', 'saptamana', 'week',
    ];
    return localKeywords.some(kw => lowerQ.includes(kw));
  };

  const isWebSearchQuery = (question: string): boolean => {
    const lowerQ = question.toLowerCase();
    // Genetics questions are handled by the genetics knowledge base, not web search
    const geneticsKeywords = [
      'almond', 'migdal', 'de roy', 'deroy', 'indigo', 'andaluzian', 'andalusian',
      'recessive red', 'roșu recesiv', 'rosu recesiv', 'toy stencil', 'stencil',
      'reduced', 'reduct', 'redus', 'slate', 'ardezie', 'kite', 'tăciune', 'taciune',
      'spread', 'negru solid', 'consangvin', 'inbreeding', 'linebreeding', 'coeficient',
      'genetic', 'moț', 'mot crest', 'muff', 'încălț', 'incaltz', 'ochi ceacâr', 'ochi ceacir',
      'bull eye', 'pearl eye', 'odd eye', 'ochi negru', 'ochi sparți', 'ochi sparit',
      'diluat', 'dilute', 'argintiu', 'silver', 'kaki', 'khaki', 'galben',
    ];
    if (geneticsKeywords.some(kw => lowerQ.includes(kw))) return false;

    const webKeywords = [
      'boal', 'disease', 'tricom', 'trichomon', 'salmonel', 'coryza', 'variola', 'pox', 'respirat',
      'tratament', 'treatment', 'medica', 'vaccin', 'vaccine', 'antibiot',
      'hrăn', 'hranire', 'feed', 'diet', 'nutri',
      'reproduc', 'breed', 'împerech', 'imperech', 'pair', 'cuib', 'nest', 'ecloz', 'hatch',
      'concurs', 'race', 'zbor', 'flight', 'antrenament', 'train', 'distan', 'voiaj',
      'regulament', 'regulation', 'fci', 'clasar', 'rank', 'coeficient',
      'ce să', 'ce sa', 'what should', 'how to', 'cum să', 'cum sa', 'best', 'cel mai bun',
      'scheme', 'protocol', 'preven', 'recuper', 'remedii', 'remedy',
    ];
    return webKeywords.some(kw => lowerQ.includes(kw));
  };

  const callWebSearch = async (question: string, msgLang: Language, loftContext: string): Promise<string> => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/pigeon-web-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          question,
          language: msgLang,
          loftContext,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed (${response.status})`);
      }

      const data = await response.json();
      if (data.response) {
        return data.response;
      }
      throw new Error('Invalid response from search');
    } catch (err) {
      return msgLang === 'en'
        ? `I couldn't perform a web search right now. ${loftContext ? `Based on your records: ${loftContext}` : ''}\n\nFor general pigeon questions, you can ask about: feeding, training, diseases, breeding, pairing, nests, vaccinations or treatments.`
        : `Nu am putut efectua căutarea pe web momentan. ${loftContext ? `Conform datelor din registre: ${loftContext}` : ''}\n\nPentru întrebări generale despre columbofilie, poți întreba despre: hrănire, antrenamente, boli, reproducere, împerechere, cuiburi, vaccinări sau tratamente.`;
    }
  };

  const generateResponse = async (question: string): Promise<string> => {
    const msgLang = detectMessageLanguage(question);
    const contextData = await fetchContextData(question, msgLang);

    const lowerQ = question.toLowerCase();

    // Try to answer contextually based on extracted data
    if (lowerQ.includes('câți masculi') || lowerQ.includes('cati masculi') || lowerQ.includes('masculi am') || lowerQ.includes('how many males') || lowerQ.includes('males do i have') || lowerQ.includes('males have')) {
      const { count } = await supabase
        .from('pigeons')
        .select('*', { count: 'exact', head: true })
        .eq('sex', 'Mascul');
      return msgLang === 'en'
        ? `You have ${count || 0} males registered in the registry.`
        : `Ai ${count || 0} masculi înregistrați în registru.`;
    }

    if (lowerQ.includes('câte femele') || lowerQ.includes('cate femele') || lowerQ.includes('femele am') || lowerQ.includes('how many females') || lowerQ.includes('females do i have') || lowerQ.includes('females have')) {
      const { count } = await supabase
        .from('pigeons')
        .select('*', { count: 'exact', head: true })
        .eq('sex', 'Femelă');
      return msgLang === 'en'
        ? `You have ${count || 0} females registered in the registry.`
        : `Ai ${count || 0} femele înregistrate în registru.`;
    }

    if (lowerQ.includes('câți porumbei') || lowerQ.includes('cati porumbei') || lowerQ.includes('porumbei am') || lowerQ.includes('how many pigeons') || lowerQ.includes('pigeons do i have') || lowerQ.includes('pigeons have') || lowerQ.includes('total pigeons')) {
      const { count } = await supabase
        .from('pigeons')
        .select('*', { count: 'exact', head: true });
      return msgLang === 'en'
        ? `You have ${count || 0} pigeons registered in total in the registry.`
        : `Ai ${count || 0} porumbei înregistrați în total în registru.`;
    }

    if (lowerQ.includes('joc') || lowerQ.includes('racing') || lowerQ.includes('race') || lowerQ.includes('style')) {
      const gameStyles: GameStyle[] = ['short', 'medium', 'long', 'faller', 'none'];
      for (const style of gameStyles) {
        const label = GAME_STYLE_LABELS[style].toLowerCase();
        if (lowerQ.includes(label) || lowerQ.includes(style)) {
          const isMaleQuery = lowerQ.includes('mascul') || lowerQ.includes('male');
          const isFemaleQuery = lowerQ.includes('femel') || lowerQ.includes('female');
          let query = supabase.from('pigeons').select('*').eq('game_style', style);
          if (isMaleQuery) query = query.eq('sex', 'Mascul');
          if (isFemaleQuery) query = query.eq('sex', 'Femelă');
          const { data: pigeons, count } = await query.order('created_at', { ascending: false });
          const styleLabel = GAME_STYLE_LABELS[style];
          if (count && count > 0) {
            if (msgLang === 'en') {
              const sexFilter = isMaleQuery ? 'males' : isFemaleQuery ? 'females' : 'pigeons';
              const list = (pigeons as any[]).map((p) => `${p.ring_series}${p.color ? ' (' + p.color + ')' : ''}${p.sex ? ' ' + p.sex : ''}`).join(', ');
              return `You have ${count} ${sexFilter} with ${styleLabel} in the registry: ${list}.`;
            } else {
              const sexFilter = isMaleQuery ? 'masculi' : isFemaleQuery ? 'femele' : 'porumbei';
              const list = (pigeons as any[]).map((p) => `${p.ring_series}${p.color ? ' (' + p.color + ')' : ''}${p.sex ? ' ' + p.sex : ''}`).join(', ');
              return `Ai ${count} ${sexFilter} cu ${styleLabel} în registru: ${list}.`;
            }
          }
          if (msgLang === 'en') {
            const emptySex = isMaleQuery ? 'males' : isFemaleQuery ? 'females' : 'pigeons';
            return `You have no ${emptySex} with ${styleLabel} in the registry.`;
          } else {
            const emptySex = isMaleQuery ? 'masculi' : isFemaleQuery ? 'femele' : 'porumbei';
            return `Nu ai ${emptySex} cu ${styleLabel} în registru.`;
          }
        }
      }

      if (lowerQ.includes('câți') || lowerQ.includes('cati') || lowerQ.includes('total') || lowerQ.includes('liste') || lowerQ.includes('lista') || lowerQ.includes('genereaz') || lowerQ.includes('how many') || lowerQ.includes('list') || lowerQ.includes('generate') || lowerQ.includes('statistics') || lowerQ.includes('stats')) {
        const { data: allPigeons } = await supabase
          .from('pigeons')
          .select('ring_series, sex, color, game_style')
          .not('game_style', 'is', null);
        if (allPigeons && allPigeons.length > 0) {
          const grouped: Record<string, any[]> = {};
          for (const p of allPigeons as any[]) {
            const key = p.game_style;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(p);
          }
          let result = msgLang === 'en' ? 'Here is the breakdown by flying style:\n\n' : 'Iată situația pe stiluri de joc:\n\n';
          for (const style of gameStyles) {
            const items = grouped[style];
            if (items && items.length > 0) {
              result += `${GAME_STYLE_LABELS[style]} (${items.length}): ${items.map(p => `${p.ring_series}${p.sex === 'Mascul' ? ' ♂' : ' ♀'}`).join(', ')}\n`;
            }
          }
          return result.trim();
        }
        return msgLang === 'en'
          ? `You have no pigeons with a flying style registered. Fill in the "Flying Style" field in the Registry to generate statistics.`
          : `Nu ai niciun porumbel cu stil de joc înregistrat. Completează câmpul "Caracteristici Joc" în Registru pentru a putea genera statistici.`;
      }
    }

    if (lowerQ.includes('tricomone') || lowerQ.includes('tratament') || lowerQ.includes('trichomon') || lowerQ.includes('treatment')) {
      const { data: treatments } = await supabase
        .from('treatments')
        .select('*')
        .ilike('disease', '%tricom%')
        .order('admin_date', { ascending: false })
        .limit(1);
      if (treatments && treatments.length > 0) {
        const t = treatments[0] as any;
        return msgLang === 'en'
          ? `The last treatment for trichomoniasis was administered on ${t.admin_date} to pigeon ${t.pigeon_ring}. Treatment: ${t.treatment || 'undocumented'}. Booster: ${t.booster_date || 'unspecified'}.`
          : `Ultimul tratament pentru tricomoneză a fost administrat pe ${t.admin_date} porumbelului ${t.pigeon_ring}. Tratament: ${t.treatment || 'nedocumentat'}. Rapel: ${t.booster_date || 'nespecificat'}.`;
      }
      return msgLang === 'en'
        ? `I could not find any trichomoniasis treatment registered in your records.`
        : `Nu am găsit niciun tratament pentru tricomoneză înregistrat în evidența ta.`;
    }

    if (lowerQ.includes('vaccin') || lowerQ.includes('rapel') || lowerQ.includes('vaccine') || lowerQ.includes('booster')) {
      const today = new Date();
      const weekLater = new Date(today);
      weekLater.setDate(weekLater.getDate() + 7);
      const { data: upcoming } = await supabase
        .from('treatments')
        .select('*')
        .gte('booster_date', today.toISOString().split('T')[0])
        .lte('booster_date', weekLater.toISOString().split('T')[0]);
      if (upcoming && upcoming.length > 0) {
        return msgLang === 'en'
          ? `In the next 7 days you have ${upcoming.length} booster(s) scheduled: ${upcoming.map((t: any) => `${t.disease} for ${t.pigeon_ring} on ${t.booster_date}`).join(', ')}.`
          : `În următoarele 7 zile ai ${upcoming.length} rapel(uri) programate: ${upcoming.map((t: any) => `${t.disease} pentru ${t.pigeon_ring} pe ${t.booster_date}`).join(', ')}.`;
      }
      return msgLang === 'en'
        ? `You have no boosters scheduled in the next 7 days.`
        : `Nu ai rapeluri programate în următoarele 7 zile.`;
    }

    if (lowerQ.includes('cuib') || lowerQ.includes('pui') || lowerQ.includes('ecloz') || lowerQ.includes('nest') || lowerQ.includes('chick') || lowerQ.includes('hatching')) {
      const { data: nests } = await supabase
        .from('nests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (nests && nests.length > 0) {
        return msgLang === 'en'
          ? `You have ${nests.length} nests registered. Most recent: ${nests.map((n: any) => `${n.nest_id} (${n.male_ring} x ${n.female_ring}), ${n.chick_count} chicks, hatching: ${n.hatching_date || 'undefined'}`).join('; ')}.`
          : `Ai ${nests.length} cuiburi înregistrate. Cele mai recente: ${nests.map((n: any) => `${n.nest_id} (${n.male_ring} x ${n.female_ring}), ${n.chick_count} pui, ecloziune: ${n.hatching_date || 'nedefinită'}`).join('; ')}.`;
      }
      return msgLang === 'en'
        ? `You have no nests registered at the moment.`
        : `Nu ai cuiburi înregistrate momentan.`;
    }

    // For web-searchable topics, call the edge function with loft context
    if (isWebSearchQuery(question)) {
      const noDataRo = 'Nu am găsit date specifice pentru această întrebare în registrele utilizatorului.';
      const noDataEn = "I could not find specific data for this question in the user's records.";
      const cleanContext = (contextData && contextData !== noDataRo && contextData !== noDataEn) ? contextData : '';
      return await callWebSearch(question, msgLang, cleanContext);
    }

    // Genetics questions — answer from the genetics knowledge base
    const geneticsAnswer = findGeneticsAnswer(question, msgLang);
    if (geneticsAnswer) {
      return geneticsAnswer;
    }

    // Default response with context
    const noDataRo = 'Nu am găsit date specifice pentru această întrebare în registrele utilizatorului.';
    const noDataEn = "I could not find specific data for this question in the user's records.";
    if (contextData && contextData !== noDataRo && contextData !== noDataEn) {
      return msgLang === 'en'
        ? `According to your records: ${contextData}\n\nFor general pigeon questions, you can ask about: feeding, training, diseases, breeding, pairing, nests, vaccinations or treatments. I can also search the web for the latest information on diseases, treatments and regulations.`
        : `Conform datelor din registrele tale: ${contextData}\n\nPentru întrebări generale despre columbofilie, poți întreba despre: hrănire, antrenamente, boli, reproducere, împerechere, cuiburi, vaccinări sau tratamente. Pot căuta și pe web cele mai noi informații despre boli, tratamente și regulamente.`;
    }

    return msgLang === 'en'
      ? `I am the Pigeon AI Assistant. I can help with:\n\n• Questions about your records (how many pigeons, treatments, nests)\n• Statistics by flying style (how many long distance, dropper list, etc.)\n• Web search for latest info on diseases, treatments, feeding and regulations\n• Advice on pairing and genetics\n\nAsk me anything about pigeons!`
      : `Sunt Asistentul Columbofil AI. Te pot ajuta cu:\n\n• Întrebări despre registrele tale (câți porumbei ai, tratamente, cuiburi)\n• Statistici pe stiluri de joc (câți cu joc lung, listă căzători etc.)\n• Căutare web pentru cele mai noi informații despre boli, tratamente, hrănire și regulamente\n• Sfaturi despre împerechere și genetică\n\nÎntreabă-mă orice despre columbofilie!`;
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    // Save user message
    const { data: savedUserMsg } = await supabase
      .from('chat_messages')
      .insert({ role: 'user', content: userMessage })
      .select()
      .single();

    if (savedUserMsg) {
      setMessages((prev) => [...prev, savedUserMsg as ChatMsg]);
    }

    // Generate response
    const response = await generateResponse(userMessage);
    const wasWebSearch = response.includes('🌐') || response.includes('web') || response.includes('Web');

    // Save assistant message
    const { data: savedAssistantMsg } = await supabase
      .from('chat_messages')
      .insert({ role: 'assistant', content: response })
      .select()
      .single();

    if (savedAssistantMsg) {
      const msg = savedAssistantMsg as ChatMsg;
      if (wasWebSearch) msg.has_web_search = true;
      setMessages((prev) => [...prev, msg]);
    }

    setSending(false);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }: { item: ChatMsg }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : (item.has_web_search ? styles.webSearchBubble : styles.assistantBubble)]}>
          {!isUser && (
            <View style={styles.assistantIcon}>
              {item.has_web_search ? (
                <Globe color={Colors.white} size={14} />
              ) : (
                <MessageCircle color={Colors.white} size={14} />
              )}
            </View>
          )}
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScreenHeader
          title={t('assistantTitle')}
          subtitle={t('unlimited')}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t('assistantInputPlaceholder')}
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Send color={Colors.white} size={20} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 24 },
  chatList: {
    padding: 24,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 8,
  },
  userBubble: {
    backgroundColor: Colors.royalBlue,
  },
  assistantBubble: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  webSearchBubble: {
    backgroundColor: Colors.goldPale,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  assistantIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.royalBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  messageText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  userText: { color: Colors.white },
  assistantText: { color: Colors.text, flex: 1 },
  inputContainer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    backgroundColor: Colors.neutral50,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.royalBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.neutral300,
  },
});
