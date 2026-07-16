import { hasScreenContent } from './payload.ts';
import type { GenerationKind, MediationSessionRow } from './types.ts';

export type BootstrapResumePlan =
  | { kind: 'failed' }
  | { kind: 'resume_generation'; generationKind: GenerationKind }
  | { kind: 'processing' }
  | { kind: 'read_envelope' };

/**
 * Pure plan for START_OR_RESUME / LOAD_SESSION on an existing session.
 * Read path must not mutate confirmations, bump sessionVersion, or call Claude.
 */
export function planBootstrapResume(
  session: MediationSessionRow
): BootstrapResumePlan {
  if (session.generation_status === 'FAILED') {
    return { kind: 'failed' };
  }

  const needed = neededGenerationKind(session);
  if (needed) {
    return { kind: 'resume_generation', generationKind: needed };
  }

  if (session.generation_status.startsWith('GENERATING_')) {
    return { kind: 'processing' };
  }

  return { kind: 'read_envelope' };
}

/** True when IDLE/resume bootstrap must be read-only (no claim/commit/create). */
export function isReadOnlyBootstrapResume(session: MediationSessionRow): boolean {
  return planBootstrapResume(session).kind === 'read_envelope';
}

function neededGenerationKind(
  session: MediationSessionRow
): GenerationKind | null {
  const status = session.generation_status;
  if (status !== 'GENERATING_CONTENT' && status !== 'GENERATING_COMPROMISE') {
    return null;
  }
  const kind = session.last_generation_kind as GenerationKind | null;
  if (!kind) return null;
  if (hasScreenContent(session.session_payload, kind)) return null;
  return kind;
}
