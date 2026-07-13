import type { SafetyEnvelope, TherapeuticGoal } from '@/types/mediator';
import { CONSTITUTION_CONSTRAINTS } from '@/services/mediatorEngine/promptComposer/config/promptTemplates';
import { buildTherapeuticStageConstraints } from '@/services/mediatorEngine/promptComposer/config/therapeuticStageConstraints';
import { PERSONA_PRECEDENCE_CLAUSE } from '@/services/mediatorEngine/promptComposer/config/personaPrecedence';
import {
  voiceLabelForIntent,
  voiceLabelForIntervention,
  voiceLabelForStrategy,
} from '@/services/mediatorEngine/promptComposer/config/runtimeVoiceLabels';
import { buildMostMediatorPersonaSection } from '@/services/mediatorEngine/promptComposer/persona/mostMediatorPersona';
import { formatSafetyEnvelopeSection } from '@/services/mediatorEngine/promptComposer/sections/buildSafetyEnvelope';
import type { SafePromptContext } from '@/services/mediatorEngine/promptComposer/lib/safePromptInput';

function complianceSummary(compliant: boolean, violationCount: number): string {
  return `Compliance: ${compliant ? 'passed' : 'failed'} (${violationCount} violations, no matched text included).`;
}

/** Builds developer prompt: persona (verbatim md) → safety → stage focus → runtime state → constitution. */
export function buildDeveloperPrompt(
  ctx: SafePromptContext,
  safetyEnvelope: SafetyEnvelope
): string {
  const { strategyOutput, priorityOutput, decisionOutput, intervention, complianceResult } = ctx;

  const primaryStrategy = strategyOutput.primaryStrategy ?? 'build_safety';
  const therapeuticIntent =
    strategyOutput.therapeuticIntent ?? decisionOutput.intent ?? 'increase_emotional_safety';
  const decisionIntent = decisionOutput.intent ?? 'increase_emotional_safety';
  const selectedIntervention =
    decisionOutput.selectedInterventionType ?? intervention.type ?? 'validate';
  const interventionType = intervention.type ?? 'validate';

  const lines = [
    buildMostMediatorPersonaSection(ctx),
    '',
    '=== Safety envelope ===',
    formatSafetyEnvelopeSection(safetyEnvelope),
  ];

  const stageConstraints = buildTherapeuticStageConstraints(
    ctx.currentGoal as TherapeuticGoal,
    ctx.language
  );
  if (stageConstraints.length > 0) {
    lines.push('', ...stageConstraints);
  }

  lines.push(
    '',
    '=== Runtime state (deterministic — follow strictly) ===',
    `Primary strategy (voice): ${voiceLabelForStrategy(primaryStrategy)}`,
    `Session intent (voice): ${voiceLabelForIntent(therapeuticIntent)}`,
    `Conversation mode: ${priorityOutput.conversationMode ?? 'NORMAL'}`,
    `Selected move (voice): ${voiceLabelForIntervention(selectedIntervention)}`,
    `Decision intent (voice): ${voiceLabelForIntent(decisionIntent)}`,
    `Goal transition: ${decisionOutput.goalTransition ?? 'stay'}`,
    `Intervention move (voice): ${voiceLabelForIntervention(interventionType)}`,
    `Expected effect id: ${intervention.expectedEffect?.id ?? 'unknown'}`,
    '',
    '=== Constitution constraints ===',
    ...CONSTITUTION_CONSTRAINTS,
    '',
    complianceSummary(
      complianceResult.compliant === true,
      Array.isArray(complianceResult.violations) ? complianceResult.violations.length : 0
    ),
    '',
    ...PERSONA_PRECEDENCE_CLAUSE
  );

  return lines.join('\n');
}
