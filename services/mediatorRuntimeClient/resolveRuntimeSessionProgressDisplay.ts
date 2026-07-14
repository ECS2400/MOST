import type { Language } from '@/constants/i18n';
import {
  RUNTIME_STAGE_LABELS_DE,
  RUNTIME_STAGE_LABELS_EN,
  RUNTIME_STAGE_LABELS_ES,
  RUNTIME_STAGE_LABELS_FR,
  RUNTIME_STAGE_LABELS_IT,
  RUNTIME_STAGE_LABELS_PL,
} from '@/constants/i18n/liveMediation/runtimeStageLabels';
import { fmt } from '@/utils/i18nFormat';
import { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';
import type { RuntimeSessionStage } from '@/types/mediator/runtimeSession';

const RUNTIME_PROGRESS_LABEL_BY_LANG: Record<Language, string> = {
  pl: '{percent}% · {stage}',
  en: '{percent}% · {stage}',
  de: '{percent}% · {stage}',
  fr: '{percent} % · {stage}',
  es: '{percent}% · {stage}',
  it: '{percent}% · {stage}',
};

const RUNTIME_STAGE_LABELS_BY_LANG: Record<
  Language,
  Record<RuntimeSessionStage, string>
> = {
  pl: RUNTIME_STAGE_LABELS_PL,
  en: RUNTIME_STAGE_LABELS_EN,
  de: RUNTIME_STAGE_LABELS_DE,
  fr: RUNTIME_STAGE_LABELS_FR,
  es: RUNTIME_STAGE_LABELS_ES,
  it: RUNTIME_STAGE_LABELS_IT,
};

function clampProgressPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function parseRuntimeStageFromLabelKey(labelKey: string): RuntimeSessionStage | null {
  const prefix = 'runtime.stage.';
  if (!labelKey.startsWith(prefix)) return null;
  const stage = labelKey.slice(prefix.length);
  return stage.length > 0 ? (stage as RuntimeSessionStage) : null;
}

/** Resolves a human-readable stage label from runtimeSession.progress.labelKey. */
export function resolveRuntimeStageLabel(
  labelKey: string,
  lang: Language
): string | null {
  const stage = parseRuntimeStageFromLabelKey(labelKey);
  if (!stage) return null;
  const labels = RUNTIME_STAGE_LABELS_BY_LANG[lang] ?? RUNTIME_STAGE_LABELS_EN;
  return labels[stage] ?? null;
}

/** Progress bar percent from runtime completionEstimate; zero when unavailable. */
export function resolveLiveProgressPercent(
  runtimeSession: RuntimeSession | null | undefined,
  runtimeUnavailable = false
): number {
  if (runtimeUnavailable || !hasRuntimeSession(runtimeSession)) {
    return 0;
  }
  return clampProgressPercent(runtimeSession.progress.completionEstimate);
}

/** Header phase label from runtime progress; recovery label when unavailable. */
export function resolveLivePhaseHeaderLabel(
  runtimeSession: RuntimeSession | null | undefined,
  lang: Language,
  options: { runtimeUnavailable?: boolean; recoveryLabel?: string } = {}
): string {
  if (options.runtimeUnavailable) {
    return options.recoveryLabel ?? '';
  }

  if (!hasRuntimeSession(runtimeSession)) {
    return '';
  }

  const stageLabel = resolveRuntimeStageLabel(runtimeSession.progress.labelKey, lang);
  if (!stageLabel) {
    return '';
  }

  const template = RUNTIME_PROGRESS_LABEL_BY_LANG[lang] ?? RUNTIME_PROGRESS_LABEL_BY_LANG.en;
  return fmt(template, {
    percent: String(clampProgressPercent(runtimeSession.progress.completionEstimate)),
    stage: stageLabel,
  });
}
