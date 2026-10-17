import { Tabs } from 'expo-router';
import { Home, Bird, Calendar, Stethoscope, Calculator, User, Trophy, Award, Shield, Eye, ScanLine, Gavel, Eye as EyeIcon, FileText, Navigation } from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import type { ColorValue } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { supabase } from '@/lib/supabase';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { pigeonType, isAdmin } = useAuth();
  const { t } = useLanguage();
  const [unreadTickets, setUnreadTickets] = useState(0);
  const insets = useSafeAreaInsets();

  const showRacingTab = pigeonType === 'racing' || pigeonType === 'both';

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
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          height: 64 + (insets.bottom > 0 ? insets.bottom : 8),
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 11,
          marginTop: 4,
          letterSpacing: 0.2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarAllowFontScaling: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <Home color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="pigeons"
        options={{
          title: t('tabRegistry'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <Bird color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="nests"
        options={{
          title: t('tabNests'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <Calendar color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="races"
        options={{
          title: t('tabRaces'),
          href: showRacingTab ? undefined : null,
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <Trophy color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="doctor"
        options={{
          title: t('tabDoctor'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <Stethoscope color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="vitrina"
        options={{
          title: t('tabVitrina'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <Award color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="diagnostic"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="scan-pedigree"
        options={{
          title: t('tabScanPedigree'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <ScanLine color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="calculator"
        options={{
          title: t('tabGenetic'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <Calculator color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="auctions"
        options={{
          title: t('tabAuctions'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <Gavel color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="eye-sign"
        options={{
          title: t('tabEyeSign'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <EyeIcon color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="pdf-catalog"
        options={{
          title: t('tabPdfCatalog'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <FileText color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="copilot"
        options={{
          title: t('tabCopilot'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <Navigation color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabProfile'),
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => <User color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: t('tabAdmin'),
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }: { focused: boolean; color: ColorValue; size: number }) => (
            <View>
              <Shield color={color} size={26} />
              {unreadTickets > 0 && (
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
      <Tabs.Screen
        name="palmares"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="pedigree"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="auction-detail"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="auction-create"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="treatments"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  badgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: Colors.white,
  },
});
