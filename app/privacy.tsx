import { LegalDocumentView } from '@/components/LegalDocumentView';
import { privacyPolicy } from '@/lib/legal-content';

export default function PrivacyScreen() {
  return <LegalDocumentView documents={privacyPolicy} />;
}
