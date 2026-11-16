import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/lib/theme';
import { findUserIdByEmail } from '@/lib/partner-directory';
import { adminAdjustCommissionWallet } from '@/lib/commission-wallet';

const MAX_ABS_AMOUNT = 100000;

export function AdminCommissionWalletCard() {
  const [email, setEmail] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    const amount = Number(amountInput.trim().replace(',', '.'));
    if (!email.trim()) {
      setError('Introdu adresa de email a utilizatorului.');
      return;
    }
    if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > MAX_ABS_AMOUNT) {
      setError(`Introdu o sumă diferită de zero, între -${MAX_ABS_AMOUNT} și ${MAX_ABS_AMOUNT} lei.`);
      return;
    }
    setBusy(true);
    try {
      const userId = await findUserIdByEmail(email);
      if (!userId) {
        setError('Nu există niciun cont cu această adresă de email.');
        return;
      }
      const balance = await adminAdjustCommissionWallet(userId, Math.round(amount * 100) / 100, note.trim());
      setSuccess(`Portofel actualizat. Sold nou: ${balance.toFixed(2)} lei.`);
      setAmountInput('');
      setNote('');
    } catch (cause) {
      console.error('admin commission wallet adjust failed', cause);
      setError('Portofelul nu a putut fi actualizat. Verifică datele și încearcă din nou.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Wallet color={Colors.royalBlue} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Portofel Comisioane</Text>
          <Text style={styles.subtitle}>Alimentează sau corectează soldul unui vânzător.</Text>
        </View>
      </View>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email utilizator"
        placeholderTextColor={Colors.textLight}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={amountInput}
          onChangeText={setAmountInput}
          placeholder="Sumă (lei), ex: 500 sau -50"
          placeholderTextColor={Colors.textLight}
          keyboardType="numeric"
        />
      </View>
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder="Notă (opțional), ex: alimentare prin transfer"
        placeholderTextColor={Colors.textLight}
        maxLength={200}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}
      {success && <Text style={styles.successText}>{success}</Text>}

      <TouchableOpacity
        style={[styles.submitBtn, busy && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.submitText}>Aplică în portofel</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
    marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.royalBluePale,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.text,
    backgroundColor: Colors.neutral50, borderRadius: BorderRadius.md,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error },
  successText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.success },
  submitBtn: {
    backgroundColor: Colors.royalBlue, borderRadius: BorderRadius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.white },
});
