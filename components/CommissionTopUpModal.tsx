import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, X } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/lib/theme';
import { useAuth } from '@/lib/auth-context';
import {
  TOPUP_MAX_AMOUNT,
  submitCommissionTopUp,
  uploadPaymentProof,
} from '@/lib/commission-wallet';

interface CommissionTopUpModalProps {
  visible: boolean;
  onClose: () => void;
}

interface PickedProof {
  uri: string;
  mimeType: string;
}

export function CommissionTopUpModal({ visible, onClose }: CommissionTopUpModalProps) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [amountInput, setAmountInput] = useState('');
  const [note, setNote] = useState('');
  const [proof, setProof] = useState<PickedProof | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setAmountInput('');
    setNote('');
    setProof(null);
    setError(null);
    setSubmitted(false);
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const pickProof = async () => {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setProof({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
    } catch (cause) {
      console.error('payment proof picker failed', cause);
      setError('Imaginea nu a putut fi selectată. Încearcă din nou.');
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const amount = Math.round(Number(amountInput.trim().replace(',', '.')) * 100) / 100;
    if (!Number.isFinite(amount) || amount < 1 || amount > TOPUP_MAX_AMOUNT) {
      setError(`Introdu o sumă între 1 și ${TOPUP_MAX_AMOUNT} lei.`);
      return;
    }
    if (!userId) {
      setError('Trebuie să fii autentificat pentru a trimite o cerere.');
      return;
    }
    setBusy(true);
    try {
      const proofPath = proof ? await uploadPaymentProof(userId, proof.uri, proof.mimeType) : null;
      await submitCommissionTopUp({ amount, note: note.trim() || null, proofPath });
      setSubmitted(true);
    } catch (cause) {
      console.error('commission top-up request failed', cause);
      setError('Cererea nu a putut fi trimisă. Verifică datele și încearcă din nou.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>Încarcă Portofel</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} accessibilityLabel="Închide">
              <X color={Colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>

          {submitted ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>
                Cererea a fost trimisă. Un administrator va verifica plata și îți va alimenta portofelul după confirmare.
              </Text>
              <TouchableOpacity style={styles.submitBtn} onPress={handleClose}>
                <Text style={styles.submitText}>Închide</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Sumă transferată (lei)</Text>
              <TextInput
                style={styles.input}
                value={amountInput}
                onChangeText={setAmountInput}
                placeholder="ex: 500"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Notă (opțional)</Text>
              <TextInput
                style={styles.input}
                value={note}
                onChangeText={setNote}
                placeholder="ex: transfer Revolut"
                placeholderTextColor={Colors.textLight}
                maxLength={200}
              />

              <Text style={styles.label}>Atașează dovada transferului (Poză / Screenshot Revolut)</Text>
              <Text style={styles.hint}>Recomandat: dovada accelerează confirmarea plății.</Text>
              {proof ? (
                <View style={styles.proofBox}>
                  <Image source={{ uri: proof.uri }} style={styles.proofPreview} resizeMode="cover" />
                  <View style={styles.proofActions}>
                    <TouchableOpacity style={styles.proofBtn} onPress={pickProof} disabled={busy}>
                      <Text style={styles.proofBtnText}>Schimbă imaginea</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.proofBtn} onPress={() => setProof(null)} disabled={busy}>
                      <Text style={styles.proofBtnText}>Elimină</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.pickBtn} onPress={pickProof} disabled={busy}>
                  <ImagePlus color={Colors.royalBlue} size={20} />
                  <Text style={styles.pickBtnText}>Alege o imagine</Text>
                </TouchableOpacity>
              )}

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.submitBtn, busy && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitText}>Am trimis plata — Solicită confirmarea</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: 20,
    maxHeight: '90%',
    gap: 12,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  closeBtn: { padding: 8 },
  form: { gap: 8, paddingBottom: 8 },
  label: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text, marginTop: 8 },
  hint: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  input: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.text,
    backgroundColor: Colors.neutral50, borderRadius: BorderRadius.md,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: BorderRadius.md, borderWidth: 1,
    borderStyle: 'dashed', borderColor: Colors.royalBlue, backgroundColor: Colors.royalBluePale,
  },
  pickBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.royalBlue },
  proofBox: { gap: 8 },
  proofPreview: { width: '100%', height: 180, borderRadius: BorderRadius.md, backgroundColor: Colors.neutral100 },
  proofActions: { flexDirection: 'row', gap: 8 },
  proofBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: BorderRadius.md,
    backgroundColor: Colors.royalBluePale,
  },
  proofBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error },
  successBox: { gap: 16, paddingVertical: 8 },
  successText: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21, color: Colors.text },
  submitBtn: {
    backgroundColor: Colors.royalBlue, borderRadius: BorderRadius.md,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.white },
});
