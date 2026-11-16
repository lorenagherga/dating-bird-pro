import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { jsPDF } from 'jspdf';
import type { PdfFonts } from '@/lib/pdf/pdf-builder';

const APP_LOGO = require('@/assets/images/icon.png');
const ROBOTO_REGULAR = require('@expo-google-fonts/roboto/400Regular/Roboto_400Regular.ttf');
const ROBOTO_BOLD = require('@expo-google-fonts/roboto/700Bold/Roboto_700Bold.ttf');

export interface PdfAssets extends PdfFonts {
  logoDataUrl: string | null;
}

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

async function readAssetBase64(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (Platform.OS === 'web') {
    const buffer = await (await fetch(uri)).arrayBuffer();
    return bytesToBase64(new Uint8Array(buffer));
  }
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export async function loadPdfAssets(): Promise<PdfAssets> {
  const [logoBase64, regular, bold] = await Promise.all([
    readAssetBase64(APP_LOGO).catch(() => null),
    readAssetBase64(ROBOTO_REGULAR),
    readAssetBase64(ROBOTO_BOLD),
  ]);
  return {
    logoDataUrl: logoBase64 ? `data:image/png;base64,${logoBase64}` : null,
    regular,
    bold,
  };
}

export async function savePdf(doc: jsPDF, fileName: string): Promise<void> {
  if (Platform.OS === 'web') {
    doc.save(fileName);
    return;
  }

  const base64 = doc.output('datauristring').split(',')[1];

  if (Platform.OS === 'android') {
    const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permission.granted) {
      const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permission.directoryUri,
        fileName.replace(/\.pdf$/i, ''),
        'application/pdf'
      );
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      return;
    }
  }

  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: fileName });
}
