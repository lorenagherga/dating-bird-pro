import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Send, MessageCircle, ShieldAlert } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { Colors, BorderRadius } from '@/lib/theme';
import { fetchPublicProfiles, PublicProfile } from '@/lib/public-profiles';

const MAX_LENGTH = 500;

interface AuctionQuestion {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: PublicProfile | null;
}

interface AuctionQuestionsProps {
  auctionId: string;
  isEnded: boolean;
}

const BLOCKED_MESSAGE = 'Mesajul conține date de contact sau linkuri externe. Acestea nu sunt permise până la încheierea licitației.';

export function AuctionQuestions({ auctionId, isEnded }: AuctionQuestionsProps) {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<AuctionQuestion[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  const loadQuestions = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('auction_questions')
      .select('id, author_id, body, created_at')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: true });
    if (loadError) {
      console.error('auction_questions load failed', loadError);
      setError('Întrebările nu pot fi încărcate acum.');
      return;
    }
    const rows = (data || []) as { id: string; author_id: string; body: string; created_at: string }[];
    const people = await fetchPublicProfiles(rows.map((row) => row.author_id));
    setQuestions(rows.map((row) => ({ ...row, author: people.get(row.author_id) ?? null })));
  }, [auctionId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !profile?.id) return;
    setSending(true);
    setError(null);
    setBlocked(false);
    const { error: insertError } = await supabase
      .from('auction_questions')
      .insert({ auction_id: auctionId, author_id: profile.id, body });
    setSending(false);
    if (insertError) {
      console.error('auction_questions insert failed', insertError);
      if (insertError.message.includes('contact_details_blocked')) {
        setBlocked(true);
      } else {
        setError('Întrebarea nu a putut fi trimisă. Încearcă din nou.');
      }
      return;
    }
    setDraft('');
    loadQuestions();
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MessageCircle color={Colors.royalBlue} size={18} />
        <Text style={styles.title}>Întrebări către vânzător</Text>
      </View>

      {questions === null && !error ? (
        <ActivityIndicator color={Colors.royalBlue} />
      ) : questions && questions.length === 0 ? (
        <Text style={styles.emptyText}>Nu există întrebări încă.</Text>
      ) : (
        questions?.map((question) => (
          <View key={question.id} style={styles.item}>
            <Text style={styles.author}>{question.author?.breeder_name || '—'}</Text>
            <Text style={styles.body}>{question.body}</Text>
          </View>
        ))
      )}

      {blocked && (
        <View style={styles.blockedBanner} accessibilityRole="alert">
          <ShieldAlert color={Colors.warning} size={20} />
          <View style={styles.blockedTextWrap}>
            <Text style={styles.blockedTitle}>Mesaj blocat</Text>
            <Text style={styles.blockedBody}>{BLOCKED_MESSAGE}</Text>
          </View>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {!isEnded && (
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={(text) => {
              setDraft(text.slice(0, MAX_LENGTH));
              setBlocked(false);
            }}
            placeholder="Scrie o întrebare..."
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={MAX_LENGTH}
          />
          <View style={styles.composerFooter}>
            <Text style={styles.counter}>{draft.length}/{MAX_LENGTH}</Text>
            <TouchableOpacity
              style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!draft.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Send color={Colors.white} size={14} />
                  <Text style={styles.sendText}>Trimite</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
    marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight },
  item: { gap: 2, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  author: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.text },
  body: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 19, color: Colors.error },
  blockedBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.warning,
    backgroundColor: Colors.warningBg,
  },
  blockedTextWrap: { flex: 1, gap: 2 },
  blockedTitle: { fontFamily: 'Inter-Bold', fontSize: 14, color: Colors.text },
  blockedBody: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 19, color: Colors.text },
  composer: { gap: 8 },
  input: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    minHeight: 64,
    backgroundColor: Colors.neutral50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  composerFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textLight },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.royalBlue,
    borderRadius: BorderRadius.md, paddingVertical: 10, paddingHorizontal: 16,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.white },
});
