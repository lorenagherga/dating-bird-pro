import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors, Shadows } from '@/lib/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [breederName, setBreederName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !breederName.trim()) {
      setError(t('fillFields'));
      return;
    }
    if (password.length < 6) {
      setError(language === 'ro' ? 'Parola trebuie să aibă cel puțin 6 caractere.' : 'Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await signUp(email.trim(), password, breederName.trim());
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <LinearGradient
      colors={[Colors.royalBlueDark, Colors.royalBlue, Colors.royalBlueLight]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>DBP</Text>
            </View>
            <Text style={styles.title}>{t('registerTitle')}</Text>
            <Text style={styles.subtitle}>{language === 'ro' ? 'Creează contul tău de columbofil' : 'Create your pigeon fancier account'}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('breederName')}</Text>
              <TextInput
                style={styles.input}
                value={breederName}
                onChangeText={setBreederName}
                placeholder="ex: Crescătorie Vulturul"
                placeholderTextColor="rgba(255,255,255,0.45)"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('email')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="exemplu@email.com"
                placeholderTextColor="rgba(255,255,255,0.45)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('password')}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Minim 6 caractere"
                placeholderTextColor="rgba(255,255,255,0.45)"
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color={Colors.royalBlueDark} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('registerBtn')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.secondaryButtonText}>
                {t('haveAccount')} <Text style={styles.secondaryLink}>{t('loginHere')}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 44,
  },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: Colors.white,
    letterSpacing: 2,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: Colors.white,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  form: {
    gap: 18,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },
  input: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
    color: Colors.white,
  },
  errorBox: {
    backgroundColor: 'rgba(192,57,43,0.2)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#FFD0CC',
  },
  primaryButton: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    ...Shadows.button,
  },
  primaryButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 17,
    color: Colors.royalBlueDark,
    letterSpacing: 0.3,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  },
  secondaryLink: {
    color: Colors.goldLight,
    fontFamily: 'Inter-SemiBold',
  },
});
