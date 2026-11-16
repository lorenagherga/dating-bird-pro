import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Check, Gavel, Trash2, X as XIcon, Zap } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/lib/theme';

type ModerationAction = 'approve' | 'reject' | 'promote' | 'delete';

interface AdminAuctionRow {
  id: string;
  title: string;
  current_price: number;
  bid_count: number;
  end_time: string;
  status: 'active' | 'pending_review';
  is_promoted: boolean;
}

export function AdminAuctionModeration() {
  const [requireApproval, setRequireApproval] = useState(false);
  const [settingLoading, setSettingLoading] = useState(true);
  const [settingSaving, setSettingSaving] = useState(false);
  const [auctions, setAuctions] = useState<AdminAuctionRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSetting = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'auction_require_approval')
      .maybeSingle();
    if (loadError) {
      setError('Nu am putut încărca setarea de aprobare.');
    } else {
      setRequireApproval(data?.value === 1);
    }
    setSettingLoading(false);
  }, []);

  const loadAuctions = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('auctions')
      .select('id, title, current_price, bid_count, end_time, status, is_promoted')
      .in('status', ['active', 'pending_review'])
      .order('created_at', { ascending: false });
    if (loadError) {
      setError('Nu am putut încărca licitațiile.');
      setAuctions([]);
    } else {
      setAuctions((data ?? []) as AdminAuctionRow[]);
    }
    setListLoading(false);
  }, []);

  useEffect(() => {
    loadSetting();
    loadAuctions();
  }, [loadSetting, loadAuctions]);

  const toggleApproval = async (value: boolean) => {
    setSettingSaving(true);
    setError(null);
    const { error: saveError } = await supabase
      .from('platform_settings')
      .update({ value: value ? 1 : 0, updated_at: new Date().toISOString() })
      .eq('key', 'auction_require_approval');
    setSettingSaving(false);
    if (saveError) {
      setError('Nu am putut salva setarea. Încercați din nou.');
      return;
    }
    setRequireApproval(value);
  };

  const runAction = async (auction: AdminAuctionRow, action: ModerationAction) => {
    setBusyId(auction.id);
    setError(null);
    const { error: actionError } = await supabase.rpc('admin_moderate_auction', {
      p_auction_id: auction.id,
      p_action: action,
    });
    setBusyId(null);
    if (actionError) {
      setError('Acțiunea nu a reușit. Încercați din nou.');
      return;
    }
    loadAuctions();
  };

  const confirmDelete = (auction: AdminAuctionRow) => {
    Alert.alert('Ștergi licitația?', `"${auction.title}" va fi eliminată definitiv.`, [
      { text: 'Anulează', style: 'cancel' },
      { text: 'Șterge', style: 'destructive', onPress: () => runAction(auction, 'delete') },
    ]);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingText}>
            <Text style={styles.title}>Aprobare înainte de publicare</Text>
            <Text style={styles.hint}>
              Licitațiile noi rămân ascunse până când un admin le aprobă.
            </Text>
          </View>
          {settingLoading ? (
            <ActivityIndicator size="small" color={Colors.royalBlue} />
          ) : (
            <Switch
              value={requireApproval}
              onValueChange={toggleApproval}
              disabled={settingSaving}
              trackColor={{ false: Colors.borderLight, true: Colors.royalBlue }}
            />
          )}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Gavel color={Colors.gold} size={20} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Licitații</Text>
            <Text style={styles.hint}>Licitațiile active și cele care așteaptă aprobare.</Text>
          </View>
        </View>

        {listLoading ? (
          <ActivityIndicator size="small" color={Colors.royalBlue} style={styles.spinner} />
        ) : auctions.length === 0 ? (
          <Text style={styles.emptyText}>Nu există licitații active.</Text>
        ) : (
          <View style={styles.list}>
            {auctions.map((auction) => {
              const pending = auction.status === 'pending_review';
              const busy = busyId === auction.id;
              const ended = new Date(auction.end_time).getTime() <= Date.now();
              return (
                <View key={auction.id} style={styles.row}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.rowTitle} numberOfLines={2}>{auction.title}</Text>
                    <View style={[styles.statusBadge, pending ? styles.statusPending : styles.statusActive]}>
                      <Text style={[styles.statusText, pending ? styles.statusTextPending : styles.statusTextActive]}>
                        {pending ? 'Așteaptă aprobare' : ended ? 'Expirată' : 'Activă'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.rowMeta}>
                    {auction.current_price} lei · {auction.bid_count} {auction.bid_count === 1 ? 'ofertă' : 'oferte'}
                    {auction.is_promoted ? ' · Promovată' : ''}
                  </Text>

                  {busy ? (
                    <ActivityIndicator size="small" color={Colors.royalBlue} style={styles.spinner} />
                  ) : (
                    <View style={styles.actions}>
                      {pending && (
                        <ActionButton
                          label="Aprobă"
                          icon={Check}
                          tone="success"
                          onPress={() => runAction(auction, 'approve')}
                        />
                      )}
                      <ActionButton
                        label={pending ? 'Respinge' : 'Oprește'}
                        icon={XIcon}
                        tone="danger"
                        onPress={() => runAction(auction, 'reject')}
                      />
                      {!auction.is_promoted && (
                        <ActionButton
                          label="Promovează"
                          icon={Zap}
                          tone="gold"
                          onPress={() => runAction(auction, 'promote')}
                        />
                      )}
                      <ActionButton
                        label="Șterge"
                        icon={Trash2}
                        tone="neutral"
                        onPress={() => confirmDelete(auction)}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </View>
  );
}

type IconComponent = typeof Check;

const TONES = {
  success: { bg: Colors.successBg, fg: Colors.success },
  danger: { bg: Colors.errorBg, fg: Colors.error },
  gold: { bg: Colors.goldPale, fg: Colors.goldDark },
  neutral: { bg: Colors.neutral100, fg: Colors.textSecondary },
} as const;

function ActionButton({
  label,
  icon: Icon,
  tone,
  onPress,
}: {
  label: string;
  icon: IconComponent;
  tone: keyof typeof TONES;
  onPress: () => void;
}) {
  const colors = TONES[tone];
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: colors.bg }]}
      onPress={onPress}
      accessibilityRole="button"
      activeOpacity={0.8}
    >
      <Icon color={colors.fg} size={14} />
      <Text style={[styles.actionText, { color: colors.fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 16 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    gap: 16,
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingText: { flex: 1, gap: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.goldPale,
    justifyContent: 'center', alignItems: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  hint: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  spinner: { marginVertical: 8 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.error },
  list: { gap: 12 },
  row: {
    gap: 10, padding: 14, borderRadius: 12,
    backgroundColor: Colors.neutral50, borderWidth: 1, borderColor: Colors.borderLight,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { flex: 1, minWidth: 0, fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  rowMeta: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusActive: { backgroundColor: Colors.successBg },
  statusPending: { backgroundColor: Colors.warningBg },
  statusText: { fontFamily: 'Inter-SemiBold', fontSize: 11 },
  statusTextActive: { color: Colors.success },
  statusTextPending: { color: Colors.warning },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  actionText: { fontFamily: 'Inter-SemiBold', fontSize: 13 },
});
