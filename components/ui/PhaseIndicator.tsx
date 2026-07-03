import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { DisputePhase } from '@/types';
import { useLanguage } from '@/hooks/useLanguage';

interface PhaseIndicatorProps {
  currentPhase: DisputePhase;
  compact?: boolean;
}

export function PhaseIndicator({ currentPhase, compact = false }: PhaseIndicatorProps) {
  const { t } = useLanguage();

  const phases = useMemo(
    () => [
      { id: 1, name: t.phases.phase1Name, icon: 'person', color: Colors.phase1 },
      { id: 2, name: t.phases.phase2Name, icon: 'flip', color: Colors.phase2 },
      { id: 3, name: t.phases.phase3Name, icon: 'people', color: Colors.phase3 },
      { id: 4, name: t.phases.phase4Name, icon: 'handshake', color: Colors.phase4 },
    ],
    [t],
  );

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {phases.map((phase) => {
          const isActive = phase.id === currentPhase;
          const isDone = phase.id < currentPhase;
          return (
            <View key={phase.id} style={styles.compactItem}>
              <View
                style={[
                  styles.compactDot,
                  isActive && { backgroundColor: phase.color, width: 24 },
                  isDone && { backgroundColor: phase.color + '80' },
                  !isActive && !isDone && { backgroundColor: Colors.border },
                ]}
              />
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {phases.map((phase, index) => {
        const isActive = phase.id === currentPhase;
        const isDone = phase.id < currentPhase;
        return (
          <React.Fragment key={phase.id}>
            <View style={styles.phaseItem}>
              <View
                style={[
                  styles.circle,
                  isActive && { backgroundColor: phase.color, borderColor: phase.color },
                  isDone && { backgroundColor: phase.color + '40', borderColor: phase.color + '80' },
                  !isActive && !isDone && styles.circleInactive,
                ]}
              >
                {isDone ? (
                  <MaterialIcons name="check" size={14} color={phase.color} />
                ) : (
                  <MaterialIcons
                    name={phase.icon as any}
                    size={14}
                    color={isActive ? '#fff' : Colors.textMuted}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.phaseName,
                  isActive && { color: phase.color },
                  isDone && { color: phase.color + 'AA' },
                  !isActive && !isDone && { color: Colors.textMuted },
                ]}
              >
                {phase.name}
              </Text>
            </View>
            {index < phases.length - 1 && (
              <View
                style={[
                  styles.connector,
                  isDone && { backgroundColor: phases[index].color + '60' },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  phaseItem: {
    alignItems: 'center',
    gap: 4,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInactive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  phaseName: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 9,
    textAlign: 'center',
    width: 56,
  },
  connector: {
    flex: 1,
    height: 1.5,
    backgroundColor: Colors.border,
    marginBottom: 16,
    marginHorizontal: 2,
  },
  compactContainer: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  compactItem: {
    alignItems: 'center',
  },
  compactDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },
});
