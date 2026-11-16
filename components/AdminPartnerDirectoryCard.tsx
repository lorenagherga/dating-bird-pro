import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Crown, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import {
  deletePartnerListing,
  fetchPartnerListings,
  getPartnerKindLabel,
  type PartnerListing,
} from '@/lib/partner-directory';
import { AdminPartnerListingForm } from '@/components/AdminPartnerListingForm';

type EditorState = { listing: PartnerListing | null } | null;

export function AdminPartnerDirectoryCard() {
  const [listings, setListings] = useState<PartnerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setListings(await fetchPartnerListings());
    } catch {
      setLoadError('Lista de parteneri nu a putut fi încărcată.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = (listing: PartnerListing) => {
    Alert.alert('Șterge partenerul', `Ștergeți "${listing.breeder_name}" din lista de parteneri?`, [
      { text: 'Anulează', style: 'cancel' },
      {
        text: 'Șterge',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePartnerListing(listing.id);
            load();
          } catch {
            setLoadError('Ștergerea nu a reușit. Încercați din nou.');
          }
        },
      },
    ]);
  };

  const handleSaved = () => {
    setEditor(null);
    load();
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Crown color={Colors.gold} size={20} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Parteneri & Crescători Elite</Text>
          <Text style={styles.hint}>Doar partenerii adăugați aici apar în pagina publică.</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={Colors.royalBlue} style={styles.spinner} />
      ) : loadError ? (
        <Text style={styles.errorText}>{loadError}</Text>
      ) : listings.length === 0 ? (
        <Text style={styles.emptyText}>Niciun partener adăugat încă.</Text>
      ) : (
        <View style={styles.list}>
          {listings.map((listing) => (
            <View key={listing.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={1}>{listing.breeder_name}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {getPartnerKindLabel(listing.partner_kind)}
                  {listing.locality ? ` · ${listing.locality}` : ''}
                  {listing.user_id ? ' · cont legat' : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setEditor({ listing })}
                accessibilityRole="button"
                accessibilityLabel="Editează"
              >
                <Pencil color={Colors.royalBlue} size={18} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => handleDelete(listing)}
                accessibilityRole="button"
                accessibilityLabel="Șterge"
              >
                <Trash2 color={Colors.error} size={18} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.addBtn} onPress={() => setEditor({ listing: null })} accessibilityRole="button">
        <Plus color={Colors.royalBlue} size={18} />
        <Text style={styles.addBtnText}>Adaugă partener</Text>
      </TouchableOpacity>

      <Modal visible={editor !== null} animationType="slide" transparent={false} onRequestClose={() => setEditor(null)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editor?.listing ? 'Editează partenerul' : 'Partener nou'}</Text>
            <TouchableOpacity onPress={() => setEditor(null)} accessibilityRole="button" accessibilityLabel="Închide">
              <X color={Colors.text} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            {editor && (
              <AdminPartnerListingForm
                key={editor.listing?.id ?? 'new'}
                listing={editor.listing}
                onSaved={handleSaved}
              />
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 32,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    gap: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.goldPale,
    justifyContent: 'center', alignItems: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontFamily: 'Inter-Bold', fontSize: 17, color: Colors.text },
  hint: { fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  spinner: { marginVertical: 8 },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.textSecondary },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.error },
  list: { gap: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.neutral50, borderRadius: 12, paddingLeft: 14, paddingRight: 6, paddingVertical: 8,
  },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.text },
  rowMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.textSecondary },
  iconBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.royalBlue, borderStyle: 'dashed',
    paddingVertical: 12,
  },
  addBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.royalBlue },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 50, paddingBottom: 16,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  modalTitle: { fontFamily: 'Inter-Bold', fontSize: 20, color: Colors.text },
  modalBody: { padding: 24, paddingBottom: 48 },
});
