import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Shield, Trash2, CircleDot, Clock, CheckCircle, Inbox, Users, Check, X as XIcon } from 'lucide-react-native';

interface SupportTicket {
  id: string;
  user_email: string;
  type: string;
  message: string;
  status: string;
  is_read: boolean;
  created_at: string;
}

interface PartnerRequestRow {
  id: string;
  breeder_name: string;
  county: string | null;
  categories: string[];
  contact_link: string | null;
  user_id: string | null;
  status: string;
  created_at: string;
}

function formatDate(dateStr: string, lang: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(lang === 'ro' ? 'ro-RO' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminPanelScreen() {
  const { t, language } = useLanguage();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all');
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequestRow[]>([]);
  const [partnerLoading, setPartnerLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });
    setTickets((data || []) as SupportTicket[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadPartnerRequests = useCallback(async () => {
    setPartnerLoading(true);
    const { data } = await supabase
      .from('partner_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPartnerRequests((data || []) as PartnerRequestRow[]);
    setPartnerLoading(false);
  }, []);

  useEffect(() => {
    loadPartnerRequests();
  }, [loadPartnerRequests]);

  const handleApprovePartner = (req: PartnerRequestRow) => {
    Alert.alert(t('adminApprove'), `${t('adminApprove')} "${req.breeder_name}"?`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('adminApprove'),
        onPress: async () => {
          await supabase.from('elite_breeders').insert({
            breeder_name: req.breeder_name,
            county: req.county,
            categories: req.categories,
            description: '',
            user_id: req.user_id,
          });
          await supabase
            .from('partner_requests')
            .update({ status: 'approved', reviewed_at: new Date().toISOString() })
            .eq('id', req.id);
          Alert.alert(t('success'), t('adminApprovedMsg'));
          loadPartnerRequests();
        },
      },
    ]);
  };

  const handleRejectPartner = (req: PartnerRequestRow) => {
    Alert.alert(t('adminReject'), `${t('adminReject')} "${req.breeder_name}"?`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('adminReject'),
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('partner_requests')
            .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
            .eq('id', req.id);
          Alert.alert(t('success'), t('adminRejectedMsg'));
          loadPartnerRequests();
        },
      },
    ]);
  };

  const handleMarkRead = async (ticket: SupportTicket) => {
    await supabase.from('support_tickets').update({ is_read: true }).eq('id', ticket.id);
    loadTickets();
  };

  const handleStatusChange = async (ticket: SupportTicket, newStatus: string) => {
    await supabase
      .from('support_tickets')
      .update({ status: newStatus, is_read: true, updated_at: new Date().toISOString() })
      .eq('id', ticket.id);
    loadTickets();
  };

  const handleDelete = (ticket: SupportTicket) => {
    Alert.alert(t('adminDeleteTicket'), t('adminDeleteTicketConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('support_tickets').delete().eq('id', ticket.id);
          loadTickets();
        },
      },
    ]);
  };

  const filtered = filter === 'all' ? tickets : tickets.filter((tk) => tk.status === filter);
  const unreadCount = tickets.filter((tk) => !tk.is_read).length;

  const statusConfig: Record<string, { bg: string; text: string; label: string; icon: typeof CircleDot }> = {
    new: { bg: Colors.errorBg, text: Colors.error, label: t('adminStatusNew'), icon: CircleDot },
    in_progress: { bg: Colors.warningBg, text: Colors.warning, label: t('adminStatusInProgress'), icon: Clock },
    resolved: { bg: Colors.successBg, text: Colors.success, label: t('adminStatusResolved'), icon: CheckCircle },
  };

  const filterTabs: { key: 'all' | 'new' | 'in_progress' | 'resolved'; label: string }[] = [
    { key: 'all', label: language === 'ro' ? 'Toate' : 'All' },
    { key: 'new', label: t('adminStatusNew') },
    { key: 'in_progress', label: t('adminStatusInProgress') },
    { key: 'resolved', label: t('adminStatusResolved') },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenHeader title={t('adminPanel')} subtitle={t('adminPanelSub')} showBack />

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardGold]}>
            <Inbox color={Colors.gold} size={24} />
            <Text style={styles.statValue}>{tickets.length}</Text>
            <Text style={styles.statLabel}>{language === 'ro' ? 'Total' : 'Total'}</Text>
          </View>
          <View style={[styles.statCard, styles.statCardUnread]}>
            <View style={styles.unreadDot} />
            <Text style={[styles.statValue, { color: Colors.error }]}>{unreadCount}</Text>
            <Text style={styles.statLabel}>{t('adminUnreadTickets')}</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {filterTabs.map((ft) => (
            <TouchableOpacity
              key={ft.key}
              style={[styles.filterTab, filter === ft.key && styles.filterTabActive]}
              onPress={() => setFilter(ft.key)}
            >
              <Text style={[styles.filterTabText, filter === ft.key && styles.filterTabTextActive]}>
                {ft.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.royalBlue} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Shield color={Colors.textLight} size={48} />
            <Text style={styles.emptyTitle}>{t('adminNoTickets')}</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colDate]}>{t('adminColDate')}</Text>
              <Text style={[styles.tableHeaderText, styles.colEmail]}>{t('adminColEmail')}</Text>
              <Text style={[styles.tableHeaderText, styles.colType]}>{t('adminColType')}</Text>
              <Text style={[styles.tableHeaderText, styles.colStatus]}>{t('adminColStatus')}</Text>
            </View>
            {filtered.map((ticket) => {
              const sc = statusConfig[ticket.status] || statusConfig.new;
              const StatusIcon = sc.icon;
              return (
                <View
                  key={ticket.id}
                  style={[styles.tableRow, !ticket.is_read && styles.tableRowUnread]}
                >
                  <View style={styles.rowContent}>
                    <View style={styles.rowTop}>
                      <View style={[styles.colDate, styles.colDataCell]}>
                        <Text style={styles.cellDate}>{formatDate(ticket.created_at, language)}</Text>
                      </View>
                      <View style={[styles.colEmail, styles.colDataCell]}>
                        <Text style={styles.cellEmail} numberOfLines={1}>{ticket.user_email}</Text>
                      </View>
                      <View style={[styles.colType, styles.colDataCell]}>
                        <View style={[
                          styles.typeBadge,
                          ticket.type === 'bug' ? styles.typeBadgeBug : styles.typeBadgeSuggestion,
                        ]}>
                          <Text style={[
                            styles.typeText,
                            ticket.type === 'bug' ? styles.typeTextBug : styles.typeTextSuggestion,
                          ]}>
                            {ticket.type === 'bug' ? t('supportTypeBug') : t('supportTypeSuggestion')}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.colStatus, styles.colDataCell]}>
                        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                          <StatusIcon color={sc.text} size={12} />
                          <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.messageSection}>
                      <Text style={styles.messageLabel}>{t('adminColMessage')}:</Text>
                      <Text style={styles.messageText}>{ticket.message}</Text>
                    </View>

                    <View style={styles.actionsRow}>
                      {!ticket.is_read && (
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => handleMarkRead(ticket)}
                        >
                          <Text style={styles.actionBtnText}>{t('adminMarkRead')}</Text>
                        </TouchableOpacity>
                      )}
                      {ticket.status !== 'in_progress' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: Colors.warningBg }]}
                          onPress={() => handleStatusChange(ticket, 'in_progress')}
                        >
                          <Text style={[styles.actionBtnText, { color: Colors.warning }]}>{t('adminMarkInProgress')}</Text>
                        </TouchableOpacity>
                      )}
                      {ticket.status !== 'resolved' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: Colors.successBg }]}
                          onPress={() => handleStatusChange(ticket, 'resolved')}
                        >
                          <Text style={[styles.actionBtnText, { color: Colors.success }]}>{t('adminMarkResolved')}</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: Colors.errorBg, marginLeft: 'auto' }]}
                        onPress={() => handleDelete(ticket)}
                      >
                        <Trash2 color={Colors.error} size={14} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {!ticket.is_read && <View style={styles.unreadIndicator} />}
                </View>
              );
            })}
          </View>
        )}

        {/* Partner Requests Section */}
        <View style={styles.partnerSection}>
          <View style={styles.partnerSectionHeader}>
            <Users color={Colors.gold} size={22} />
            <View>
              <Text style={styles.partnerSectionTitle}>{t('adminPartnerRequests')}</Text>
              <Text style={styles.partnerSectionSub}>{t('adminPartnerReqSub')}</Text>
            </View>
          </View>

          {partnerLoading ? (
            <ActivityIndicator size="small" color={Colors.royalBlue} style={{ marginTop: 16 }} />
          ) : partnerRequests.length === 0 ? (
            <Text style={styles.partnerEmpty}>{t('adminNoTickets')}</Text>
          ) : (
            <View style={{ gap: 12 }}>
              {partnerRequests.map((req) => (
                <View key={req.id} style={styles.partnerReqCard}>
                  <View style={styles.partnerReqTop}>
                    <Text style={styles.partnerReqName}>{req.breeder_name}</Text>
                    {req.county && <Text style={styles.partnerReqCounty}>{req.county}</Text>}
                  </View>
                  {req.categories.length > 0 && (
                    <View style={styles.partnerReqCategories}>
                      {req.categories.map((cat, idx) => (
                        <View key={idx} style={styles.partnerReqCatChip}>
                          <Text style={styles.partnerReqCatText}>{cat}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {req.contact_link && (
                    <Text style={styles.partnerReqLink} numberOfLines={1}>{req.contact_link}</Text>
                  )}
                  <Text style={styles.partnerReqDate}>{formatDate(req.created_at, language)}</Text>
                  <View style={styles.partnerReqActions}>
                    <TouchableOpacity
                      style={styles.partnerApproveBtn}
                      onPress={() => handleApprovePartner(req)}
                    >
                      <Check color={Colors.success} size={16} />
                      <Text style={styles.partnerApproveText}>{t('adminApprove')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.partnerRejectBtn}
                      onPress={() => handleRejectPartner(req)}
                    >
                      <XIcon color={Colors.error} size={16} />
                      <Text style={styles.partnerRejectText}>{t('adminReject')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 24, paddingBottom: 40 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 4,
  },
  statCardGold: {
    borderColor: Colors.gold,
    borderWidth: 1.5,
  },
  statCardUnread: {
    borderColor: Colors.error,
    borderWidth: 1.5,
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.error,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterTabActive: {
    backgroundColor: Colors.royalBlue,
    borderColor: Colors.royalBlue,
  },
  filterTabText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: Colors.white,
  },
  tableContainer: {
    gap: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.royalBlue,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tableHeaderText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.white,
  },
  tableRow: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  tableRowUnread: {
    borderColor: Colors.gold,
    borderWidth: 1.5,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: '100%',
    backgroundColor: Colors.gold,
  },
  rowContent: {
    padding: 14,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  colDate: { flex: 0.8 },
  colEmail: { flex: 1 },
  colType: { flex: 0.7 },
  colStatus: { flex: 0.7 },
  colDataCell: {
    paddingRight: 8,
  },
  cellDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: Colors.textSecondary,
  },
  cellEmail: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.text,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  typeBadgeBug: {
    backgroundColor: Colors.errorBg,
  },
  typeBadgeSuggestion: {
    backgroundColor: Colors.royalBluePale,
  },
  typeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
  },
  typeTextBug: {
    color: Colors.error,
  },
  typeTextSuggestion: {
    color: Colors.royalBlue,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
  },
  messageSection: {
    backgroundColor: Colors.neutral50,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  messageLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  messageText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.royalBluePale,
  },
  actionBtnText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: Colors.royalBlue,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: Colors.text,
  },
  // Partner Requests
  partnerSection: {
    marginTop: 32,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  partnerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  partnerSectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: Colors.text,
  },
  partnerSectionSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  partnerEmpty: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 20,
  },
  partnerReqCard: {
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  partnerReqTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  partnerReqName: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  partnerReqCounty: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  partnerReqCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  partnerReqCatChip: {
    backgroundColor: Colors.royalBluePale,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  partnerReqCatText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: Colors.royalBlue,
  },
  partnerReqLink: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.royalBlue,
    marginBottom: 4,
  },
  partnerReqDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 10,
  },
  partnerReqActions: {
    flexDirection: 'row',
    gap: 8,
  },
  partnerApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.successBg,
  },
  partnerApproveText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.success,
  },
  partnerRejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.errorBg,
  },
  partnerRejectText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: Colors.error,
  },
});
