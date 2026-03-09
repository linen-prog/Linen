
import { StyleSheet } from 'react-native';

// Warm Linen Color Palette - matches the screenshots
export const colors = {
  // Core "Warm Linen" scheme - soft peachy beige
  background: '#F5E6D3', // Soft peachy beige (main background)
  backgroundTop: '#F5E6D3', // Same as background for consistency
  primary: '#2D7A6E',    // Deep teal green
  text: '#4A4A4A',       // Dark gray-brown
  border: '#E0D0C0',     // Warm beige border
  
  // Gradient fix
  backgroundPattern: 'rgba(255, 255, 255, 0.1)', // Subtle white overlay
  
  // Other common colors, consistent with the theme
  secondary: '#6B8E23',
  accent: '#D4A574',
  cardBackground: '#FFFFFF',
  card: '#FFFFFF', // Alias for cardBackground
  secondaryText: '#6B6B6B',
  textSecondary: '#6B6B6B', // Alias for secondaryText
  mutedText: '#999999',
  lightText: '#888888',
  white: '#FFFFFF',
  black: '#000000',
  error: '#FF3B30',
  success: '#4CD964',
  warning: '#FFCC00',
  prayer: '#D4A574', // For glitter particles
  
  // Tab bar and icon colors
  tabIconDefault: '#CCC',
  tabIconSelected: '#2D7A6E', // Uses primary
  tint: '#2D7A6E', // Uses primary
  icon: '#4A4A4A', // Uses text
  link: '#2D7A6E', // Uses primary
  
  // Card and surface colors
  cardBorder: '#E0D0C0',
  
  // Interactive elements
  inputBackground: '#FFFFFF',
  inputBorder: '#E0D0C0',
  inputFocus: '#2D7A6E',
  
  // Borders and dividers
  divider: '#E8DDD0',
  
  // Overlays and shadows
  overlay: 'rgba(45, 122, 110, 0.1)',
  shadowColor: 'rgba(74, 74, 74, 0.15)',
  shadow: 'rgba(74, 74, 74, 0.15)', // Alias for shadowColor
  
  // Gradient colors
  gradientStart: '#F5E6D3',
  gradientEnd: '#F0DDCB',
  
  // Additional aliases for consistency
  primaryLight: '#2D7A6E',
};

// Typography
export const typography = {
  // Font families
  regular: 'System',
  medium: 'System',
  bold: 'System',
  fontFamily: 'System',
  
  // Font sizes
  xs: 12,
  sm: 14,
  base: 16,
  body: 16,
  bodySmall: 14,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  h2: 24,
  h3: 20,
  
  // Line heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
  
  // Font weights
  weightRegular: '400' as const,
  weightMedium: '500' as const,
  weightSemibold: '600' as const,
  weightBold: '700' as const,
  semibold: '600' as const,
};

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border radius
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Shadows
export const shadows = {
  sm: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Common component styles
export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  
  cardTitle: {
    fontSize: typography.xl,
    fontWeight: typography.weightBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  
  cardSubtitle: {
    fontSize: typography.base,
    color: colors.secondaryText,
    lineHeight: typography.lineHeightRelaxed * typography.base,
  },
  
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  
  buttonText: {
    color: '#FFFFFF',
    fontSize: typography.base,
    fontWeight: typography.weightSemibold,
  },
  
  secondaryButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  secondaryButtonText: {
    color: colors.primary,
    fontSize: typography.base,
    fontWeight: typography.weightSemibold,
  },
  
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.base,
    color: colors.text,
  },
  
  inputFocused: {
    borderColor: colors.inputFocus,
    borderWidth: 2,
  },
  
  heading1: {
    fontSize: typography.xxxl,
    fontWeight: typography.weightBold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  
  heading2: {
    fontSize: typography.xxl,
    fontWeight: typography.weightBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  
  heading3: {
    fontSize: typography.xl,
    fontWeight: typography.weightSemibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  
  bodyText: {
    fontSize: typography.base,
    color: colors.text,
    lineHeight: typography.lineHeightRelaxed * typography.base,
  },
  
  secondaryBodyText: {
    fontSize: typography.base,
    color: colors.secondaryText,
    lineHeight: typography.lineHeightRelaxed * typography.base,
  },
  
  mutedText: {
    fontSize: typography.sm,
    color: colors.mutedText,
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

// Gradient configuration for GradientBackground component
export const gradientConfig = {
  colors: ['#F5E6D3', '#F0DDCB'], // Gentle peachy beige gradient
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export const backgroundPattern = 'rgba(255, 255, 255, 0.03)';
