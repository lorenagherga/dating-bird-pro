import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Megaphone } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/lib/theme';

export function AnnouncementBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      supabase.from('platform_settings').select('value').eq('key', 'announcement_active').maybeSingle(),
      supabase.from('platform_text_settings').select('value').eq('key', 'announcement_message').maybeSingle(),
    ]).then(([flagRes, textRes]) => {
      if (!mounted || flagRes.error || textRes.error) return;
      const text = textRes.data?.value?.trim() ?? '';
      setMessage(flagRes.data?.value === 1 && text ? text : null);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!message) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Megaphone color={Colors.goldDark} size={18} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.goldPale,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gold,
    padding: 14,
    marginBottom: 16,
  },
  text: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text, lineHeight: 20 },
});
