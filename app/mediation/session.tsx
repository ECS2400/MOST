import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { normalizeRouteParam } from '@/utils/normalizeRouteParam';
import { supabase } from '@/services/supabase';
import {
  createMediationTurnRequestId,
  loadMediationTurnV2Session,
  MediationTurnV2Error,
  sendMediationTurnV2Action,
  startOrResumeMediationTurnV2,
} from '@/services/mediationTurnV2';
import type {
  EnvelopeActionV2,
  MediationTurnV2Envelope,
} from '@/services/mediationTurnV2.types';
import { MediationV2SummaryScreen } from '@/components/mediation/v2/MediationV2SummaryScreen';
import { MediationV2EasyChoicesScreen } from '@/components/mediation/v2/MediationV2EasyChoicesScreen';
import { MediationV2FirstDealScreen } from '@/components/mediation/v2/MediationV2FirstDealScreen';
import { MediationV2CompromiseScreen } from '@/components/mediation/v2/MediationV2CompromiseScreen';
import { MediationV2LessonScreen } from '@/components/mediation/v2/MediationV2LessonScreen';
import { MediationV2DateScreen } from '@/components/mediation/v2/MediationV2DateScreen';
import { MediationV2EndScreen } from '@/components/mediation/v2/MediationV2EndScreen';
import { MediationV2ProcessingView } from '@/components/mediation/v2/MediationV2ProcessingView';
import { MediationV2ErrorView } from '@/components/mediation/v2/MediationV2ErrorView';

function isWaitingForPartner(envelope: MediationTurnV2Envelope): boolean {
  if (envelope.processing) return false;
  if (envelope.content.status === 'failed') return false;

  const partnerStatus = envelope.content.partnerStatus;
  if (partnerStatus === 'waiting') {
    const answered = envelope.actions.every((a) => a.disabled === true);
    return answered;
  }

  const primary = envelope.actions.find(
    (a) => a.type === 'CONTINUE' || a.type === 'FINISH' || a.type === 'VOTE'
  );
  return primary?.disabled === true;
}

export default function MediationSessionV2Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mediationId?: string }>();
  const mediationId = normalizeRouteParam(params.mediationId);

  const [envelope, setEnvelope] = useState<MediationTurnV2Envelope | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inFlightRequestId = useRef<string | null>(null);
  const bootRequestId = useRef<string | null>(null);
  const lastSessionVersion = useRef<number | null>(null);
  const loadInFlight = useRef(false);

  const applyEnvelope = useCallback((next: MediationTurnV2Envelope) => {
    setEnvelope(next);
    lastSessionVersion.current = next.sessionVersion;
    setErrorCode(null);
    setErrorMessage(null);
  }, []);

  const handlePublicError = useCallback((error: unknown) => {
    if (error instanceof MediationTurnV2Error) {
      setErrorCode(error.code);
      setErrorMessage(error.message);
      return;
    }
    setErrorCode('INTERNAL_ERROR');
    setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
  }, []);

  const bootstrap = useCallback(async () => {
    if (!mediationId) {
      setErrorCode('INVALID_REQUEST');
      setErrorMessage('Brak mediationId.');
      setBootLoading(false);
      return;
    }

    if (!bootRequestId.current) {
      bootRequestId.current = createMediationTurnRequestId();
    }
    const requestId = bootRequestId.current;
    inFlightRequestId.current = requestId;

    setBootLoading(true);
    setErrorCode(null);
    try {
      const next = await startOrResumeMediationTurnV2({ mediationId, requestId });
      applyEnvelope(next);
    } catch (error) {
      handlePublicError(error);
    } finally {
      setBootLoading(false);
      inFlightRequestId.current = null;
    }
  }, [applyEnvelope, handlePublicError, mediationId]);

  const reloadSession = useCallback(async () => {
    if (!envelope?.sessionId || loadInFlight.current || actionBusy) return;
    loadInFlight.current = true;
    const requestId = createMediationTurnRequestId();
    try {
      const next = await loadMediationTurnV2Session({
        sessionId: envelope.sessionId,
        requestId,
      });
      applyEnvelope(next);
    } catch (error) {
      if (
        error instanceof MediationTurnV2Error &&
        error.code === 'GENERATION_ALREADY_RUNNING'
      ) {
        setEnvelope((prev) =>
          prev
            ? { ...prev, processing: true, message: prev.message ?? 'PROCESSING' }
            : prev
        );
        return;
      }
      handlePublicError(error);
    } finally {
      loadInFlight.current = false;
    }
  }, [actionBusy, applyEnvelope, envelope?.sessionId, handlePublicError]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Soft sync: partner actions / generation finalize → LOAD_SESSION only.
  useEffect(() => {
    if (!envelope?.sessionId) return;

    const channel = supabase
      .channel(`mediation-session-v2:${envelope.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mediation_sessions',
          filter: `session_id=eq.${envelope.sessionId}`,
        },
        (payload) => {
          const row = payload.new as { session_version?: number };
          const version =
            typeof row.session_version === 'number' ? row.session_version : null;
          if (version != null && lastSessionVersion.current != null && version <= lastSessionVersion.current) {
            return;
          }
          void reloadSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [envelope?.sessionId, reloadSession]);

  const runAction = useCallback(
    async (action: EnvelopeActionV2) => {
      if (!envelope?.sessionId || actionBusy) return;
      if (action.disabled || action.visible === false) return;

      const requestId = createMediationTurnRequestId();
      inFlightRequestId.current = requestId;
      setActionBusy(true);
      setErrorCode(null);

      try {
        const next = await sendMediationTurnV2Action({
          sessionId: envelope.sessionId,
          requestId,
          type: action.type,
          optionId: action.type === 'VOTE' && action.voteValue == null ? action.id : null,
          voteValue: action.type === 'VOTE' ? action.voteValue : null,
        });
        applyEnvelope(next);

        if (action.type === 'CLOSE') {
          router.replace('/(tabs)');
        }
      } catch (error) {
        if (
          error instanceof MediationTurnV2Error &&
          error.code === 'GENERATION_ALREADY_RUNNING'
        ) {
          setEnvelope((prev) =>
            prev
              ? { ...prev, processing: true, message: prev.message ?? 'PROCESSING' }
              : prev
          );
          return;
        }
        handlePublicError(error);
      } finally {
        setActionBusy(false);
        inFlightRequestId.current = null;
      }
    },
    [actionBusy, applyEnvelope, envelope?.sessionId, handlePublicError, router]
  );

  const handleRetryFromError = useCallback(async () => {
    if (envelope?.sessionId && envelope.actions.some((a) => a.type === 'RETRY')) {
      const retryAction = envelope.actions.find((a) => a.type === 'RETRY');
      if (retryAction) {
        await runAction(retryAction);
        return;
      }
    }
    bootRequestId.current = createMediationTurnRequestId();
    await bootstrap();
  }, [bootstrap, envelope, runAction]);

  const waiting = envelope ? isWaitingForPartner(envelope) : false;
  const failedContent = envelope?.content.status === 'failed';
  const budgetExceeded = errorCode === 'LLM_CALL_BUDGET_EXCEEDED';

  function renderScreen() {
    if (!envelope) return null;

    if (envelope.processing) {
      return (
        <MediationV2ProcessingView
          message={envelope.message}
          onRefresh={() => void reloadSession()}
          refreshing={loadInFlight.current}
        />
      );
    }

    if (failedContent) {
      const retry = envelope.actions.find((a) => a.type === 'RETRY');
      return (
        <MediationV2ErrorView
          code="FAILED"
          canRetry={!!retry}
          onRetry={retry ? () => void runAction(retry) : undefined}
          busy={actionBusy}
        />
      );
    }

    switch (envelope.screen) {
      case 'SUMMARY':
        return (
          <MediationV2SummaryScreen
            content={envelope.content}
            actions={envelope.actions}
            busy={actionBusy}
            waitingForPartner={waiting}
            onAction={(a) => void runAction(a)}
          />
        );
      case 'EASY_CHOICES':
        return (
          <MediationV2EasyChoicesScreen
            content={envelope.content}
            actions={envelope.actions}
            busy={actionBusy}
            onAction={(a) => void runAction(a)}
          />
        );
      case 'FIRST_DEAL':
        return (
          <MediationV2FirstDealScreen
            content={envelope.content}
            actions={envelope.actions}
            busy={actionBusy}
            waitingForPartner={waiting}
            onAction={(a) => void runAction(a)}
          />
        );
      case 'COMPROMISE':
        return (
          <MediationV2CompromiseScreen
            content={envelope.content}
            actions={envelope.actions}
            busy={actionBusy}
            waitingForPartner={waiting}
            onAction={(a) => void runAction(a)}
          />
        );
      case 'LESSON':
        return (
          <MediationV2LessonScreen
            content={envelope.content}
            actions={envelope.actions}
            busy={actionBusy}
            waitingForPartner={waiting}
            onAction={(a) => void runAction(a)}
          />
        );
      case 'DATE':
        return (
          <MediationV2DateScreen
            content={envelope.content}
            actions={envelope.actions}
            busy={actionBusy}
            waitingForPartner={waiting}
            onAction={(a) => void runAction(a)}
          />
        );
      case 'END':
        return (
          <MediationV2EndScreen
            content={envelope.content}
            actions={envelope.actions}
            busy={actionBusy}
            onAction={(a) => void runAction(a)}
          />
        );
      default:
        return (
          <MediationV2ErrorView
            code="UNSUPPORTED_SESSION_STATE"
            message="Nieobsługiwany ekran z backendu."
          />
        );
    }
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {envelope?.title ?? 'Mediacja'}
          </Text>
          {envelope?.progress ? (
            <Text style={styles.progress}>
              {envelope.progress.current}/{envelope.progress.total}
            </Text>
          ) : null}
        </View>
        {envelope?.sessionId && !bootLoading ? (
          <Pressable
            onPress={() => void reloadSession()}
            style={styles.refreshBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="refresh" size={22} color={Colors.primaryLight} />
          </Pressable>
        ) : (
          <View style={styles.refreshBtn} />
        )}
      </View>

      {envelope?.subtitle ? (
        <Text style={styles.subtitle}>{envelope.subtitle}</Text>
      ) : null}

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {bootLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primaryLight} size="large" />
            <Text style={styles.loadingText}>Ładowanie mediacji…</Text>
          </View>
        ) : errorCode && !envelope ? (
          <MediationV2ErrorView
            code={errorCode}
            message={errorMessage ?? undefined}
            canRetry={!budgetExceeded}
            onRetry={() => void handleRetryFromError()}
            busy={actionBusy || bootLoading}
          />
        ) : (
          <>
            {errorCode && envelope && !budgetExceeded ? (
              <Text style={styles.inlineError}>{errorMessage || errorCode}</Text>
            ) : null}
            {budgetExceeded ? (
              <MediationV2ErrorView code="LLM_CALL_BUDGET_EXCEEDED" />
            ) : (
              renderScreen()
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    flexShrink: 1,
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.lg,
    color: Colors.textPrimary,
  },
  progress: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
  subtitle: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.textSecondary,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing['2xl'],
  },
  loadingText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.base,
    color: Colors.textSecondary,
  },
  inlineError: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.sm,
    color: Colors.error,
    marginBottom: Spacing.md,
  },
});
