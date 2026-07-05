import type { InterventionType } from '@/types/mediator';

/** Turn offset before the same intervention type may repeat. */
export const DO_NOT_REPEAT_BEFORE_OFFSET: Partial<Record<InterventionType, number>> = {
  celebrate_breakthrough: 8,
  pause_session: 6,
  deescalate: 4,
  validate: 2,
  reflect: 2,
};

/** Default repeat offset for intervention types not listed explicitly. */
export const DEFAULT_DO_NOT_REPEAT_OFFSET = 0;
