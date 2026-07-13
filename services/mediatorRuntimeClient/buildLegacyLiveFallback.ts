import {
  computeLiveSessionFlow,
  resolveGenerateMode,
  type LiveMessage,
  type LiveSessionFlow,
  type LiveTurnState,
  type MediatorMode,
} from '@/services/liveMediation';
import {
  resolveRuntimeActionExecution,
  type ResolveRuntimeActionExecutionParams,
} from '@/services/mediatorRuntimeClient/resolveRuntimeActionExecution';

export interface LegacyLiveFallbackContext {
  messages: LiveMessage[];
  hostUserId: string;
  partnerUserIds: string[];
}

export interface LegacyGenerateModeContext extends LegacyLiveFallbackContext {
  turn: LiveTurnState;
  messagesForMode?: LiveMessage[];
}

export type LegacyLiveFallbackGate = ResolveRuntimeActionExecutionParams;

/** Whether live UI must derive flow from legacy message helpers. */
export function shouldUseLegacyLiveFallback(gate: LegacyLiveFallbackGate): boolean {
  return resolveRuntimeActionExecution(gate).useLegacyFallback;
}

/** Builds legacy session flow — only call when {@link shouldUseLegacyLiveFallback} is true. */
export function buildLegacySessionFlow(ctx: LegacyLiveFallbackContext): LiveSessionFlow {
  return computeLiveSessionFlow(ctx.messages, ctx.hostUserId, ctx.partnerUserIds);
}

/** Builds legacy generation mode — only call when runtime fallback is required. */
export function buildLegacyGenerateMode(ctx: LegacyGenerateModeContext): MediatorMode | null {
  return resolveGenerateMode(
    ctx.turn,
    ctx.messagesForMode ?? ctx.messages,
    ctx.hostUserId,
    ctx.partnerUserIds
  );
}
