
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { IconSymbol } from '@/components/IconSymbol';
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

  useEffect(() => {
    loadUserStats();
    loadLastCheckIn();
  }, []);

  const loadUserStats = async () => {
    try {
      const response = await authenticatedGet('/api/profile/stats');
      const data = await response.json();
      setStats(data);
      console.log('[Home] Loaded user stats:', data);
    } catch (error) {
      console.log('[Home] Error loading stats:', error);
    }
  };

  const loadLastCheckIn = async () => {
    try {
      const response = await authenticatedGet('/api/check-in/last-message');
      const data = await response.json();
      if (data.lastMessage) {
        setLastCheckInMessage(data.lastMessage);
      }
      console.log('[Home] Loaded last check-in message');
    } catch (error) {
      console.log('[Home] Error loading last check-in:', error);
    }
  };

  const displayName = stats?.displayName || user?.name || 'friend';
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

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appTitle}>Linen</Text>
            <Text style={styles.greeting}>{greetingText}</Text>
          </View>

          {/* Check-In Card */}
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
            
            <Text style={styles.cardSubtitle}>What&apos;s on your heart?</Text>
            
            {lastCheckInMessage ? (
              <View style={styles.promptContainer}>
                <Text style={styles.promptText}>
                  {lastCheckInMessage.length > 80 
                    ? `${lastCheckInMessage.substring(0, 80)}...` 
                    : lastCheckInMessage}
                </Text>
              </View>
            ) : (
              <View style={styles.promptContainer}>
                <Text style={styles.promptText}>
                  You reflected on scripture this morning—want to explore it deeper?
                </Text>
              </View>
            )}
            
            {lastCheckInMessage && (
              <Text style={styles.lastTimeText}>
                Last time: &quot;{lastCheckInMessage.substring(0, 50)}...&quot;
              </Text>
            )}
          </TouchableOpacity>

          {/* Open Your Gift Card */}
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

          {/* Community Card */}
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
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  appTitle: {
    fontSize: 48,
    fontWeight: typography.regular,
    color: colors.text,
    fontFamily: typography.fontFamilySerif,
    marginBottom: spacing.sm,
  },
  greeting: {
    fontSize: typography.h4,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilySerif,
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
    fontSize: typography.h4,
    fontWeight: typography.medium,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  promptContainer: {
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
    paddingLeft: spacing.md,
    marginBottom: spacing.md,
  },
  promptText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textLight,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  lastTimeText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.regular,
    color: colors.textLight,
    lineHeight: 20,
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
