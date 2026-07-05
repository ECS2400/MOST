import type { SafePromptContext } from '@/services/mediatorEngine/promptComposer/lib/safePromptInput';

/** Builds a short context summary without full state JSON. */
export function buildContextSummary(ctx: SafePromptContext): string {
  const { currentGoal, priorityOutput, strategyOutput, turnNumber } = ctx;
  const mode = priorityOutput.conversationMode ?? 'NORMAL';
  const strategy = strategyOutput.primaryStrategy ?? 'build_safety';
  const goalTransition = ctx.decisionOutput.goalTransition ?? 'stay';

  return [
    `Turn ${turnNumber}.`,
    `Current goal: ${currentGoal}.`,
    `Conversation mode: ${mode}.`,
    `Strategy: ${strategy}.`,
    `Goal transition: ${goalTransition}.`,
  ].join(' ');
}
