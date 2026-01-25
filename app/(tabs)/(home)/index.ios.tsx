
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function HomeScreen() {
  console.log('🏠 [Home iOS] Screen rendering');
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
        console.log('🏠 [Home iOS] User data loaded:', userResponse);
        
        // Extract first name from the user's name field
        const userName = userResponse.user?.name || '';
        const extractedFirstName = userName.split(' ')[0] || 'Friend';
        setFirstName(extractedFirstName);

        // Fetch streaks
        const streaksResponse = await authenticatedGet<{ checkInStreak: number; reflectionStreak: number }>('/api/streaks');
        console.log('🏠 [Home iOS] Streaks loaded:', streaksResponse);
        setCheckInStreak(streaksResponse.checkInStreak);
        setReflectionStreak(streaksResponse.reflectionStreak);
      } catch (error) {
        console.error('🏠 [Home iOS] Failed to load user data:', error);
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
    console.log('🏠 [Home iOS] User tapped Check-In card');
    console.log('🏠 [Home iOS] Navigating to: /check-in');
    router.push('/check-in');
  };

  const handleDailyGift = () => {
    console.log('🏠 [Home iOS] User tapped Daily Gift card');
    console.log('🏠 [Home iOS] Navigating to: /open-gift');
    router.push('/open-gift');
    console.log('🏠 [Home iOS] router.push() called for /open-gift');
  };

  const handleCommunity = () => {
    console.log('🏠 [Home iOS] User tapped Community card');
    console.log('🏠 [Home iOS] Navigating to: /community');
    router.push('/community');
  };

  const handleWeeklyRecap = () => {
    console.log('🏠 [Home iOS] User tapped Weekly Recap card');
    console.log('🏠 [Home iOS] Navigating to: /weekly-recap');
    router.push('/weekly-recap');
  };

  const greetingText = `Peace to you, ${firstName}`;
  const checkInStreakText = `${checkInStreak}`;
  const checkInBestText = `best: 2`;
  const reflectionStreakText = `${reflectionStreak}`;
  const reflectionBestText = `best: 4`;

  return (
    <React.Fragment>
      <Stack.Screen
        options={{
          title: 'Linen',
          headerShown: true,
        }}
      />
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: textColor }]}>
              {greetingText}
            </Text>
          </View>

          {/* Streak cards */}
          <View style={styles.streakContainer}>
            <View style={[styles.streakCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.streakLabel, { color: textSecondaryColor }]}>
                Check-In Streak
              </Text>
              <View style={styles.streakRow}>
                <Text style={[styles.streakNumber, { color: colors.primary }]}>
                  {checkInStreakText}
                </Text>
                <Text style={[styles.streakBest, { color: textSecondaryColor }]}>
                  {checkInBestText}
                </Text>
              </View>
            </View>

            <View style={[styles.streakCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.streakLabel, { color: textSecondaryColor }]}>
                Reflection Streak
              </Text>
              <View style={styles.streakRow}>
                <Text style={[styles.streakNumber, { color: colors.primary }]}>
                  {reflectionStreakText}
                </Text>
                <Text style={[styles.streakBest, { color: textSecondaryColor }]}>
                  {reflectionBestText}
                </Text>
              </View>
            </View>
          </View>

          {/* Primary Actions - Check-In and Open Your Gift */}
          <View style={styles.primaryActions}>
            <TouchableOpacity 
              style={[styles.primaryCard, { backgroundColor: cardBg }]}
              onPress={handleCheckIn}
              activeOpacity={0.7}
            >
              <View style={[styles.primaryIconContainer, { backgroundColor: colors.primary + '15' }]}>
                <IconSymbol 
                  ios_icon_name="message.fill"
                  android_material_icon_name="chat"
                  size={40}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.primaryCardTitle, { color: textColor }]}>
                Check-In
              </Text>
              <Text style={[styles.primaryCardDescription, { color: textSecondaryColor }]}>
                What&apos;s on your mind?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.primaryCard, { backgroundColor: cardBg }]}
              onPress={handleDailyGift}
              activeOpacity={0.7}
            >
              <View style={[styles.primaryIconContainer, { backgroundColor: colors.accent + '15' }]}>
                <IconSymbol 
                  ios_icon_name="gift.fill"
                  android_material_icon_name="card-giftcard"
                  size={40}
                  color={colors.accent}
                />
              </View>
              <Text style={[styles.primaryCardTitle, { color: textColor }]}>
                Open Your Gift
              </Text>
              <Text style={[styles.primaryCardDescription, { color: textSecondaryColor }]}>
                Daily scripture reflection
              </Text>
            </TouchableOpacity>
          </View>

          {/* Secondary Actions - Community and Weekly Recap */}
          <View style={styles.secondaryActions}>
            <TouchableOpacity 
              style={[styles.secondaryCard, { backgroundColor: cardBg }]}
              onPress={handleCommunity}
              activeOpacity={0.7}
            >
              <View style={[styles.secondaryIconContainer, { backgroundColor: colors.prayer + '15' }]}>
                <IconSymbol 
                  ios_icon_name="person.3.fill"
                  android_material_icon_name="group"
                  size={24}
                  color={colors.prayer}
                />
              </View>
              <View style={styles.secondaryCardContent}>
                <Text style={[styles.secondaryCardTitle, { color: textColor }]}>
                  Community
                </Text>
                <Text style={[styles.secondaryCardDescription, { color: textSecondaryColor }]}>
                  Share your reflections
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.secondaryCard, { backgroundColor: cardBg }]}
              onPress={handleWeeklyRecap}
              activeOpacity={0.7}
            >
              <View style={[styles.secondaryIconContainer, { backgroundColor: colors.primary + '15' }]}>
                <IconSymbol 
                  ios_icon_name="calendar"
                  android_material_icon_name="calendar-today"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.secondaryCardContent}>
                <Text style={[styles.secondaryCardTitle, { color: textColor }]}>
                  Weekly Recap
                </Text>
                <Text style={[styles.secondaryCardDescription, { color: textSecondaryColor }]}>
                  See your journey this week
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 2,
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
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  streakCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: typography.regular,
    marginBottom: spacing.xs,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: typography.bold,
  },
  streakBest: {
    fontSize: 12,
    fontWeight: typography.regular,
  },
  primaryActions: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  primaryCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  primaryCardTitle: {
    fontSize: 22,
    fontWeight: typography.bold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  primaryCardDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  secondaryActions: {
    gap: spacing.md,
  },
  secondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  secondaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  secondaryCardContent: {
    flex: 1,
  },
  secondaryCardTitle: {
    fontSize: 16,
    fontWeight: typography.semibold,
    marginBottom: 2,
  },
  secondaryCardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
