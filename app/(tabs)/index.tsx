
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { GradientBackground } from '@/components/GradientBackground';
import { NotificationBell } from "@/components/NotificationBell";
import NotificationButton, { NotificationButtonHandle } from '@/components/NotificationButton';
import { authenticatedGet } from '@/utils/api';
import { useTheme } from '@/contexts/ThemeContext';

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
  const [showCompanionBanner, setShowCompanionBanner] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<NotificationButtonHandle>(null);

  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingTranslateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const greetingTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(greetingOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(greetingTranslateY, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2000);

    return () => clearTimeout(greetingTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        // Check if companion preferences have been set (first-time tutorial)
        try {
          const prefsResponse = await authenticatedGet<{ preferencesSet: boolean }>('/api/companion/preferences');
          console.log('🏠 [Home] Companion preferences check:', prefsResponse);
          if (isMounted && prefsResponse.preferencesSet === false) {
            setShowCompanionBanner(true);
          }
        } catch (error) {
          console.error('🏠 [Home] Failed to check companion preferences:', error);
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

  const { isDark } = useTheme();
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;

  const handleLoveMessagesPress = () => {
    console.log('🏠 [Home] User tapped Love Messages card');
    notificationRef.current?.open();
  };

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
    router.navigate('/(tabs)/community');
  };

  const handleWeeklyRecap = () => {
    console.log('🏠 [Home] User tapped Weekly Recap card');
    console.log('🏠 [Home] Navigating to: /weekly-recap');
    router.push('/weekly-recap');
  };

  const greetingText = 'Peace to you, friend.';
  const checkInStreakText = `${checkInStreak}`;
  const checkInBestText = `best: 2`;
  const reflectionStreakText = `${reflectionStreak}`;
  const reflectionBestText = `best: 4`;

  const isValidText = (val: string | null | undefined, minLen = 5) =>
    typeof val === 'string' && val.trim().length > minLen;

  const checkInTagline = isValidText(personalization?.companionTagline, 3)
    ? personalization!.companionTagline!
    : "What's on your heart?";
  const personalizationActivity = isValidText(personalization?.recentActivity) ? personalization!.recentActivity! : null;
  const personalizationStreak = isValidText(personalization?.streakMessage) ? personalization!.streakMessage! : null;
  const personalizationContext = isValidText(personalization?.conversationContext) ? personalization!.conversationContext! : null;
  const showPersonalization = !!(personalizationActivity || personalizationStreak || personalizationContext);

  return (
    <React.Fragment>
      <Stack.Screen
        options={{
          title: '',
          headerShown: true,
          headerRight: () => <NotificationButton />,
        }}
      />
      <GradientBackground>
        <View style={styles.container}>
          {/* Hidden NotificationButton — provides modal + polling logic */}
          <View style={styles.hiddenNotificationButton}>
            <NotificationButton
              ref={notificationRef}
              onUnreadCountChange={(count) => {
                console.log('🏠 [Home] Love messages count changed:', count);
                setUnreadCount(count);
              }}
            />
          </View>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={[styles.appTitle, { color: colors.primary }]}>
                Linen
              </Text>
              <Animated.Text
                style={[
                  styles.greeting,
                  { color: colors.primary },
                  { opacity: greetingOpacity, transform: [{ translateY: greetingTranslateY }] },
                ]}
              >
                {greetingText}
              </Animated.Text>
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

            {/* Love Messages card */}
            <TouchableOpacity
              style={styles.loveMessagesCard}
              onPress={handleLoveMessagesPress}
              activeOpacity={0.75}
            >
              <View style={styles.loveMessagesLeft}>
                <View style={styles.loveMessagesIconCircle}>
                  <IconSymbol
                    ios_icon_name="heart.fill"
                    android_material_icon_name="favorite"
                    size={22}
                    color="#d97706"
                  />
                </View>
                <View style={styles.loveMessagesTextBlock}>
                  <Text style={styles.loveMessagesTitle}>Love Messages</Text>
                  <Text style={styles.loveMessagesSubtitle}>Reactions & care from your community</Text>
                </View>
              </View>
              {unreadCount > 0 && (
                <View style={styles.loveMessagesBadge}>
                  <Text style={styles.loveMessagesBadgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
                </View>
              )}
            </TouchableOpacity>

            {showCompanionBanner && (
              <TouchableOpacity
                style={styles.companionBanner}
                onPress={() => {
                  console.log('🏠 [Home] Companion banner tapped — navigating to companion-preferences');
                  router.push('/companion-preferences');
                }}
                activeOpacity={0.8}
              >
                <View style={styles.companionBannerLeft}>
                  <Text style={styles.companionBannerIcon}>✨</Text>
                  <View style={styles.companionBannerText}>
                    <Text style={styles.companionBannerTitle}>Personalize Your AI Companion</Text>
                    <Text style={styles.companionBannerSubtitle}>Set your tone, directness & more →</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    console.log('🏠 [Home] Companion banner dismissed');
                    setShowCompanionBanner(false);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.companionBannerDismiss}>✕</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}

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
                  {checkInTagline}
                </Text>
                {showPersonalization && (
                  <View style={styles.personalizationContainer}>
                    {personalizationActivity && (
                      <Text style={[styles.personalizationText, { color: textSecondaryColor }]}>
                        {personalizationActivity}
                      </Text>
                    )}
                    {personalizationStreak && (
                      <Text style={[styles.personalizationText, { color: textSecondaryColor }]}>
                        {personalizationStreak}
                      </Text>
                    )}
                    {personalizationContext && (
                      <Text style={[styles.personalizationText, { color: textSecondaryColor }]}>
                        {personalizationContext}
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
                    Heart Threads
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
  appTitle: {
    fontSize: typography.h2 * 2,
    fontWeight: typography.bold,
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
  companionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  companionBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  companionBannerIcon: {
    fontSize: 20,
  },
  companionBannerText: {
    flex: 1,
  },
  companionBannerTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.primaryDark,
    marginBottom: 2,
  },
  companionBannerSubtitle: {
    fontSize: 12,
    color: colors.primary,
  },
  companionBannerDismiss: {
    fontSize: 14,
    color: colors.textLight,
    paddingLeft: spacing.sm,
  },
  hiddenNotificationButton: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  loveMessagesCard: {
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#92400e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  loveMessagesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  loveMessagesIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  loveMessagesTextBlock: {
    flex: 1,
  },
  loveMessagesTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  loveMessagesSubtitle: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },
  loveMessagesBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: spacing.sm,
  },
  loveMessagesBadgeText: {
    fontSize: 11,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
});
