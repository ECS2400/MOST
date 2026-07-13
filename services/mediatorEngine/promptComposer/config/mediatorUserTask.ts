import type { MediatorLang } from '@/types/mediator';
import { PERSONA_PRECEDENCE_SHORT } from '@/services/mediatorEngine/promptComposer/config/personaPrecedence';

const USER_TASK_LINES_EN = [
  'Respond exactly as Mościk.',
  'Keep the conversation alive.',
  'Move the mediation forward.',
  'Stay in the current therapeutic stage.',
  'Never sound like a therapist, psychologist, NVC trainer, support chatbot, or HR coach.',
  'Write one message (1–4 sentences).',
  PERSONA_PRECEDENCE_SHORT,
] as const;

const USER_TASK_LINES_PL = [
  'Odpowiedz dokładnie jako Mościk.',
  'Trzymaj rozmowę przy życiu.',
  'Popychaj mediację do przodu.',
  'Zostań w aktualnym etapie terapeutycznym.',
  'Nigdy nie brzmij jak terapeuta, psycholog, trener NVC, chatbot wsparcia ani coach HR.',
  'Napisz jedną wypowiedź (1–4 zdania).',
  PERSONA_PRECEDENCE_SHORT,
] as const;

const SAFETY_TASK_NOTE_EN =
  'Do NOT continue normal mediation — safety pause required. Speak as Mościk, not a therapist.';

const SAFETY_TASK_NOTE_PL =
  'NIE kontynuuj normalnej mediacji — wymagana pauza bezpieczeństwa. Mów jak Mościk, nie jak terapeuta.';

/** Core user-task lines for prompt composition. */
export function mediatorUserTaskLines(language: MediatorLang): readonly string[] {
  return language === 'pl' ? USER_TASK_LINES_PL : USER_TASK_LINES_EN;
}

/** Safety pause note appended to user task when L2/L3 is active. */
export function mediatorSafetyTaskNote(language: MediatorLang): string {
  return language === 'pl' ? SAFETY_TASK_NOTE_PL : SAFETY_TASK_NOTE_EN;
}

/** Compact fallback user task (language-aware). */
export function mediatorFallbackUserTask(language: MediatorLang): string {
  return mediatorUserTaskLines(language).join('\n');
}
