import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import type {
  RuntimeClosureDirective,
  RuntimeMediationDbStatus,
  RuntimeSession,
  RuntimeSessionOutcome,
} from '@/types/mediator/runtimeSession';

export type ClosureDirective = RuntimeClosureDirective;
export type MediationDbStatus = RuntimeMediationDbStatus;

const TERMINAL_RUNTIME_OUTCOMES: ReadonlySet<RuntimeSessionOutcome> = new Set([
  'resolved',
  'closed_without_agreement',
  'safety_stopped',
]);

export interface ResolveRuntimeClosureActionParams {
  runtimeSession: RuntimeSession | null | undefined;
}

export interface RuntimeClosureAction {
  shouldNavigate: boolean;
  directive: ClosureDirective;
  suggestedDbStatus: MediationDbStatus | null;
  source: 'runtime' | 'legacy_fallback';
}

const LEGACY_FALLBACK_ACTION: RuntimeClosureAction = {
  shouldNavigate: false,
  directive: 'none',
  suggestedDbStatus: null,
  source: 'legacy_fallback',
};

/**
 * Resolves whether live UI should navigate to closure from runtimeSession.
 *
 * Runtime takes precedence only for terminal outcomes with an explicit closure directive.
 * Otherwise legacy closure handlers remain responsible for navigation.
 */
export function resolveRuntimeClosureAction(
  params: ResolveRuntimeClosureActionParams
): RuntimeClosureAction {
  const { runtimeSession } = params;

  if (!hasRuntimeSession(runtimeSession)) {
    return LEGACY_FALLBACK_ACTION;
  }

  const { closure, session } = runtimeSession;
  const directive = closure.directive;

  if (!closure.navigateToClosure || directive === 'none') {
    return {
      shouldNavigate: false,
      directive,
      suggestedDbStatus: closure.suggestedDbStatus,
      source: 'legacy_fallback',
    };
  }

  if (!TERMINAL_RUNTIME_OUTCOMES.has(session.outcome)) {
    return {
      shouldNavigate: false,
      directive,
      suggestedDbStatus: closure.suggestedDbStatus,
      source: 'legacy_fallback',
    };
  }

  return {
    shouldNavigate: true,
    directive,
    suggestedDbStatus: closure.suggestedDbStatus,
    source: 'runtime',
  };
}

/** Whether runtime closure navigation should run (guards duplicate invocation). */
export function shouldPerformRuntimeClosureNavigation(
  action: RuntimeClosureAction,
  alreadyNavigated: boolean
): boolean {
  return !alreadyNavigated && action.shouldNavigate && action.source === 'runtime';
}

/** Maps runtime closure to dispute-closure navigation outcome param. */
export function mapRuntimeClosureNavigationOutcome(
  action: RuntimeClosureAction,
  sessionOutcome: RuntimeSessionOutcome
): 'resolved' | 'unresolved_but_closed' {
  const dbStatus = resolveEffectiveClosureDbStatus(action, sessionOutcome);
  if (dbStatus === 'pending_agreements') {
    return 'unresolved_but_closed';
  }
  return 'resolved';
}

/** Resolves Supabase mediations.status from runtime closure hints. */
export function resolveEffectiveClosureDbStatus(
  action: RuntimeClosureAction,
  sessionOutcome: RuntimeSessionOutcome
): MediationDbStatus | null {
  if (action.suggestedDbStatus) {
    return action.suggestedDbStatus;
  }

  if (sessionOutcome === 'resolved') {
    return 'resolved';
  }

  if (sessionOutcome === 'closed_without_agreement' || sessionOutcome === 'safety_stopped') {
    return 'pending_agreements';
  }

  return null;
}
