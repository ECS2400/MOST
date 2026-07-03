// Most App — AI Mediator Service
// Phase 1-2 tips use curated Polish prompts.
// Phase 2 mirror analysis calls the analyze-perspectives Edge Function.
// Phase 3 real-time coaching calls the realtimecoach Edge Function.
// Fallback to local mocked responses if Edge Functions are unavailable.

import { DisputePhase, PhaseData } from '@/types';
import { callEdge, EDGE } from '@/services/supabase';

export interface AIMediatorResponse {
  message: string;
  type?: 'warning' | 'celebration' | 'suggestion' | 'break' | 'tip' | 'prompt';
  suggestions?: string[];
}

export interface MessageAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  response: AIMediatorResponse | null;
  indicator: '🟢' | '🟡' | '🔴';
}

export interface MirrorAnalysis {
  emotionsSummary: string;
  needsSummary: string;
  bridgeStatement: string;
}

// ─── Local fallback prompts ───────────────────────────────────────────────────
const phase1Prompts = [
  'Spróbuj opisać konkretne zachowanie, a nie osobę. Zamiast "jesteś nieodpowiedzialny", powiedz "kiedy X się dzieje, czuję Y".',
  'Co jest dla Ciebie najważniejsze w tej kwestii? Spróbuj dotrzeć do swoich głębszych potrzeb.',
  'Opisz sytuację z perspektywy faktów — co się konkretnie wydarzyło? Unikaj interpretacji.',
  'Twoja perspektywa jest ważna. AI przeczyta ją i pomoże Twojemu partnerowi zrozumieć Twój punkt widzenia.',
];

const phase2Prompts = [
  'Faza lustra polega na potwierdzeniu uczuć partnera — nie na ocenianiu ich słuszności.',
  'Spróbuj odpowiedzieć: "Słyszę, że czujesz... i rozumiem dlaczego..."',
  'Zrozumienie nie oznacza zgody. Możesz rozumieć punkt widzenia partnera, nawet jeśli się z nim nie zgadzasz.',
];

const phase3Prompts = [
  'Szukacie wspólnego rozwiązania — nie kompromisu, lecz syntezy, gdzie oboje zyskujecie.',
  'Zamiast skupiać się na przeszłości, pomyślcie o przyszłości: jak chcecie, żeby to wyglądało za miesiąc?',
  'Jesteście tu razem — to już wielki krok. Rozmawiajcie powoli, słuchajcie uważnie.',
];

const phase4Suggestions = [
  'Świetna praca! Upewnijcie się, że ustalenia są konkretne, mierzalne i terminowe.',
  'Warto ustalić, kiedy sprawdzicie postępy — np. za tydzień.',
  'Gratulacje za dotarcie do tej fazy! Sama gotowość do rozmowy to już duże osiągnięcie.',
];

// ─── Local real-time analysis patterns ───────────────────────────────────────
const negativePatterns = [
  { pattern: /ty zawsze/i, type: 'generalization' },
  { pattern: /ty nigdy/i, type: 'generalization' },
  { pattern: /jesteś taki/i, type: 'labeling' },
  { pattern: /jesteś taka/i, type: 'labeling' },
  { pattern: /to twoja wina/i, type: 'blame' },
  { pattern: /przez ciebie/i, type: 'blame' },
  { pattern: /nie rozumiesz/i, type: 'dismissal' },
  { pattern: /nie słuchasz/i, type: 'dismissal' },
];

const positivePatterns = [
  { pattern: /rozumiem/i, type: 'understanding' },
  { pattern: /słyszę cię/i, type: 'listening' },
  { pattern: /masz rację/i, type: 'agreement' },
  { pattern: /przepraszam/i, type: 'apology' },
  { pattern: /dziękuję/i, type: 'gratitude' },
  { pattern: /czuję się/i, type: 'feelings' },
  { pattern: /potrzebuję/i, type: 'needs' },
];

const warningResponses: Record<string, string[]> = {
  generalization: [
    '⚠️ Zauważam generalizację. Spróbuj: "Czuję się... gdy..." zamiast "Ty zawsze/nigdy..."',
  ],
  labeling: [
    '⚠️ Etykietowanie osoby zamiast opisywania zachowania może zablokować dialog. Opisz konkretne zachowanie.',
  ],
  blame: [
    '⚠️ Szukanie winnego utrudnia znalezienie rozwiązania. Skup się na swoich uczuciach i potrzebach.',
  ],
  dismissal: [
    '⚠️ Spróbuj zapytać zamiast stwierdzać: "Pomóż mi zrozumieć, co masz na myśli".',
  ],
};

const celebrationResponses: Record<string, string[]> = {
  understanding: ['💜 Świetnie! "Rozumiem" to jeden z najpotężniejszych mostów porozumienia.'],
  listening: ['💜 "Słyszę cię" — to buduje most. Tak trzymać!'],
  agreement: ['💜 Uznanie racji partnera wymaga odwagi. To buduje zaufanie.'],
  apology: ['💜 Przeproszenie wymaga siły. To bardzo ważny krok.'],
  gratitude: ['💜 Wdzięczność w konflikcie to rzadka i cenna rzecz. Brawo!'],
  feelings: ['🟢 Wyrażasz swoje uczucia zamiast atakować — to właśnie chodzi!'],
  needs: ['🟢 Wyrażasz swoje potrzeby — to klucz do zrozumienia.'],
};

const breakSuggestions = [
  '🧘 Zauważam, że emocje są teraz wysokie. Może warto wziąć 10-minutową przerwę?',
  '🧘 Widzę napięcie w rozmowie. Głęboki oddech, herbata, 10 minut — i wracajcie z nową energią.',
];

const inactivityPrompts = [
  'Jak się czujecie? Może spróbujcie: "Chcę, żebyś wiedział/a..."',
  'Jesteśmy tu razem. Kiedy będziecie gotowi, powiedzcie sobie jedno dobre słowo.',
];

const mirrorEmotionsFallback = [
  ['sfrustrowany/a', 'niezrozumiany/a', 'samotny/a w tej kwestii'],
  ['rozczarowany/a', 'zmęczony/a', 'potrzebujący/a wsparcia'],
];

const mirrorNeedsFallback = [
  ['uznania i docenienia', 'poczucia bezpieczeństwa', 'lepszej komunikacji'],
  ['bliskości emocjonalnej', 'bycia usłyszanym/ą', 'zrozumienia'],
];

const resolutionTemplates = [
  (title: string) =>
    `Na podstawie Waszych potrzeb proponuję: Ustalcie regularne spotkania poświęcone rozmowie o "${title}". Oboje zgadzacie się słuchać bez przerywania i wyrażać potrzeby przez "ja" zamiast "ty".`,
  (title: string) =>
    `Propozycja: Przez najbliższy miesiąc każde z Was robi jeden konkretny krok w kierunku lepszego rozwiązania kwestii "${title}". Za miesiąc wracacie do tematu razem.`,
];

const summaryLessons = [
  'Nauczyliście się, że wyrażanie potrzeb zamiast oczekiwania, że partner je odgadnie, otwiera drzwi do prawdziwego porozumienia.',
  'Przekonaliście się, że zrozumienie nie wymaga zgody — można słuchać i szanować perspektywę, nawet gdy się różni.',
];

const summaryKeyMoments = [
  'Kluczowy moment: gdy oboje zdecydowaliście się słuchać, nie walczyć.',
  'Kluczowy moment: wzajemne potwierdzenie, że oboje chcecie dobrego dla tej relacji.',
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getMediatorTip(phase: DisputePhase): Promise<AIMediatorResponse> {
  await simulateDelay(400);
  let message = '';
  switch (phase) {
    case 1: message = randomFrom(phase1Prompts); break;
    case 2: message = randomFrom(phase2Prompts); break;
    case 3: message = randomFrom(phase3Prompts); break;
    case 4: message = randomFrom(phase4Suggestions); break;
  }
  return { message, type: 'tip' };
}

export async function askMediator(
  question: string,
  phase: DisputePhase,
  disputeTitle: string
): Promise<AIMediatorResponse> {
  try {
    const result = await callEdge<{ message: string }>(EDGE.realtimeCoach, {
      message: question,
      previousMessages: [],
      language: 'pl',
      context: 'ask_mediator',
      phase,
      disputeTitle,
    });
    return { message: result.message || '', type: 'suggestion' };
  } catch {
    await simulateDelay(800);
    return {
      message: `W kontekście sporu o "${disputeTitle}" — pamiętajcie, że oboje chcecie dobrego wyniku. To Was łączy, nie dzieli.`,
      type: 'suggestion',
    };
  }
}

/**
 * Real-time analysis of a single chat message.
 * Tries Edge Function realtimecoach first, falls back to local pattern matching.
 */
export async function analyzeMessage(
  content: string,
  recentNegativeCount: number,
  previousMessages: { content: string; isAI: boolean }[] = [],
  language = 'pl'
): Promise<MessageAnalysis> {
  // Run local pattern analysis first (instant)
  const lower = content.toLowerCase();
  let sentimentScore = 0;
  let detectedNegativeType: string | null = null;
  let detectedPositiveType: string | null = null;

  for (const { pattern, type } of negativePatterns) {
    if (pattern.test(lower)) {
      sentimentScore -= 0.6;
      detectedNegativeType = type;
      break;
    }
  }
  for (const { pattern, type } of positivePatterns) {
    if (pattern.test(lower)) {
      sentimentScore += 0.5;
      detectedPositiveType = type;
      break;
    }
  }

  sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
  const sentiment: MessageAnalysis['sentiment'] =
    sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'neutral';
  const indicator: MessageAnalysis['indicator'] =
    sentiment === 'positive' ? '🟢' : sentiment === 'neutral' ? '🟡' : '🔴';

  let localResponse: AIMediatorResponse | null = null;

  if (recentNegativeCount >= 3 && sentiment === 'negative') {
    localResponse = { message: randomFrom(breakSuggestions), type: 'break' };
  } else if (detectedNegativeType && warningResponses[detectedNegativeType]) {
    localResponse = { message: randomFrom(warningResponses[detectedNegativeType]), type: 'warning' };
  } else if (detectedPositiveType && celebrationResponses[detectedPositiveType]) {
    localResponse = { message: randomFrom(celebrationResponses[detectedPositiveType]), type: 'celebration' };
  }

  // If local analysis found something, try to enrich with Edge Function
  if (localResponse || Math.random() > 0.6) {
    try {
      const msgs = previousMessages.slice(-6).map((m) => ({
        role: m.isAI ? 'assistant' : 'user',
        content: m.content,
      }));
      const result = await callEdge<{ message?: string; type?: string; coaching?: string }>(
        EDGE.realtimeCoach,
        { message: content, previousMessages: msgs, language }
      );
      const aiMessage = result.message || result.coaching;
      if (aiMessage && aiMessage.trim()) {
        return {
          sentiment,
          sentimentScore,
          indicator,
          response: {
            message: aiMessage,
            type: (result.type as any) || localResponse?.type || 'suggestion',
          },
        };
      }
    } catch {
      // Fallback to local response
    }
  }

  return { sentiment, sentimentScore, indicator, response: localResponse };
}

export async function getInactivityPrompt(): Promise<AIMediatorResponse> {
  return { message: randomFrom(inactivityPrompts), type: 'prompt' };
}

/**
 * Phase 2 mirror analysis — calls analyze-perspectives Edge Function.
 * Falls back to local if unavailable.
 */
export async function getMirrorAnalysis(
  disputeTitle: string,
  perspectiveA?: string,
  perspectiveB?: string,
  language = 'pl'
): Promise<MirrorAnalysis> {
  if (perspectiveA && perspectiveB) {
    try {
      const result = await callEdge<{
        emotions?: string;
        common_ground?: string;
        misunderstanding?: string;
        suggestions?: string[];
        celebration?: string;
        emotionsSummary?: string;
        needsSummary?: string;
        bridgeStatement?: string;
      }>(EDGE.analyzePerspectives, {
        perspectiveA,
        perspectiveB,
        category: disputeTitle,
        language,
      });

      // Handle different response shapes from the edge function
      return {
        emotionsSummary:
          result.emotionsSummary ||
          result.emotions ||
          `W tej sytuacji oboje możecie czuć różne emocje. Są to naturalne reakcje na konflikt.`,
        needsSummary:
          result.needsSummary ||
          result.common_ground ||
          `Za Waszymi stanowiskami kryją się wspólne potrzeby — oboje chcecie bezpiecznej i pełnej miłości relacji.`,
        bridgeStatement:
          result.bridgeStatement ||
          result.celebration ||
          `Spór o "${disputeTitle}" to zaproszenie do głębszego poznania siebie nawzajem.`,
      };
    } catch {
      // Fall through to local fallback
    }
  }

  // Local fallback
  await simulateDelay(2000);
  const emotions = randomFrom(mirrorEmotionsFallback);
  const needs = randomFrom(mirrorNeedsFallback);
  return {
    emotionsSummary: `W tej sytuacji oboje możecie czuć się: ${emotions.join(', ')}. Są to naturalne reakcje na konflikt.`,
    needsSummary: `Za Waszymi stanowiskami kryją się potrzeby: ${needs.join(', ')}. Oboje chcecie tego samego — bezpiecznej i pełnej miłości relacji.`,
    bridgeStatement: `Spór o "${disputeTitle}" to zaproszenie do głębszego poznania siebie nawzajem. Jesteście gotowi na wspólną przestrzeń.`,
  };
}

export async function getResolutionSuggestion(
  user1Data: PhaseData,
  user2Data: PhaseData,
  disputeTitle: string
): Promise<string> {
  try {
    const result = await callEdge<{ message?: string; suggestion?: string }>(
      EDGE.realtimeCoach,
      {
        message: `Zaproponuj konkretne rozwiązanie sporu: "${disputeTitle}"`,
        previousMessages: [],
        language: 'pl',
        context: 'resolution',
      }
    );
    const suggestion = result.message || result.suggestion;
    if (suggestion) return suggestion;
  } catch {}
  await simulateDelay(800);
  return randomFrom(resolutionTemplates)(disputeTitle);
}

export async function getResolutionSummary(
  disputeTitle: string
): Promise<{ lesson: string; keyMoment: string }> {
  await simulateDelay(600);
  return {
    lesson: randomFrom(summaryLessons),
    keyMoment: randomFrom(summaryKeyMoments),
  };
}
