
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradientConfig } from '@/styles/commonStyles';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: any;
}

export function GradientBackground({ children, style }: GradientBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      {/* Layer 1: Color Gradient */}
      <LinearGradient
        colors={gradientConfig.colors}
        locations={gradientConfig.locations}
        start={gradientConfig.start}
        end={gradientConfig.end}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Layer 2: Subtle Cross Pattern Overlay */}
      <View style={StyleSheet.absoluteFillObject}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
          <Defs>
            <Pattern
              id="crossPattern"
              x="0"
              y="0"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              {/* Horizontal rectangle of the cross */}
              <Rect
                x="25"
                y="28"
                width="10"
                height="4"
                fill="#d6c9b8"
                opacity="0.08"
              />
              {/* Vertical rectangle of the cross */}
              <Rect
                x="28"
                y="25"
                width="4"
                height="10"
                fill="#d6c9b8"
                opacity="0.08"
              />
            </Pattern>
          </Defs>
          
          {/* Apply pattern with overlay blend mode */}
          <Rect
            width="100%"
            height="100%"
            fill="url(#crossPattern)"
          />
        </Svg>
      </View>
      
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
