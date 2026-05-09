
import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradientConfig } from '@/styles/commonStyles';
import { useTheme } from '@/contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: any;
  variant?: 'default' | 'midnight';
}

// Seeded star positions — fixed so they never re-render
const STAR_DATA = [
  { x: 0.05, y: 0.03, size: 1.5 }, { x: 0.18, y: 0.07, size: 2 },
  { x: 0.32, y: 0.02, size: 1.5 }, { x: 0.47, y: 0.06, size: 2.5 },
  { x: 0.61, y: 0.01, size: 1.5 }, { x: 0.75, y: 0.05, size: 2 },
  { x: 0.88, y: 0.03, size: 1.5 }, { x: 0.93, y: 0.09, size: 2 },
  { x: 0.12, y: 0.13, size: 2.5 }, { x: 0.27, y: 0.11, size: 1.5 },
  { x: 0.41, y: 0.15, size: 2 },   { x: 0.55, y: 0.10, size: 1.5 },
  { x: 0.69, y: 0.14, size: 2.5 }, { x: 0.82, y: 0.12, size: 2 },
  { x: 0.96, y: 0.16, size: 1.5 }, { x: 0.08, y: 0.20, size: 2 },
  { x: 0.22, y: 0.22, size: 1.5 }, { x: 0.36, y: 0.19, size: 2.5 },
  { x: 0.50, y: 0.24, size: 2 },   { x: 0.64, y: 0.21, size: 1.5 },
  { x: 0.78, y: 0.25, size: 2 },   { x: 0.91, y: 0.20, size: 2.5 },
  { x: 0.03, y: 0.30, size: 1.5 }, { x: 0.16, y: 0.33, size: 2 },
  { x: 0.30, y: 0.28, size: 1.5 }, { x: 0.44, y: 0.35, size: 2.5 },
  { x: 0.58, y: 0.31, size: 2 },   { x: 0.72, y: 0.36, size: 1.5 },
  { x: 0.85, y: 0.29, size: 2 },   { x: 0.97, y: 0.34, size: 1.5 },
  { x: 0.10, y: 0.40, size: 2.5 }, { x: 0.24, y: 0.43, size: 2 },
  { x: 0.38, y: 0.38, size: 1.5 }, { x: 0.52, y: 0.44, size: 2 },
  { x: 0.66, y: 0.41, size: 2.5 }, { x: 0.80, y: 0.45, size: 1.5 },
  { x: 0.94, y: 0.39, size: 2 },   { x: 0.07, y: 0.50, size: 1.5 },
  { x: 0.21, y: 0.52, size: 2 },   { x: 0.35, y: 0.48, size: 2.5 },
];

const STAR_OPACITIES = [0.7, 0.8, 0.9, 0.6, 0.85, 0.75, 0.65, 0.9, 0.7, 0.8];

export function GradientBackground({ children, style, variant = 'default' }: GradientBackgroundProps) {
  const { isDark } = useTheme();

  const stars = useMemo(() => {
    return STAR_DATA.map((s, i) => ({
      left: s.x * SCREEN_WIDTH,
      top: s.y * SCREEN_HEIGHT,
      size: s.size,
      opacity: STAR_OPACITIES[i % STAR_OPACITIES.length],
    }));
  }, []);

  if (variant === 'midnight') {
    return (
      <View style={[styles.container, style]}>
        {/* Base deep midnight gradient */}
        <LinearGradient
          colors={['#0a0612', '#110820', '#0d0618', '#0a0612']}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Star field */}
        <View style={[StyleSheet.absoluteFillObject, styles.starField]} pointerEvents="none">
          {stars.map((star, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                borderRadius: star.size,
                backgroundColor: `rgba(255,255,255,${star.opacity})`,
              }}
            />
          ))}
        </View>

        {/* Bottom-left purple glow */}
        <LinearGradient
          colors={['transparent', 'rgba(88,28,135,0.25)', 'transparent']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFillObject, styles.fogBottomLeft]}
          pointerEvents="none"
        />

        {/* Bottom-right violet glow */}
        <LinearGradient
          colors={['transparent', 'rgba(109,40,217,0.2)', 'transparent']}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={[StyleSheet.absoluteFillObject, styles.fogBottomRight]}
          pointerEvents="none"
        />

        {/* Center bloom */}
        <LinearGradient
          colors={['transparent', 'rgba(139,92,246,0.08)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFillObject, styles.fogCenter]}
          pointerEvents="none"
        />

        {/* Side vignette */}
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.5)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {children}
      </View>
    );
  }

  // Default warm cream variant
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
      <View style={styles.patternOverlay} pointerEvents="none" />
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
  starField: {
    opacity: 0.7,
  },
  fogBottomLeft: {
    left: 0,
    bottom: 0,
    width: '60%',
    height: '50%',
    top: undefined,
    right: undefined,
  },
  fogBottomRight: {
    right: 0,
    bottom: 0,
    width: '50%',
    height: '40%',
    top: undefined,
    left: undefined,
  },
  fogCenter: {
    top: '25%',
    bottom: '25%',
  },
});
