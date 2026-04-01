// Powered by OnSpace.AI
export const Colors = {
  // Brand
  primary: '#1B2A7B',
  primaryLight: '#2E3F9E',
  primaryDark: '#111B54',
  accent: '#2D8C4E',
  accentLight: '#3AAD62',
  accentDark: '#1F6338',

  // Backgrounds
  background: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F8',
  cardBg: '#FFFFFF',
  splashBg: '#1B2A7B',

  // Text
  textPrimary: '#1A1E2E',
  textSecondary: '#5A6275',
  textMuted: '#9299AB',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  // UI Elements
  border: '#E2E5EF',
  borderLight: '#EEF0F8',
  divider: '#E8EAF2',
  inputBg: '#F0F2FA',

  // Status
  success: '#2D8C4E',
  warning: '#E8A020',
  error: '#D32F2F',
  info: '#1976D2',

  // Badges
  badgePrimary: '#1B2A7B',
  badgeSuccess: '#2D8C4E',
  badgeWarning: '#F57C00',
  badgeMuted: '#9299AB',

  // Shadows
  shadowColor: '#1B2A7B',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
};

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 22,
  xxxl: 26,
  hero: 32,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
};

export const Shadow = {
  sm: {
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};
