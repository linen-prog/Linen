
import { IconSymbol } from '@/components/IconSymbol';
import { GradientBackground } from '@/components/GradientBackground';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useTheme } from '@/contexts/ThemeContext';
import { authenticatedGet } from '@/utils/api';
import { Stack, useRouter } from 'expo-router';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';

interface WeeklyRecap {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  isPremium: boolean;
  createdAt: string;
}

// Yellow/amber accent palette matching the app's warm linen theme
const YELLOW = {
  accent: '#fbbf24',        // Amber 400
  accentLight: '#fef3c7',   // Amber 100
  accentVeryLight: '#fffbeb', // Amber 50
  accentDark: '#b45309',    // Amber 700
  accentMuted: 'rgba(251, 191, 36, 0.15)',
  accentBorder: 'rgba(251, 191, 36, 0.35)',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: YELLOW.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  pageSubtitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: YELLOW.accentDark,
    marginBottom: spacing.sm,
    marginTop: 64,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: YELLOW.accent,
  },
  sectionHeaderText: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
    color: YELLOW.accentDark,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  recapCard: {
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: YELLOW.accentBorder,
    boxShadow: '0 2px 8px rgba(251, 191, 36, 0.10)',
  },
  recapIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: YELLOW.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  recapInfo: {
    flex: 1,
  },
  recapDate: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  recapMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: YELLOW.accentMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: YELLOW.accentBorder,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: typography.caption,
    color: YELLOW.accentDark,
    fontWeight: typography.semibold,
  },
  recapTime: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  chevronWrapper: {
    marginLeft: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: YELLOW.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default function WeeklyRecapHistoryScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [recaps, setRecaps] = useState<WeeklyRecap[]>([]);
  const cardBg = isDark ? colors.cardDark : '#ffffff';
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

  useEffect(() => {
    loadRecapHistory();
  }, []);

  const loadRecapHistory = async () => {
    console.log('Loading recap history');
    try {
      setLoading(true);
      const data = await authenticatedGet<{ recaps: WeeklyRecap[] }>('/api/weekly-recap/history');
      console.log('Recap history loaded:', data);
      setRecaps(data.recaps || []);
    } catch (error) {
      console.error('Error loading recap history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}–${endDay}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  };

  const handleRecapPress = (weekStartDate: string) => {
    console.log('Viewing recap for week:', weekStartDate);
    router.push(`/weekly-recap-detail?weekStartDate=${weekStartDate}`);
  };

  const stackOptions = {
    title: 'Weekly History',
    headerShown: true,
    headerTransparent: true,
    headerTintColor: YELLOW.accentDark,
    headerTitleStyle: { fontSize: 34, fontWeight: '700' as const },
    headerBackTitle: '',
    headerBackButtonDisplayMode: 'minimal' as const,
    headerLeft: () => (
      <TouchableOpacity
        onPress={() => {
          console.log('Back pressed from recap history');
          router.back();
        }}
        style={{ paddingRight: 8 }}
      >
        <ChevronLeft size={24} color={YELLOW.accentDark} />
      </TouchableOpacity>
    ),
  };

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <Stack.Screen options={stackOptions} />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={YELLOW.accent} />
            <Text style={styles.loadingText}>Loading your recaps...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (recaps.length === 0) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <Stack.Screen options={stackOptions} />
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Clock size={36} color={YELLOW.accent} />
            </View>
            <Text style={styles.emptyTitle}>No recaps yet</Text>
            <Text style={styles.emptyText}>
              Your weekly recaps will appear here once they are generated.
            </Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen options={stackOptions} />
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageSubtitle}>Recap</Text>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderDot} />
            <Text style={styles.sectionHeaderText}>
              {recaps.length} {recaps.length === 1 ? 'recap' : 'recaps'}
            </Text>
          </View>

          {recaps.map((recap) => {
            const dateRangeDisplay = formatDateRange(recap.weekStartDate, recap.weekEndDate);
            const relativeTimeDisplay = formatRelativeTime(recap.createdAt);

            return (
              <TouchableOpacity
                key={recap.id}
                style={[styles.recapCard, { backgroundColor: cardBg }]}
                onPress={() => handleRecapPress(recap.weekStartDate)}
                activeOpacity={0.75}
              >
                <View style={styles.recapIconCircle}>
                  <IconSymbol
                    ios_icon_name="calendar"
                    android_material_icon_name="calendar-today"
                    size={22}
                    color={YELLOW.accentDark}
                  />
                </View>

                <View style={styles.recapInfo}>
                  <Text style={[styles.recapDate, { color: textColor }]}>{dateRangeDisplay}</Text>
                  <View style={styles.recapMeta}>
                    {recap.isPremium && (
                      <View style={styles.premiumBadge}>
                        <IconSymbol
                          ios_icon_name="star.fill"
                          android_material_icon_name="star"
                          size={10}
                          color={YELLOW.accentDark}
                        />
                        <Text style={styles.premiumBadgeText}>Enhanced</Text>
                      </View>
                    )}
                    <Text style={[styles.recapTime, { color: textSecondaryColor }]}>{relativeTimeDisplay}</Text>
                  </View>
                </View>

                <View style={styles.chevronWrapper}>
                  <ChevronRight size={16} color={YELLOW.accentDark} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
