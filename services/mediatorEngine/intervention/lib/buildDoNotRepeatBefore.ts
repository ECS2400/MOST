import type { InterventionType, TurnNumber } from '@/types/mediator';
import {
  DEFAULT_DO_NOT_REPEAT_OFFSET,
  DO_NOT_REPEAT_BEFORE_OFFSET,
} from '@/services/mediatorEngine/intervention/config/doNotRepeatBefore';

/** Computes the earliest turn when this intervention type may repeat. */
export function buildDoNotRepeatBefore(
  type: InterventionType,
  turnNumber: TurnNumber
): TurnNumber {
  const offset = DO_NOT_REPEAT_BEFORE_OFFSET[type] ?? DEFAULT_DO_NOT_REPEAT_OFFSET;
  return turnNumber + offset;
}
