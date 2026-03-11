
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { GradientBackground } from '@/components/GradientBackground';

interface PersonalizationData {
  companionTagline: string | null;
  recentActivity: string | null;
  streakMessage: string | null;
  conversationContext: string | null;
}

export default function HomeScreen() {
  console.log('🏠 [Home] Screen rendering');
  const router = useRouter();

  const [checkInStreak, setCheckInStreak] = useState(0);
  const [reflectionStreak, setReflectionStreak] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [personalization, setPersonalization] = useState<PersonalizationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUserData = async () => {
      try {
        console.log('🏠 [Home] Loading user data...');
        
        // Fetch user info from auth context
        const { getUserData } = await import('@/lib/auth');
        const userData = await getUserData();
        console.log('🏠 [Home] User data loaded from storage:', userData);
        
        if (!isMounted) {
          console.log('🏠 [Home] Component unmounted, skipping state updates');
          return;
        }
        
        // Extract first name from the user's name field
        const userName = userData?.name || '';
        const extractedFirstName = userName.split(' ')[0] || 'Friend';
        setFirstName(extractedFirstName);

        // Fetch streaks
        const { authenticatedGet } = await import('@/utils/api');
        const streaksResponse = await authenticatedGet<{ checkInStreak: number; reflectionStreak: number }>('/api/streaks');
        console.log('🏠 [Home] Streaks loaded:', streaksResponse);
        
        if (!isMounted) {
          console.log('🏠 [Home] Component unmounted, skipping state updates');
          return;
        }
        
        setCheckInStreak(streaksResponse.checkInStreak);
        setReflectionStreak(streaksResponse.reflectionStreak);

        // Fetch personalization data for AI companion
        try {
          const personalizationResponse = await authenticatedGet<PersonalizationData>('/api/check-in/personalization');
          console.log('🏠 [Home] Personalization data loaded:', personalizationResponse);
          
          if (isMounted) {
            setPersonalization(personalizationResponse);
          }
        } catch (error) {
          console.error('🏠 [Home] Failed to load personalization data:', error);
          // Personalization is optional, continue without it
        }
      } catch (error) {
        console.error('🏠 [Home] Failed to load user data:', error);
        // Use defaults on error
        if (isMounted) {
          setFirstName('Friend');
          setCheckInStreak(0);
          setReflectionStreak(0);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Always use light theme colors
  const textColor = colors.text;
  const textSecondaryColor = colors.textSecondary;
  const cardBg = colors.card;

  const handleCheckIn = () => {
    console.log('🏠 [Home] User tapped Check-In card');
    console.log('🏠 [Home] Navigating to: /check-in');
    router.push('/check-in');
  };

  const handleDailyGift = () => {
    console.log('🏠 [Home] User tapped Daily Gift card');
    console.log('🏠 [Home] Navigating directly to: /daily-gift');
    router.push('/daily-gift');
    console.log('🏠 [Home] router.push() called for /daily-gift');
  };

  const handleCommunity = () => {
    console.log('🏠 [Home] User tapped Community card');
    console.log('🏠 [Home] Navigating to: /community');
    router.push('/community');
  };

  const handleWeeklyRecap = () => {
    console.log('🏠 [Home] User tapped Weekly Recap card');
    console.log('🏠 [Home] Navigating to: /weekly-recap');
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
      <GradientBackground>
        <View style={styles.container}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={[styles.greeting, { color: textColor }]}>
                {greetingText}
              </Text>
            </View>

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
                  {personalization?.companionTagline || "What's on your mind?"}
                </Text>
                {(personalization?.recentActivity || personalization?.streakMessage || personalization?.conversationContext) && (
                  <View style={styles.personalizationContainer}>
                    {personalization.recentActivity && (
                      <Text style={[styles.personalizationText, { color: textSecondaryColor }]}>
                        {personalization.recentActivity}
                      </Text>
                    )}
                    {personalization.streakMessage && (
                      <Text style={[styles.personalizationText, { color: textSecondaryColor }]}>
                        {personalization.streakMessage}
                      </Text>
                    )}
                    {personalization.conversationContext && (
                      <Text style={[styles.personalizationText, { color: textSecondaryColor }]}>
                        {personalization.conversationContext}
                      </Text>
                    )}
                  </View>
                )}
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
      </GradientBackground>
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
  personalizationContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border + '40',
    width: '100%',
    gap: spacing.xs,
  },
  personalizationText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
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
