
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Linen Color Palette - Warm, gentle, faith-rooted
export const colors = {
  // Primary - Deep green (spiritual, grounded)
  primary: '#1B5E4F',
  primaryLight: '#2D7A68',
  primaryDark: '#0F3D32',
  
  // Background - Warm off-white
  background: '#FAF8F5',
  backgroundDark: '#1C1C1E',
  
  // Card - Soft white with warmth
  card: '#FFFFFF',
  cardDark: '#2C2C2E',
  
  // Text
  text: '#2C2C2E',
  textSecondary: '#6B6B6B',
  textLight: '#9B9B9B',
  textDark: '#F5F5F5',
  textSecondaryDark: '#A8A8A8',
  
  // Accent - Soft gold for highlights
  accent: '#D4A574',
  accentLight: '#E8C9A3',
  
  // Functional
  border: '#E8E5E0',
  borderDark: '#3A3A3C',
  shadow: 'rgba(27, 94, 79, 0.08)',
  shadowDark: 'rgba(0, 0, 0, 0.3)',
  
  // Prayer/Community
  prayer: '#8B7355',
  prayerLight: '#B39A7D',
  
  // Status (gentle, non-urgent)
  success: '#5A8F7B',
  warning: '#C9A66B',
  error: '#B85C50',
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
