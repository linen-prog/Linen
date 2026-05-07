
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/GradientBackground';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { colors, spacing } from '@/styles/commonStyles';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/IconSymbol';
import FloatingTabBar from '@/components/FloatingTabBar';
import ChimePlayer from '@/components/ChimePlayer';
import { trackGiftOpen, shouldShowReviewPrompt, markReviewPromptShown } from '@/utils/reviewPrompt';
import ReviewPromptModal from '@/components/ReviewPromptModal';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const tabs = [
  { name: 'home', route: '/(tabs)/' as const, icon: 'home' as const, ios_icon_name: 'house.fill', label: 'Home' },
  { name: 'community', route: '/(tabs)/community' as const, icon: 'people' as const, ios_icon_name: 'person.3.fill', label: 'Community' },
  { name: 'profile', route: '/(tabs)/profile' as const, icon: 'person' as const, ios_icon_name: 'person.circle.fill', label: 'Profile' },
];

interface GlitterParticleData {
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
  const [ritualPausing, setRitualPausing] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ritualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioPlayerRef = useRef<{ play: () => void } | null>(null);

  const navigateToDailyGift = () => {
    console.log('🎁 [OpenGift] Navigating to /daily-gift');
    try {
      router.replace('/daily-gift');
    } catch (error) {
      console.error('🎁 [OpenGift] Navigation error:', error);
      router.push('/daily-gift');
    }
  };

  // Animated values — nativeDriver compatible (opacity + transform only)
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const microcopyOpacity = useRef(new Animated.Value(0)).current;
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    console.log('🎁 [OpenGift] useEffect - Screen is now visible to user');
    return () => {
      if (navigationTimerRef.current) clearTimeout(navigationTimerRef.current);
      if (ritualTimerRef.current) clearTimeout(ritualTimerRef.current);
      if (glowLoopRef.current) glowLoopRef.current.stop();
      glowOpacity.stopAnimation();
      microcopyOpacity.stopAnimation();
    };
  }, []);

  const startGlowPulse = () => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.8, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
      ])
    );
    glowLoopRef.current = loop;
    loop.start();
  };

  const fadeOutGlow = () => {
    if (glowLoopRef.current) glowLoopRef.current.stop();
    Animated.timing(glowOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
  };

  const fadeInMicrocopy = () => {
    Animated.timing(microcopyOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  };

  const fadeOutMicrocopy = () => {
    Animated.timing(microcopyOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  // Create glitter particles once — stable across renders
  const glitterParticles = useMemo<GlitterParticleData[]>(() => Array.from({ length: 30 }, (_, index) => ({
    id: index,
    angle: (index / 30) * Math.PI * 2,
    distance: 80 + Math.random() * 60,
    delay: Math.random() * 100,
    color: index % 3 === 0 ? colors.accent : index % 3 === 1 ? colors.primary : colors.prayer,
  })), []);

  const { isDark } = useTheme();
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

  const handleReceiveGift = () => {
    if (isOpening || ritualPausing) {
      console.log('🎁 [OpenGift] Already in ritual or opening, ignoring tap');
      return;
    }

    console.log('🎁 [OpenGift] User tapped "Receive your gift" - starting 1.5s ritual pause');
    setRitualPausing(true);
    startGlowPulse();
    fadeInMicrocopy();

    // Play chime sound — fail silently if asset missing or audio unavailable
    try {
      if (audioPlayerRef.current) {
        console.log('🎁 [OpenGift] Playing chime sound');
        audioPlayerRef.current.play();
      }
    } catch (err) {
      console.log('🎁 [OpenGift] Audio play failed silently:', err);
    }

    // After 1.5s ritual pause, start glitter animation then navigate
    ritualTimerRef.current = setTimeout(() => {
      console.log('🎁 [OpenGift] Ritual pause complete - starting glitter animation');
      setRitualPausing(false);
      fadeOutMicrocopy();
      fadeOutGlow();
      setIsOpening(true);

      navigationTimerRef.current = setTimeout(async () => {
        console.log('🎁 [OpenGift] Animation complete - tracking gift open');
        await trackGiftOpen();
        const shouldShow = await shouldShowReviewPrompt();
        console.log('🎁 [OpenGift] shouldShowReviewPrompt:', shouldShow);
        if (shouldShow) {
          console.log('🎁 [OpenGift] Showing review prompt before navigating');
          await markReviewPromptShown();
          setShowReviewPrompt(true);
          // Navigation happens via ReviewPromptModal onClose
        } else {
          navigateToDailyGift();
        }
      }, 1200);
    }, 1500);
  };

  const handleCommunityPress = () => {
    console.log('🎁 [OpenGift] User tapped Community icon');
    router.navigate('/(tabs)/community');
  };

  const titleText = 'Your Daily Gift';
  const subtitleText = 'A word for your heart today';
  const buttonLabel = 'Receive your gift';
  const isInteractive = !ritualPausing && !isOpening;

  console.log('🎁 [OpenGift] Rendering - ritualPausing:', ritualPausing, 'isOpening:', isOpening);

  return (
    <GradientBackground>
      {/*
        ChimePlayer calls useAudioPlayer unconditionally at its own top level
        (satisfying Rules of Hooks), then surfaces the player via onReady.
        It renders null and is wrapped in a try/catch at the component boundary.
      */}
      <ChimePlayer onReady={(player) => { audioPlayerRef.current = player; }} />

      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Daily Gift',
            headerBackTitle: '',
            headerTransparent: true,
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#047857',
            headerTitleStyle: {
              fontSize: 18,
              fontWeight: '400' as const,
              color: '#1c1917',
              fontFamily: 'Georgia',
            },
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => { console.log('[OpenGift] Back button pressed'); router.back(); }}
                style={{ paddingRight: 8, flexDirection: 'row' as const, alignItems: 'center' as const }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ChevronLeft size={24} color="#047857" />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <TouchableOpacity
                onPress={handleCommunityPress}
                style={{ paddingLeft: 8 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol
                  ios_icon_name="person.2"
                  android_material_icon_name="group"
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>
            ),
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
            {/* Soft pulsing glow — zIndex 0, behind the gift box */}
            <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />

            <TouchableOpacity
              style={[styles.giftBox, { backgroundColor: colors.primary }]}
              onPress={handleReceiveGift}
              activeOpacity={0.8}
              disabled={!isInteractive}
            >
              <IconSymbol
                ios_icon_name="gift.fill"
                android_material_icon_name="card-giftcard"
                size={80}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {/* Glitter particles — rendered after ritual pause ends */}
            {isOpening && glitterParticles.map((particle) => (
              <GlitterParticleView
                key={particle.id}
                angle={particle.angle}
                distance={particle.distance}
                delay={particle.delay}
                color={particle.color}
              />
            ))}
          </View>

          {/* Ritual microcopy — fades in during the 1.5s pause */}
          <Animated.Text
            style={[styles.microcopy, { color: textSecondaryColor, opacity: microcopyOpacity }]}
          >
            Take a breath before you receive
          </Animated.Text>

          {/* Receive button — hidden during ritual pause and glitter animation */}
          {isInteractive && (
            <TouchableOpacity
              onPress={handleReceiveGift}
              activeOpacity={0.7}
              style={styles.receiveButton}
            >
              <Text style={[styles.receiveButtonText, { color: colors.primary }]}>
                {buttonLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <FloatingTabBar tabs={tabs} />
      </SafeAreaView>

      {/* App Store review prompt — shown after gift animation completes */}
      <ReviewPromptModal
        visible={showReviewPrompt}
        onClose={() => {
          console.log('🎁 [OpenGift] ReviewPromptModal closed — navigating to /daily-gift');
          setShowReviewPrompt(false);
          navigateToDailyGift();
        }}
      />
    </GradientBackground>
  );
}

function GlitterParticleView({
  angle,
  distance,
  delay,
  color,
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
        easing: Easing.out(Easing.cubic),
      });
      translateY.value = withTiming(targetY, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
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
    <ReanimatedAnimated.View
      style={[styles.glitterParticle, { backgroundColor: color }, animatedStyle]}
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
    paddingBottom: 100,
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
  glowRing: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(212, 196, 168, 0.4)',
    zIndex: 0,
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
    zIndex: 1,
  },
  glitterParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 2,
  },
  microcopy: {
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  receiveButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  receiveButtonText: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
