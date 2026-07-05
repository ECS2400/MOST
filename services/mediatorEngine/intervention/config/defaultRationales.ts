import type { InterventionType } from '@/types/mediator';

/** Technical rationale templates — not user-facing copy. */
export const RATIONALE_FROM_DECISION = 'generated from decision';
export const RATIONALE_FROM_SAFETY_OVERRIDE = 'generated from safety override';

/** Intervention types treated as safety-override decisions for rationale selection. */
export const SAFETY_OVERRIDE_INTERVENTION_TYPES: ReadonlySet<InterventionType> = new Set([
  'safety_response',
  'pause_session',
]);
