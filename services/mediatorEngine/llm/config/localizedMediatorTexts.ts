import type { MediatorLang } from '@/types/mediator';

export type LocalizedTextMode = 'normal' | 'safety';

/** Normal mediator fallback/stub texts for all supported languages. */
export const LOCALIZED_NORMAL_TEXT: Record<MediatorLang, string> = {
  en: 'I hear that this is difficult for both of you. Let us take a moment and speak one at a time.',
  pl: 'Słyszę, że to jest trudne dla was obojga. Zatrzymajmy się na chwilę i mówcie po kolei.',
  es: 'Escucho que esto es difícil para ambos. Tomemos un momento y hablemos uno a la vez.',
  it: 'Sento che questo momento è difficile per entrambi. Prendiamoci un momento e parliamo a turno.',
  de: 'Ich höre, dass das für Sie beide schwierig ist. Lassen Sie uns kurz innehalten und nacheinander sprechen.',
  fr: 'J\'entends que cela est difficile pour vous deux. Prenons un moment et parlons l\'un après l\'autre.',
};

/** Safety-aware fallback/stub texts for all supported languages. */
export const LOCALIZED_SAFETY_TEXT: Record<MediatorLang, string> = {
  en: 'I want to pause here for safety. Please take a slow breath. We can stop and step back before continuing.',
  pl: 'Chcę tu zrobić pauzę ze względu na bezpieczeństwo. Weźcie proszę spokojny oddech. Możemy zatrzymać rozmowę i wrócić do niej dopiero wtedy, gdy będzie spokojniej.',
  es: 'Quiero hacer una pausa aquí por seguridad. Por favor, respiren despacio. Podemos detener la conversación y retomarla cuando estén más tranquilos.',
  it: 'Voglio fare una pausa qui per sicurezza. Per favore, fate un respiro lento. Possiamo fermare la conversazione e riprenderla quando sarà più calmo.',
  de: 'Ich möchte hier aus Sicherheitsgründen eine Pause machen. Bitte atmet ruhig. Wir können das Gespräch stoppen und fortsetzen, wenn es ruhiger ist.',
  fr: 'Je veux faire une pause ici pour la sécurité. Prenez une respiration lente, s\'il vous plaît. Nous pouvons arrêter la conversation et la reprendre quand ce sera plus calme.',
};

/** Returns localized mediator text for the given language and mode. */
export function localizedMediatorText(language: MediatorLang, mode: LocalizedTextMode): string {
  return mode === 'safety' ? LOCALIZED_SAFETY_TEXT[language] : LOCALIZED_NORMAL_TEXT[language];
}

export const SUPPORTED_MEDIATOR_LANGS: MediatorLang[] = ['pl', 'en', 'es', 'it', 'de', 'fr'];

/** Human-readable language names for prompt instructions. */
export const LANGUAGE_DISPLAY_NAMES: Record<MediatorLang, string> = {
  pl: 'Polish',
  en: 'English',
  es: 'Spanish',
  it: 'Italian',
  de: 'German',
  fr: 'French',
};
