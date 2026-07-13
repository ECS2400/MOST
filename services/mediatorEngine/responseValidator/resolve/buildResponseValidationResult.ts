import type {
  DraftMediatorReply,
  ResponseValidationAction,
  ResponseValidationResult,
  ResponseValidationRuleResult,
} from '@/types/mediator';
import type { ResponseValidationContext } from '@/types/mediator';
import { buildValidatedFallback } from '@/services/mediatorEngine/responseValidator/fallback/buildValidatedFallback';
import { buildRetryInstruction } from '@/services/mediatorEngine/responseValidator/retry/buildRetryInstruction';
import { runAllValidationRules } from '@/services/mediatorEngine/responseValidator/rules';

function resolveAction(
  hasBlockingFailures: boolean,
  attemptNumber: number,
  maxAttempts: number
): ResponseValidationAction {
  if (!hasBlockingFailures) return 'accept';
  if (attemptNumber < maxAttempts) return 'retry';
  return 'fallback';
}

/** Assembles the final ResponseValidationResult from rule outcomes. */
export function buildResponseValidationResult(
  ctx: ResponseValidationContext,
  ruleResults: ResponseValidationRuleResult[],
  validatedAt: string
): ResponseValidationResult {
  const blockingReasons = ruleResults
    .filter((r) => !r.passed && r.severity === 'block')
    .map((r) => r.reason);
  const warningReasons = ruleResults
    .filter((r) => !r.passed && r.severity === 'warn')
    .map((r) => r.reason);
  const failedRuleIds = ruleResults
    .filter((r) => !r.passed)
    .map((r) => r.ruleId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  const hasBlockingFailures = blockingReasons.length > 0;
  const action = resolveAction(hasBlockingFailures, ctx.attemptNumber, ctx.maxAttempts);
  const valid = action === 'accept';

  const retryInstruction =
    action === 'retry'
      ? buildRetryInstruction({
          failedRuleIds,
          blockingReasons,
          currentGoal: ctx.currentGoal,
        })
      : null;

  const fallbackReply =
    action === 'fallback'
      ? buildValidatedFallback(ctx.language, ctx.safetyLevel, ctx.turnNumber, blockingReasons)
      : null;

  const validatedReply: DraftMediatorReply | null =
    action === 'accept' ? ctx.draftReply : action === 'fallback' ? fallbackReply : null;

  return {
    valid,
    action,
    ruleResults,
    blockingReasons,
    warningReasons,
    retryInstruction,
    fallbackReply,
    validatedReply,
    validatedAt,
  };
}

/** Runs all rules and builds the validation result. */
export function resolveResponseValidation(
  ctx: ResponseValidationContext,
  validatedAt: string = new Date().toISOString()
): ResponseValidationResult {
  const ruleResults = runAllValidationRules(ctx);
  return buildResponseValidationResult(ctx, ruleResults, validatedAt);
}

export { resolveAction };
