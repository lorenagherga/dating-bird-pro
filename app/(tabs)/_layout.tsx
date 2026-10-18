import { Tabs } from 'expo-router';
import { Home, Bird, Users, Menu, Shield } from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import type { ColorValue } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [unreadTickets, setUnreadTickets] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isAdmin) return;
    const loadUnread = () => {
      supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .then(({ count }) => setUnreadTickets(count || 0));
    };
    loadUnread();
    const interval = setInterval(loadUnread, 15000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const hiddenScreenOptions = {
    href: null,
    headerShown: false,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.royalBlue,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.borderLight,
          borderTopWidth: 1,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
          height: 68 + (insets.bottom > 0 ? insets.bottom : 10),
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-SemiBold',
          fontSize: 12,
          marginTop: 6,
          letterSpacing: 0.2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarAllowFontScaling: false,
      }}
    >
      {/* Visible tabs — only 4 */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <Home color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="pigeons"
        options={{
          title: t('tabRegistry'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <Bird color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t('tabCommunity'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <Users color={color} size={28} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabMore'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => (
            <View>
              <Menu color={color} size={28} />
              {isAdmin && unreadTickets > 0 && (
                <View style={tabStyles.badge}>
                  <Text style={tabStyles.badgeText}>
                    {unreadTickets > 9 ? '9+' : unreadTickets}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      {/* Hidden from tab bar — accessible via "More" screen or direct navigation */}
      <Tabs.Screen name="nests" options={hiddenScreenOptions} />
      <Tabs.Screen name="races" options={hiddenScreenOptions} />
      <Tabs.Screen name="vitrina" options={hiddenScreenOptions} />
      <Tabs.Screen name="diagnostic" options={hiddenScreenOptions} />
      <Tabs.Screen name="scan-pedigree" options={hiddenScreenOptions} />
      <Tabs.Screen name="calculator" options={hiddenScreenOptions} />
      <Tabs.Screen name="doctor" options={hiddenScreenOptions} />
      <Tabs.Screen name="auctions" options={hiddenScreenOptions} />
      <Tabs.Screen name="partners" options={hiddenScreenOptions} />
      <Tabs.Screen name="pdf-catalog" options={hiddenScreenOptions} />
      <Tabs.Screen name="copilot" options={hiddenScreenOptions} />
      <Tabs.Screen name="profile" options={hiddenScreenOptions} />
      <Tabs.Screen name="admin" options={hiddenScreenOptions} />
      <Tabs.Screen name="palmares" options={hiddenScreenOptions} />
      <Tabs.Screen name="pedigree" options={hiddenScreenOptions} />
      <Tabs.Screen name="auction-detail" options={hiddenScreenOptions} />
      <Tabs.Screen name="auction-create" options={hiddenScreenOptions} />
      <Tabs.Screen name="treatments" options={hiddenScreenOptions} />
      <Tabs.Screen name="assistant" options={hiddenScreenOptions} />
      <Tabs.Screen name="partner-detail" options={hiddenScreenOptions} />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  badgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: Colors.white,
  },
});
