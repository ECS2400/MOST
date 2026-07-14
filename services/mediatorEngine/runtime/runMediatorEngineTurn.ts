import type { MediatorRuntimeInput, MediatorRuntimeOutput } from '@/types/mediator';
import { hydrateMediationParticipantNames } from '@/services/mediatorEngine/participants/hydrateMediationParticipantNames';
import { orchestrateTurn } from '@/services/mediatorEngine/orchestrator/orchestrateTurn';
import { composePrompt } from '@/services/mediatorEngine/promptComposer/composePrompt';
import { createFallbackMediatorReply } from '@/services/mediatorEngine/llm/fallback/createFallbackMediatorReply';
import { buildPromptComposerInputFromTurn } from '@/services/mediatorEngine/runtime/lib/buildPromptComposerInputFromTurn';
import { safeRuntimeInput } from '@/services/mediatorEngine/runtime/lib/safeRuntimeInput';
import { applyRuntimeClientEvents } from '@/services/mediatorEngine/clientEvents/applyRuntimeClientEvents';
import { runReplyRetryLoop } from '@/services/mediatorEngine/runtime/retry/runReplyRetryLoop';
import {
  buildFinalMediatorMessage,
  resolveFinalDraftReply,
} from '@/services/mediatorEngine/runtime/final/buildFinalMediatorMessage';
import { buildRuntimeOutput } from '@/services/mediatorEngine/runtime/resolve/buildRuntimeOutput';
import { logRuntimeTurnContext, previewText } from '@/services/mediatorEngine/edge/runtimeTurnTraceDevLog';
import { RUNTIME_LIMITS } from '@/services/mediatorEngine/runtime/config/runtimeLimits';
import {
  createEmptyMediationState,
  createEmptyIntervention,
} from '@/services/mediatorEngine/_internal/skeletonDefaults';

/**
 * Executes the full Mediator Engine runtime flow for one turn.
 *
 * orchestrateTurn → composePrompt → generateMediatorReply → validateMediatorReply → finalMediatorMessage
 *
 * Never throws. Does not call live LLM APIs by default.
 */
export async function runMediatorEngineTurn(
  input: MediatorRuntimeInput | unknown
): Promise<MediatorRuntimeOutput> {
  const startedAt = new Date().toISOString();

  try {
    const ctx = safeRuntimeInput(input);

    const stateBefore =
      ctx.turnInput.mediationState ?? createEmptyMediationState(ctx.turnInput);

    const clientEventResult = applyRuntimeClientEvents({
      mediationState: stateBefore,
      sessionMemory: ctx.sessionMemory,
      clientEvents: ctx.turnInput.clientEvents ?? [],
    });

    const hydratedState = clientEventResult.mediationState
      ? hydrateMediationParticipantNames(
          clientEventResult.mediationState,
          ctx.turnInput.participantNames,
          ctx.language
        )
      : null;

    const turnInput = {
      ...ctx.turnInput,
      language: ctx.language,
      mediationState: hydratedState,
    };

    const orchestratedTurn = orchestrateTurn({
      request: turnInput,
      sessionMemory: clientEventResult.sessionMemory,
    });

    const promptInput = buildPromptComposerInputFromTurn(
      turnInput,
      ctx.sessionMemory,
      orchestratedTurn,
      ctx.language
    );

    const safetyLevel = promptInput.safetyOutput?.level ?? 'none';
    const promptComposerOutput = composePrompt(promptInput);

    const recentRefs = promptComposerOutput.promptMetadata.recentMediatorMessageRefs ?? [];
    logRuntimeTurnContext({
      mediationId: ctx.turnInput.mediationId,
      turnNumber: ctx.turnInput.turnNumber,
      trigger: ctx.turnInput.trigger,
      participantReplyCount: (ctx.turnInput.transcriptDelta ?? []).filter(
        (entry) => entry.authorRole === 'host' || entry.authorRole === 'partner'
      ).length,
      participantReplies: (ctx.turnInput.transcriptDelta ?? [])
        .filter((entry) => entry.authorRole === 'host' || entry.authorRole === 'partner')
        .map((entry) => ({
          role: entry.authorRole,
          messageId: entry.id,
          contentPreview: previewText(entry.content, 120),
        })),
      transcriptDeltaCount: ctx.turnInput.transcriptDelta?.length ?? 0,
      transcriptWindowCount: promptInput.transcriptWindow?.length ?? 0,
      recentMediatorMessageCount: recentRefs.length,
      recentMediatorMessages: recentRefs.map((entry) => ({
        messageId: entry.id,
        contentPreview: previewText(entry.content, 120),
      })),
    });

    const retryResult = await runReplyRetryLoop({
      promptComposerOutput,
      ctx,
      safetyLevel,
      turnNumber: ctx.turnInput.turnNumber,
    });

    const finalDraft = resolveFinalDraftReply(retryResult.responseValidation);
    const complianceOk = orchestratedTurn.complianceResult.compliant;
    const validationAction = complianceOk
      ? retryResult.responseValidation.action
      : 'fallback';
    const replyForFinal =
      complianceOk
        ? finalDraft
        : createFallbackMediatorReply(
            ctx.language,
            safetyLevel,
            ctx.turnInput.turnNumber,
            orchestratedTurn.complianceResult.violations.map((v) => v.ruleId)
          );

    const finalMediatorMessage = buildFinalMediatorMessage(
      replyForFinal,
      validationAction,
      ctx.language,
      safetyLevel,
      ctx.turnInput.turnNumber
    );

    const completedAt = new Date().toISOString();

    return buildRuntimeOutput({
      ctx,
      orchestratedTurn,
      promptComposerOutput,
      retryResult,
      finalMediatorMessage,
      startedAt,
      completedAt,
    });
  } catch {
    return buildEmergencyRuntimeOutput(input, startedAt);
  }
}

function buildEmergencyRuntimeOutput(
  input: MediatorRuntimeInput | unknown,
  startedAt: string
): MediatorRuntimeOutput {
  const completedAt = new Date().toISOString();
  const ctx = safeRuntimeInput(input);
  const fallbackReply = createFallbackMediatorReply(ctx.language, 'none', ctx.turnInput.turnNumber);

  let orchestratedTurn;
  try {
    orchestratedTurn = orchestrateTurn({
      request: ctx.turnInput,
      sessionMemory: ctx.sessionMemory,
    });
  } catch {
    orchestratedTurn = {
      mediationState: createEmptyMediationState(ctx.turnInput),
      intervention: createEmptyIntervention(ctx.turnInput.turnNumber),
      sessionMemory: ctx.sessionMemory,
      evidenceStore: {} as never,
      explainability: {} as never,
      complianceResult: {
        compliant: true,
        violations: [],
        attemptNumber: 1,
        fallbackUsed: false,
        validatedAt: completedAt,
        validatorLayer: 'deterministic',
      },
      engineVersion: RUNTIME_LIMITS.engineVersion as 'v2.3',
    };
  }

  const promptComposerOutput = composePrompt(null as never);

  return buildRuntimeOutput({
    ctx,
    orchestratedTurn,
    promptComposerOutput,
    retryResult: {
      llmOutput: {
        draftReply: fallbackReply,
        fallbackUsed: true,
        generatedAt: completedAt,
      },
      responseValidation: {
        valid: false,
        action: 'fallback',
        ruleResults: [],
        blockingReasons: ['Unexpected runtime error'],
        warningReasons: [],
        retryInstruction: null,
        fallbackReply,
        validatedReply: fallbackReply,
        validatedAt: completedAt,
      },
      retryCount: 0,
      fallbackUsed: true,
    },
    finalMediatorMessage: buildFinalMediatorMessage(
      fallbackReply,
      'fallback',
      ctx.language,
      'none',
      ctx.turnInput.turnNumber
    ),
    startedAt,
    completedAt,
  });
}
