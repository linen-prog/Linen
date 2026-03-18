
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { IconSymbol } from '@/components/IconSymbol';
import NotificationButton from '@/components/NotificationButton';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/utils/api';

interface UserStats {
  checkInStreak: number;
  reflectionStreak: number;
  displayName?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [lastCheckInMessage, setLastCheckInMessage] = useState<string>('');
  const [hasLoveMessages, setHasLoveMessages] = useState<boolean>(false);

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(-12)).current;
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingTranslateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    // Title animates in immediately on mount
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

    // Greeting fades + slides up after a calm 2s delay
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
        displayName: user?.name || 'friend',
      });
    }
  }, [user?.name]);

  const loadLastCheckIn = async () => {
    try {
      console.log('[Home] Loading last check-in message...');
      const data = await authenticatedGet<{ lastMessage?: string }>('/api/check-in/last-message');
      if (data.lastMessage) {
        setLastCheckInMessage(data.lastMessage);
        console.log('[Home] Loaded last check-in message');
      }
    } catch (error: any) {
      console.log('[Home] Error loading last check-in:', error?.message || error);
      // Fail silently - not critical for home screen
    }
  };

  useEffect(() => {
    console.log('🏠 [Home] Component mounted - NotificationButton should be visible');
    loadUserStats();
    loadLastCheckIn();
  }, [loadUserStats]);

  const handleUnreadCountChange = (count: number) => {
    console.log('🏠 [Home] Love messages count changed:', count);
    setHasLoveMessages(count > 0);
  };

  const displayName = stats?.displayName || user?.name || 'Friend';
  const greetingText = `Peace to you, ${displayName}`;

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
    router.push('/(tabs)/community');
  };

  const handleWeeklyRecapPress = () => {
    console.log('[Home] User tapped Weekly Recap button');
    router.push('/weekly-recap');
  };

  console.log('🏠 [Home] RENDERING - About to render NotificationButton');

  return (
    <GradientBackground>
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

          <View style={styles.streakContainer}>
            <View style={styles.streakCard}>
              <Text style={styles.streakLabel}>Check-in</Text>
              <Text style={styles.streakDot}>·</Text>
              <Text style={styles.streakValue}>{stats?.checkInStreak || 0}</Text>
            </View>

            <View style={styles.streakCard}>
              <Text style={styles.streakLabel}>Reflection</Text>
              <Text style={styles.streakDot}>·</Text>
              <Text style={styles.streakValue}>{stats?.reflectionStreak || 0}</Text>
            </View>
          </View>

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

          <TouchableOpacity
            style={styles.loveMessagesCard}
            onPress={() => {
              console.log('[Home] User tapped Love Messages button');
              router.push('/notification-preferences');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.loveMessagesIconCircle}>
              <IconSymbol
                ios_icon_name="heart.fill"
                android_material_icon_name="favorite"
                size={32}
                color="#e11d48"
              />
            </View>
            <Text style={styles.loveMessagesTitle}>Love Messages</Text>
            <Text style={styles.loveMessagesSubtitle}>Encouragement from the community</Text>
            {hasLoveMessages && (
              <View style={styles.loveMessagesBadge}>
                <Text style={styles.loveMessagesBadgeText}>New</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.giftCard}
            onPress={handleOpenGiftPress}
            activeOpacity={0.7}
          >
            <View style={styles.cardIconContainer}>
              <IconSymbol
                ios_icon_name="gift.fill"
                android_material_icon_name="card-giftcard"
                size={32}
                color={colors.primary}
              />
            </View>

            <View>
              <Text style={styles.giftCardTitle}>Open Your Gift</Text>
              <Text style={styles.giftCardSubtitle}>Daily scripture reflection</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.weeklyRecapCard}
            onPress={handleWeeklyRecapPress}
            activeOpacity={0.7}
          >
            <View style={styles.weeklyRecapIconContainer}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={24}
                color={colors.primary}
              />
            </View>

            <Text style={styles.weeklyRecapTitle}>Weekly Recap</Text>
          </TouchableOpacity>

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
    marginBottom: 8,
    gap: 6,
  },
  streakCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: borderRadius.sm,
    paddingVertical: 1,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.47,
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
    fontWeight: typography.regular,
    color: colors.textLight,
  },
  checkInCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
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
  loveMessagesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  loveMessagesIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  loveMessagesTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: 2,
    textAlign: 'center',
  },
  loveMessagesSubtitle: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loveMessagesBadge: {
    marginTop: spacing.sm,
    backgroundColor: '#e11d48',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  loveMessagesBadgeText: {
    fontSize: 11,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  cardIconContainer: {
    marginRight: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: 1,
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: typography.regular,
    color: colors.textSecondary,
  },
  giftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.accentMedium,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
    shadowColor: colors.accentDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  giftCardTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  giftCardSubtitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.regular,
    color: colors.textSecondary,
  },
  weeklyRecapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  weeklyRecapIconContainer: {
    marginRight: spacing.md,
  },
  weeklyRecapTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.text,
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
