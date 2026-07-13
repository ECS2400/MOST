import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  buildLiveRuntimeDevDiagnostics,
  logLiveRuntimeDevDiagnostics,
  type LiveRuntimeDevDiagnostics,
} from '@/services/mediatorRuntimeClient/formatLiveRuntimeDevDiagnostics';
import { isRuntimeSessionShape } from '@/services/mediatorRuntimeClient/runtimeSessionShape';
import {
  liveRuntimeDevStatusLabel,
  resolveLiveRuntimeDevStatus,
} from '@/services/mediatorRuntimeClient/runtimeSessionRefreshGuard';
import type { RuntimeSession } from '@/types/mediator/runtimeSession';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface LiveRuntimeDevDiagnosticsProps {
  mediationId: string | undefined;
  runtimeSession: RuntimeSession | null | undefined;
  runtimeFailed: boolean;
  invalidRuntimeState?: boolean;
}

function DiagnosticsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

/** DEV-only floating runtime diagnostics — stripped in production builds. */
export function LiveRuntimeDevDiagnostics({
  mediationId,
  runtimeSession,
  runtimeFailed,
  invalidRuntimeState = false,
}: LiveRuntimeDevDiagnosticsProps) {
  const [expanded, setExpanded] = useState(false);

  const diagnostics = useMemo(
    () =>
      buildLiveRuntimeDevDiagnostics({
        mediationId,
        runtimeSession,
        runtimeFailed,
      }),
    [mediationId, runtimeSession, runtimeFailed]
  );

  const devStatus = useMemo(
    () =>
      resolveLiveRuntimeDevStatus({
        runtimeFailed,
        hasValidRuntimeSession:
          runtimeSession != null &&
          isRuntimeSessionShape(runtimeSession) &&
          !invalidRuntimeState,
      }),
    [runtimeFailed, runtimeSession, invalidRuntimeState]
  );

  useEffect(() => {
    if (!diagnostics) return;
    logLiveRuntimeDevDiagnostics(diagnostics);
  }, [diagnostics]);

  if (!__DEV__ || !diagnostics) {
    return null;
  }

  const statusLabel = liveRuntimeDevStatusLabel(devStatus);
  const statusColor =
    devStatus === 'failed'
      ? Colors.error
      : devStatus === 'ok'
        ? Colors.success
        : Colors.warning;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        style={[styles.badge, { borderColor: statusColor }]}
        accessibilityRole="button"
        accessibilityLabel="Toggle runtime diagnostics"
      >
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <View style={styles.badgeTextWrap}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          <Text style={styles.summaryText} numberOfLines={1}>
            {diagnostics.runtimeStage} · {diagnostics.nextBeat} · {diagnostics.pendingAwaiting}
          </Text>
        </View>
        <Text style={styles.expandHint}>{expanded ? '▾' : '▸'}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.panel}>
          <DiagnosticsPanel diagnostics={diagnostics} />
        </View>
      ) : null}
    </View>
  );
}

function DiagnosticsPanel({ diagnostics }: { diagnostics: LiveRuntimeDevDiagnostics }) {
  return (
    <>
      <DiagnosticsRow label="mediationId" value={diagnostics.mediationId} />
      <DiagnosticsRow label="stage" value={diagnostics.runtimeStage} />
      <DiagnosticsRow label="currentGoal" value={diagnostics.currentGoal} />
      <DiagnosticsRow label="nextBeat" value={diagnostics.nextBeat} />
      <DiagnosticsRow label="pending" value={diagnostics.pendingAwaiting} />
      <DiagnosticsRow label="proposal" value={diagnostics.proposalPhase} />
      <DiagnosticsRow label="closure" value={diagnostics.closureDirective} />
      <DiagnosticsRow
        label="runtimeFailed"
        value={diagnostics.runtimeFailed ? 'true' : 'false'}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    left: Spacing.sm,
    zIndex: 20,
    alignItems: 'flex-end',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    maxWidth: '100%',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(18, 18, 24, 0.92)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeTextWrap: {
    flexShrink: 1,
    minWidth: 0,
  },
  statusText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 11,
  },
  summaryText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  expandHint: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
  },
  panel: {
    marginTop: Spacing.xs,
    width: '100%',
    maxWidth: 360,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(18, 18, 24, 0.95)',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  rowLabel: {
    width: 88,
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.textMuted,
  },
  rowValue: {
    flex: 1,
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.textPrimary,
  },
});
