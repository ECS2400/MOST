import type { InterventionType } from '@/types/mediator';
import { LIBRARY_PATTERN_IDS } from '@/services/mediatorEngine/intervention/config/libraryPatternIds';

/** Resolves the deterministic library pattern id for an intervention type. */
export function buildLibraryPatternId(type: InterventionType): string {
  return LIBRARY_PATTERN_IDS[type] ?? `${type}_v1`;
}
