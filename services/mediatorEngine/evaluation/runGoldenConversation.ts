import type { GoldenConversation } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type { MediationState, SessionMemory } from '@/types/mediator';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { runMediatorEngineTurn } from '@/services/mediatorEngine/runtime/runMediatorEngineTurn';
import {
  buildGoldenRuntimeInput,
  conversationHasMessages,
  filterParticipantMessages,
} from '@/services/mediatorEngine/evaluation/mapGoldenToRuntime';
import type { ConversationRunResult, TurnTrace } from '@/services/mediatorEngine/evaluation/types';

export async function runGoldenConversation(
  conversation: GoldenConversation
): Promise<ConversationRunResult> {
  if (!conversationHasMessages(conversation)) {
    return {
      conversationId: conversation.id,
      status: 'SKIPPED',
      skipReason: 'messages_missing',
      executedTurns: 0,
      turns: [],
    };
  }

  const participantMessages = filterParticipantMessages(conversation.messages!);
  let mediationState: MediationState | null = null;
  let sessionMemory: SessionMemory = createEmptySessionMemory();
  const turns: TurnTrace[] = [];

  try {
    for (let index = 0; index < participantMessages.length; index += 1) {
      const message = participantMessages[index];
      const turnNumber = index + 1;
      const speaker = message.speaker as 'host' | 'partner';

      const runtimeInput = buildGoldenRuntimeInput({
        conversation,
        message,
        turnNumber,
        messageIndex: index + 1,
        mediationState,
        sessionMemory,
      });

      const output = await runMediatorEngineTurn(runtimeInput);
      const decision = output.orchestratedTurn.explainability.decisionExplanation.outcome;

      turns.push({
        turnNumber,
        speaker,
        inputMessage: message.text,
        currentGoal: output.orchestratedTurn.explainability.currentGoal,
        strategy: decision.strategy,
        interventionType: decision.interventionType,
        goalTransition: decision.goalTransition,
        sessionMemory: output.orchestratedTurn.sessionMemory,
        mediationState: output.orchestratedTurn.mediationState,
        finalMediatorMessage: output.finalMediatorMessage,
        safetyLevel: output.finalMediatorMessage.safetyLevel,
        compliance: output.orchestratedTurn.complianceResult,
      });

      mediationState = output.orchestratedTurn.mediationState;
      sessionMemory = output.orchestratedTurn.sessionMemory;
    }

    return {
      conversationId: conversation.id,
      status: 'PASS',
      executedTurns: turns.length,
      turns,
    };
  } catch (error) {
    return {
      conversationId: conversation.id,
      status: 'FAILED',
      executedTurns: turns.length,
      turns,
      failureReason: error instanceof Error ? error.message : String(error),
    };
  }
}
