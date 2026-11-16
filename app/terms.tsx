import { LegalDocumentView } from '@/components/LegalDocumentView';
import { termsOfService } from '@/lib/legal-content';

export default function TermsScreen() {
  return <LegalDocumentView documents={termsOfService} />;
}
