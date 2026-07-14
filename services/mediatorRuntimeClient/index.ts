export { buildMediatorRuntimeRequest } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';
export type { MediatorRuntimeClientInput } from '@/services/mediatorRuntimeClient/buildMediatorRuntimeRequest';

export {
  buildRuntimeClientEvents,
} from '@/services/mediatorRuntimeClient/buildRuntimeClientEvents';
export type { RuntimeClientEventAction } from '@/services/mediatorRuntimeClient/buildRuntimeClientEvents';

export {
  callMediatorRuntime,
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
  RuntimeWaitingDisplaySource,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionWaitingDisplay';

export {
  canSubmitLiveMessage,
  resolveRuntimeInputState,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionInputState';
export type {
  ResolveRuntimeInputStateParams,
  RuntimeInputState,
  RuntimeInputVisibilityReason,
  TechnicalInputGuards,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionInputState';

export { hasRuntimeSession } from '@/services/mediatorRuntimeClient/hasRuntimeSession';

export {
  resolveRuntimeGenerationFlow,
  mapRuntimeBeatToMediatorMode,
  logRuntimeGenerationFlowResolution,
  isRuntimeDirectMediatorMode,
  RUNTIME_DIRECT_MEDIATOR_MODES,
} from '@/services/mediatorRuntimeClient/resolveRuntimeGenerationFlow';
export type {
  ResolveRuntimeGenerationFlowParams,
  RuntimeGenerationFlowReason,
  RuntimeGenerationFlowResolution,
} from '@/services/mediatorRuntimeClient/resolveRuntimeGenerationFlow';

export {
  resolveRuntimeDecisionPanelVisibility,
} from '@/services/mediatorRuntimeClient/resolveRuntimeDecisionPanelVisibility';
export type {
  DecisionPanelKind,
  ResolveRuntimeDecisionPanelVisibilityParams,
  RuntimeDecisionPanelSource,
  RuntimeDecisionPanelVisibility,
} from '@/services/mediatorRuntimeClient/resolveRuntimeDecisionPanelVisibility';

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
  RuntimeClosureSource,
} from '@/services/mediatorRuntimeClient/resolveRuntimeClosureAction';

export {
  canExecuteRuntimeClientAction,
  planLiveRuntimeClientAction,
  resolveRuntimeActionExecution,
} from '@/services/mediatorRuntimeClient/resolveRuntimeActionExecution';
export type {
  LiveRuntimeClientActionKind,
  LiveRuntimeClientActionPlan,
  ResolveRuntimeActionExecutionParams,
  RuntimeActionExecution,
  RuntimeActionExecutionReason,
} from '@/services/mediatorRuntimeClient/resolveRuntimeActionExecution';

export {
  resolveRuntimeAwaitingProposal,
  resolveRuntimeProposalPanelState,
  resolveRuntimeProposalUserDecided,
} from '@/services/mediatorRuntimeClient/resolveRuntimeProposalPanelState';
export type { RuntimeProposalPanelState } from '@/services/mediatorRuntimeClient/resolveRuntimeProposalPanelState';

export {
  mapRuntimeSessionStageForTests,
  resolveRuntimeSessionFlow,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionFlow';
export type {
  ResolveRuntimeSessionFlowParams,
  RuntimeSessionFlowResolution,
} from '@/services/mediatorRuntimeClient/resolveRuntimeSessionFlow';

export {
  buildBootstrapMediationStateFromContext,
} from '@/services/mediatorRuntimeClient/mapMediationContextToBootstrapState';
export type { BootstrapMediationContextInput } from '@/services/mediatorRuntimeClient/mapMediationContextToBootstrapState';

export {
  buildLiveRuntimeDevDiagnostics,
  logLiveRuntimeDevDiagnostics,
} from '@/services/mediatorRuntimeClient/formatLiveRuntimeDevDiagnostics';
export type { LiveRuntimeDevDiagnostics } from '@/services/mediatorRuntimeClient/formatLiveRuntimeDevDiagnostics';

export { isRuntimeSessionShape, isRecord } from '@/services/mediatorRuntimeClient/runtimeSessionShape';
