/**
 * Canonical Mediator AI Engine v2.3 pipeline step order.
 *
 * Role: single source of truth for architecture validation tests and documentation.
 * Orchestrator must invoke steps in this exact sequence.
 */

/** Pipeline step identifiers in execution order. */
export const MEDIATOR_PIPELINE_STEP_ORDER = [
  'stateAnalyzer',
  'safety',
  'reflection',
  'strategy',
  'priority',
  'decision',
  'intervention',
  'constitution',
  'sessionMemory',
  'metrics',
] as const;

export type MediatorPipelineStepId = (typeof MEDIATOR_PIPELINE_STEP_ORDER)[number];

/** Public function name invoked by the orchestrator for each step. */
export const MEDIATOR_PIPELINE_STEP_FUNCTIONS: Record<
  MediatorPipelineStepId,
  string
> = {
  stateAnalyzer: 'analyzeState',
  safety: 'evaluateSafety',
  reflection: 'runReflection',
  strategy: 'selectStrategy',
  priority: 'resolvePriority',
  decision: 'makeDecision',
  intervention: 'generateIntervention',
  constitution: 'validateConstitution',
  sessionMemory: 'updateSessionMemory',
  metrics: 'recordMetrics',
};
