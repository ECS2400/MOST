// Most App — Design Tokens
export const Colors = {
  // Brand
  primary: '#7C3AED',       // Purple
  primaryLight: '#A78BFA',
  primaryDark: '#5B21B6',
  accent: '#F97316',        // Coral/Orange
  accentLight: '#FCA570',
  accentDark: '#EA580C',

  // Gradient endpoints
  gradientStart: '#7C3AED',
  gradientMid: '#C026D3',
  gradientEnd: '#F97316',

  // Surfaces
  background: '#0F0A1E',
  surface: '#1A1030',
  surfaceElevated: '#241545',
  surfaceCard: '#1E1338',
  border: '#2E1F4A',
  borderLight: '#3D2860',

  // Text
  textPrimary: '#F5F3FF',
  textSecondary: '#A494C8',
  textMuted: '#6B5E8A',
  textOnPrimary: '#FFFFFF',

  // Semantic
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',

  // Phase colors
  phase1: '#7C3AED',   // Individual — purple
  phase2: '#C026D3',   // Mirror — magenta
  phase3: '#F97316',   // Joint — coral
  phase4: '#10B981',   // Resolution — green

  // Premium
  gold: '#F59E0B',
  goldLight: '#FCD34D',
};

export const Typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  size: {
    xs: 11,
    sm: 13,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
};
