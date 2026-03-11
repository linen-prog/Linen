
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Warm Linen Color Palette - Gentle, faith-rooted aesthetic
export const colors = {
  // Background Gradient Colors
  backgroundTop: '#fef3c7',      // Warm cream/amber (top)
  backgroundMiddle: '#fafaf9',   // Off-white/stone (middle)
  backgroundBottom: '#fef3c7',   // Warm cream/amber (bottom)
  backgroundPattern: 'rgba(214, 201, 184, 0.08)', // Subtle pattern overlay at 8% opacity
  
  // Primary - Emerald/Green
  primary: '#047857',            // Emerald 700 (primary green)
  primaryLight: '#ecfdf5',       // Emerald 50 (very light mint)
  primaryMedium: '#059669',      // Emerald 600 (medium green)
  primaryDark: '#065f46',        // Emerald 800 (dark green)
  primaryVeryDark: '#064e3b',    // Emerald 900 (very dark green)
  
  // Background - Stone
  background: '#fafaf9',         // Stone 50 (off-white)
  backgroundDark: '#1c1917',     // Stone 900 (near black)
  
  // Card - Stone
  card: '#f5f5f4',               // Stone 100
  cardDark: '#292524',           // Stone 800
  
  // Text - Stone
  text: '#1c1917',               // Stone 900 (near black)
  textSecondary: '#57534e',      // Stone 600
  textLight: '#78716c',          // Stone 500 (medium gray)
  textDark: '#fafaf9',           // Stone 50 (off-white)
  textSecondaryDark: '#e7e5e4',  // Stone 200
  
  // Accent - Amber/Gold
  accent: '#fbbf24',             // Amber 400
  accentLight: '#fef3c7',        // Amber 100
  accentVeryLight: '#fffbeb',    // Amber 50
  accentMedium: '#fcd34d',       // Amber 300
  accentDark: '#b45309',         // Amber 700
  
  // Functional - Stone
  border: '#e7e5e4',             // Stone 200
  borderDark: '#44403c',         // Stone 700
  shadow: 'rgba(4, 120, 87, 0.08)',  // Emerald 700 at 8%
  shadowDark: 'rgba(0, 0, 0, 0.3)',
  
  // Prayer/Community - Warm tones
  prayer: '#b45309',             // Amber 700
  prayerLight: '#fcd34d',        // Amber 300
  
  // Status (gentle, non-urgent)
  success: '#059669',            // Emerald 600
  warning: '#fbbf24',            // Amber 400
  error: '#dc2626',              // Red for errors
};

export const typography = {
  // Calm, readable fonts
  fontFamily: 'System',
  fontFamilySerif: 'Georgia',
  
  // Sizes - spacious, not cramped
  h1: 32,
  h2: 26,
  h3: 22,
  h4: 18,
  body: 16,
  bodySmall: 14,
  caption: 12,
  
  // Weights
  light: '300' as TextStyle['fontWeight'],
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Gradient configuration for elegant background
export const gradientConfig = {
  colors: [colors.backgroundTop, colors.backgroundMiddle, colors.backgroundTop],
  locations: [0, 0.5, 1],
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  containerDark: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  heading1: {
    fontSize: typography.h1,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  heading1Dark: {
    fontSize: typography.h1,
    fontWeight: typography.semibold,
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  heading2: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  heading2Dark: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
  heading3: {
    fontSize: typography.h3,
    fontWeight: typography.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  heading3Dark: {
    fontSize: typography.h3,
    fontWeight: typography.medium,
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.text,
    lineHeight: 24,
  },
  bodyDark: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textDark,
    lineHeight: 24,
  },
  bodySecondary: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  bodySecondaryDark: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondaryDark,
    lineHeight: 24,
  },
  caption: {
    fontSize: typography.caption,
    fontWeight: typography.regular,
    color: colors.textLight,
  },
  captionDark: {
    fontSize: typography.caption,
    fontWeight: typography.regular,
    color: colors.textSecondaryDark,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputDark: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.textDark,
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
});
