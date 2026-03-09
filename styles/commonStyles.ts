
import { StyleSheet } from 'react-native';

export const colors = {
  // Warm, gentle background colors
  background: '#F5E6D3', // Soft peachy beige
  backgroundSecondary: '#EFE0CE', // Slightly darker beige
  backgroundPattern: 'rgba(255, 255, 255, 0.3)', // Subtle white overlay for pattern
  surface: '#FFFFFF', // Pure white for cards
  
  // Deep teal/green primary color (from the heart icon)
  primary: '#2D7A6E', // Deep teal green
  primaryLight: '#4A9B8E', // Lighter teal
  primaryDark: '#1F5A50', // Darker teal
  
  // Text colors
  text: '#4A4A4A', // Dark gray-brown for body text
  textSecondary: '#7A7A7A', // Medium gray for secondary text
  textLight: '#9A9A9A', // Light gray for subtle text
  
  // Accent colors
  accent: '#2D7A6E', // Same as primary for consistency
  accentLight: '#E8F4F2', // Very light teal for backgrounds
  
  // Semantic colors
  success: '#4A9B8E',
  warning: '#D4A574',
  error: '#C85A54',
  info: '#6B9AC4',
  
  // UI element colors
  border: '#E0D0BE', // Warm beige border
  borderLight: '#EFE0CE',
  divider: '#E8DCC8',
  
  // Interactive states
  hover: '#E8F4F2',
  pressed: '#D8E4E2',
  disabled: '#C0C0C0',
  
  // Special colors
  white: '#FFFFFF',
  black: '#2A2A2A',
  transparent: 'transparent',
  
  // Shadow colors
  shadow: 'rgba(45, 122, 110, 0.1)', // Teal-tinted shadow
  shadowDark: 'rgba(45, 122, 110, 0.2)',
};

export const gradientConfig = {
  colors: ['#F5E6D3', '#EFE0CE', '#F5E6D3'], // Soft peachy beige gradient
  locations: [0, 0.5, 1],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export const typography = {
  // Font families
  fontRegular: 'System',
  fontMedium: 'System',
  fontBold: 'System',
  fontLight: 'System',
  
  // Font sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  
  // Line heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
  
  // Font weights
  weightLight: '300' as const,
  weightRegular: '400' as const,
  weightMedium: '500' as const,
  weightSemibold: '600' as const,
  weightBold: '700' as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardLarge: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.base,
    fontWeight: typography.weightSemibold,
  },
  buttonSecondary: {
    backgroundColor: colors.accentLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonSecondaryText: {
    color: colors.primary,
    fontSize: typography.base,
    fontWeight: typography.weightSemibold,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.base,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading1: {
    fontSize: typography.xxxl,
    fontWeight: typography.weightBold,
    color: colors.text,
    lineHeight: typography.xxxl * typography.lineHeightTight,
  },
  heading2: {
    fontSize: typography.xxl,
    fontWeight: typography.weightBold,
    color: colors.text,
    lineHeight: typography.xxl * typography.lineHeightTight,
  },
  heading3: {
    fontSize: typography.xl,
    fontWeight: typography.weightSemibold,
    color: colors.text,
    lineHeight: typography.xl * typography.lineHeightNormal,
  },
  body: {
    fontSize: typography.base,
    fontWeight: typography.weightRegular,
    color: colors.text,
    lineHeight: typography.base * typography.lineHeightRelaxed,
  },
  bodySecondary: {
    fontSize: typography.sm,
    fontWeight: typography.weightRegular,
    color: colors.textSecondary,
    lineHeight: typography.sm * typography.lineHeightRelaxed,
  },
  caption: {
    fontSize: typography.xs,
    fontWeight: typography.weightRegular,
    color: colors.textLight,
    lineHeight: typography.xs * typography.lineHeightNormal,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
