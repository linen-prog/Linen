
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import FloatingTabBar from '@/components/FloatingTabBar';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';
import { Audio } from 'expo-audio';
import type { Href } from 'expo-router';

interface GlitterParticle {
  id: number;
  angle: number;
  distance: number;
  delay: number;
  color: string;
}

interface AmbientSound {
  id: string;
  name: string;
  icon: string;
  materialIcon: string;
  url: string;
}

const AMBIENT_SOUNDS: AmbientSound[] = [
  {
    id: 'birds',
    name: 'Birds',
    icon: 'bird',
    materialIcon: 'flutter-dash',
    url: 'https://assets.mixkit.co/active_storage/sfx/17/17.wav',
  },
  {
    id: 'rain',
    name: 'Rain',
    icon: 'cloud.rain.fill',
    materialIcon: 'water-drop',
    url: 'https://assets.mixkit.co/active_storage/sfx/2394/2394.wav',
  },
  {
    id: 'wind',
    name: 'Wind',
    icon: 'wind',
    materialIcon: 'air',
    url: 'https://assets.mixkit.co/active_storage/sfx/2500/2500.wav',
  },
  {
    id: 'ocean',
    name: 'Ocean Waves',
    icon: 'water.waves',
    materialIcon: 'waves',
    url: 'https://assets.mixkit.co/active_storage/sfx/1208/1208.wav',
  },
  {
    id: 'bells',
    name: 'Church Bells',
    icon: 'bell.fill',
    materialIcon: 'notifications',
    url: 'https://assets.mixkit.co/active_storage/sfx/628/628.wav',
  },
];

export default function OpenGiftScreen() {
  console.log('🎁 [OpenGift] Screen mounted and rendering');
  const router = useRouter();
  const [isOpening, setIsOpening] = useState(false);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  useEffect(() => {
    console.log('🎁 [OpenGift] useEffect - Screen is now visible to user');
    
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        console.log('🔊 [OpenGift] Audio mode configured');
      } catch (error) {
        console.error('🔊 [OpenGift] Error configuring audio:', error);
      }
    };
    
    configureAudio();
    
    return () => {
      if (sound) {
        console.log('🔊 [OpenGift] Unloading sound on unmount');
        sound.unloadAsync();
      }
    };
  }, [sound]);
  
  const glitterParticles: GlitterParticle[] = Array.from({ length: 30 }, (_, index) => ({
    id: index,
    angle: (index / 30) * Math.PI * 2,
    distance: 80 + Math.random() * 60,
    delay: Math.random() * 100,
    color: index % 3 === 0 ? colors.accent : index % 3 === 1 ? colors.primary : colors.prayer,
  }));

  const bgColor = colors.backgroundTop;
  const textColor = colors.text;
  const textSecondaryColor = colors.textSecondary;

  const handleSoundSelect = async (soundId: string) => {
    console.log('🔊 [OpenGift] User selected sound:', soundId);
    
    try {
      if (selectedSound === soundId && sound) {
        if (isPlaying) {
          console.log('🔊 [OpenGift] Pausing sound');
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          console.log('🔊 [OpenGift] Resuming sound');
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }
      
      if (sound) {
        console.log('🔊 [OpenGift] Unloading previous sound');
        await sound.unloadAsync();
        setSound(null);
      }
      
      const selectedAmbient = AMBIENT_SOUNDS.find(s => s.id === soundId);
      if (!selectedAmbient) {
        console.error('🔊 [OpenGift] Sound not found:', soundId);
        return;
      }
      
      console.log('🔊 [OpenGift] Loading sound from:', selectedAmbient.url);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: selectedAmbient.url },
        { shouldPlay: true, isLooping: true, volume: 0.5 },
        (status) => {
          if (status.isLoaded) {
            if (status.didJustFinish && !status.isLooping) {
              console.log('🔊 [OpenGift] Sound finished playing');
              setIsPlaying(false);
            }
          }
        }
      );
      
      console.log('🔊 [OpenGift] Sound loaded and playing');
      setSound(newSound);
      setSelectedSound(soundId);
      setIsPlaying(true);
    } catch (error) {
      console.error('🔊 [OpenGift] Error playing sound:', error);
    }
  };

  const handleStopSound = async () => {
    console.log('🔊 [OpenGift] User stopped sound');
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setSelectedSound(null);
      setIsPlaying(false);
    }
  };

  const handleOpenGift = () => {
    if (isOpening) {
      console.log('🎁 [OpenGift] Already opening, ignoring tap');
      return;
    }

    console.log('🎁 [OpenGift] User tapped gift box - starting glitter animation');
    setIsOpening(true);

    const navigationTimer = setTimeout(() => {
      console.log('🎁 [OpenGift] Animation complete - navigating to /daily-gift');
      try {
        router.replace('/daily-gift');
      } catch (error) {
        console.error('🎁 [OpenGift] Navigation error:', error);
        router.push('/daily-gift');
      }
    }, 1200);

    return () => clearTimeout(navigationTimer);
  };

  const titleText = 'Your Daily Gift';
  const subtitleText = 'A word for your heart today';
  const tapText = 'Tap to open';
  const ambientSoundTitle = 'Ambient Sound';

  console.log('🎁 [OpenGift] Rendering screen content');

  const tabs = [
    { name: 'home', route: '/(tabs)' as Href, icon: 'home' as const, label: 'Home' },
    { name: 'community', route: '/(tabs)/community' as Href, icon: 'group' as const, label: 'Community' },
    { name: 'profile', route: '/(tabs)/profile' as Href, icon: 'account-circle' as const, label: 'Profile' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
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

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.ambientSoundBox, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.ambientSoundTitle, { color: textColor }]}>
            {ambientSoundTitle}
          </Text>
          
          <View style={styles.soundButtons}>
            {AMBIENT_SOUNDS.map((ambientSound) => {
              const isSelected = selectedSound === ambientSound.id;
              const buttonBgColor = isSelected && isPlaying ? colors.primary : colors.backgroundTop;
              const buttonTextColor = isSelected && isPlaying ? '#FFFFFF' : textColor;
              
              return (
                <TouchableOpacity
                  key={ambientSound.id}
                  style={[styles.soundButton, { backgroundColor: buttonBgColor }]}
                  onPress={() => handleSoundSelect(ambientSound.id)}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name={ambientSound.icon}
                    android_material_icon_name={ambientSound.materialIcon}
                    size={24}
                    color={buttonTextColor}
                  />
                  <Text style={[styles.soundButtonText, { color: buttonTextColor }]}>
                    {ambientSound.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          {selectedSound && isPlaying && (
            <TouchableOpacity
              style={[styles.stopButton, { backgroundColor: colors.error }]}
              onPress={handleStopSound}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="stop.fill"
                android_material_icon_name="stop"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.stopButtonText}>Stop Sound</Text>
            </TouchableOpacity>
          )}
        </View>

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
      </ScrollView>

      <FloatingTabBar tabs={tabs} />
    </View>
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
  }, [angle, distance, delay, translateX, translateY, opacity, scale]);

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  ambientSoundBox: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ambientSoundTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  soundButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  soundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  soundButtonText: {
    fontSize: 14,
    fontWeight: '400',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    alignSelf: 'center',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
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
