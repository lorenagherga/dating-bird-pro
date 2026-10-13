import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';
import type { Profile, SubscriptionPlan, PigeonType } from './types';
import { Platform } from 'react-native';

interface VipStatus {
  isVip: boolean;
  vipPlan: SubscriptionPlan | null;
  reason: string;
}

interface AuthContextType {
  session: any | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isVip: boolean;
  vipPlan: SubscriptionPlan | null;
  effectivePlan: SubscriptionPlan;
  deviceId: string;
  deviceLockError: string | null;
  clearDeviceLockError: () => void;
  pigeonType: PigeonType | null;
  setPigeonType: (type: PigeonType) => Promise<void>;
  signUp: (email: string, password: string, breederName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePlan: (plan: SubscriptionPlan) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEVICE_ID_KEY = 'dbp_device_id';

async function getOrCreateDeviceId(): Promise<string> {
  if (Platform.OS === 'web') {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'web_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  try {
    const SecureStore = await import('expo-secure-store');
    let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!id) {
      id = 'native_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    let id = 'native_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    return id;
  }
}

function getDeviceName(): string {
  if (Platform.OS === 'web') {
    return 'Browser Web';
  }
  return 'Telefon Mobil';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [vipStatus, setVipStatus] = useState<VipStatus>({ isVip: false, vipPlan: null, reason: '' });
  const [deviceId, setDeviceId] = useState('');
  const [deviceLockError, setDeviceLockError] = useState<string | null>(null);

  const pigeonType = profile?.pigeon_type ?? null;
  const plan = profile?.subscription_plan || 'free';
  const effectivePlan: SubscriptionPlan = vipStatus.isVip && vipStatus.vipPlan ? vipStatus.vipPlan : plan;

  const clearDeviceLockError = useCallback(() => setDeviceLockError(null), []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const id = await getOrCreateDeviceId();
      if (mounted) setDeviceId(id);

      const { data: { session: s } } = await supabase.auth.getSession();
      if (mounted) {
        if (s) {
          setSession(s);
          await checkSessionAndLoadProfile(s, id);
        } else {
          setLoading(false);
        }
      }
    })();

    supabase.auth.onAuthStateChange((_event, s) => {
      (async () => {
        if (s) {
          setSession(s);
          setDeviceLockError(null);
          await checkSessionAndLoadProfile(s, deviceId || await getOrCreateDeviceId());
        } else {
          setSession(null);
          setProfile(null);
          setIsAdmin(false);
          setVipStatus({ isVip: false, vipPlan: null, reason: '' });
          setLoading(false);
        }
      })();
    });

    return () => { mounted = false; };
  }, []);

  const checkSessionAndLoadProfile = async (s: any, currentDeviceId: string) => {
    try {
      const userId = s.user.id;
      const email = s.user.email || '';

      // 1. Check if user is admin
      const { data: whitelist } = await supabase
        .from('admin_whitelist')
        .select('email')
        .eq('email', email)
        .maybeSingle();
      const userIsAdmin = !!whitelist;
      setIsAdmin(userIsAdmin);

      // 2. Check VIP status
      const { data: vipEntry } = await supabase
        .from('vip_list')
        .select('plan, reason')
        .eq('email', email)
        .maybeSingle();
      if (vipEntry) {
        setVipStatus({ isVip: true, vipPlan: vipEntry.plan as SubscriptionPlan, reason: vipEntry.reason || '' });
      } else {
        setVipStatus({ isVip: false, vipPlan: null, reason: '' });
      }

      // 3. SERVER-SIDE device lock check
      const { data: lockResult, error: lockError } = await supabase
        .rpc('check_device_lock', {
          p_device_id: currentDeviceId,
          p_device_name: getDeviceName(),
        });

      if (lockError) {
        // Dacă funcția nu rulează, permitem accesul (fallback)
      } else if (lockResult && lockResult.length > 0) {
        const result = lockResult[0];
        if (result.blocked === true) {
          // BLOCAT - alt dispozitiv este asociat
          setDeviceLockError(result.reason);
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }
      }

      // 4. Update session record (tabel sessions existent)
      await supabase.from('sessions').delete().eq('user_id', userId).eq('device_id', currentDeviceId);
      await supabase.from('sessions').insert({
        user_id: userId,
        device_id: currentDeviceId,
        device_name: getDeviceName(),
      });

      // 5. Load profile (trigger-ul îl creează automat la înregistrare)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        setProfile(existingProfile as Profile);
      } else {
        // Fallback: creează profilul dacă trigger-ul nu a funcționat
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            breeder_name: email.split('@')[0],
            subscription_plan: 'free',
          })
          .select()
          .single();
        if (newProfile) {
          setProfile(newProfile as Profile);
        }
      }
    } catch (e) {
      // Silently handle
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    if (data) setProfile(data as Profile);
  }, [session]);

  const updatePlan = useCallback(async (plan: SubscriptionPlan) => {
    if (!session?.user?.id) return;
    await supabase
      .from('profiles')
      .update({ subscription_plan: plan })
      .eq('id', session.user.id);
    await refreshProfile();
  }, [session, refreshProfile]);

  const setPigeonType = useCallback(async (type: PigeonType) => {
    if (!session?.user?.id) return;
    const { error } = await supabase.rpc('set_pigeon_type', { p_type: type });
    if (error) {
      // Fallback: direct update
      await supabase
        .from('profiles')
        .update({ pigeon_type: type })
        .eq('id', session.user.id);
    }
    await refreshProfile();
  }, [session, refreshProfile]);

  const signUp = async (email: string, password: string, breederName: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          breeder_name: breederName,
        },
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    if (session?.user?.id && deviceId) {
      await supabase.from('sessions').delete().eq('user_id', session.user.id).eq('device_id', deviceId);
    }
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setVipStatus({ isVip: false, vipPlan: null, reason: '' });
    setDeviceLockError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        isAdmin,
        isVip: vipStatus.isVip,
        vipPlan: vipStatus.vipPlan,
        effectivePlan,
        deviceId,
        deviceLockError,
        clearDeviceLockError,
        pigeonType,
        setPigeonType,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        updatePlan,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
