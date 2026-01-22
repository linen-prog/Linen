
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function HomeScreen() {
  console.log('User viewing Home screen');
  const router = useRouter();

  const [checkInStreak, setCheckInStreak] = useState(0);
  const [reflectionStreak, setReflectionStreak] = useState(0);
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Fetch user info
        const { authenticatedGet } = await import('@/utils/api');
        const userResponse = await authenticatedGet<{ user: { id: string; email: string; name?: string } }>('/api/auth/me');
        console.log('User data loaded:', userResponse);
        
        // Extract first name from the user's name field
        const userName = userResponse.user?.name || '';
        const extractedFirstName = userName.split(' ')[0] || 'Friend';
        setFirstName(extractedFirstName);

        // Fetch streaks
        const streaksResponse = await authenticatedGet<{ checkInStreak: number; reflectionStreak: number }>('/api/streaks');
        console.log('Streaks loaded:', streaksResponse);
        setCheckInStreak(streaksResponse.checkInStreak);
        setReflectionStreak(streaksResponse.reflectionStreak);
      } catch (error) {
        console.error('Failed to load user data:', error);
        // Use defaults on error
        setFirstName('Friend');
        setCheckInStreak(0);
        setReflectionStreak(0);
      }
    };

    loadUserData();
  }, []);

  // Always use light theme colors
  const bgColor = colors.background;
  const textColor = colors.text;
  const textSecondaryColor = colors.textSecondary;
  const cardBg = colors.card;

  const handleCheckIn = () => {
    console.log('User tapped Check-In card');
    router.push('/check-in');
  };

  const handleDailyGift = () => {
    console.log('User tapped Daily Gift card');
    router.push('/daily-gift');
  };

  const handleCommunity = () => {
    console.log('User tapped Community card');
    router.push('/community');
  };

  const handleWeeklyRecap = () => {
    console.log('User tapped Weekly Recap card');
    router.push('/weekly-recap');
  };

  const greetingText = `Peace to you, ${firstName}`;
  const checkInStreakText = `${checkInStreak}`;
  const reflectionStreakText = `${reflectionStreak}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, Platform.OS === 'android' && { paddingTop: 48 }]}>
          <Text style={[styles.greeting, { color: textColor }]}>
            {greetingText}
          </Text>
        </View>

        {/* Much smaller, subtle streak cards */}
        <View style={styles.streakContainer}>
          <View style={[styles.streakCard, { backgroundColor: cardBg }]}>
            <View style={styles.streakRow}>
              <IconSymbol 
                ios_icon_name="message.fill"
                android_material_icon_name="chat"
                size={12}
                color={colors.primary}
              />
              <Text style={[styles.streakNumber, { color: textColor }]}>
                {checkInStreakText}
              </Text>
              <Text style={[styles.streakLabel, { color: textSecondaryColor }]}>
                Check-In
              </Text>
            </View>
          </View>

          <View style={[styles.streakCard, { backgroundColor: cardBg }]}>
            <View style={styles.streakRow}>
              <IconSymbol 
                ios_icon_name="gift.fill"
                android_material_icon_name="card-giftcard"
                size={12}
                color={colors.accent}
              />
              <Text style={[styles.streakNumber, { color: textColor }]}>
                {reflectionStreakText}
              </Text>
              <Text style={[styles.streakLabel, { color: textSecondaryColor }]}>
                Reflection
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.mainCards}>
          <TouchableOpacity 
            style={[styles.mainCard, { backgroundColor: cardBg }]}
            onPress={handleCheckIn}
            activeOpacity={0.7}
          >
            <View style={styles.mainCardIcon}>
              <IconSymbol 
                ios_icon_name="message.fill"
                android_material_icon_name="chat"
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.mainCardContent}>
              <Text style={[styles.mainCardTitle, { color: textColor }]}>
                Check-In
              </Text>
              <Text style={[styles.mainCardDescription, { color: textSecondaryColor }]}>
                Share what&apos;s on your heart
              </Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={textSecondaryColor}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.mainCard, { backgroundColor: cardBg }]}
            onPress={handleDailyGift}
            activeOpacity={0.7}
          >
            <View style={styles.mainCardIcon}>
              <IconSymbol 
                ios_icon_name="gift.fill"
                android_material_icon_name="card-giftcard"
                size={24}
                color={colors.accent}
              />
            </View>
            <View style={styles.mainCardContent}>
              <Text style={[styles.mainCardTitle, { color: textColor }]}>
                Open Your Daily Gift
              </Text>
              <Text style={[styles.mainCardDescription, { color: textSecondaryColor }]}>
                One daily scripture reflection
              </Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={textSecondaryColor}
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.mainCard, { backgroundColor: cardBg }]}
            onPress={handleCommunity}
            activeOpacity={0.7}
          >
            <View style={styles.mainCardIcon}>
              <IconSymbol 
                ios_icon_name="person.3.fill"
                android_material_icon_name="group"
                size={24}
                color={colors.prayer}
              />
            </View>
            <View style={styles.mainCardContent}>
              <Text style={[styles.mainCardTitle, { color: textColor }]}>
                Community
              </Text>
              <Text style={[styles.mainCardDescription, { color: textSecondaryColor }]}>
                Share and hold others in prayer
              </Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={textSecondaryColor}
            />
          </TouchableOpacity>

          {/* Smaller, more subtle Weekly Recap card */}
          <TouchableOpacity 
            style={[styles.weeklyRecapCard, { backgroundColor: cardBg }]}
            onPress={handleWeeklyRecap}
            activeOpacity={0.7}
          >
            <IconSymbol 
              ios_icon_name="calendar"
              android_material_icon_name="calendar-today"
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.weeklyRecapText, { color: textColor }]}>
              Weekly Recap
            </Text>
            <IconSymbol 
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={16}
              color={textSecondaryColor}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  greeting: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
  },
  streakContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  streakCard: {
    flex: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    paddingHorizontal: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakNumber: {
    fontSize: 11,
    fontWeight: typography.semibold,
  },
  streakLabel: {
    fontSize: 10,
    fontWeight: typography.regular,
  },
  mainCards: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  mainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  mainCardIcon: {
    marginRight: spacing.sm,
  },
  mainCardContent: {
    flex: 1,
  },
  mainCardTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    marginBottom: 2,
  },
  mainCardDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  weeklyRecapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
    marginTop: spacing.xs,
  },
  weeklyRecapText: {
    flex: 1,
    fontSize: 13,
    fontWeight: typography.medium,
  },
});
