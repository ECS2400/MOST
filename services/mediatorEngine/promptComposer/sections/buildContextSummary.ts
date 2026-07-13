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

  const intakeSummary = ctx.mediationState.conflict?.conflictSummary?.trim();
  const pre = ctx.mediationState.conflict?.preAnalysisContext;
  if (intakeSummary || pre) {
    const intakeParts: string[] = [];
    if (intakeSummary) intakeParts.push(`Intake: ${intakeSummary}`);
    if (pre?.keyTrigger) intakeParts.push(`Key trigger: ${pre.keyTrigger}`);
    const emotions = [...(pre?.hostEmotions ?? []), ...(pre?.partnerEmotions ?? [])];
    if (emotions.length > 0) intakeParts.push(`Emotions: ${emotions.join(', ')}`);
    const needs = [...(pre?.hostNeeds ?? []), ...(pre?.partnerNeeds ?? [])];
    if (needs.length > 0) intakeParts.push(`Needs: ${needs.join(', ')}`);
    if (intakeParts.length > 0) {
      parts.push(intakeParts.join(' '));
    }
  }

  return parts.join(' ');
}
