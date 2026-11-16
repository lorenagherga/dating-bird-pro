import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, MessageCircle, Trophy } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { Colors, BorderRadius } from '@/lib/theme';
import {
  fetchMyNotifications,
  markNotificationsRead,
  UserNotification,
} from '@/lib/notifications';

const REFRESH_INTERVAL_MS = 30000;

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('ro-RO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function NotificationBell() {
  const router = useRouter();
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setNotifications(await fetchMyNotifications());
      setLoadError(null);
    } catch (cause) {
      console.error('notifications load failed', cause);
      setLoadError('Notificările nu pot fi încărcate acum.');
    }
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    load();
    const timer = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [profile?.id, load]);

  if (!profile?.id) return null;

  const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) && !n.read_at ? { ...n, read_at: readAt } : n)));
    try {
      await markNotificationsRead(ids);
    } catch (cause) {
      console.error('mark notifications read failed', cause);
      load();
    }
  };

  const handleOpenItem = (item: UserNotification) => {
    markRead([item.id]);
    setOpen(false);
    if (item.auction_id) router.push(`/(tabs)/auction-detail?id=${item.auction_id}`);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.bellBtn}
        onPress={() => setOpen(true)}
        accessibilityLabel="Notificări"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Bell color={Colors.white} size={20} strokeWidth={2} />
        {unreadIds.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadIds.length > 9 ? '9+' : unreadIds.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Închide" />
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Notificări</Text>
              {unreadIds.length > 0 && (
                <TouchableOpacity onPress={() => markRead(unreadIds)}>
                  <Text style={styles.markAll}>Marchează toate</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadError ? (
              <Text style={styles.errorText}>{loadError}</Text>
            ) : notifications.length === 0 ? (
              <Text style={styles.emptyText}>Nu ai notificări încă.</Text>
            ) : (
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {notifications.map((item) => {
                  const Icon = item.kind === 'auction_won' ? Trophy : MessageCircle;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.item, !item.read_at && styles.itemUnread]}
                      onPress={() => handleOpenItem(item)}
                    >
                      <View style={[styles.itemIcon, item.kind === 'auction_won' && styles.itemIconWon]}>
                        <Icon color={item.kind === 'auction_won' ? Colors.royalBlue : Colors.textSecondary} size={16} />
                      </View>
                      <View style={styles.itemText}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        {item.body ? <Text style={styles.itemBody} numberOfLines={1}>{item.body}</Text> : null}
                        <Text style={styles.itemDate}>{formatWhen(item.created_at)}</Text>
                      </View>
                      {!item.read_at && <View style={styles.unreadDot} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.royalBlue,
  },
  badgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: Colors.white },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.35)', justifyContent: 'flex-start', paddingTop: 110, paddingHorizontal: 16 },
  panel: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 16,
    maxHeight: '70%',
    gap: 12,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.text },
  markAll: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textLight, paddingVertical: 20, textAlign: 'center' },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.error, paddingVertical: 20 },
  list: { flexGrow: 0 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: BorderRadius.md,
  },
  itemUnread: { backgroundColor: Colors.royalBluePale },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.neutral50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconWon: { backgroundColor: Colors.royalBluePale },
  itemText: { flex: 1, gap: 2 },
  itemTitle: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  itemBody: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary },
  itemDate: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.textLight },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.royalBlue },
});
