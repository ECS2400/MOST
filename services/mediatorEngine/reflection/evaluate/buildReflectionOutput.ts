import type { ReflectionOutput } from '@/types/mediator';
import { createEmptyReflectionOutput } from '@/services/mediatorEngine/_internal/skeletonDefaults';
import {
  evaluateConversationProgress,
  evaluateLastInterventionHelpful,
} from '@/services/mediatorEngine/reflection/evaluate/evaluateConversationProgress';
import { evaluateExpectedEffect } from '@/services/mediatorEngine/reflection/evaluate/evaluateExpectedEffect';
import { evaluateReadiness } from '@/services/mediatorEngine/reflection/evaluate/evaluateReadiness';
import { evaluateStrategyShift } from '@/services/mediatorEngine/reflection/evaluate/evaluateStrategyShift';
import { reflectionConfidence } from '@/services/mediatorEngine/reflection/lib/confidence';
import type { SafeReflectionContext } from '@/services/mediatorEngine/reflection/lib/safeReflectionInput';
import { REFLECTION_THRESHOLDS } from '@/services/mediatorEngine/reflection/config/reflectionThresholds';

function buildRiskFlags(
  ctx: SafeReflectionContext,
  shouldChangeStrategy: boolean,
  conversationMovedForward: boolean
) {
  const repeatRisk = ctx.recentIneffectiveTypes.includes(ctx.lastInterventionType);
  const stuckRisk = !conversationMovedForward && shouldChangeStrategy;
  const drillDownRisk =
    ctx.stateAfter.dynamics?.blameLoopDetected === true ||
    (ctx.stateAfter.dynamics?.escalationLevel ?? 0) > 2;

  return {
    repeatRisk: reflectionConfidence(
      repeatRisk,
      repeatRisk ? REFLECTION_THRESHOLDS.highConfidence : REFLECTION_THRESHOLDS.mediumConfidence,
      repeatRisk ? ['repeated-ineffective-type'] : []
    ),
    stuckRisk: reflectionConfidence(
      stuckRisk,
      stuckRisk ? REFLECTION_THRESHOLDS.highConfidence : REFLECTION_THRESHOLDS.mediumConfidence,
      stuckRisk ? ['stuck-no-progress'] : []
    ),
    drillDownRisk: reflectionConfidence(
      drillDownRisk,
      drillDownRisk ? REFLECTION_THRESHOLDS.highConfidence : REFLECTION_THRESHOLDS.lowConfidence,
      drillDownRisk ? ['high-escalation-or-blame'] : []
    ),
  };
}

function buildReflectionNotes(
  shouldChangeStrategy: boolean,
  recommendedShift: string,
  movedForward: boolean,
  helpful: boolean
): string {
  const parts: string[] = [];
  parts.push(`helpful=${helpful}`);
  parts.push(`moved=${movedForward}`);
  if (shouldChangeStrategy) parts.push(`shift=${recommendedShift}`);
  return parts.join('; ');
}

/** Assembles the full ReflectionOutput from normalized L1 evaluation results. */
export function buildReflectionOutput(ctx: SafeReflectionContext): ReflectionOutput {
  const base = createEmptyReflectionOutput();
  const progress = evaluateConversationProgress(ctx);
  const lastInterventionHelpful = evaluateLastInterventionHelpful(ctx);
  const conversationMovedForward = progress.conversationMovedForward;
  const expectedEffectEvaluation = evaluateExpectedEffect(ctx);
  const partnerReadiness = evaluateReadiness(ctx, conversationMovedForward.value);
  const strategy = evaluateStrategyShift({
    ctx,
    lastInterventionHelpful: lastInterventionHelpful.value,
    conversationMovedForward: conversationMovedForward.value,
    expectedEffectEvaluation,
  });
  const risks = buildRiskFlags(
    ctx,
    strategy.shouldChangeStrategy,
    conversationMovedForward.value
  );

  const bothReady =
    partnerReadiness.host.readyToAdvance.value &&
    partnerReadiness.partner.readyToAdvance.value;

  return {
    ...base,
    understoodPartners: reflectionConfidence(
      bothReady,
      bothReady ? REFLECTION_THRESHOLDS.highConfidence : REFLECTION_THRESHOLDS.mediumConfidence,
      bothReady ? ['both-ready'] : ['readiness-pending']
    ),
    lastInterventionHelpful,
    conversationMovedForward,
    shouldChangeStrategy: strategy.shouldChangeStrategy,
    repeatRisk: risks.repeatRisk,
    drillDownRisk: risks.drillDownRisk,
    stuckRisk: risks.stuckRisk,
    recommendedStrategyShift: strategy.recommendedStrategyShift,
    reflectionNotes: buildReflectionNotes(
      strategy.shouldChangeStrategy,
      strategy.recommendedStrategyShift,
      conversationMovedForward.value,
      lastInterventionHelpful.value
    ),
    expectedEffectEvaluation,
    partnerReadiness,
    strategyRecommendation: {
      preferStrategyChange: strategy.shouldChangeStrategy,
      suggestedStrategy: strategy.shouldChangeStrategy
        ? ctx.stateAfter.activeStrategy?.primary ?? null
        : null,
      reason: strategy.shouldChangeStrategy
        ? `L1 shift: ${strategy.recommendedStrategyShift}`
        : '',
      confidence: strategy.shouldChangeStrategy
        ? REFLECTION_THRESHOLDS.highConfidence
        : REFLECTION_THRESHOLDS.mediumConfidence,
    },
    paceRecommendation: {
      suggestedPace:
        strategy.recommendedStrategyShift === 'slow_down' ||
        strategy.recommendedStrategyShift === 'pause'
          ? 'slow'
          : strategy.recommendedStrategyShift === 'consolidate'
            ? 'normal'
            : null,
      reason:
        strategy.recommendedStrategyShift === 'slow_down'
          ? 'load-or-stall-detected'
          : strategy.recommendedStrategyShift === 'pause'
            ? 'safety-active'
            : '',
    },
    loadRecommendation: {
      acknowledgeLoad: ctx.stateAfter.load?.exhaustionDetected?.value === true,
      targetParticipant:
        (ctx.stateAfter.load?.host?.value ?? 0) >= (ctx.stateAfter.load?.partner?.value ?? 0)
          ? 'host'
          : 'partner',
    },
  };
}
