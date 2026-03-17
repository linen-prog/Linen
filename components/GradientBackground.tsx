
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradientConfig } from '@/styles/commonStyles';
import { useTheme } from '@/contexts/ThemeContext';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: any;
}

export function GradientBackground({ children, style }: GradientBackgroundProps) {
  const { isDark } = useTheme();

  const gradientColors = isDark
    ? [colors.backgroundDark, '#231f1c', colors.backgroundDark] as const
    : gradientConfig.colors as unknown as readonly [string, string, ...string[]];

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={gradientColors}
        locations={gradientConfig.locations}
        start={gradientConfig.start}
        end={gradientConfig.end}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Subtle pattern overlay */}
      <View style={styles.patternOverlay} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backgroundPattern,
  },
});
