import { useLang } from '../../../shared/i18n/LanguageContext';

export function LegalNote() {
  const { lang } = useLang();
  if (lang !== 'en') return null;
  return <p className="legal-note">Official version in Spanish. This page shows the official Spanish text.</p>;
}
