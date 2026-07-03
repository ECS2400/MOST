import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';

const { width: W, height: H } = Dimensions.get('window');

type Star = { x: number; y: number; size: number; opacity: number };

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function buildStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    x: seededRandom(i * 3) * W,
    y: seededRandom(i * 5) * H,
    size: 1 + seededRandom(i * 11) * 2.5,
    opacity: 0.15 + seededRandom(i * 13) * 0.85,
  }));
}

function StarLayer({ stars }: { stars: Star[] }) {
  return (
    <View style={styles.starLayer}>
      {stars.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            borderRadius: s.size,
            backgroundColor: '#F5F3FF',
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}

export function CosmicBackground() {
  const stars = useMemo(() => buildStars(90), []);

  return (
    <View style={styles.root} pointerEvents="none">
      <LinearGradient
        colors={['#03020a', Colors.background, '#150828', '#0F0A1E']}
        locations={[0, 0.4, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.nebula1} />
      <View style={styles.nebula2} />

      <StarLayer stars={stars} />

      <LinearGradient
        colors={['transparent', 'rgba(5,3,16,0.25)', 'rgba(5,3,16,0.55)']}
        locations={[0, 0.85, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  starLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  nebula1: {
    position: 'absolute',
    width: W * 0.9,
    height: W * 0.9,
    borderRadius: W * 0.45,
    backgroundColor: '#7C3AED',
    opacity: 0.07,
    top: H * 0.08,
    left: -W * 0.15,
  },
  nebula2: {
    position: 'absolute',
    width: W * 0.75,
    height: W * 0.75,
    borderRadius: W * 0.375,
    backgroundColor: '#C026D3',
    opacity: 0.06,
    bottom: H * 0.05,
    right: -W * 0.1,
  },
});

/** Półprzezroczyste tło ekranu — widać gwiazdy, tekst czytelny */
export const SCREEN_BG = 'rgba(15, 10, 30, 0.72)';

/** Pełne ciemne tło — auth, onboarding */
export const SCREEN_BG_SOLID = Colors.background;
