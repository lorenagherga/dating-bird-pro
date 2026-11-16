import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Ban, Bell, Check, Crown, Search, Trash2, Users, Wallet, UserPlus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import {
  fetchCommissionRates,
  normalizeCommissionRole,
  setUserCommissionRole,
  type CommissionRates,
} from '@/lib/commission';
import { adminAdjustCommissionWallet, formatLei } from '@/lib/commission-wallet';
import type { CommissionRole } from '@/lib/types';

interface UserRow {
  u_id: string;
  u_breeder_name: string;
  u_email: string;
  u_created_at: string;
  u_subscription_plan: string;
  u_pro_expires_at: string | null;
  u_commission_role: string;
  u_is_suspended: boolean;
}

interface SignupAlert {
  id: string;
}

interface BalanceRow {
  user_id: string;
  balance: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(dateStr: string, lang: string): string {
  return new Date(dateStr).toLocaleDateString(lang === 'ro' ? 'ro-RO' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isProActive(user: UserRow, now: number): boolean {
  if (user.u_subscription_plan !== 'pro') return false;
  return !user.u_pro_expires_at || new Date(user.u_pro_expires_at).getTime() > now;
}

export function AdminUsersCenter() {
  const { language } = useLanguage();
  const isRo = language === 'ro';
  const [users, setUsers] = useState<UserRow[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [alerts, setAlerts] = useState<SignupAlert[]>([]);
  const [rates, setRates] = useState<CommissionRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [balanceDraft, setBalanceDraft] = useState('');
  const [rowMessage, setRowMessage] = useState<{ userId: string; text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [usersRes, balancesRes, alertsRes, ratesRes] = await Promise.all([
      supabase.rpc('admin_list_users'),
      supabase.rpc('admin_user_wallet_balances'),
      supabase.from('signup_notifications').select('id').eq('is_read', false),
      fetchCommissionRates().catch(() => null),
    ]);

    if (usersRes.error || balancesRes.error || alertsRes.error) {
      setError(isRo ? 'Nu am putut încărca utilizatorii. Încearcă din nou.' : 'Could not load users. Please try again.');
      setLoading(false);
      return;
    }

    const balanceMap: Record<string, number> = {};
    for (const row of (balancesRes.data ?? []) as BalanceRow[]) {
      balanceMap[row.user_id] = Number(row.balance);
    }
    setUsers((usersRes.data ?? []) as UserRow[]);
    setBalances(balanceMap);
    setAlerts((alertsRes.data ?? []) as SignupAlert[]);
    setRates(ratesRes);
    setLoading(false);
  }, [isRo]);

  useEffect(() => {
    load();
  }, [load]);

  const now = Date.now();

  const stats = useMemo(() => {
    const weekAgo = now - 7 * DAY_MS;
    return {
      total: users.length,
      recentSignups: users.filter((u) => new Date(u.u_created_at).getTime() >= weekAgo).length,
      activePro: users.filter((u) => isProActive(u, now)).length,
      walletTotal: Object.values(balances).reduce((sum, v) => sum + v, 0),
    };
  }, [users, balances, now]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.u_email?.toLowerCase().includes(q) || u.u_breeder_name?.toLowerCase().includes(q),
    );
  }, [users, query]);

  const showRowMessage = (userId: string, text: string, ok: boolean) => setRowMessage({ userId, text, ok });

  const runAction = async (userId: string, action: () => Promise<void>, successText: string) => {
    setBusyId(userId);
    setRowMessage(null);
    try {
      await action();
      showRowMessage(userId, successText, true);
      await load();
    } catch {
      showRowMessage(userId, isRo ? 'Operațiunea a eșuat. Încearcă din nou.' : 'Action failed. Please try again.', false);
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = (userId: string, role: CommissionRole) =>
    runAction(userId, () => setUserCommissionRole(userId, role), isRo ? 'Rol actualizat.' : 'Role updated.');

  const grantPro = (userId: string) =>
    runAction(
      userId,
      async () => {
        const { data, error: rpcError } = await supabase.rpc('admin_grant_pro_year', { p_user_id: userId });
        if (rpcError || !data) throw new Error('grant failed');
      },
      isRo ? 'Pro activat pentru un an.' : 'Pro granted for one year.',
    );

  const revokePro = (userId: string) =>
    runAction(
      userId,
      async () => {
        const { error: rpcError } = await supabase.rpc('admin_revoke_pro', { p_user_id: userId });
        if (rpcError) throw new Error('revoke failed');
      },
      isRo ? 'Abonamentul Pro a fost dezactivat.' : 'Pro subscription disabled.',
    );

  const toggleSuspended = (user: UserRow) => {
    const suspend = !user.u_is_suspended;
    runAction(
      user.u_id,
      async () => {
        const { error: rpcError } = await supabase.rpc('admin_set_user_suspended', {
          p_user_id: user.u_id,
          p_suspended: suspend,
        });
        if (rpcError) throw new Error('suspend failed');
      },
      suspend ? (isRo ? 'Cont suspendat.' : 'Account suspended.') : (isRo ? 'Cont reactivat.' : 'Account reactivated.'),
    );
  };

  const saveBalance = (user: UserRow) => {
    const target = Number(balanceDraft.replace(',', '.'));
    if (!Number.isFinite(target)) {
      showRowMessage(user.u_id, isRo ? 'Introdu o sumă validă.' : 'Enter a valid amount.', false);
      return;
    }
    const current = balances[user.u_id] ?? 0;
    const delta = Math.round((target - current) * 100) / 100;
    if (delta === 0) {
      setEditingBalanceId(null);
      return;
    }
    runAction(
      user.u_id,
      async () => {
        await adminAdjustCommissionWallet(user.u_id, delta, isRo ? 'Ajustare manuală admin' : 'Manual admin adjustment');
        setEditingBalanceId(null);
      },
      isRo ? 'Soldul a fost actualizat.' : 'Balance updated.',
    );
  };

  const confirmDelete = (user: UserRow) => {
    Alert.alert(
      isRo ? 'Ștergi contul?' : 'Delete account?',
      isRo
        ? `Contul ${user.u_email} și toate datele asociate vor fi șterse definitiv. Acțiunea nu poate fi anulată.`
        : `The account ${user.u_email} and all its data will be permanently deleted. This cannot be undone.`,
      [
        { text: isRo ? 'Renunță' : 'Cancel', style: 'cancel' },
        {
          text: isRo ? 'Șterge definitiv' : 'Delete permanently',
          style: 'destructive',
          onPress: () =>
            runAction(
              user.u_id,
              async () => {
                const { error: rpcError } = await supabase.rpc('admin_delete_user', { p_user_id: user.u_id });
                if (rpcError) throw new Error('delete failed');
              },
              isRo ? 'Contul a fost șters.' : 'Account deleted.',
            ),
        },
      ],
    );
  };

  const roleOptions = (): { role: CommissionRole; label: string }[] => [
    { role: 'standard', label: `Standard (${rates?.standard ?? 5}%)` },
    { role: 'partner', label: `${isRo ? 'Partener' : 'Partner'} (${rates?.partner ?? 2}%)` },
    { role: 'ambassador', label: `${isRo ? 'Ambasador' : 'Ambassador'} (0%)` },
  ];

  const markAlertsRead = async () => {
    const { error: updateError } = await supabase
      .from('signup_notifications')
      .update({ is_read: true })
      .eq('is_read', false);
    if (updateError) {
      setError(isRo ? 'Nu am putut marca alertele ca văzute.' : 'Could not mark alerts as read.');
      return;
    }
    load();
  };

  const statCards = [
    { icon: Users, label: isRo ? 'Total utilizatori' : 'Total users', value: String(stats.total) },
    { icon: UserPlus, label: isRo ? 'Înscrieri ultimele 7 zile' : 'Signups, last 7 days', value: String(stats.recentSignups) },
    { icon: Crown, label: isRo ? 'Abonați Pro activi' : 'Active Pro members', value: String(stats.activePro) },
    { icon: Wallet, label: isRo ? 'Fonduri în portofele' : 'Funds in wallets', value: formatLei(stats.walletTotal) },
  ];

  return (
    <View style={styles.section}>
      {alerts.length > 0 && (
        <View style={styles.alertBox}>
          <Bell color={Colors.royalBlue} size={18} />
          <Text style={styles.alertText}>
            {isRo
              ? `${alerts.length} ${alerts.length === 1 ? 'cont nou' : 'conturi noi'} de la ultima verificare`
              : `${alerts.length} new ${alerts.length === 1 ? 'account' : 'accounts'} since last check`}
          </Text>
          <TouchableOpacity style={styles.alertBtn} onPress={markAlertsRead} activeOpacity={0.8}>
            <Check color={Colors.success} size={14} />
            <Text style={styles.alertBtnText}>{isRo ? 'Marchează' : 'Mark seen'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsGrid}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <View key={card.label} style={styles.statCard}>
              <Icon color={Colors.royalBlue} size={18} />
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.searchBox}>
        <Search color={Colors.textLight} size={18} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={isRo ? 'Caută după nume sau email' : 'Search by name or email'}
          placeholderTextColor={Colors.textLight}
          autoCapitalize="none"
        />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="small" color={Colors.royalBlue} style={{ marginTop: 16 }} />
      ) : filteredUsers.length === 0 ? (
        <Text style={styles.empty}>
          {users.length === 0
            ? isRo ? 'Nu există conturi înregistrate încă.' : 'No accounts registered yet.'
            : isRo ? 'Niciun utilizator nu corespunde căutării.' : 'No users match your search.'}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {filteredUsers.map((user) => {
            const isNew = now - new Date(user.u_created_at).getTime() < 2 * DAY_MS;
            const isBusy = busyId === user.u_id;
            const proActive = isProActive(user, now);
            const message = rowMessage?.userId === user.u_id ? rowMessage : null;
            const currentRole = normalizeCommissionRole(user.u_commission_role);
            return (
              <View key={user.u_id} style={styles.row}>
                <View style={styles.rowHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameLine}>
                      <Text style={styles.name} numberOfLines={1}>{user.u_breeder_name || user.u_email}</Text>
                      {user.u_is_suspended && (
                        <View style={styles.suspendedBadge}>
                          <Text style={styles.suspendedBadgeText}>{isRo ? 'SUSPENDAT' : 'SUSPENDED'}</Text>
                        </View>
                      )}
                      {isNew && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>NOU</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.email} numberOfLines={1}>{user.u_email}</Text>
                    <Text style={styles.meta}>
                      {(isRo ? 'Înscris: ' : 'Joined: ') + formatDate(user.u_created_at, language)}
                    </Text>
                  </View>
                  <View style={styles.balancePill}>
                    <Wallet color={Colors.royalBlue} size={14} />
                    <Text style={styles.balanceText}>{formatLei(balances[user.u_id] ?? 0)}</Text>
                  </View>
                </View>

                <View style={styles.chipRow}>
                  {roleOptions().map((option) => {
                    const active = currentRole === option.role;
                    return (
                      <TouchableOpacity
                        key={option.role}
                        style={[styles.chip, active && styles.chipActive, isBusy && styles.disabled]}
                        onPress={() => changeRole(user.u_id, option.role)}
                        disabled={isBusy || active}
                        accessibilityRole="button"
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, isBusy && styles.disabled]}
                    onPress={() => (proActive ? revokePro(user.u_id) : grantPro(user.u_id))}
                    disabled={isBusy}
                    accessibilityRole="button"
                    activeOpacity={0.8}
                  >
                    <Crown color={proActive ? Colors.warning : Colors.royalBlue} size={14} />
                    <Text style={styles.actionText}>
                      {proActive ? (isRo ? 'Dezactivează Pro' : 'Disable Pro') : (isRo ? 'Activează Pro' : 'Enable Pro')}
                    </Text>
                  </TouchableOpacity>

                  {editingBalanceId === user.u_id ? (
                    <View style={styles.balanceEditor}>
                      <TextInput
                        style={styles.balanceInput}
                        value={balanceDraft}
                        onChangeText={setBalanceDraft}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={Colors.textLight}
                      />
                      <TouchableOpacity style={styles.actionBtn} onPress={() => saveBalance(user)} disabled={isBusy}>
                        <Check color={Colors.success} size={14} />
                        <Text style={styles.actionText}>{isRo ? 'Salvează' : 'Save'}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, isBusy && styles.disabled]}
                      onPress={() => {
                        setEditingBalanceId(user.u_id);
                        setBalanceDraft(String(balances[user.u_id] ?? 0));
                      }}
                      disabled={isBusy}
                      accessibilityRole="button"
                      activeOpacity={0.8}
                    >
                      <Wallet color={Colors.royalBlue} size={14} />
                      <Text style={styles.actionText}>{isRo ? 'Editează sold' : 'Edit balance'}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtn, isBusy && styles.disabled]}
                    onPress={() => toggleSuspended(user)}
                    disabled={isBusy}
                    accessibilityRole="button"
                    activeOpacity={0.8}
                  >
                    <Ban color={user.u_is_suspended ? Colors.success : Colors.warning} size={14} />
                    <Text style={styles.actionText}>
                      {user.u_is_suspended ? (isRo ? 'Reactivează contul' : 'Reactivate account') : (isRo ? 'Suspendă contul' : 'Suspend account')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn, isBusy && styles.disabled]}
                    onPress={() => confirmDelete(user)}
                    disabled={isBusy}
                    accessibilityRole="button"
                    activeOpacity={0.8}
                  >
                    <Trash2 color={Colors.error} size={14} />
                    <Text style={[styles.actionText, { color: Colors.error }]}>{isRo ? 'Șterge' : 'Delete'}</Text>
                  </TouchableOpacity>
                </View>

                {isBusy && <ActivityIndicator size="small" color={Colors.royalBlue} />}
                {message && (
                  <Text style={message.ok ? styles.success : styles.error}>{message.text}</Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 16 },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: Colors.royalBluePale,
    borderRadius: 12,
    padding: 12,
  },
  alertText: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  alertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.successBg,
  },
  alertBtnText: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.success },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 6,
  },
  statValue: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.text },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchInput: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.text, paddingVertical: 8 },
  errorBox: { backgroundColor: Colors.errorBg, borderRadius: 10, padding: 12 },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error },
  empty: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 20,
  },
  row: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 10,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.text },
  newBadge: {
    backgroundColor: Colors.gold,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.text },
  suspendedBadge: {
    backgroundColor: Colors.errorBg,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  suspendedBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.error },
  email: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  meta: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textLight },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.royalBluePale,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  balanceText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
  },
  chipActive: { borderColor: Colors.royalBlue, backgroundColor: Colors.royalBluePale },
  chipText: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.textSecondary },
  chipTextActive: { fontFamily: 'Inter-Bold', color: Colors.royalBlue },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.neutral50,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  deleteBtn: { borderColor: Colors.error, backgroundColor: Colors.errorBg },
  actionText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.royalBlue },
  balanceEditor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceInput: {
    minWidth: 100,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.royalBlue,
    paddingHorizontal: 10,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: Colors.text,
  },
  disabled: { opacity: 0.5 },
  success: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.success },
  error: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.error },
});
