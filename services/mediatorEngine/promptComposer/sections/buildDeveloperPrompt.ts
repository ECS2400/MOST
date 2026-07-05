import type { SafetyEnvelope } from '@/types/mediator';
import { CONSTITUTION_CONSTRAINTS } from '@/services/mediatorEngine/promptComposer/config/promptTemplates';
import { formatSafetyEnvelopeSection } from '@/services/mediatorEngine/promptComposer/sections/buildSafetyEnvelope';
import type { SafePromptContext } from '@/services/mediatorEngine/promptComposer/lib/safePromptInput';

function complianceSummary(compliant: boolean, violationCount: number): string {
  return `Compliance: ${compliant ? 'passed' : 'failed'} (${violationCount} violations, no matched text included).`;
}

/** Builds developer prompt with deterministic pipeline constraints. */
export function buildDeveloperPrompt(
  ctx: SafePromptContext,
  safetyEnvelope: SafetyEnvelope
): string {
  const { strategyOutput, priorityOutput, decisionOutput, intervention, complianceResult } = ctx;

  const lines = [
    '=== Pipeline constraints (deterministic — follow strictly) ===',
    `Primary strategy: ${strategyOutput.primaryStrategy ?? 'build_safety'}`,
    `Therapeutic intent: ${strategyOutput.therapeuticIntent ?? decisionOutput.intent ?? 'increase_emotional_safety'}`,
    `Conversation mode: ${priorityOutput.conversationMode ?? 'NORMAL'}`,
    `Selected intervention type: ${decisionOutput.selectedInterventionType ?? intervention.type ?? 'validate'}`,
    `Decision intent: ${decisionOutput.intent ?? 'increase_emotional_safety'}`,
    `Goal transition: ${decisionOutput.goalTransition ?? 'stay'}`,
    `Intervention type: ${intervention.type ?? 'validate'}`,
    `Expected effect id: ${intervention.expectedEffect?.id ?? 'unknown'}`,
    '',
    '=== Safety envelope ===',
    formatSafetyEnvelopeSection(safetyEnvelope),
    '',
    '=== Constitution constraints ===',
    ...CONSTITUTION_CONSTRAINTS,
    '',
    complianceSummary(
      complianceResult.compliant === true,
      Array.isArray(complianceResult.violations) ? complianceResult.violations.length : 0
    ),
  ];

  return lines.join('\n');
}
