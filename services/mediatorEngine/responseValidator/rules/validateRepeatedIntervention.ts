import type { ResponseValidationRuleResult } from '@/types/mediator';
import type { ResponseValidationContext } from '@/types/mediator';
import {
  analyzeRepeatedInterventionDetailed,
} from '@/services/mediatorEngine/responseValidator/lib/repetitionAnalysis';
import { logRepeatedInterventionMatch } from '@/services/mediatorEngine/edge/runtimeTurnTraceDevLog';

const RULE_ID = 'repeated_intervention';

/** Blocks mediator replies that repeat a recent intervention across turns. */
export function validateRepeatedIntervention(
  ctx: ResponseValidationContext
): ResponseValidationRuleResult {
  const recent = ctx.recentMediatorMessages ?? [];
  const refs = ctx.recentMediatorMessageRefs ?? [];
  const analysis = analyzeRepeatedInterventionDetailed({
    draftText: ctx.text,
    recentMediatorMessages: recent,
    interventionType: undefined,
    knownNames: [],
  });

  if (!analysis.repeated) {
    logRepeatedInterventionMatch({
      turnNumber: ctx.turnNumber,
      attemptNumber: ctx.attemptNumber,
      candidateText: ctx.text,
      ruleDecision: 'pass',
    });
    return {
      ruleId: RULE_ID,
      passed: true,
      severity: 'block',
      reason: 'No repeated intervention detected',
    };
  }

  const best = analysis.bestMatch;
  const priorRef = best ? refs[best.priorIndex] : undefined;
  logRepeatedInterventionMatch({
    turnNumber: ctx.turnNumber,
    attemptNumber: ctx.attemptNumber,
    candidateText: ctx.text,
    matchedPriorMessageId: priorRef?.id ?? (best ? `recent-${best.priorIndex}` : null),
    matchedPriorText: best?.priorText ?? null,
    matchedPhrase: best?.matchedPhrase ?? null,
    similarityScore: best?.tokenOverlap ?? null,
    threshold: best?.tokenOverlapThreshold ?? null,
    ruleDecision: 'block',
    matchDetail: best,
  });

  return {
    ruleId: RULE_ID,
    passed: false,
    severity: 'block',
    reason: `Repeated intervention: ${analysis.reasons.join('; ')}`,
    metadata: { reasonCount: analysis.reasons.length },
    repetitionMatchDetail: best
      ? {
          priorIndex: best.priorIndex,
          priorText: best.priorText,
          matchedPhrase: best.matchedPhrase,
          matchTypes: best.matchTypes,
          tokenOverlap: best.tokenOverlap,
          phraseHitCount: best.phraseHitCount,
          questionOverlap: best.questionOverlap,
          matchedReasons: best.matchedReasons,
        }
      : undefined,
  };
}
