/**
 * Ending-aware stub LLM provider — TEST ONLY (Phase 5J.2).
 * Używany wyłącznie przez evaluation/ending; nie podpięty do produkcji.
 */

import type { EndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/types';
import { filterParticipantMessages } from '@/services/mediatorEngine/evaluation/mapGoldenToRuntime';
import { localizedMediatorText } from '@/services/mediatorEngine/llm/config/localizedMediatorTexts';
import type { LlmProviderPort, LlmProviderRequest, LlmProviderResponse } from '@/types/mediator';

const FUTURE_PLANNING_ENDING_CLOSURE = [
  'Ustaliliście pierwszy mały krok, nie całą przyszłość naraz: ona potrzebuje, by planowanie mieszkania i pieniędzy nie było tylko na niej i żeby plany się nie rozmywały,',
  'on boi się presji, wyroku i obietnic, których nie da się dowieźć.',
  'Konkret na teraz: jedna spokojna rozmowa w tygodniu, jeden temat naraz, prawo powiedzieć stop i wrócić do tematu następnego dnia.',
  'To nie zamyka całego problemu, ale daje sprawdzalny start — czy taki krok jest dla was obojga wystarczająco bezpieczny na teraz?',
].join(' ');

const BROKEN_PROMISES_ENDING_CLOSURE = [
  'Ustaliliście jeden konkretny krok na ten miesiąc: rachunki po stronie partnera, termin i potwierdzenie po zapłacie bez czekania na przypomnienie.',
  'Host potrzebuje powtarzalnej odpowiedzialności, nie idealnych obietnic; partner boi się znowu zawieść i wejść w rolę listy porażek.',
  'Zaufanie nie wróci jedną rozmową — tylko małymi, dowiezionymi rzeczami; jeśli coś się opóźnia, mówicie wcześniej, nie po fakcie.',
  'To pierwszy test spójności — czy ten krok jest dla was obojga wystarczająco jasny i bezpieczny na teraz?',
].join(' ');

const RECURRING_ARGUMENTS_ENDING_CLOSURE = [
  'Ustaliliście procedurę na kolejną kłótnię, nie jeden temat — ona naciska, bo boi się być zignorowana, on się wycofuje, bo boi się dolać oliwy do ognia.',
  'Wspólny cykl to naciskanie, wycofanie i większe napięcie: hasło stop, 20 minut przerwy, bez gonienia argumentami i bez znikania bez słowa, potem powrót do rozmowy i jedno zdanie — co mnie naprawdę zaboliło.',
  'To nie znaczy, że już nie będziecie się kłócić — tylko procedura na zatrzymanie schematu.',
  'Czy ten sposób jest dla was obojga realistyczny do przetestowania przy następnej kłótni?',
].join(' ');

const FUTURE_PLANNING_MID_PHASE = [
  'Słyszę, że oboje mówicie o przyszłości, ale inaczej reagujecie na planowanie i niepewność.',
  'Zatrzymajmy się przy tym, co każde z Was teraz czuje — bez wchodzenia od razu w wielki plan.',
].join(' ');

const BROKEN_PROMISES_MID_PHASE = [
  'Słyszę utratę zaufania po obu stronach — jedna osoba potrzebuje sprawdzalnej odpowiedzialności, druga boi się kolejnej porażki.',
  'Zatrzymajmy się przy tym, co już ustaliliście, bez wchodzenia w wielką listę napraw.',
].join(' ');

const RECURRING_ARGUMENTS_MID_PHASE = [
  'Słyszę powtarzalny cykl: naciskanie i wycofanie — oboje reagujecie na schemat, nie tylko na temat.',
  'Zatrzymajmy się przy procedurze, którą ustalacie, bez szukania winnego.',
].join(' ');

function isSafetyActive(safetyLevel: string): boolean {
  return safetyLevel === 'L2_pause' || safetyLevel === 'L3_stop';
}

function resolveEndingClosure(conversationId: string): string | null {
  switch (conversationId) {
    case 'future-planning-ending':
      return FUTURE_PLANNING_ENDING_CLOSURE;
    case 'broken-promises-ending':
      return BROKEN_PROMISES_ENDING_CLOSURE;
    case 'recurring-arguments-ending':
      return RECURRING_ARGUMENTS_ENDING_CLOSURE;
    default:
      return null;
  }
}

const EARLY_PHASE_BY_CONVERSATION: Record<string, Record<number, string>> = {
  'future-planning-ending': {
    1: 'Słyszę obie perspektywy. Zatrzymajmy się przy tym, co każde z Was teraz czuje.',
    2: 'Obie strony mówią o przyszłości i o tym, jak inaczej czujecie presję planowania.',
    3: 'Zatrzymajmy się przy emocjach, zanim przejdziemy do konkretów.',
  },
  'broken-promises-ending': {
    1: 'Słyszę, jak bardzo utrata zaufania dotyka was oboje — zatrzymajmy się przy tym, co teraz czujecie.',
    2: 'Jedna strona boi się kolejnej obietnicy, druga zmęczenia rolą przypominającej.',
    3: 'Zatrzymajmy się przy tym, co każde z Was naprawdę potrzebuje — bez wymuszania przeprosin.',
  },
  'recurring-arguments-ending': {
    1: 'Słyszę powtarzalny wzorzec kłótni — zatrzymajmy się przy tym, co każde z Was czuje w eskalacji.',
    2: 'Jedna strona naciska z lęku przed ignorowaniem, druga wycofuje się, by nie pogorszyć sytuacji.',
    3: 'Zatrzymajmy się przy cyklu, nie przy szukaniu winnego.',
  },
};

function earlyPhaseText(conversationId: string, turnNumber: number): string {
  const byTurn = EARLY_PHASE_BY_CONVERSATION[conversationId];
  return (
    byTurn?.[turnNumber] ??
    `Słyszę, co teraz pada w tej rozmowie — zatrzymajmy się przy tym, co jest dla Was najważniejsze (tura ${turnNumber}).`
  );
}

function resolveMidPhaseText(conversationId: string): string {
  switch (conversationId) {
    case 'future-planning-ending':
      return FUTURE_PLANNING_MID_PHASE;
    case 'broken-promises-ending':
      return BROKEN_PROMISES_MID_PHASE;
    case 'recurring-arguments-ending':
      return RECURRING_ARGUMENTS_MID_PHASE;
    default:
      return 'Słyszę obie perspektywy. Zatrzymajmy się przy tym, co każde z Was teraz czuje.';
  }
}

function buildResponse(text: string): LlmProviderResponse {
  return {
    text,
    provider: 'ending-aware-stub',
    model: 'ending-stub-v1',
    latencyMs: 1,
    finishReason: 'stop',
  };
}

/**
 * Stub reagujący na fazę ending conversation — zwraca domknięcie na ostatniej turze.
 * Nie jest LLM-em; służy wyłącznie ending benchmarkowi (Phase 5J).
 */
export function createEndingAwareStubProvider(conversation: EndingConversation): LlmProviderPort {
  const totalTurns = filterParticipantMessages(conversation.messages).length;
  const endingClosure = resolveEndingClosure(conversation.id);
  const midPhaseText = resolveMidPhaseText(conversation.id);

  return {
    providerId: 'ending-aware-stub',
    async generateText(request: LlmProviderRequest): Promise<LlmProviderResponse> {
      const { safetyLevel, language, turnNumber } = request.metadata;

      if (isSafetyActive(safetyLevel)) {
        return buildResponse(localizedMediatorText(language, 'safety'));
      }

      if (turnNumber >= totalTurns && endingClosure) {
        return buildResponse(endingClosure);
      }

      if (turnNumber >= Math.max(1, totalTurns - 2)) {
        return buildResponse(midPhaseText);
      }

      return buildResponse(earlyPhaseText(conversation.id, turnNumber));
    },
  };
}
