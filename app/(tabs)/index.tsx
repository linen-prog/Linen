
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { IconSymbol } from '@/components/IconSymbol';
import NotificationButton from '@/components/NotificationButton';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/utils/api';

interface UserStats {
  checkInStreak: number;
  reflectionStreak: number;
  checkInBest: number;
  reflectionBest: number;
  displayName?: string;
}

interface PersonalizationData {
  companionMessage?: string;
  companionName?: string;
  lastCheckInSummary?: string;
  suggestedAction?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [personalization, setPersonalization] = useState<PersonalizationData | null>(null);
  const [lastCheckInMessage, setLastCheckInMessage] = useState<string>('');
  const [hasLoveMessages, setHasLoveMessages] = useState<boolean>(false);

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(-12)).current;
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingTranslateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

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

  const loadUserStats = useCallback(async () => {
    try {
      console.log('[Home] Loading user stats...');
      const data = await authenticatedGet<UserStats>('/api/profile/stats');
      setStats(data);
      console.log('[Home] Loaded user stats:', data);
    } catch (error: any) {
      console.log('[Home] Error loading stats:', error?.message || error);
      setStats({
        checkInStreak: 0,
        reflectionStreak: 0,
        checkInBest: 0,
        reflectionBest: 0,
        displayName: user?.name || 'friend',
      });
    }
  }, [user?.name]);

  const loadPersonalization = useCallback(async () => {
    try {
      console.log('[Home] Loading personalization data from /api/check-in/personalization...');
      const data = await authenticatedGet<PersonalizationData>('/api/check-in/personalization');
      setPersonalization(data);
      console.log('[Home] Loaded personalization data:', data);
    } catch (error: any) {
      console.log('[Home] Error loading personalization:', error?.message || error);
      // Fail silently — not critical
    }
  }, []);

  const loadLastCheckIn = useCallback(async () => {
    try {
      console.log('[Home] Loading last check-in message...');
      const data = await authenticatedGet<{ lastMessage?: string }>('/api/check-in/last-message');
      if (data.lastMessage) {
        setLastCheckInMessage(data.lastMessage);
        console.log('[Home] Loaded last check-in message');
      }
    } catch (error: any) {
      console.log('[Home] Error loading last check-in:', error?.message || error);
    }
  }, []);

  useEffect(() => {
    console.log('🏠 [Home] Component mounted');
    loadUserStats();
    loadPersonalization();
    loadLastCheckIn();
  }, [loadUserStats, loadPersonalization, loadLastCheckIn]);

  const handleUnreadCountChange = (count: number) => {
    console.log('🏠 [Home] Love messages count changed:', count);
    setHasLoveMessages(count > 0);
  };

  const displayName = stats?.displayName || user?.name || 'Friend';
  const greetingText = `Peace to you, ${displayName}`;

  const checkInStreakVal = stats?.checkInStreak || 0;
  const reflectionStreakVal = stats?.reflectionStreak || 0;
  const checkInBestVal = stats?.checkInBest || 0;
  const reflectionBestVal = stats?.reflectionBest || 0;

  const companionMessage = personalization?.companionMessage || '';
  const companionName = personalization?.companionName || 'Your Companion';
  const hasCompanionMessage = companionMessage.length > 0;

  const handleCheckInPress = () => {
    console.log('[Home] User tapped Check-In button');
    router.push('/check-in');
  };

  const handleOpenGiftPress = () => {
    console.log('[Home] User tapped Open Your Gift button');
    router.push('/daily-gift');
  };

  const handleCommunityPress = () => {
    console.log('[Home] User tapped Community button');
    router.navigate('/(tabs)/community');
  };

  const handleWeeklyRecapPress = () => {
    console.log('[Home] User tapped Weekly Recap button');
    router.push('/weekly-recap');
  };

  const handleCompanionBannerPress = () => {
    console.log('[Home] User tapped Companion banner');
    router.push('/check-in');
  };

  console.log('🏠 [Home] RENDERING');

  return (
    <GradientBackground>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Animated.Text
            style={[
              styles.appTitle,
              { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] },
            ]}
          >
            Linen
          </Animated.Text>
          <View style={styles.notificationButtonWrapper}>
            <NotificationButton onUnreadCountChange={handleUnreadCountChange} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.greetingContainer}>
            <Animated.Text
              style={[
                styles.greeting,
                { opacity: greetingOpacity, transform: [{ translateY: greetingTranslateY }] },
              ]}
            >
              {greetingText}
            </Animated.Text>
          </View>

          {/* Streak row */}
          <View style={styles.streakContainer}>
            <View style={styles.streakCard}>
              <Text style={styles.streakLabel}>Check-in</Text>
              <Text style={styles.streakDot}>·</Text>
              <Text style={styles.streakValue}>{checkInStreakVal}</Text>
              {checkInBestVal > 0 ? (
                <Text style={styles.streakBest}>
                  {' best '}
                </Text>
              ) : null}
              {checkInBestVal > 0 ? (
                <Text style={styles.streakBestValue}>{checkInBestVal}</Text>
              ) : null}
            </View>

            <View style={styles.streakCard}>
              <Text style={styles.streakLabel}>Reflection</Text>
              <Text style={styles.streakDot}>·</Text>
              <Text style={styles.streakValue}>{reflectionStreakVal}</Text>
              {reflectionBestVal > 0 ? (
                <Text style={styles.streakBest}>
                  {' best '}
                </Text>
              ) : null}
              {reflectionBestVal > 0 ? (
                <Text style={styles.streakBestValue}>{reflectionBestVal}</Text>
              ) : null}
            </View>
          </View>

          {/* Companion banner */}
          {hasCompanionMessage ? (
            <TouchableOpacity
              style={styles.companionBanner}
              onPress={handleCompanionBannerPress}
              activeOpacity={0.8}
            >
              <View style={styles.companionIconCircle}>
                <IconSymbol
                  ios_icon_name="person.fill"
                  android_material_icon_name="person"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.companionTextContainer}>
                <Text style={styles.companionName}>{companionName}</Text>
                <Text style={styles.companionMessage} numberOfLines={2}>
                  {companionMessage}
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={16}
                color={colors.textLight}
              />
            </TouchableOpacity>
          ) : null}

          {/* Primary card — Check-In */}
          <TouchableOpacity
            style={styles.checkInCard}
            onPress={handleCheckInPress}
            activeOpacity={0.7}
          >
            <View style={styles.checkInIconCircle}>
              <IconSymbol
                ios_icon_name="message.fill"
                android_material_icon_name="chat"
                size={36}
                color={colors.primary}
              />
            </View>
            <Text style={styles.checkInCardTitle}>Check-In</Text>
            <Text style={styles.checkInCardSubtitle}>What's on your heart?</Text>
            {lastCheckInMessage ? (
              <Text style={styles.checkInLastMessage}>{lastCheckInMessage}</Text>
            ) : null}
          </TouchableOpacity>

          {/* Secondary card grid */}
          <View style={styles.secondaryGrid}>
            <TouchableOpacity
              style={[styles.secondaryCard, styles.giftCard]}
              onPress={handleOpenGiftPress}
              activeOpacity={0.7}
            >
              <View style={styles.cardIconContainer}>
                <IconSymbol
                  ios_icon_name="gift.fill"
                  android_material_icon_name="card-giftcard"
                  size={28}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.secondaryCardTitle}>Open Your Gift</Text>
              <Text style={styles.secondaryCardSubtitle}>Daily scripture reflection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryCard, styles.weeklyRecapCard]}
              onPress={handleWeeklyRecapPress}
              activeOpacity={0.7}
            >
              <View style={styles.cardIconContainer}>
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="calendar-today"
                  size={28}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.secondaryCardTitle}>Weekly Recap</Text>
              <Text style={styles.secondaryCardSubtitle}>Review your week</Text>
            </TouchableOpacity>
          </View>

          {/* Community card */}
          <TouchableOpacity
            style={styles.communityCard}
            onPress={handleCommunityPress}
            activeOpacity={0.7}
          >
            <View style={styles.communityIconContainer}>
              <IconSymbol
                ios_icon_name="heart.fill"
                android_material_icon_name="favorite"
                size={32}
                color={colors.primary}
              />
            </View>
            <Text style={styles.communityCardTitle}>Community</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: typography.regular,
    color: colors.primary,
    fontFamily: typography.fontFamilySerif,
    marginBottom: 4,
  },
  notificationButtonWrapper: {
    zIndex: 101,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  greetingContainer: {
    alignItems: 'flex-start',
    marginTop: 12,
    marginBottom: 8,
  },
  greeting: {
    fontSize: 16,
    fontWeight: typography.regular,
    color: colors.primary,
    fontFamily: typography.fontFamilySerif,
  },
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 6,
  },
  streakCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: borderRadius.sm,
    paddingVertical: 2,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.55,
  },
  streakLabel: {
    fontSize: 10,
    fontWeight: typography.regular,
    color: colors.textLight,
  },
  streakDot: {
    fontSize: 10,
    color: colors.textLight,
    marginHorizontal: 3,
  },
  streakValue: {
    fontSize: 10,
    fontWeight: typography.semibold,
    color: colors.textLight,
  },
  streakBest: {
    fontSize: 9,
    color: colors.textLight,
    opacity: 0.7,
  },
  streakBestValue: {
    fontSize: 9,
    fontWeight: typography.semibold,
    color: colors.textLight,
    opacity: 0.7,
  },
  companionBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryMedium,
  },
  companionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  companionTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  companionName: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: colors.primary,
    marginBottom: 2,
  },
  companionMessage: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  checkInCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    marginBottom: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
    alignItems: 'center',
  },
  checkInIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  checkInCardTitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  checkInCardSubtitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  checkInLastMessage: {
    fontSize: typography.bodySmall,
    fontStyle: 'italic',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  secondaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  giftCard: {
    borderWidth: 2,
    borderColor: colors.accentMedium,
  },
  weeklyRecapCard: {},
  cardIconContainer: {
    marginBottom: spacing.sm,
  },
  secondaryCardTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  secondaryCardSubtitle: {
    fontSize: 11,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  communityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  communityIconContainer: {
    marginRight: spacing.md,
  },
  communityCardTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.text,
  },
});
