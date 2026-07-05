import type { InterventionType } from '@/types/mediator';

/** Ordered safe fallback preference when recommended type is unavailable. */
export const SAFE_FALLBACK_INTERVENTION_ORDER: readonly InterventionType[] = [
  'reflect',
  'validate',
  'deescalate',
  'pause_session',
  'welcome_open',
  'mirror',
  'reframe',
  'redirect_blame',
  'remind_goal',
  'invite_reflection',
  'recover_acknowledge',
  'propose_rule',
  'confirm_agreement',
  'summarize_close',
  'safety_response',
];

/** Safety-mode fallback — never falls through to general types like reflect. */
export const SAFETY_FALLBACK_INTERVENTION_ORDER: readonly InterventionType[] = [
  'safety_response',
  'pause_session',
  'deescalate',
];

/** Default allowed list when Priority Engine returns none (normal mode). */
export const DEFAULT_ALLOWED_INTERVENTIONS: readonly InterventionType[] = [
  'reflect',
  'validate',
  'deescalate',
];

/** Default allowed list when Priority Engine returns none in safety mode. */
export const DEFAULT_SAFETY_ALLOWED_INTERVENTIONS: readonly InterventionType[] =
  SAFETY_FALLBACK_INTERVENTION_ORDER;
