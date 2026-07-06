import type { SafePromptContext } from '@/services/mediatorEngine/promptComposer/lib/safePromptInput';

/** Builds a short context summary without full state JSON. */
export function buildContextSummary(ctx: SafePromptContext): string {
  const { currentGoal, priorityOutput, strategyOutput, turnNumber } = ctx;
  const mode = priorityOutput.conversationMode ?? 'NORMAL';
  const strategy = strategyOutput.primaryStrategy ?? 'build_safety';
  const goalTransition = ctx.decisionOutput.goalTransition ?? 'stay';

  const parts = [
    `Turn ${turnNumber}.`,
    `Current goal: ${currentGoal}.`,
    `Conversation mode: ${mode}.`,
    `Strategy: ${strategy}.`,
    `Goal transition: ${goalTransition}.`,
  ];

  const hint = ctx.continuityContext?.continuityHint;
  if (typeof hint === 'string' && hint.length > 0) {
    parts.push(`Continuity: ${hint}`);
  }

  const goalHint = ctx.goalContinuityContext?.goalContinuityHint;
  if (typeof goalHint === 'string' && goalHint.length > 0) {
    parts.push(`Goal continuity: ${goalHint}`);
  }

  return parts.join(' ');
}
