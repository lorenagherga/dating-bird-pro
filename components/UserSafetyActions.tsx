import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ban, Flag } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { Colors, BorderRadius } from '@/lib/theme';
import { blockUser, reportUser, REPORT_REASON_MAX_LENGTH } from '@/lib/user-safety';

type SafetyDialog = 'report' | 'block' | null;

interface UserSafetyActionsProps {
  targetUserId: string;
  targetName: string;
  auctionId?: string | null;
  onBlocked?: (targetUserId: string) => void;
}

export function UserSafetyActions({ targetUserId, targetName, auctionId, onBlocked }: UserSafetyActionsProps) {
  const { profile } = useAuth();
  const [dialog, setDialog] = useState<SafetyDialog>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (!profile?.id || profile.id === targetUserId) return null;

  const close = () => {
    if (busy) return;
    setDialog(null);
    setError(null);
    setReason('');
  };

  const submitReport = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Scrie un motiv pentru raport.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await reportUser({ reporterId: profile.id, reportedUserId: targetUserId, reason: trimmed, auctionId });
      setDialog(null);
      setReason('');
      setDone('Raportul a fost trimis. Echipa noastră îl va analiza.');
    } catch {
      setError('Raportul nu a putut fi trimis. Încearcă din nou.');
    } finally {
      setBusy(false);
    }
  };

  const submitBlock = async () => {
    setBusy(true);
    setError(null);
    try {
      await blockUser(targetUserId);
      setDialog(null);
      setDone(`Ai blocat pe ${targetName}. Mesajele lui nu mai apar în conversațiile tale.`);
      onBlocked?.(targetUserId);
    } catch {
      setError('Utilizatorul nu a putut fi blocat. Încearcă din nou.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={() => setDialog('report')} accessibilityRole="button">
          <Flag color={Colors.textSecondary} size={16} />
          <Text style={styles.buttonText}>Raportează</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.blockButton]} onPress={() => setDialog('block')} accessibilityRole="button">
          <Ban color={Colors.error} size={16} />
          <Text style={[styles.buttonText, styles.blockText]}>Blochează</Text>
        </TouchableOpacity>
      </View>
      {done && <Text style={styles.doneText}>{done}</Text>}

      <Modal visible={dialog !== null} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            {dialog === 'report' ? (
              <>
                <Text style={styles.title}>Raportează {targetName}</Text>
                <Text style={styles.body}>Descrie pe scurt problema. Raportele sunt analizate de echipa noastră.</Text>
                <TextInput
                  style={styles.input}
                  value={reason}
                  onChangeText={(value) => { setReason(value); setError(null); }}
                  placeholder="Motivul raportului"
                  placeholderTextColor={Colors.textLight}
                  multiline
                  maxLength={REPORT_REASON_MAX_LENGTH}
                  editable={!busy}
                />
                {error && <Text style={styles.errorText}>{error}</Text>}
                <TouchableOpacity style={[styles.confirm, busy && styles.disabled]} onPress={submitReport} disabled={busy} accessibilityRole="button">
                  {busy ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.confirmText}>Trimite raportul</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.title}>Blochezi {targetName}?</Text>
                <Text style={styles.body}>Nu vei mai vedea mesajele acestui utilizator în chat.</Text>
                {error && <Text style={styles.errorText}>{error}</Text>}
                <TouchableOpacity style={[styles.confirm, styles.confirmDanger, busy && styles.disabled]} onPress={submitBlock} disabled={busy} accessibilityRole="button">
                  {busy ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.confirmText}>Blochează</Text>}
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.cancel} onPress={close} disabled={busy} accessibilityRole="button">
              <Text style={styles.cancelText}>Anulează</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  button: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: Colors.neutral100,
  },
  blockButton: { backgroundColor: Colors.errorBg },
  buttonText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary },
  blockText: { color: Colors.error },
  doneText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.success },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 24, gap: 12 },
  title: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  body: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
  input: {
    minHeight: 96, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: BorderRadius.md,
    padding: 12, fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.text, textAlignVertical: 'top',
  },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.error },
  confirm: {
    backgroundColor: Colors.royalBlue, borderRadius: BorderRadius.md,
    paddingVertical: 14, alignItems: 'center', minHeight: 48, justifyContent: 'center',
  },
  confirmDanger: { backgroundColor: Colors.error },
  confirmText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.white },
  cancel: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textSecondary },
  disabled: { opacity: 0.6 },
});
