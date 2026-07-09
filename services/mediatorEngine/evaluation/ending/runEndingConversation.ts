import type { EndingConversation } from '@/services/mediatorEngine/__tests__/endingConversations/types';
import type { ConversationMessage } from '@/services/mediatorEngine/__tests__/goldenConversations/types';
import type { MediationState, SessionMemory } from '@/types/mediator';
import type { LlmProviderPort } from '@/types/mediator';
import { createEmptySessionMemory } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import { runMediatorEngineTurn } from '@/services/mediatorEngine/runtime/runMediatorEngineTurn';
import {
  buildGoldenRuntimeInput,
  filterParticipantMessages,
} from '@/services/mediatorEngine/evaluation/mapGoldenToRuntime';
import type { ConversationRunResult, TurnTrace } from '@/services/mediatorEngine/evaluation/types';
import type { EndingConversationRunResult } from '@/services/mediatorEngine/evaluation/ending/types';

export interface RunEndingConversationOptions {
  llmProvider?: LlmProviderPort;
}

/** Minimalny adapter — ending używa tego samego runtime input co golden, bez modyfikacji GOLDEN_CONVERSATIONS. */
function asGoldenRunSource(conversation: EndingConversation): {
  id: string;
  messages: ConversationMessage[];
} {
  return { id: conversation.id, messages: conversation.messages };
}

export async function runEndingConversation(
  conversation: EndingConversation,
  options?: RunEndingConversationOptions
): Promise<EndingConversationRunResult> {
  const runSource = asGoldenRunSource(conversation);
  const participantMessages = filterParticipantMessages(runSource.messages);
  let mediationState: MediationState | null = null;
  let sessionMemory: SessionMemory = createEmptySessionMemory();
  const turns: TurnTrace[] = [];

  try {
    for (let index = 0; index < participantMessages.length; index += 1) {
      const message = participantMessages[index];
      const turnNumber = index + 1;
      const speaker = message.speaker as 'host' | 'partner';

      const runtimeInput = buildGoldenRuntimeInput({
        conversation: runSource as Parameters<typeof buildGoldenRuntimeInput>[0]['conversation'],
        message,
        turnNumber,
        messageIndex: index + 1,
        mediationState,
        sessionMemory,
      });

      if (options?.llmProvider) {
        runtimeInput.llmProvider = options.llmProvider;
      }

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

    const baseResult: EndingConversationRunResult = {
      conversationId: conversation.id,
      status: 'PASS',
      executedTurns: turns.length,
      turns,
    };

    const provider = options?.llmProvider;
    if (provider?.providerId === 'ending-aware-stub' && turns.length > 0) {
      const lastTurn = turns.at(-1)!;
      const providerResponse = await provider.generateText({
        systemPrompt: '',
        developerPrompt: '',
        userPrompt: lastTurn.inputMessage,
        modelHints: {},
        metadata: {
          turnNumber: lastTurn.turnNumber,
          language: 'pl',
          safetyLevel: lastTurn.safetyLevel,
          interventionType: lastTurn.interventionType,
          goal: lastTurn.currentGoal,
        },
      });
      baseResult.endingEvaluationText = providerResponse.text.trim();
    }

    return baseResult;
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
