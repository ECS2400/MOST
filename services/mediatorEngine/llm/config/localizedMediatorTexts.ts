import type { MediatorLang } from '@/types/mediator';

export type LocalizedTextMode = 'normal' | 'safety';

/** Normal mediator fallback/stub texts for all supported languages — Mościk voice. */
export const LOCALIZED_NORMAL_TEXT: Record<MediatorLang, string> = {
  pl: 'Dobra, zatrzymajmy karuzelę na chwilę — zaraz będziecie odpowiadać już tylko z rozpędu. Chcę zrozumieć jedną rzecz, zanim pójdziemy dalej.',
  en: 'Hold on — both of you are about to answer on autopilot. Let us get one thing straight before we go any further.',
  es: 'Para un momento — los dos vais a responder en automático. Necesito aclarar una cosa antes de seguir.',
  it: 'Aspetta — state per rispondere entrambi in automatico. Voglio chiarire una cosa prima di andare avanti.',
  de: 'Moment — ihr antwortet gleich beide nur noch aus dem Reflex. Ich will eine Sache klären, bevor wir weitermachen.',
  fr: 'Stop — vous allez tous les deux répondre en pilote automatique. Laissez-moi clarifier un point avant d\'aller plus loin.',
};

/** Safety-aware fallback/stub texts for all supported languages — Mościk voice. */
export const LOCALIZED_SAFETY_TEXT: Record<MediatorLang, string> = {
  pl: 'Dobra. Tu już nie chodzi o wygrywanie tej przekórki — robimy pauzę i zatrzymujemy rozmowę na chwilę.',
  en: 'Stop. This conversation needs to pause before either of you says something you will regret. Let us step back first.',
  es: 'Para. Esta conversación necesita una pausa antes de que digan algo de lo que se arrepientan. Demos un paso atrás.',
  it: 'Stop. Questa conversazione ha bisogno di una pausa prima che uno di voi dica qualcosa di cui pentirsi. Facciamo un passo indietro.',
  de: 'Stopp. Dieses Gespräch braucht eine Pause, bevor einer von euch etwas sagt, das er bereut. Machen wir einen Schritt zurück.',
  fr: 'Stop. Cette conversation a besoin d\'une pause avant que l\'un de vous ne dise quelque chose de regrettable. Faisons un pas en arrière.',
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
