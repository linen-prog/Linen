
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
  bestCheckInStreak: number;
  bestReflectionStreak: number;
  // legacy field names
  checkInBest?: number;
  reflectionBest?: number;
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
    }, 300);

    return () => clearTimeout(greetingTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserStats = useCallback(async () => {
    try {
      console.log('[Home] Loading user stats from /api/profile/stats...');
      const data = await authenticatedGet<UserStats>('/api/profile/stats');
      setStats(data);
      console.log('[Home] Loaded user stats:', data);
    } catch (error: any) {
      console.log('[Home] Error loading stats:', error?.message || error);
      setStats({
        checkInStreak: 0,
        reflectionStreak: 0,
        bestCheckInStreak: 0,
        bestReflectionStreak: 0,
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
    console.log('[Home] Component mounted');
    loadUserStats();
    loadPersonalization();
    loadLastCheckIn();
  }, [loadUserStats, loadPersonalization, loadLastCheckIn]);

  const handleUnreadCountChange = (count: number) => {
    console.log('[Home] Love messages count changed:', count);
    setHasLoveMessages(count > 0);
  };

  const rawName = stats?.displayName || user?.name || '';
  const firstName = rawName.split(' ')[0] || 'friend';
  const greetingName = firstName || 'friend';
  const greetingText = `Peace to you, ${greetingName}.`;

  const checkInStreakVal = stats?.checkInStreak ?? 0;
  const reflectionStreakVal = stats?.reflectionStreak ?? 0;
  const checkInBestVal = stats?.bestCheckInStreak ?? stats?.checkInBest ?? 0;
  const reflectionBestVal = stats?.bestReflectionStreak ?? stats?.reflectionBest ?? 0;

  const checkInStreakDisplay = String(checkInStreakVal);
  const reflectionStreakDisplay = String(reflectionStreakVal);
  const checkInBestDisplay = `best: ${checkInBestVal}`;
  const reflectionBestDisplay = `best: ${reflectionBestVal}`;

  const companionMessage = personalization?.companionMessage || '';
  const companionName = personalization?.companionName || 'Your Companion';
  const hasCompanionMessage = companionMessage.length > 0;

  const handleCheckInPress = () => {
    console.log('[Home] User tapped Check-In card');
    router.push('/check-in');
  };

  const handleOpenGiftPress = () => {
    console.log('[Home] User tapped Open Your Gift card');
    router.push('/daily-gift');
  };

  const handleCommunityPress = () => {
    console.log('[Home] User tapped Community card');
    router.navigate('/(tabs)/community');
  };

  const handleWeeklyRecapPress = () => {
    console.log('[Home] User tapped Weekly Recap card');
    router.push('/weekly-recap');
  };

  const handleCompanionBannerPress = () => {
    console.log('[Home] User tapped Companion banner');
    router.push('/check-in');
  };

  console.log('[Home] Rendering');

  return (
    <GradientBackground>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
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
          {/* Greeting */}
          <Animated.Text
            style={[
              styles.greeting,
              { opacity: greetingOpacity, transform: [{ translateY: greetingTranslateY }] },
            ]}
          >
            {greetingText}
          </Animated.Text>

          {/* Streak row */}
          <View style={styles.streakRow}>
            <View style={styles.streakCard}>
              <Text style={styles.streakLabel}>Check-In Streak</Text>
              <View style={styles.streakValueRow}>
                <Text style={styles.streakNumber}>{checkInStreakDisplay}</Text>
                <Text style={styles.streakBest}>{checkInBestDisplay}</Text>
              </View>
            </View>
            <View style={styles.streakCard}>
              <Text style={styles.streakLabel}>Reflection Streak</Text>
              <View style={styles.streakValueRow}>
                <Text style={styles.streakNumber}>{reflectionStreakDisplay}</Text>
                <Text style={styles.streakBest}>{reflectionBestDisplay}</Text>
              </View>
            </View>
          </View>

          {/* Companion banner (optional) */}
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

          {/* Check-In card */}
          <TouchableOpacity
            style={styles.primaryCard}
            onPress={handleCheckInPress}
            activeOpacity={0.75}
          >
            <View style={styles.checkInIconCircle}>
              <IconSymbol
                ios_icon_name="message.fill"
                android_material_icon_name="chat"
                size={32}
                color={colors.primary}
              />
            </View>
            <Text style={styles.primaryCardTitle}>Check-In</Text>
            <Text style={styles.primaryCardSubtitle}>What's on your heart?</Text>
            {lastCheckInMessage ? (
              <Text style={styles.lastMessage}>{lastCheckInMessage}</Text>
            ) : null}
          </TouchableOpacity>

          {/* Open Your Gift card */}
          <TouchableOpacity
            style={styles.primaryCard}
            onPress={handleOpenGiftPress}
            activeOpacity={0.75}
          >
            <View style={styles.giftIconCircle}>
              <IconSymbol
                ios_icon_name="gift.fill"
                android_material_icon_name="card-giftcard"
                size={32}
                color="#F59E0B"
              />
            </View>
            <Text style={styles.primaryCardTitle}>Open Your Gift</Text>
            <Text style={styles.primaryCardSubtitle}>Daily scripture reflection</Text>
          </TouchableOpacity>

          {/* Weekly Recap card */}
          <TouchableOpacity
            style={styles.secondaryCard}
            onPress={handleWeeklyRecapPress}
            activeOpacity={0.75}
          >
            <View style={styles.secondaryCardIcon}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.secondaryCardText}>
              <Text style={styles.secondaryCardTitle}>Weekly Recap</Text>
              <Text style={styles.secondaryCardSubtitle}>Review your week</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={16}
              color={colors.textLight}
            />
          </TouchableOpacity>

          {/* Community card */}
          <TouchableOpacity
            style={styles.secondaryCard}
            onPress={handleCommunityPress}
            activeOpacity={0.75}
          >
            <View style={styles.secondaryCardIcon}>
              <IconSymbol
                ios_icon_name="heart.fill"
                android_material_icon_name="favorite"
                size={24}
                color={colors.primary}
              />
            </View>
            <View style={styles.secondaryCardText}>
              <Text style={styles.secondaryCardTitle}>Community</Text>
              <Text style={styles.secondaryCardSubtitle}>Connect with others</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={16}
              color={colors.textLight}
            />
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
    paddingTop: spacing.xs,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  appTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#2D5016',
    fontFamily: typography.fontFamilySerif,
    letterSpacing: -0.5,
  },
  notificationButtonWrapper: {
    zIndex: 101,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D5016',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  // Streak row
  streakRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
  },
  streakCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  streakLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  streakValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 32,
  },
  streakBest: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textLight,
  },
  // Companion banner
  companionBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
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
  // Primary cards (Check-In, Open Your Gift)
  primaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingVertical: 36,
    paddingHorizontal: spacing.lg,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  checkInIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  giftIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  primaryCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  primaryCardSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  lastMessage: {
    fontSize: typography.bodySmall,
    fontStyle: 'italic',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  // Secondary cards (Weekly Recap, Community)
  secondaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  secondaryCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  secondaryCardText: {
    flex: 1,
  },
  secondaryCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  secondaryCardSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
  },
});
