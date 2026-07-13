import type { MediatorLang } from '@/types/mediator';
import type { SafePromptContext } from '@/services/mediatorEngine/promptComposer/lib/safePromptInput';
import {
  voiceLabelForIntent,
  voiceLabelForIntervention,
  voiceLabelForStrategy,
} from '@/services/mediatorEngine/promptComposer/config/runtimeVoiceLabels';
import MOST_MEDIATOR_PERSONA_MARKDOWN from '@/services/mediatorEngine/promptComposer/persona/mostMediatorPersona.md';

export { MOST_MEDIATOR_PERSONA_MARKDOWN };

export interface MostMediatorPersonaVariables {
  userName: string;
  partnerName: string;
  currentState: string;
}

const ROLE_LABELS: Record<MediatorLang, { host: string; partner: string }> = {
  pl: { host: 'Host', partner: 'Partner' },
  en: { host: 'Host', partner: 'Partner' },
  es: { host: 'Anfitrión', partner: 'Pareja' },
  it: { host: 'Host', partner: 'Partner' },
  de: { host: 'Host', partner: 'Partner' },
  fr: { host: 'Hôte', partner: 'Partenaire' },
};

function resolveDisplayName(
  ctx: SafePromptContext,
  role: 'host' | 'partner'
): string {
  const fromState = ctx.mediationState.participants?.[role]?.profile?.displayName?.trim();
  if (fromState) {
    return fromState;
  }
  return ROLE_LABELS[ctx.language][role];
}

/** Builds runtime state for {{CURRENT_STATE}} substitution — voice labels only, no raw IDs. */
export function buildMostMediatorCurrentState(ctx: SafePromptContext): string {
  const parts = [
    `goal=${ctx.currentGoal}`,
    `turn=${ctx.turnNumber}`,
    `mode=${ctx.priorityOutput.conversationMode ?? 'NORMAL'}`,
    `strategy=${voiceLabelForStrategy(ctx.strategyOutput.primaryStrategy ?? 'build_safety')}`,
    `move=${voiceLabelForIntervention(
      ctx.decisionOutput.selectedInterventionType ?? ctx.intervention.type ?? 'validate'
    )}`,
    `intent=${voiceLabelForIntent(
      ctx.decisionOutput.intent ?? ctx.strategyOutput.therapeuticIntent ?? 'increase_emotional_safety'
    )}`,
    `goalTransition=${ctx.decisionOutput.goalTransition ?? 'stay'}`,
  ];

  const safetyLevel = ctx.safetyOutput?.level;
  if (safetyLevel && safetyLevel !== 'none') {
    parts.push(`safety=${safetyLevel}`);
  }

  return parts.join('; ');
}

/** Resolves persona variables from existing prompt composer context. */
export function resolveMostMediatorPersonaVariables(
  ctx: SafePromptContext
): MostMediatorPersonaVariables {
  return {
    userName: resolveDisplayName(ctx, 'host'),
    partnerName: resolveDisplayName(ctx, 'partner'),
    currentState: buildMostMediatorCurrentState(ctx),
  };
}

/** Substitutes {{USER_NAME}}, {{PARTNER_NAME}}, {{CURRENT_STATE}} in the persona markdown. */
export function renderMostMediatorPersona(
  markdown: string,
  variables: MostMediatorPersonaVariables
): string {
  return markdown
    .replaceAll('{{USER_NAME}}', variables.userName)
    .replaceAll('{{PARTNER_NAME}}', variables.partnerName)
    .replaceAll('{{CURRENT_STATE}}', variables.currentState);
}

/** Verbatim Mościk persona markdown with session variables substituted. */
export function buildMostMediatorPersonaSection(ctx: SafePromptContext): string {
  return renderMostMediatorPersona(
    MOST_MEDIATOR_PERSONA_MARKDOWN,
    resolveMostMediatorPersonaVariables(ctx)
  );
}

/** Fallback persona when composePrompt fails before context is available. */
export function buildFallbackMostMediatorPersona(language: MediatorLang): string {
  const labels = ROLE_LABELS[language];
  return renderMostMediatorPersona(MOST_MEDIATOR_PERSONA_MARKDOWN, {
    userName: labels.host,
    partnerName: labels.partner,
    currentState: 'goal=SAFE_OPENING; turn=1; mode=NORMAL; strategy=slow_conflict; move=reveal_pattern',
  });
}
