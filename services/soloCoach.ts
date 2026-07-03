import AsyncStorage from '@react-native-async-storage/async-storage';
import { callEdge, EDGE } from '@/services/supabase';
import type { MediationAnalysis } from '@/services/mediationAnalysisInterpret';
import type { MappedAnalysisView } from '@/services/analysisViewMapper';
import type { SoloQuizAnswers } from '@/constants/soloQuiz';
import { formatQuizContext } from '@/constants/soloQuiz';
import type { Language } from '@/constants/i18n';
import { getSoloExtras } from '@/constants/i18n/soloExtras';
import { looksLikePolishCoachText } from '@/utils/textTruncate';
import {
  buildCoachReply,
  buildOpeningCoachMessage,
  detectChatMode,
  isRoboticCoachReply,
  isStaleEdgeReply,
  polishCasual,
} from '@/services/soloCoachConversation';

export { buildOpeningCoachMessage };

export interface SoloCoachTurnResult {
  reply: string;
  funFact?: string;
  source?: string;
}

export const SOLO_CHAT_STORAGE_KEY = 'most_solo_chat_session';
export const SOLO_CHAT_MESSAGE_LIMIT = 20;

export interface SoloCoachMessage {
  id: string;
  role: 'user' | 'coach';
  content: string;
  funFact?: string;
  created_at: string;
}

export interface SoloChatSession {
  view: MappedAnalysisView;
  raw: MediationAnalysis;
  combinedDescription: string;
  quizAnswers?: SoloQuizAnswers;
  messages: SoloCoachMessage[];
  createdAt: string;
  /** Rekord w tabeli mediations — ustawiany przy starcie coacha solo. */
  mediationId?: string;
}

function buildAnalysisSummary(raw: MediationAnalysis): Record<string, unknown> {
  const summary: Record<string, unknown> = {};
  for (const key of [
    'analysis_version',
    'situation_summary',
    'emotions_explanation',
    'needs_explanation',
    'what_could_improve',
    'user_emotions',
    'user_needs',
    'key_trigger',
    'suggestion_quote',
    'perspective_gap_detail',
    'partner_emotions',
    'partner_needs',
  ]) {
    const value = raw[key as keyof MediationAnalysis];
    if (value != null && value !== '') summary[key] = value;
  }
  return summary;
}

export async function saveSoloChatSession(session: SoloChatSession): Promise<void> {
  await AsyncStorage.setItem(SOLO_CHAT_STORAGE_KEY, JSON.stringify(session));
}

export async function loadSoloChatSession(): Promise<SoloChatSession | null> {
  const raw = await AsyncStorage.getItem(SOLO_CHAT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SoloChatSession;
  } catch {
    return null;
  }
}

export async function clearSoloChatSession(): Promise<void> {
  await AsyncStorage.removeItem(SOLO_CHAT_STORAGE_KEY);
}

export async function processSoloCoachTurn(
  userMessage: string,
  session: SoloChatSession,
  language: Language = 'pl'
): Promise<SoloCoachTurnResult> {
  const extras = getSoloExtras(language);
  const analysisSummary = buildAnalysisSummary(session.raw);
  const quizGoal =
    typeof session.quizAnswers?.goal === 'string' ? session.quizAnswers.goal : undefined;
  const quizContext = session.quizAnswers ? formatQuizContext(session.quizAnswers, language) : '';

  const history = session.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const chatMode = detectChatMode(history);

  const offlineReply =
    language === 'pl'
      ? polishCasual(buildCoachReply(userMessage, history, session.view, quizGoal))
      : extras.chat.offlineCoachReply;

  try {
    const result = await callEdge<{ reply?: string; funFact?: string; source?: string }>(
      EDGE.soloCoach,
      {
        userMessage,
        language,
        analysisSummary,
        combinedDescription: session.combinedDescription,
        quizContext,
        chatMode,
        recentMessages: history.slice(-20),
      }
    );

    const edgeReply = result.reply?.trim();
    if (edgeReply) {
      const polished = polishCasual(edgeReply);
      const polishOfflineLeak =
        language !== 'pl' &&
        (result.source === 'fallback' || looksLikePolishCoachText(polished));
      const stale =
        language === 'pl' &&
        (result.source === 'fallback' || isStaleEdgeReply(polished, history));
      if (!isRoboticCoachReply(polished) && !polishOfflineLeak && !stale) {
        return {
          reply: polished,
          funFact: result.funFact?.trim() || undefined,
          source: result.source,
        };
      }
    }
  } catch {
    // offline fallback below
  }

  return { reply: offlineReply, source: 'fallback' };
}

export async function fetchOpeningCoachMessage(
  session: SoloChatSession,
  language: Language = 'pl'
): Promise<string> {
  const analysisSummary = buildAnalysisSummary(session.raw);
  const quizContext = session.quizAnswers ? formatQuizContext(session.quizAnswers, language) : '';

  try {
    const result = await callEdge<{ reply?: string; source?: string }>(EDGE.soloCoach, {
      isOpening: true,
      language,
      analysisSummary,
      combinedDescription: session.combinedDescription,
      quizContext,
      chatMode: true,
      recentMessages: [],
    });
    const edgeReply = result.reply?.trim();
    if (edgeReply) {
      const polished = polishCasual(edgeReply);
      const polishLeak = language !== 'pl' && looksLikePolishCoachText(polished);
      if (!polishLeak && !isRoboticCoachReply(polished)) {
        return polished;
      }
    }
  } catch {
    // localized context fallback below
  }

  return buildOpeningCoachMessage(session.view, language);
}
