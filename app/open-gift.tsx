
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';

interface GlitterParticle {
  id: number;
  angle: number;
  distance: number;
  delay: number;
  color: string;
}

export default function OpenGiftScreen() {
  console.log('🎁 [OpenGift] Screen mounted and rendering');
  const router = useRouter();
  const [isOpening, setIsOpening] = useState(false);
  
  useEffect(() => {
    console.log('🎁 [OpenGift] useEffect - Screen is now visible to user');
  }, []);
  
  // Create glitter particles
  const glitterParticles: GlitterParticle[] = Array.from({ length: 30 }, (_, index) => ({
    id: index,
    angle: (index / 30) * Math.PI * 2,
    distance: 80 + Math.random() * 60,
    delay: Math.random() * 100,
    color: index % 3 === 0 ? colors.accent : index % 3 === 1 ? colors.primary : colors.prayer,
  }));

  const bgColor = colors.background;
  const textColor = colors.text;
  const textSecondaryColor = colors.textSecondary;

  const handleOpenGift = () => {
    if (isOpening) {
      console.log('🎁 [OpenGift] Already opening, ignoring tap');
      return;
    }

    console.log('🎁 [OpenGift] User tapped gift box - starting glitter animation');
    setIsOpening(true);

    // Navigate after animation completes
    const navigationTimer = setTimeout(() => {
      console.log('🎁 [OpenGift] Animation complete - navigating to /daily-gift');
      try {
        router.replace('/daily-gift');
      } catch (error) {
        console.error('🎁 [OpenGift] Navigation error:', error);
        // Fallback: try push instead of replace
        router.push('/daily-gift');
      }
    }, 1200);

    // Cleanup timer on unmount
    return () => clearTimeout(navigationTimer);
  };

  const titleText = 'Your Daily Gift';
  const subtitleText = 'A word for your heart today';
  const tapText = 'Tap to open';

  console.log('🎁 [OpenGift] Rendering screen content');

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
          {isOpening && glitterParticles.map((particle) => (
            <GlitterParticle
              key={particle.id}
              angle={particle.angle}
              distance={particle.distance}
              delay={particle.delay}
              color={particle.color}
            />
          ))}
        </View>

        <Text style={[styles.tapText, { color: textSecondaryColor }]}>
          {tapText}
        </Text>
      </View>
    </SafeAreaView>
  );
}

function GlitterParticle({ 
  angle, 
  distance, 
  delay, 
  color 
}: { 
  angle: number; 
  distance: number; 
  delay: number; 
  color: string;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  React.useEffect(() => {
    const targetX = Math.cos(angle) * distance;
    const targetY = Math.sin(angle) * distance;

    setTimeout(() => {
      translateX.value = withTiming(targetX, { 
        duration: 800, 
        easing: Easing.out(Easing.cubic) 
      });
      translateY.value = withTiming(targetY, { 
        duration: 800, 
        easing: Easing.out(Easing.cubic) 
      });
      opacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) })
      );
      scale.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0.5, { duration: 600 })
      );
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.glitterParticle,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
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
    fontSize: 32,
    fontWeight: '400',
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: spacing.xxl * 2,
    textAlign: 'center',
    fontWeight: '300',
  },
  giftContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    width: 200,
    height: 200,
  },
  giftBox: {
    width: 140,
    height: 140,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
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
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '300',
  },
});
