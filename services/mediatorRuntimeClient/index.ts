export { buildMediatorRuntimeRequest } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';
export type { MediatorRuntimeClientInput } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';

export {
  buildRuntimeClientEvents,
} from '@/services/mediatorRuntimeClient/buildRuntimeClientEvents';
export type { RuntimeClientEventAction } from '@/services/mediatorRuntimeClient/buildRuntimeClientEvents';

export {
  callMediatorRuntime,
  callMediatorRuntimeForLiveFlow,
} from '@/services/mediatorRuntimeClient/mediatorRuntimeClient';
export type {
  MediatorRuntimeClientOptions,
  MediatorRuntimeClientResult,
} from '@/services/mediatorRuntimeClient/mediatorRuntimeClient';

export { parseMediatorRuntimeResponse } from '@/services/mediatorRuntimeClient/parseMediatorRuntimeResponse';
export type {
  MediatorRuntimeParsedSuccess,
  ParseMediatorRuntimeResponseResult,
} from '@/services/mediatorRuntimeClient/parseMediatorRuntimeResponse';

export { adaptRuntimeToLiveResponse } from '@/services/mediatorRuntimeClient/adaptRuntimeToLiveResponse';

export {
  MEDIATOR_RUNTIME_ENGINE_VERSION,
  MEDIATOR_RUNTIME_DEFAULT_TIMEOUT_MS,
  MEDIATOR_RUNTIME_MAX_RETRIES,
  MEDIATOR_RUNTIME_RETRY_DELAYS_MS,
  MEDIATOR_RUNTIME_FUNCTION_PATH,
  getDefaultEnv,
  resolveMediatorRuntimeEndpoint,
} from '@/services/mediatorRuntimeClient/mediatorRuntimeConfig';
export { getMediatorRuntimeEndpoint, getMediatorRuntimeRequestHeaders } from '@/services/mediatorRuntimeClient/supabaseBridge';

export {
  MediatorRuntimeClientError,
  isMediatorRuntimeClientError,
  isRetryableMediatorRuntimeClientError,
} from '@/services/mediatorRuntimeClient/errors';
export type {
  MediatorRuntimeClientErrorKind,
  MediatorRuntimeClientErrorDetails,
} from '@/services/mediatorRuntimeClient/errors';

export {
  withMediatorRuntimeRetry,
  isRetryableHttpStatus,
  createHttpMediatorRuntimeError,
  wrapFetchFailure,
} from '@/services/mediatorRuntimeClient/retry';
export type { MediatorRuntimeRetryOptions } from '@/services/mediatorRuntimeClient/retry';

export type { QuestionTarget } from '@/services/mediatorRuntimeClient/types';

export {
  buildLiveRuntimeTurnInput,
  routeLiveMediatorTurn,
  toRuntimeLanguage,
  resolveRuntimeTrigger,
  logMediatorRuntimeRolloutFailure,
} from '@/services/mediatorRuntimeClient/liveMediationBridge';
export type {
  LiveRuntimeTurnParams,
  LiveMediatorRoutingDeps,
  MediatorRuntimeRolloutFailurePayload,
  MediatorRuntimeRolloutFailureLogger,
} from '@/services/mediatorRuntimeClient/liveMediationBridge';

export {
  buildMediationRuntimePersistencePatch,
  parseLoadedMediationRuntimeRow,
  parseStoredRuntimeSession,
} from '@/services/mediatorRuntimeClient/mediationRuntimeSessionPersistence';
export type { LoadedMediationRuntimeState } from '@/services/mediatorRuntimeClient/mediationRuntimeSessionPersistence';

export {
  loadMediationRuntimeState,
  loadMediationRuntimeSession,
} from '@/services/mediatorRuntimeClient/loadMediationRuntimeSession';

export {
  resolveLivePhaseHeaderLabel,
  resolveLiveProgressPercent,
  resolveRuntimeStageLabel,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionProgressDisplay';

export {
  mapRuntimeSessionToWaitingKind,
  resolveLiveContinueWaitingDisplay,
  resolveLiveProposalWaitingDisplay,
  resolveLiveSessionWaitingStatusDisplay,
  resolveLiveWaitingAnswerDisplay,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionWaitingDisplay';
export type {
  RuntimeWaitingDisplay,
  RuntimeWaitingDisplayKind,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionWaitingDisplay';

export {
  canSubmitLiveMessage,
  computeLegacyInputVisible,
  resolveRuntimeInputState,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionInputState';
export type {
  LegacyInputVisibilityInput,
  ResolveRuntimeInputStateParams,
  RuntimeInputState,
  RuntimeInputVisibilityReason,
  TechnicalInputGuards,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionInputState';

export { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';

export {
  resolveRuntimeGenerationMode,
  logRuntimeGenerationModeResolution,
  mapRuntimeBeatToLegacyMode,
} from '@/services/mediatorRuntimeClient/resolveRuntimeGenerationMode';
export type {
  ResolveRuntimeGenerationModeParams,
  RuntimeGenerationModeReason,
  RuntimeGenerationModeResolution,
  RuntimeGenerationModeSource,
} from '@/services/mediatorRuntimeClient/resolveRuntimeGenerationMode';

export {
  compareRuntimeNextBeat,
  logLiveGenerationIntentComparison,
  mapLegacyGenerateModeToIntent,
  mapRuntimeNextBeatToIntent,
} from '@/services/mediatorRuntimeClient/compareRuntimeNextBeat';
export type {
  CompareRuntimeNextBeatParams,
  GenerationIntentMismatchReason,
  LiveGenerationIntent,
  LiveGenerationIntentComparison,
} from '@/services/mediatorRuntimeClient/compareRuntimeNextBeat';

export {
  compareLiveDecisionPanels,
  logLiveDecisionPanelComparison,
  resolveRuntimeLiveDecisionPanelKind,
} from '@/services/mediatorRuntimeClient/compareLiveDecisionPanels';
export type {
  DecisionPanelMismatchReason,
  LiveDecisionPanelComparison,
} from '@/services/mediatorRuntimeClient/compareLiveDecisionPanels';

export {
  resolveRuntimeDecisionPanelVisibility,
} from '@/services/mediatorRuntimeClient/resolveRuntimeDecisionPanelVisibility';
export type {
  DecisionPanelKind,
  LegacyDecisionPanelVisibilityInput,
  ResolveRuntimeDecisionPanelVisibilityParams,
  RuntimeDecisionPanelVisibility,
} from '@/services/mediatorRuntimeClient/resolveRuntimeDecisionPanelVisibility';

export {
  resolveLegacyLiveDecisionPanelState,
} from '@/services/mediatorRuntimeClient/resolveLegacyLiveDecisionPanel';
export type {
  LiveDecisionPanelKind,
  LiveLegacyDecisionPanelInput,
  LiveLegacyDecisionPanelState,
} from '@/services/mediatorRuntimeClient/resolveLegacyLiveDecisionPanel';

export {
  mapRuntimeClosureNavigationOutcome,
  resolveEffectiveClosureDbStatus,
  resolveRuntimeClosureAction,
  shouldPerformRuntimeClosureNavigation,
} from '@/services/mediatorRuntimeClient/resolveRuntimeClosureAction';
export type {
  ClosureDirective,
  MediationDbStatus,
  ResolveRuntimeClosureActionParams,
  RuntimeClosureAction,
} from '@/services/mediatorRuntimeClient/resolveRuntimeClosureAction';

export { isRuntimeSessionShape, isRecord } from '@/services/mediatorRuntimeClient/runtimeSessionShape';
