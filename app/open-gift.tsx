
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function OpenGiftScreen() {
  console.log('User viewing Open Gift screen');
  const router = useRouter();
  const [isOpening, setIsOpening] = useState(false);
  const [glitterParticles] = useState(() => 
    Array.from({ length: 30 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  );

  const bgColor = colors.background;
  const textColor = colors.text;
  const textSecondaryColor = colors.textSecondary;

  const handleOpenGift = () => {
    if (isOpening) {
      return;
    }

    console.log('User tapped to open gift - starting animation');
    setIsOpening(true);

    // Animate glitter particles
    const animations = glitterParticles.map((particle, index) => {
      const angle = (index / glitterParticles.length) * Math.PI * 2;
      const distance = 100 + Math.random() * 100;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance;

      return Animated.parallel([
        Animated.timing(particle.x, {
          toValue: targetX,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(particle.y, {
          toValue: targetY,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(particle.opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: 600,
            delay: 200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(particle.scale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: 0,
            duration: 600,
            delay: 200,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    Animated.parallel(animations).start(() => {
      console.log('Gift opening animation complete - navigating to daily gift');
      router.replace('/daily-gift');
    });
  };

  const titleText = 'Your Daily Gift';
  const subtitleText = 'A word for your heart today';
  const tapText = 'Tap to open';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: '',
          headerBackTitle: 'Home',
          headerStyle: {
            backgroundColor: bgColor,
          },
          headerTintColor: colors.primary,
        }}
      />

      <View style={styles.content}>
        <Text style={[styles.title, { color: textColor }]}>
          {titleText}
        </Text>
        
        <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
          {subtitleText}
        </Text>

        <View style={styles.giftContainer}>
          <TouchableOpacity 
            style={[styles.giftBox, { backgroundColor: colors.primary }]}
            onPress={handleOpenGift}
            activeOpacity={0.8}
            disabled={isOpening}
          >
            <IconSymbol 
              ios_icon_name="gift.fill"
              android_material_icon_name="card-giftcard"
              size={80}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Glitter particles */}
          {glitterParticles.map((particle, index) => {
            const glitterColor = index % 3 === 0 ? colors.accent : index % 3 === 1 ? colors.primary : colors.prayer;
            
            return (
              <Animated.View
                key={index}
                style={[
                  styles.glitterParticle,
                  {
                    backgroundColor: glitterColor,
                    transform: [
                      { translateX: particle.x },
                      { translateY: particle.y },
                      { scale: particle.scale },
                    ],
                    opacity: particle.opacity,
                  },
                ]}
              />
            );
          })}
        </View>

        <Text style={[styles.tapText, { color: textSecondaryColor }]}>
          {tapText}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.body,
    fontStyle: 'italic',
    marginBottom: spacing.xxl * 2,
    textAlign: 'center',
  },
  giftContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  giftBox: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glitterParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tapText: {
    fontSize: typography.body,
    textAlign: 'center',
  },
});
