import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Phone, Handshake } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, BorderRadius } from '@/lib/theme';

interface HandoverContact {
  party: 'seller' | 'winner';
  full_name: string | null;
  phone: string | null;
}

interface AuctionHandoverCardProps {
  auctionId: string;
}

export function AuctionHandoverCard({ auctionId }: AuctionHandoverCardProps) {
  const [contacts, setContacts] = useState<HandoverContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: rpcError } = await supabase.rpc('get_auction_contacts', { p_auction_id: auctionId });
      if (cancelled) return;
      if (rpcError) {
        console.error('get_auction_contacts failed', rpcError);
        setError('Datele de contact nu pot fi afișate acum. Încearcă din nou mai târziu.');
        return;
      }
      setContacts((Array.isArray(data) ? data : []) as HandoverContact[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [auctionId]);

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  if (!contacts) {
    return <ActivityIndicator color={Colors.royalBlue} style={{ marginVertical: 16 }} />;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Handshake color={Colors.royalBlue} size={20} />
        <Text style={styles.title}>Predarea porumbelului</Text>
      </View>
      <Text style={styles.hint}>
        Licitația s-a încheiat. Folosiți datele de mai jos pentru a finaliza predarea.
      </Text>
      {contacts.map((contact) => (
        <View key={contact.party} style={styles.row}>
          <Text style={styles.party}>{contact.party === 'seller' ? 'Vânzător' : 'Câștigător'}</Text>
          <Text style={styles.name}>{contact.full_name || '—'}</Text>
          <View style={styles.phoneRow}>
            <Phone color={Colors.textSecondary} size={14} />
            <Text style={styles.phone}>{contact.phone || '—'}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.royalBlue,
    gap: 12,
    marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  hint: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  row: { gap: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  party: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.textLight, textTransform: 'uppercase' },
  name: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phone: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error, marginBottom: 16 },
});
