import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { Colors } from '@/lib/theme';
import { PLAN_LABELS, PLAN_LIMITS, PLAN_PRICES, SubscriptionPlan } from '@/lib/types';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Crown, Check, LogOut, Shield, Star, Trash2, UserPlus, X, Bell, Unlock, Eye, MessageSquarePlus, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/language-context';
import { LANGUAGE_LIST, Language } from '@/lib/i18n';

const PLAN_ORDER: SubscriptionPlan[] = ['free', 'hobby', 'standard', 'professional'];

interface VipEntry {
  id: string;
  email: string;
  plan: SubscriptionPlan;
  reason: string;
  created_at: string;
}

interface AdminNotification {
  id: string;
  email: string;
  device_id: string;
  device_name: string;
  attempt_at: string;
  is_read: boolean;
}

export default function ProfileScreen() {
  const { profile, signOut, isAdmin, isVip, vipPlan, effectivePlan, updatePlan } = useAuth();
  const [pigeonCount, setPigeonCount] = useState(0);
  const [upgrading, setUpgrading] = useState(false);
  const [vipList, setVipList] = useState<VipEntry[]>([]);
  const [vipLoading, setVipLoading] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [newVipEmail, setNewVipEmail] = useState('');
  const [newVipPlan, setNewVipPlan] = useState<SubscriptionPlan>('professional');
  const [newVipReason, setNewVipReason] = useState('');
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [languageLocked, setLanguageLocked] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportType, setSupportType] = useState<'bug' | 'suggestion'>('bug');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSending, setSupportSending] = useState(false);

  const { t, language, setLanguage } = useLanguage();
  const plan = profile?.subscription_plan || 'free';
  const limits = PLAN_LIMITS[effectivePlan];

  const PLAN_DESCRIPTIONS: Record<SubscriptionPlan, string[]> = {
    free: [t('pdFree1'), t('pdFree2'), t('pdFree3')],
    hobby: [t('pdHobby1'), t('pdHobby2'), t('pdHobby3')],
    standard: [t('pdStandard1'), t('pdStandard2'), t('pdStandard3'), t('pdStandard4')],
    professional: [
      t('pdPro1'),
      t('pdPro2'),
      t('pdPro3'),
      t('pdPro4'),
      t('pdPro5'),
      t('pdPro6'),
    ],
  };

  const loadData = useCallback(async () => {
    const { count } = await supabase
      .from('pigeons')
      .select('*', { count: 'exact', head: true });
    setPigeonCount(count || 0);
  }, []);

  const loadVipList = useCallback(async () => {
    setVipLoading(true);
    const { data } = await supabase
      .from('vip_list')
      .select('*')
      .order('created_at', { ascending: false });
    setVipList((data || []) as VipEntry[]);
    setVipLoading(false);
  }, []);

  const loadAdminNotifications = useCallback(async () => {
    setNotifLoading(true);
    const { data } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('attempt_at', { ascending: false })
      .limit(50);
    const notifs = (data || []) as AdminNotification[];
    setAdminNotifications(notifs);
    setUnreadCount(notifs.filter(n => !n.is_read).length);
    setNotifLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    if (isAdmin) {
      loadVipList();
      loadAdminNotifications();
    }
    if (profile?.email) {
      supabase
        .from('locked_languages')
        .select('language')
        .eq('email', profile.email.toLowerCase())
        .maybeSingle()
        .then(({ data }) => {
          if (data?.language) setLanguageLocked(true);
        });
    }
  }, [loadData, isAdmin, loadVipList, loadAdminNotifications, profile?.email]);

  const handleUpgrade = async (newPlan: SubscriptionPlan) => {
    if (newPlan === plan) return;
    Alert.alert(
      t('confirmPlan'),
      `${t('confirmPlanMsg')} ${PLAN_LABELS[newPlan]} (${PLAN_PRICES[newPlan]})?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          onPress: async () => {
            setUpgrading(true);
            await updatePlan(newPlan);
            setUpgrading(false);
            Alert.alert(t('success'), `${t('planUpdated')} ${PLAN_LABELS[newPlan]}.`);
          },
        },
      ]
    );
  };

  const handleSendSupport = async () => {
    if (!supportMessage.trim()) {
      Alert.alert(t('error'), t('supportMessageRequired'));
      return;
    }
    setSupportSending(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_email: profile?.email || '',
      user_id: profile?.id || '',
      type: supportType,
      message: supportMessage.trim(),
    });
    setSupportSending(false);
    if (error) {
      Alert.alert(t('error'), error.message);
      return;
    }
    setShowSupportModal(false);
    setSupportMessage('');
    setSupportType('bug');
    Alert.alert(t('supportSent'), t('supportSentMsg'));
  };

  const handleSignOut = () => {
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOutConfirmBtn'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleAddVip = async () => {
    if (!newVipEmail.trim()) {
      Alert.alert(t('error'), t('enterEmail'));
      return;
    }
    const { error } = await supabase
      .from('vip_list')
      .insert({
        email: newVipEmail.trim().toLowerCase(),
        plan: newVipPlan,
        reason: newVipReason.trim(),
      });
    if (error) {
      Alert.alert(t('error'), error.message.includes('duplicate') ? t('vipDuplicate') : error.message);
      return;
    }
    setShowVipModal(false);
    setNewVipEmail('');
    setNewVipReason('');
    setNewVipPlan('professional');
    loadVipList();
    Alert.alert(t('success'), `${newVipEmail.trim()} ${t('vipAdded')} ${PLAN_LABELS[newVipPlan]}.`);
  };

  const handleRemoveVip = (entry: VipEntry) => {
    Alert.alert(
      t('deleteVip'),
      `${t('deleteVipConfirm')} ${entry.email}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await supabase.from('vip_list').delete().eq('id', entry.id);
            loadVipList();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('profileTitle')} subtitle={profile?.breeder_name || ''} />

        <View style={styles.profileCard}>
          <View style={styles.profileIcon}>
            <Crown color={Colors.royalBlue} size={28} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.breeder_name}</Text>
            <Text style={styles.profileEmail}>{profile?.email}</Text>
          </View>
        </View>

        {isAdmin && (
          <View style={styles.adminBadge}>
            <Shield color={Colors.royalBlue} size={16} />
            <Text style={styles.adminText}>{t('adminAccount')}</Text>
          </View>
        )}

        {isVip && !isAdmin && (
          <View style={styles.vipBadge}>
            <Star color={Colors.white} size={16} />
            <Text style={styles.vipText}>{t('vipMember')} {PLAN_LABELS[vipPlan || 'professional']}</Text>
          </View>
        )}

        <View style={styles.usageCard}>
          <Text style={styles.usageTitle}>{t('currentUsage')}</Text>
          <View style={styles.usageRow}>
            <View style={styles.usageItem}>
              <Text style={styles.usageValue}>{pigeonCount} / {limits.pigeonLimit === 999999 ? '∞' : limits.pigeonLimit}</Text>
              <Text style={styles.usageLabel}>{t('pigeonsLabel')}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {t('yourPlan')} {PLAN_LABELS[effectivePlan]}
          {isVip && plan !== effectivePlan && (
            <Text style={styles.vipNote}> {t('vipNote')}</Text>
          )}
        </Text>

        <View style={styles.plansList}>
          {PLAN_ORDER.filter(p => p !== 'free').map((p) => {
            const isCurrent = effectivePlan === p;
            const isLower = PLAN_ORDER.indexOf(p) < PLAN_ORDER.indexOf(effectivePlan);
            return (
              <View
                key={p}
                style={[
                  styles.planCard,
                  isCurrent && styles.planCardCurrent,
                  p === 'professional' && styles.planCardPro,
                ]}
              >
                <View style={styles.planHeader}>
                  <View>
                    <Text style={styles.planName}>{PLAN_LABELS[p]}</Text>
                    <Text style={styles.planPrice}>{PLAN_PRICES[p]}</Text>
                  </View>
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>{t('current')}</Text>
                    </View>
                  )}
                  {p === 'professional' && !isCurrent && (
                    <View style={styles.proBadge}>
                      <Crown color={Colors.white} size={14} />
                    </View>
                  )}
                </View>

                <View style={styles.planFeatures}>
                  {PLAN_DESCRIPTIONS[p].map((feat, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Check color={Colors.royalBlue} size={16} />
                      <Text style={styles.featureText}>{feat}</Text>
                    </View>
                  ))}
                </View>

                {!isCurrent && !isLower && (
                  <TouchableOpacity
                    style={[styles.upgradeButton, upgrading && styles.upgradeButtonDisabled]}
                    onPress={() => handleUpgrade(p)}
                    disabled={upgrading}
                  >
                    {upgrading ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <Text style={styles.upgradeButtonText}>
                        {p === 'professional' ? t('unlockAll') : t('switchPlan')}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                {isLower && (
                  <View style={styles.downgradeNote}>
                    <Text style={styles.downgradeText}>{t('lowerPlan')}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {isAdmin && (
          <View style={styles.notifSection}>
            <View style={styles.notifSectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifSectionTitle}>{t('securityAlerts')}</Text>
                <Text style={styles.notifSectionSubtitle}>
                  {t('securityAlertsSub')}
                  {unreadCount > 0 && <Text style={styles.unreadBadge}> · {unreadCount} {t('newAlerts')}</Text>}
                </Text>
              </View>
              <View style={styles.notifIconBox}>
                <Bell color={unreadCount > 0 ? Colors.error : Colors.textSecondary} size={22} />
              </View>
            </View>

            {notifLoading ? (
              <ActivityIndicator color={Colors.royalBlue} size="small" style={{ marginVertical: 20 }} />
            ) : adminNotifications.length === 0 ? (
              <Text style={styles.notifEmptyText}>{t('noBlockedAttempts')}</Text>
            ) : (
              <View style={styles.notifListContainer}>
                {adminNotifications.map((notif) => (
                  <View key={notif.id} style={[styles.notifCard, !notif.is_read && styles.notifCardUnread]}>
                    <View style={styles.notifCardInfo}>
                      <Text style={styles.notifCardEmail}>{notif.email}</Text>
                      <Text style={styles.notifCardDetail}>
                        {t('device')} {notif.device_name || t('unknownDevice')}
                      </Text>
                      <Text style={styles.notifCardDate}>
                        {new Date(notif.attempt_at).toLocaleString('ro-RO')}
                      </Text>
                    </View>
                    <View style={styles.notifCardActions}>
                      {!notif.is_read && (
                        <TouchableOpacity
                          style={styles.notifMarkBtn}
                          onPress={async () => {
                            await supabase.from('admin_notifications').update({ is_read: true }).eq('id', notif.id);
                            loadAdminNotifications();
                          }}
                        >
                          <Eye color={Colors.royalBlue} size={18} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.notifUnlockBtn}
                        onPress={() => {
                          Alert.alert(
                            t('unlockDevice'),
                            `${notif.email} ${t('unlockDeviceMsg')}`,
                            [
                              { text: t('cancel'), style: 'cancel' },
                              {
                                text: t('unlockBtn'),
                                onPress: async () => {
                                  const { data } = await supabase.rpc('admin_unlock_device', { p_email: notif.email });
                                  if (data) {
                                    Alert.alert(t('success'), `${notif.email} ${t('unlockSuccess')}`);
                                    loadAdminNotifications();
                                  } else {
                                    Alert.alert(t('error'), t('unlockFailed'));
                                  }
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <Unlock color={Colors.warning} size={18} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {isAdmin && (
          <View style={styles.vipSection}>
            <View style={styles.vipSectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.vipSectionTitle}>{t('vipList')}</Text>
                <Text style={styles.vipSectionSubtitle}>
                  {t('vipListSub')}
                </Text>
              </View>
              <TouchableOpacity style={styles.addVipButton} onPress={() => setShowVipModal(true)}>
                <UserPlus color={Colors.white} size={18} />
              </TouchableOpacity>
            </View>

            {vipLoading ? (
              <ActivityIndicator color={Colors.royalBlue} size="small" style={{ marginVertical: 20 }} />
            ) : vipList.length === 0 ? (
              <Text style={styles.vipEmptyText}>{t('noVipMembers')}</Text>
            ) : (
              <View style={styles.vipListContainer}>
                {vipList.map((entry) => (
                  <View key={entry.id} style={styles.vipCard}>
                    <View style={styles.vipCardInfo}>
                      <Text style={styles.vipCardEmail}>{entry.email}</Text>
                      <Text style={styles.vipCardPlan}>
                        {PLAN_LABELS[entry.plan]}
                        {entry.reason ? ` · ${entry.reason}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.vipRemoveBtn}
                      onPress={() => handleRemoveVip(entry)}
                    >
                      <Trash2 color={Colors.error} size={18} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {!languageLocked && (
          <View style={styles.languageCard}>
            <Text style={styles.languageTitle}>{t('language')}</Text>
            <View style={styles.languageGrid}>
              {LANGUAGE_LIST.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.languageOption, language === lang.code && styles.languageOptionActive]}
                  onPress={() => setLanguage(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[styles.languageOptionText, language === lang.code && styles.languageOptionTextActive]}>
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => setShowSupportModal(true)}
        >
          <View style={styles.supportIconBox}>
            <MessageSquarePlus color={Colors.royalBlue} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportTitle}>{t('supportFeedback')}</Text>
            <Text style={styles.supportSubtitle}>{t('supportFeedbackSub')}</Text>
          </View>
          <ChevronRight color={Colors.textLight} size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut color={Colors.error} size={20} />
          <Text style={styles.signOutText}>{t('signOut')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showVipModal} animationType="slide" transparent onRequestClose={() => setShowVipModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('addVipTitle')}</Text>
              <TouchableOpacity onPress={() => setShowVipModal(false)}>
                <X color={Colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>{t('userEmail')}</Text>
              <TextInput
                style={styles.modalInput}
                value={newVipEmail}
                onChangeText={setNewVipEmail}
                placeholder="prieten@email.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>{t('premiumPlan')}</Text>
              <View style={styles.planSelector}>
                {(['hobby', 'standard', 'professional'] as SubscriptionPlan[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.planOption, newVipPlan === p && styles.planOptionSelected]}
                    onPress={() => setNewVipPlan(p)}
                  >
                    <Text style={[styles.planOptionText, newVipPlan === p && styles.planOptionTextSelected]}>
                      {PLAN_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>{t('reasonOptional')}</Text>
              <TextInput
                style={styles.modalInput}
                value={newVipReason}
                onChangeText={setNewVipReason}
                placeholder={t('reasonPlaceholder')}
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <TouchableOpacity style={styles.modalSubmitButton} onPress={handleAddVip}>
              <Text style={styles.modalSubmitText}>{t('addVipBtn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSupportModal} animationType="slide" transparent onRequestClose={() => setShowSupportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('supportFeedback')}</Text>
              <TouchableOpacity onPress={() => setShowSupportModal(false)}>
                <X color={Colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>{t('supportType')}</Text>
              <View style={styles.planSelector}>
                <TouchableOpacity
                  style={[styles.planOption, supportType === 'bug' && styles.planOptionSelected]}
                  onPress={() => setSupportType('bug')}
                >
                  <Text style={[styles.planOptionText, supportType === 'bug' && styles.planOptionTextSelected]}>
                    {t('supportTypeBug')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.planOption, supportType === 'suggestion' && styles.planOptionSelected]}
                  onPress={() => setSupportType('suggestion')}
                >
                  <Text style={[styles.planOptionText, supportType === 'suggestion' && styles.planOptionTextSelected]}>
                    {t('supportTypeSuggestion')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>{t('supportMessage')}</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 100, textAlignVertical: 'top' }]}
                value={supportMessage}
                onChangeText={setSupportMessage}
                placeholder={t('supportMessagePlaceholder')}
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity style={styles.modalSubmitButton} onPress={handleSendSupport} disabled={supportSending}>
              {supportSending ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>{t('supportSend')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
  },
  profileIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  profileEmail: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.royalBluePale,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  adminText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  usageCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 24,
  },
  usageTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.text, marginBottom: 14 },
  usageRow: { flexDirection: 'row', alignItems: 'center' },
  usageItem: { flex: 1, alignItems: 'center' },
  usageValue: { fontFamily: 'Inter-Bold', fontSize: 22, color: Colors.royalBlue },
  usageLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  usageDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: Colors.text,
    marginBottom: 16,
  },
  plansList: { gap: 14 },
  planCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  planCardCurrent: {
    borderColor: Colors.royalBlue,
    borderWidth: 2,
  },
  planCardPro: {
    backgroundColor: Colors.royalBlue,
    borderColor: Colors.royalBlue,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  planName: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.text },
  planPrice: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  currentBadge: {
    backgroundColor: Colors.royalBluePale,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  currentBadgeText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: Colors.royalBlue },
  proBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planFeatures: { gap: 8, marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.text, flex: 1 },
  upgradeButton: {
    backgroundColor: Colors.royalBlue,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradeButtonDisabled: { opacity: 0.6 },
  upgradeButtonText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },
  downgradeNote: {
    backgroundColor: Colors.neutral100,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  downgradeText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: Colors.errorBg,
  },
  languageCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: 16,
  },
  languageTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.text,
    marginBottom: 14,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  languageOption: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  languageFlag: {
    fontSize: 20,
  },
  languageOptionActive: {
    borderColor: Colors.royalBlue,
    backgroundColor: Colors.royalBluePale,
  },
  languageOptionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  languageOptionTextActive: {
    color: Colors.royalBlue,
  },
  signOutText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.error },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.royalBlue,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  vipText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.white },
  vipNote: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.royalBlue },
  vipSection: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: 24,
  },
  vipSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  vipSectionTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  vipSectionSubtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  addVipButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.royalBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vipEmptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, paddingVertical: 12 },
  vipListContainer: { gap: 10 },
  vipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  vipCardInfo: { flex: 1 },
  vipCardEmail: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  vipCardPlan: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  vipRemoveBtn: { padding: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.text },
  modalField: { marginBottom: 16 },
  modalLabel: { fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.text, marginBottom: 8 },
  modalInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
  },
  planSelector: { flexDirection: 'row', gap: 8 },
  planOption: {
    flex: 1,
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  planOptionSelected: {
    borderColor: Colors.royalBlue,
    backgroundColor: Colors.royalBluePale,
  },
  planOptionText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary },
  planOptionTextSelected: { color: Colors.royalBlue },
  modalSubmitButton: {
    backgroundColor: Colors.royalBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSubmitText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },
  notifSection: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: 24,
  },
  notifSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  notifSectionTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  notifSectionSubtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  unreadBadge: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.error },
  notifIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.errorBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifEmptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary, paddingVertical: 12 },
  notifListContainer: { gap: 10 },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  notifCardUnread: {
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  notifCardInfo: { flex: 1 },
  notifCardEmail: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  notifCardDetail: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  notifCardDate: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight, marginTop: 2 },
  notifCardActions: { flexDirection: 'row', gap: 8 },
  notifMarkBtn: { padding: 6 },
  notifUnlockBtn: { padding: 6 },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: 16,
  },
  supportIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.royalBluePale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  supportSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
