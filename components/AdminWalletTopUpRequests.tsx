import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Eye, X } from 'lucide-react-native';
import { Colors, BorderRadius } from '@/lib/theme';
import {
  approveCommissionTopUp,
  fetchPendingTopUpRequests,
  formatLei,
  getPaymentProofUrl,
  rejectCommissionTopUp,
  type PendingTopUpRequest,
} from '@/lib/commission-wallet';

export function AdminWalletTopUpRequests() {
  const [requests, setRequests] = useState<PendingTopUpRequest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRequests(await fetchPendingTopUpRequests());
      setLoadError(null);
    } catch (cause) {
      console.error('top-up requests load failed', cause);
      setLoadError('Cererile nu pot fi încărcate acum. Încearcă din nou mai târziu.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleViewProof = async (path: string) => {
    setActionError(null);
    try {
      setViewerUri(await getPaymentProofUrl(path));
    } catch (cause) {
      console.error('payment proof open failed', cause);
      setActionError('Dovada nu a putut fi deschisă. Încearcă din nou.');
    }
  };

  const handleDecision = async (requestId: string, decide: () => Promise<unknown>) => {
    setActionError(null);
    setBusyId(requestId);
    try {
      await decide();
      await load();
    } catch (cause) {
      console.error('top-up decision failed', cause);
      setActionError('Cererea nu a putut fi actualizată. Încearcă din nou.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Cereri de încărcare portofel</Text>
        {requests !== null && <Text style={styles.count}>{requests.length}</Text>}
      </View>

      {loadError ? (
        <Text style={styles.errorText}>{loadError}</Text>
      ) : requests === null ? (
        <ActivityIndicator color={Colors.royalBlue} />
      ) : requests.length === 0 ? (
        <Text style={styles.emptyText}>Nu există cereri în așteptare.</Text>
      ) : (
        requests.map((request) => {
          const busy = busyId === request.t_id;
          return (
            <View key={request.t_id} style={styles.item}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{request.t_user_name || request.t_user_email || 'Utilizator'}</Text>
                {request.t_user_email ? <Text style={styles.itemMeta}>{request.t_user_email}</Text> : null}
                <Text style={styles.itemAmount}>{formatLei(Number(request.t_amount))}</Text>
                {request.t_note ? <Text style={styles.itemMeta}>{request.t_note}</Text> : null}
                <Text style={styles.itemMeta}>{new Date(request.t_created_at).toLocaleString('ro-RO')}</Text>
              </View>

              <View style={styles.itemActions}>
                {request.t_proof_path ? (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => handleViewProof(request.t_proof_path as string)}
                    disabled={busy}
                  >
                    <Eye color={Colors.royalBlue} size={16} />
                    <Text style={styles.secondaryBtnText}>Vezi dovada foto</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.noProofText}>Fără dovadă foto</Text>
                )}
                <View style={styles.decisionRow}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, busy && styles.btnDisabled]}
                    onPress={() => handleDecision(request.t_id, () => rejectCommissionTopUp(request.t_id))}
                    disabled={busy}
                  >
                    <Text style={styles.rejectBtnText}>Respinge</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approveBtn, busy && styles.btnDisabled]}
                    onPress={() => handleDecision(request.t_id, () => approveCommissionTopUp(request.t_id))}
                    disabled={busy}
                  >
                    {busy ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <Text style={styles.approveBtnText}>Aprobă</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })
      )}

      {actionError && <Text style={styles.errorText}>{actionError}</Text>}

      <ProofViewer uri={viewerUri} onClose={() => setViewerUri(null)} />
    </View>
  );
}

function ProofViewer({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  return (
    <Modal visible={uri !== null} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={styles.viewerContainer}>
        <TouchableOpacity style={styles.viewerClose} onPress={onClose} accessibilityLabel="Închide">
          <X color={Colors.white} size={24} />
        </TouchableOpacity>
        {uri ? <Image source={{ uri }} style={styles.viewerImage} resizeMode="contain" /> : null}
      </View>
    </Modal>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: 'Inter-Bold', fontSize: 16, color: Colors.text },
  count: { fontFamily: 'Inter-Bold', fontSize: 13, color: Colors.royalBlue },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textLight },
  errorText: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.error },
  item: {
    gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  itemInfo: { gap: 2 },
  itemName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.text },
  itemMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  itemAmount: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.royalBlue, marginTop: 2 },
  itemActions: { gap: 8 },
  noProofText: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textLight },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: BorderRadius.md, backgroundColor: Colors.royalBluePale,
  },
  secondaryBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  decisionRow: { flexDirection: 'row', gap: 8 },
  rejectBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10,
    borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.error,
  },
  rejectBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.error },
  approveBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10,
    borderRadius: BorderRadius.md, backgroundColor: Colors.royalBlue,
  },
  approveBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.white },
  btnDisabled: { opacity: 0.6 },
  viewerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  viewerClose: {
    position: 'absolute', top: 48, right: 20, zIndex: 2,
    padding: 10, borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  viewerImage: { width: '100%', height: '100%' },
});
