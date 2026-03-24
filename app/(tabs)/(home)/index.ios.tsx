
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { IconSymbol } from '@/components/IconSymbol';
import { Ionicons } from '@expo/vector-icons';
import NotificationButton, { NotificationButtonHandle } from '@/components/NotificationButton';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/utils/api';

interface UserStats {
  displayName?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [lastCheckInMessage, setLastCheckInMessage] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const notificationRef = useRef<NotificationButtonHandle>(null);

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(-12)).current;
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingTranslateY = useRef(new Animated.Value(14)).current;
  const checkInCardOpacity = useRef(new Animated.Value(0)).current;

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

    const checkInTimer = setTimeout(() => {
      Animated.timing(checkInCardOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 300);

    return () => {
      clearTimeout(greetingTimer);
      clearTimeout(checkInTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserStats = useCallback(async () => {
    try {
      console.log('[Home iOS] Loading user stats...');
      const data = await authenticatedGet<UserStats>('/api/profile/stats');
      setStats(data);
      console.log('[Home iOS] Loaded user stats:', data);
    } catch (error: any) {
      console.log('[Home iOS] Error loading stats:', error?.message || error);
      setStats({
        displayName: user?.name || 'friend',
      });
    }
  }, [user?.name]);

  const loadLastCheckIn = async () => {
    try {
      console.log('[Home iOS] Loading last check-in message...');
      const data = await authenticatedGet<{ lastMessage?: string }>('/api/check-in/last-message');
      if (data.lastMessage) {
        setLastCheckInMessage(data.lastMessage);
        console.log('[Home iOS] Loaded last check-in message');
      }
    } catch (error: any) {
      console.log('[Home iOS] Error loading last check-in:', error?.message || error);
    }
  };

  useEffect(() => {
    console.log('🏠 [Home iOS] Component mounted');
    loadUserStats();
    loadLastCheckIn();
  }, [loadUserStats]);

  const handleUnreadCountChange = (count: number) => {
    console.log('🏠 [Home iOS] Love messages count changed:', count);
    setUnreadCount(count);
  };

  const handleLoveMessagesPress = () => {
    console.log('[Home iOS] User tapped Love Messages card');
    notificationRef.current?.open();
  };

  const displayName = stats?.displayName || user?.name || 'Friend';
  const greetingText = `Peace to you, ${displayName}`;
  const unreadCountDisplay = unreadCount > 9 ? '9+' : String(unreadCount);

  const handleCheckInPress = () => {
    console.log('[Home iOS] User tapped Check-In button');
    router.push('/check-in');
  };

  const handleOpenGiftPress = () => {
    console.log('[Home iOS] User tapped Open Your Gift button');
    router.push('/daily-gift');
  };

  const handleCommunityPress = () => {
    console.log('[Home iOS] User tapped Community button');
    router.navigate('/(tabs)/community');
  };

  const handleWeeklyRecapPress = () => {
    console.log('[Home iOS] User tapped Weekly Recap button');
    router.push('/weekly-recap');
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={[]}>
        {/* Hidden NotificationButton — provides modal + polling logic */}
        <View style={styles.hiddenNotificationButton}>
          <NotificationButton
            ref={notificationRef}
            onUnreadCountChange={handleUnreadCountChange}
          />
        </View>

        <View style={[styles.header, { paddingTop: insets.top + 40 }]}>
          <Animated.Text
            style={[
              styles.appTitle,
              { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] },
            ]}
          >
            Linen
          </Animated.Text>
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
            <Animated.Text
              style={[
                styles.greetingSubtitle,
                { opacity: greetingOpacity, transform: [{ translateY: greetingTranslateY }] },
              ]}
            >
              {"I'm glad you're here."}
            </Animated.Text>
          </View>

          <Text style={styles.presenceCue}>{"Take a breath before you begin"}</Text>

          {/* Love Messages card */}
          <TouchableOpacity
            style={styles.loveMessagesCard}
            onPress={handleLoveMessagesPress}
            activeOpacity={0.75}
          >
            <View style={styles.loveMessagesLeft}>
              <View style={styles.loveMessagesIconCircle}>
                <Ionicons name="sparkles" size={20} color="#b08040" />
              </View>
              <View style={styles.loveMessagesTextBlock}>
                <Text style={styles.loveMessagesTitle}>{"You've received care"}</Text>
              </View>
            </View>
            {unreadCount > 0 && (
              <View style={styles.loveMessagesBadge}>
                <Text style={styles.loveMessagesBadgeText}>{unreadCountDisplay}</Text>
              </View>
            )}
          </TouchableOpacity>

          <Animated.View style={{ opacity: checkInCardOpacity }}>
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
          </Animated.View>

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
              <Text style={styles.giftCardSubtitle}>A quiet moment with scripture</Text>
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
  hiddenNotificationButton: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
    opacity: 0,
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
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  greetingContainer: {
    alignItems: 'flex-start',
    marginTop: 24,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    fontWeight: typography.regular,
    color: colors.primary,
    fontFamily: typography.fontFamilySerif,
  },
  greetingSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    fontStyle: 'italic',
    color: colors.primary,
    fontFamily: typography.fontFamilySerif,
    opacity: 0.7,
    marginTop: 4,
  },
  presenceCue: {
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.textSecondary,
    opacity: 0.55,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 28,
  },
  loveMessagesCard: {
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: spacing.md,
    marginBottom: 16,
    shadowColor: '#92400e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
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
    fontWeight: '500',
    color: colors.text,
    fontFamily: typography.fontFamilySerif,
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
    fontWeight: '600',
    color: '#FFFFFF',
  },
  checkInCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: spacing.xl + 14,
    paddingHorizontal: spacing.lg + 8,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  checkInIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accentVeryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  checkInCardTitle: {
    fontSize: typography.h2,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  checkInCardSubtitle: {
    fontSize: typography.bodySmall,
    fontWeight: '400',
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
  cardIconContainer: {
    marginRight: spacing.sm,
  },
  giftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingVertical: 18,
    paddingHorizontal: spacing.md + 4,
    marginBottom: 16,
    shadowColor: colors.accentDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  giftCardTitle: {
    fontSize: typography.body,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  giftCardSubtitle: {
    fontSize: typography.bodySmall,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  weeklyRecapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: spacing.lg + 4,
    paddingHorizontal: spacing.lg + 4,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  weeklyRecapIconContainer: {
    marginRight: spacing.md,
  },
  weeklyRecapTitle: {
    fontSize: typography.h3,
    fontWeight: '500',
    color: colors.text,
  },
  communityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: spacing.lg + 4,
    paddingHorizontal: spacing.lg + 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  communityIconContainer: {
    marginRight: spacing.md,
  },
  communityCardTitle: {
    fontSize: typography.h3,
    fontWeight: '500',
    color: colors.text,
  },
});
