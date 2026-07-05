import type { ConfidenceValue, ExpectedEffectEvaluation } from '@/types/mediator';
import { REFLECTION_THRESHOLDS } from '@/services/mediatorEngine/reflection/config/reflectionThresholds';
import { confidenceFromRatio, reflectionConfidence } from '@/services/mediatorEngine/reflection/lib/confidence';
import type { SafeReflectionContext } from '@/services/mediatorEngine/reflection/lib/safeReflectionInput';

type SignalChecker = (ctx: SafeReflectionContext) => boolean;

const STRUCTURAL_SIGNAL_CHECKS: Record<string, SignalChecker> = {
  participant_response: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  engagement: (ctx) => ctx.transcriptMeta.hasHostMessage && ctx.transcriptMeta.hasPartnerMessage,
  calm_tone: (ctx) => !ctx.stateAfter.dynamics?.escalationDetected,
  calmer_tone: (ctx) => {
    const before = ctx.stateBefore.dynamics?.escalationLevel ?? 0;
    const after = ctx.stateAfter.dynamics?.escalationLevel ?? 0;
    return after <= before;
  },
  acknowledgment: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  confirmation: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  recognition: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  emotion_named: (ctx) =>
    !!ctx.stateAfter.participants?.host?.namedEmotion ||
    !!ctx.stateAfter.participants?.partner?.namedEmotion,
  need_named: (ctx) =>
    !!ctx.stateAfter.participants?.host?.namedNeed ||
    !!ctx.stateAfter.participants?.partner?.namedNeed,
  deeper_share: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  perspective_shift: (ctx) => ctx.stateAfter.dynamics?.mutualUnderstandingScore > (ctx.stateBefore.dynamics?.mutualUnderstandingScore ?? 0),
  rule_discussion: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  plan_discussion: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  mutual_acknowledgment: (ctx) =>
    ctx.transcriptMeta.hasHostMessage && ctx.transcriptMeta.hasPartnerMessage,
  lower_intensity: (ctx) => {
    const before = ctx.stateBefore.dynamics?.escalationLevel ?? 0;
    const after = ctx.stateAfter.dynamics?.escalationLevel ?? 0;
    return after < before;
  },
  less_blame: (ctx) => !ctx.stateAfter.dynamics?.blameLoopDetected,
  self_focus: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  return_to_topic: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  pause_accepted: (ctx) => (ctx.stateAfter.dynamics?.pauseAcceptedBy?.length ?? 0) > 0,
  goal_recall: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  reflection_engagement: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  closure_signal: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  agreement_signal: (ctx) => ctx.stateAfter.agreements?.acceptedByBoth === true,
  safety_acknowledgment: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
  trust_restored: (ctx) => ctx.stateAfter.recovery !== null,
  tone_shift: (ctx) => ctx.transcriptMeta.nonEmptyMessageCount > 0,
};

function checkSignal(signal: string, ctx: SafeReflectionContext): boolean {
  const checker = STRUCTURAL_SIGNAL_CHECKS[signal];
  if (checker) return checker(ctx);
  return ctx.transcriptMeta.nonEmptyMessageCount > 0;
}

/** Evaluates expected effect achievement using structural signals only. */
export function evaluateExpectedEffect(
  ctx: SafeReflectionContext
): ExpectedEffectEvaluation | null {
  const effect = ctx.expectedEffect;
  if (!effect) return null;

  const signals = Array.isArray(effect.observableSignals) ? effect.observableSignals : [];
  if (signals.length === 0) {
    return {
      effectId: effect.id,
      achieved: false,
      confidence: REFLECTION_THRESHOLDS.lowConfidence,
      evidence: ['no-signals-defined'],
      partial: false,
    };
  }

  const metSignals: string[] = [];
  const unmetSignals: string[] = [];

  for (const signal of signals) {
    if (typeof signal !== 'string') continue;
    if (checkSignal(signal, ctx)) {
      metSignals.push(signal);
    } else {
      unmetSignals.push(signal);
    }
  }

  const achieved = metSignals.length === signals.length;
  const partial = metSignals.length > 0 && !achieved;
  const confidence = confidenceFromRatio(metSignals.length, signals.length);

  const evidence = metSignals.map((s) => `signal:${s}`);
  if (unmetSignals.length > 0) {
    evidence.push(`unmet:${unmetSignals.join(',')}`);
  }

  return {
    effectId: effect.id,
    achieved,
    confidence,
    evidence,
    partial,
  };
}

/** Returns true when the prior expected effect verification window has expired. */
export function isExpectedEffectStale(ctx: SafeReflectionContext): boolean {
  const meta = ctx.stateAfter.lastInterventionMeta;
  if (!meta || typeof meta.turnNumber !== 'number') return false;
  const elapsed = ctx.turnNumber - meta.turnNumber;
  const horizon = meta.expectedEffect?.timeHorizon ?? 1;
  return elapsed > horizon + REFLECTION_THRESHOLDS.expectedEffectStaleTurns - 1;
}

/** Returns true when the same intervention type was recently flagged ineffective. */
export function hasRepeatedIneffectivePattern(ctx: SafeReflectionContext): boolean {
  if (ctx.recentIneffectiveTypes.includes(ctx.lastInterventionType)) return true;

  const prev = ctx.previousReflection;
  if (
    prev?.lastInterventionHelpful?.value === false &&
    prev.shouldChangeStrategy === true
  ) {
    return true;
  }

  return false;
}
