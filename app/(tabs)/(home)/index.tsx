
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
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

  useEffect(() => {
    console.log('🏠 [Home] Component mounted - NotificationButton should be visible');
    loadUserStats();
    loadLastCheckIn();
  }, []);

  const handleUnreadCountChange = (count: number) => {
    console.log('🏠 [Home] Love messages count changed:', count);
    setHasLoveMessages(count > 0);
  };

  const loadUserStats = async () => {
    try {
      console.log('[Home] Loading user stats...');
      const data = await authenticatedGet<UserStats>('/api/profile/stats');
      setStats(data);
      console.log('[Home] Loaded user stats:', data);
    } catch (error: any) {
      console.log('[Home] Error loading stats:', error?.message || error);
      // Set default stats on error
      setStats({
        checkInStreak: 0,
        reflectionStreak: 0,
        displayName: user?.name || 'friend'
      });
    }
  };

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
          <Text style={styles.appTitle}>Linen</Text>
          <View style={styles.notificationButtonWrapper}>
            <NotificationButton onUnreadCountChange={handleUnreadCountChange} />
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{greetingText}</Text>
          </View>

          <View style={styles.streakContainer}>
            <View style={styles.streakCard}>
              <Text style={styles.streakLabel}>Check-in Streak</Text>
              <Text style={styles.streakValue}>{stats?.checkInStreak || 0}</Text>
              <Text style={styles.streakBest}>best: {stats?.checkInStreak || 0}</Text>
            </View>
            
            <View style={styles.streakCard}>
              <Text style={styles.streakLabel}>Reflection Streak</Text>
              <Text style={styles.streakValue}>{stats?.reflectionStreak || 0}</Text>
              <Text style={styles.streakBest}>best: {stats?.reflectionStreak || 0}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.checkInCard}
            onPress={handleCheckInPress}
            activeOpacity={0.7}
          >
            <View style={styles.cardIconContainer}>
              <IconSymbol 
                ios_icon_name="message.fill" 
                android_material_icon_name="chat" 
                size={48} 
                color={colors.primary}
              />
            </View>
            
            <Text style={styles.cardTitle}>Check-In</Text>
            
            <Text style={styles.cardSubtitle}>Dove is here for you</Text>
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
                size={48} 
                color={colors.primary}
              />
            </View>
            
            <Text style={styles.giftCardTitle}>Open Your Gift</Text>
            
            <Text style={styles.giftCardSubtitle}>Daily scripture reflection</Text>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: typography.regular,
    color: colors.primary,
    fontFamily: typography.fontFamilySerif,
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
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  greeting: {
    fontSize: typography.h3,
    fontWeight: typography.regular,
    color: colors.primary,
    fontFamily: typography.fontFamilySerif,
  },
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  streakCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  streakLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  streakValue: {
    fontSize: 32,
    fontWeight: typography.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  streakBest: {
    fontSize: typography.caption,
    fontWeight: typography.regular,
    color: colors.textLight,
  },
  checkInCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  cardIconContainer: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
  },
  giftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.accentMedium,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: colors.accentDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  giftCardTitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  giftCardSubtitle: {
    fontSize: typography.body,
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
