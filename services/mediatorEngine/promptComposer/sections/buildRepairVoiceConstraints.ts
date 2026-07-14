import type { MediatorLang } from '@/types/mediator';

const REPAIR_VOICE_LINES: Record<MediatorLang, string[]> = {
  pl: [
    '=== Repair voice (override) ===',
    'Uczestnik skrytykował powtarzanie lub samą aplikację — przełącz się na repair_voice.',
    'Krótko przyznaj, że poprzednie podejście było powtarzalne (lekki, samokrytyczny ton).',
    'Zmień strategię interwencji — nie parafrazuj tego samego pytania.',
    'Zadaj jedno nowe pytanie o inny konkretny moment lub sprzeczność.',
    'Maksymalnie 3 krótkie zdania. Bez korpo-empatii i bez psychologizowania.',
  ],
  en: [
    '=== Repair voice (override) ===',
    'A participant criticized repetition or the app — switch to repair_voice.',
    'Briefly admit the previous approach was repetitive (light, self-deprecating tone).',
    'Change intervention strategy — do not paraphrase the same question.',
    'Ask one new question about a different concrete moment or contradiction.',
    'Maximum 3 short sentences. No corporate empathy or therapizing.',
  ],
  es: [
    '=== Repair voice (override) ===',
    'Un participante criticó la repetición o la app — usa repair_voice.',
    'Admite brevemente que el enfoque anterior era repetitivo.',
    'Cambia la estrategia — no parafrasees la misma pregunta.',
    'Haz una pregunta nueva sobre otro momento concreto o contradicción.',
    'Máximo 3 frases cortas.',
  ],
  it: [
    '=== Repair voice (override) ===',
    'Un partecipante ha criticato la ripetizione o l\'app — usa repair_voice.',
    'Ammetti brevemente che l\'approccio precedente era ripetitivo.',
    'Cambia strategia — non parafrasare la stessa domanda.',
    'Fai una nuova domanda su un momento concreto diverso o una contraddizione.',
    'Massimo 3 frasi brevi.',
  ],
  de: [
    '=== Repair voice (override) ===',
    'Ein Teilnehmer hat Wiederholung oder die App kritisiert — nutze repair_voice.',
    'Gib kurz zu, dass der vorherige Ansatz repetitiv war.',
    'Wechsle die Strategie — paraphrasiere nicht dieselbe Frage.',
    'Stelle eine neue Frage zu einem anderen konkreten Moment oder Widerspruch.',
    'Maximal 3 kurze Sätze.',
  ],
  fr: [
    '=== Repair voice (override) ===',
    'Un participant a critiqué la répétition ou l\'app — passe en repair_voice.',
    'Admets brièvement que l\'approche précédente était répétitive.',
    'Change de stratégie — ne paraphrase pas la même question.',
    'Pose une nouvelle question sur un autre moment concret ou une contradiction.',
    'Maximum 3 phrases courtes.',
  ],
};

/** Repair-voice prompt override — takes precedence over normal stage wording. */
export function buildRepairVoiceConstraints(language: MediatorLang): string[] {
  return REPAIR_VOICE_LINES[language] ?? REPAIR_VOICE_LINES.en;
}
