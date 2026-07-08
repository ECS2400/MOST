import type {
  GoldenConversation,
  ConversationMessage,
} from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type {
  MediatorRuntimeInput,
  MediationState,
  OrchestrateTurnRequest,
  OrchestrateTurnTrigger,
  SessionMemory,
  TranscriptMessage,
} from '@/types/mediator';
import { createDeterministicStubProvider } from '@/services/mediatorEngine/llm/adapters/deterministicStubProvider';
import { RUNTIME_LIMITS } from '@/services/mediatorEngine/runtime/config/runtimeLimits';

const GOLDEN_RUN_CREATED_AT = '2026-07-08T00:00:00.000Z';

export function conversationHasMessages(conversation: GoldenConversation): boolean {
  return Array.isArray(conversation.messages) && conversation.messages.length > 0;
}

export function filterParticipantMessages(messages: ConversationMessage[]): ConversationMessage[] {
  return messages.filter((message) => message.speaker === 'host' || message.speaker === 'partner');
}

export function mapSpeakerToTrigger(speaker: 'host' | 'partner'): OrchestrateTurnTrigger {
  return speaker === 'host' ? 'host_generate' : 'partner_message';
}

export function mapMessageToTranscript(
  message: ConversationMessage,
  conversationId: string,
  turnNumber: number,
  messageIndex: number
): TranscriptMessage {
  return {
    id: `${conversationId}-msg-${messageIndex}`,
    authorRole: message.speaker,
    content: message.text,
    turnNumber,
    createdAt: GOLDEN_RUN_CREATED_AT,
  };
}

export interface BuildGoldenRuntimeInputParams {
  conversation: GoldenConversation;
  message: ConversationMessage;
  turnNumber: number;
  messageIndex: number;
  mediationState: MediationState | null;
  sessionMemory: SessionMemory;
}

export function buildGoldenRuntimeInput(params: BuildGoldenRuntimeInputParams): MediatorRuntimeInput {
  const { conversation, message, turnNumber, messageIndex, mediationState, sessionMemory } = params;
  const speaker = message.speaker as 'host' | 'partner';

  const turnInput: OrchestrateTurnRequest = {
    mediationId: `golden-${conversation.id}`,
    sessionId: `golden-session-${conversation.id}`,
    trigger: mapSpeakerToTrigger(speaker),
    turnNumber,
    mediationState,
    transcriptDelta: [mapMessageToTranscript(message, conversation.id, turnNumber, messageIndex)],
    engineVersion: 'v2.3',
    language: 'pl',
  };

  return {
    turnInput,
    sessionMemory,
    language: 'pl',
    llmProvider: createDeterministicStubProvider(),
    maxReplyAttempts: RUNTIME_LIMITS.defaultMaxReplyAttempts,
  };
}
