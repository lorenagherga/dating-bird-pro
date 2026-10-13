import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Colors } from '@/lib/theme';

export default function Index() {
  const { session, loading, deviceLockError, pigeonType } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (session) {
        if (!pigeonType) {
          router.replace('/onboarding');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [session, loading, deviceLockError, pigeonType, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.royalBlue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
