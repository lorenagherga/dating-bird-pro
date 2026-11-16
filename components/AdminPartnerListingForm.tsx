import { useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CheckSquare, ImagePlus, Square, X as XIcon } from 'lucide-react-native';
import { Colors } from '@/lib/theme';
import {
  NO_PARTNER_BENEFITS,
  PARTNER_BENEFITS,
  PARTNER_KIND_OPTIONS,
  findUserIdByEmail,
  savePartnerListing,
  uploadPartnerLogo,
  type PartnerBenefitKey,
  type PartnerBenefits,
  type PartnerKind,
  type PartnerListing,
} from '@/lib/partner-directory';

interface FormState extends PartnerBenefits {
  breeder_name: string;
  partner_kind: PartnerKind;
  locality: string;
  description: string;
  external_link: string;
  logo_url: string | null;
  account_email: string;
}

interface AdminPartnerListingFormProps {
  listing: PartnerListing | null;
  onSaved: () => void;
}

export function AdminPartnerListingForm({ listing, onSaved }: AdminPartnerListingFormProps) {
  const [form, setForm] = useState<FormState>(() => ({
    breeder_name: listing?.breeder_name ?? '',
    partner_kind: listing?.partner_kind ?? 'breeder',
    locality: listing?.locality ?? '',
    description: listing?.description ?? '',
    external_link: listing?.external_link ?? '',
    logo_url: listing?.logo_url ?? null,
    account_email: '',
    ...(listing
      ? {
          benefit_free_pro: listing.benefit_free_pro,
          benefit_preferential_commission: listing.benefit_preferential_commission,
          benefit_top_placement: listing.benefit_top_placement,
        }
      : NO_PARTNER_BENEFITS),
  }));
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setError(null);
  };

  const toggleBenefit = (key: PartnerBenefitKey) => {
    update({ [key]: !form[key] } as Partial<FormState>);
  };

  const pickLogo = async () => {
    setError(null);
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Permisiunea pentru galerie este necesară.');
        return;
      }
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (picked.canceled || !picked.assets[0]) return;

    setUploadingLogo(true);
    try {
      const url = await uploadPartnerLogo(picked.assets[0].uri);
      update({ logo_url: url });
    } catch {
      setError('Încărcarea logo-ului nu a reușit. Încercați din nou.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    const name = form.breeder_name.trim();
    const link = form.external_link.trim();
    if (!name) {
      setError('Introduceți numele partenerului.');
      return;
    }
    if (link && !/^https?:\/\//i.test(link)) {
      setError('Linkul trebuie să înceapă cu http:// sau https://');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let userId = listing?.user_id ?? null;
      const email = form.account_email.trim();
      if (email) {
        userId = await findUserIdByEmail(email);
        if (!userId) {
          setError('Nu există niciun cont cu acest email.');
          return;
        }
      }
      await savePartnerListing(listing?.id ?? null, {
        breeder_name: name,
        logo_url: form.logo_url,
        partner_kind: form.partner_kind,
        locality: form.locality.trim() || null,
        description: form.description.trim(),
        external_link: link || null,
        user_id: userId,
        benefit_free_pro: form.benefit_free_pro,
        benefit_preferential_commission: form.benefit_preferential_commission,
        benefit_top_placement: form.benefit_top_placement,
      });
      onSaved();
    } catch {
      setError('Salvarea nu a reușit. Încercați din nou.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <Text style={styles.label}>Logo</Text>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            {form.logo_url ? (
              <Image source={{ uri: form.logo_url }} style={styles.logoImage} resizeMode="cover" />
            ) : (
              <ImagePlus color={Colors.textLight} size={22} />
            )}
          </View>
          <TouchableOpacity
            style={styles.logoBtn}
            onPress={pickLogo}
            disabled={uploadingLogo}
            accessibilityRole="button"
          >
            {uploadingLogo ? (
              <ActivityIndicator size="small" color={Colors.royalBlue} />
            ) : (
              <Text style={styles.logoBtnText}>{form.logo_url ? 'Schimbă logo' : 'Încarcă logo'}</Text>
            )}
          </TouchableOpacity>
          {form.logo_url && (
            <TouchableOpacity
              onPress={() => update({ logo_url: null })}
              accessibilityRole="button"
              accessibilityLabel="Elimină logo"
              style={styles.logoRemove}
            >
              <XIcon color={Colors.error} size={16} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Tip partener</Text>
        <View style={styles.kindRow}>
          {PARTNER_KIND_OPTIONS.map((option) => {
            const active = form.partner_kind === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.kindChip, active && styles.kindChipActive]}
                onPress={() => update({ partner_kind: option.value })}
                accessibilityRole="button"
              >
                <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Nume</Text>
        <TextInput
          style={styles.input}
          value={form.breeder_name}
          onChangeText={(value) => update({ breeder_name: value })}
          placeholderTextColor={Colors.textLight}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Localitate</Text>
        <TextInput
          style={styles.input}
          value={form.locality}
          onChangeText={(value) => update({ locality: value })}
          placeholderTextColor={Colors.textLight}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Descriere</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.description}
          onChangeText={(value) => update({ description: value })}
          multiline
          textAlignVertical="top"
          placeholderTextColor={Colors.textLight}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Link extern (promovare reciprocă)</Text>
        <TextInput
          style={styles.input}
          value={form.external_link}
          onChangeText={(value) => update({ external_link: value })}
          placeholder="https://"
          placeholderTextColor={Colors.textLight}
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Beneficii partener</Text>
        {PARTNER_BENEFITS.map((benefit) => {
          const checked = form[benefit.key];
          const Box = checked ? CheckSquare : Square;
          return (
            <TouchableOpacity
              key={benefit.key}
              style={styles.benefitRow}
              onPress={() => toggleBenefit(benefit.key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
            >
              <Box color={checked ? Colors.royalBlue : Colors.textLight} size={20} />
              <Text style={styles.benefitText}>{benefit.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Email cont asociat (pentru licitații)</Text>
        <TextInput
          style={styles.input}
          value={form.account_email}
          onChangeText={(value) => update({ account_email: value })}
          placeholder={listing?.user_id ? 'Cont deja asociat. Completați doar pentru a schimba.' : 'opțional'}
          placeholderTextColor={Colors.textLight}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.saveBtn, (saving || uploadingLogo) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving || uploadingLogo}
        accessibilityRole="button"
      >
        {saving ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <Text style={styles.saveBtnText}>Salvează</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary },
  input: {
    fontFamily: 'Inter-Regular', fontSize: 15, color: Colors.text,
    backgroundColor: Colors.neutral50, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  textArea: { minHeight: 96 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: {
    width: 64, height: 64, borderRadius: 12, backgroundColor: Colors.neutral100,
    borderWidth: 1, borderColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  logoImage: { width: 64, height: 64 },
  logoBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.royalBluePale, minWidth: 120, alignItems: 'center',
  },
  logoBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.royalBlue },
  logoRemove: { padding: 8 },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kindChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.neutral100, borderWidth: 1, borderColor: Colors.borderLight,
  },
  kindChipActive: { backgroundColor: Colors.royalBluePale, borderColor: Colors.royalBlue },
  kindChipText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textSecondary },
  kindChipTextActive: { color: Colors.royalBlue },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  benefitText: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 14, color: Colors.text },
  errorText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.error },
  saveBtn: {
    backgroundColor: Colors.royalBlue, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', minHeight: 48,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontFamily: 'Inter-Bold', fontSize: 15, color: Colors.white },
});
