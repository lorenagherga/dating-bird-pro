import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { Colors } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

export function DeleteAccountButton() {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeConfirm = () => {
    if (deleting) return;
    setConfirmVisible(false);
    setError(null);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke('delete-account');
    if (invokeError || (data as { error?: string } | null)?.error) {
      setDeleting(false);
      setError(t('deleteAccountFailed'));
      return;
    }
    setDeleting(false);
    setConfirmVisible(false);
    await signOut();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => setConfirmVisible(true)}
        accessibilityRole="button"
      >
        <Trash2 color={Colors.white} size={20} />
        <Text style={styles.deleteButtonText}>{t('deleteAccountButton')}</Text>
      </TouchableOpacity>

      <Modal visible={confirmVisible} animationType="fade" transparent onRequestClose={closeConfirm}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}>
              <Trash2 color={Colors.error} size={24} />
            </View>
            <Text style={styles.dialogTitle}>{t('deleteAccountTitle')}</Text>
            <Text style={styles.dialogBody}>{t('deleteAccountBody')}</Text>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.confirmButton, deleting && styles.disabled]}
              onPress={handleDelete}
              disabled={deleting}
              accessibilityRole="button"
            >
              {deleting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.confirmButtonText}>{t('deleteAccountConfirm')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={closeConfirm}
              disabled={deleting}
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.error,
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 52,
  },
  deleteButtonText: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.white },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  dialogIcon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.errorBg,
    justifyContent: 'center', alignItems: 'center',
  },
  dialogTitle: { fontFamily: 'Inter-Bold', fontSize: 18, color: Colors.text },
  dialogBody: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21, color: Colors.textSecondary },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.error },
  confirmButton: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  confirmButtonText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.white },
  cancelButton: { alignItems: 'center', paddingVertical: 12 },
  cancelButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textSecondary },
  disabled: { opacity: 0.6 },
});
