
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Animated } from 'react-native';
import { GradientBackground } from '@/components/GradientBackground';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState, useEffect, useRef } from 'react';

interface MonthlySummaryData {
  monthName: string;
  year: number;
  month: number;
  totalCheckIns: number;
  totalEntries: number;
  totalWords: number;
  communityPosts: number;
  practicesCompleted: number;
  aiConversations: number;
  currentStreak: number;
  topMoods: Array<{ mood: string; count: number }>;
  topScriptures: Array<{ reference: string; count: number }>;
  conversationSummary: string;
  suggestions: Array<{ title: string; description: string }>;
  growthHighlight: string;
  hasEnoughData: boolean;
}

interface MonthlySummaryResponse {
  summary: MonthlySummaryData | null;
  hasEnoughData: boolean;
  message: string;
}

// Animated stat card that counts up from 0
function AnimatedStatCard({
  icon,
  value,
  label,
  suffix,
  isDark,
  delay,
}: {
  icon: string;
  value: number;
  label: string;
  suffix?: string;
  isDark: boolean;
  delay: number;
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      const duration = 800;
      const steps = 30;
      const stepDuration = duration / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep += 1;
        const progress = currentStep / steps;
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(eased * value));
        if (currentStep >= steps) {
          clearInterval(interval);
          setDisplayValue(value);
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  const cardBg = isDark ? 'rgba(120, 53, 15, 0.25)' : 'rgba(254, 243, 199, 0.8)';
  const numColor = isDark ? '#fcd34d' : '#b45309';
  const labelColor = isDark ? '#d6d3d1' : '#78716c';
  const iconColor = isDark ? '#fbbf24' : '#d97706';
  const suffixText = suffix ? suffix : '';
  const displayText = String(displayValue) + suffixText;

  return (
    <Animated.View style={[monthlyStyles.statCard, { backgroundColor: cardBg, opacity: fadeAnim }]}>
      <Text style={[monthlyStyles.statIcon, { color: iconColor }]}>{icon}</Text>
      <Text style={[monthlyStyles.statNumber, { color: numColor }]}>{displayText}</Text>
      <Text style={[monthlyStyles.statLabel, { color: labelColor }]}>{label}</Text>
    </Animated.View>
  );
}

const monthlyStyles = StyleSheet.create({
  outerCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: 'rgba(180, 83, 9, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  calendarIcon: {
    marginRight: spacing.sm,
    fontSize: 22,
  },
  mainTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
  },
  monthBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  monthBadgeText: {
    fontSize: 12,
    fontWeight: typography.semibold,
  },
  subtitleText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
    opacity: 0.3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: typography.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '47%',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: typography.bold,
    lineHeight: 30,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: typography.medium,
    textAlign: 'center',
    marginTop: 2,
  },
  moodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  moodName: {
    fontSize: 13,
    fontWeight: typography.semibold,
  },
  moodCount: {
    fontSize: 11,
    fontWeight: typography.medium,
    opacity: 0.8,
  },
  growthBox: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  growthText: {
    fontSize: typography.body,
    lineHeight: 24,
    fontWeight: typography.medium,
  },
  journeyText: {
    fontSize: typography.body,
    lineHeight: 26,
    fontStyle: 'italic',
  },
  suggestionCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  suggestionTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.bold,
    marginBottom: 4,
  },
  suggestionDesc: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  scriptureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: spacing.sm,
  },
  scriptureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  scriptureText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
  },
  notEnoughBox: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  notEnoughText: {
    fontSize: typography.bodySmall,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  loadingLabel: {
    fontSize: typography.bodySmall,
    marginTop: spacing.sm,
  },
});

function MonthlySummarySection({
  monthlySummary,
  monthlyLoading,
  monthlyError,
  isDark,
}: {
  monthlySummary: MonthlySummaryResponse | null;
  monthlyLoading: boolean;
  monthlyError: boolean;
  isDark: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!monthlyLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [monthlyLoading]);

  const outerBg = isDark ? 'rgba(41, 37, 36, 0.95)' : 'rgba(255, 251, 235, 0.95)';
  const titleColor = isDark ? '#fcd34d' : '#92400e';
  const badgeBg = isDark ? 'rgba(120, 53, 15, 0.4)' : 'rgba(253, 230, 138, 0.8)';
  const badgeText = isDark ? '#fcd34d' : '#92400e';
  const subtitleColor = isDark ? '#d6d3d1' : '#78716c';
  const dividerColor = isDark ? '#44403c' : '#d6d3d1';
  const labelColor = isDark ? '#a8a29e' : '#a8a29e';
  const growthBg = isDark ? 'rgba(6, 78, 59, 0.3)' : 'rgba(209, 250, 229, 0.7)';
  const growthText = isDark ? '#6ee7b7' : '#065f46';
  const journeyColor = isDark ? '#e7e5e4' : '#44403c';
  const suggBg = isDark ? 'rgba(120, 53, 15, 0.2)' : 'rgba(254, 243, 199, 0.7)';
  const suggTitleColor = isDark ? '#fcd34d' : '#92400e';
  const suggDescColor = isDark ? '#d6d3d1' : '#57534e';
  const scriptureColor = isDark ? '#d6d3d1' : '#57534e';
  const notEnoughBg = isDark ? 'rgba(41, 37, 36, 0.5)' : 'rgba(245, 245, 244, 0.8)';
  const notEnoughColor = isDark ? '#a8a29e' : '#78716c';

  const s = monthlySummary?.summary;
  const hasData = monthlySummary?.hasEnoughData;
  const message = monthlySummary?.message ?? '';
  const monthName = s?.monthName ?? '';

  const topMoodsSlice = s?.topMoods?.slice(0, 3) ?? [];
  const topScripturesSlice = s?.topScriptures?.slice(0, 3) ?? [];
  const suggestionsSlice = s?.suggestions?.slice(0, 4) ?? [];

  const moodColors = [
    { bg: isDark ? 'rgba(159, 18, 57, 0.35)' : 'rgba(254, 205, 211, 0.9)', text: isDark ? '#fda4af' : '#9f1239' },
    { bg: isDark ? 'rgba(120, 53, 15, 0.35)' : 'rgba(253, 230, 138, 0.9)', text: isDark ? '#fcd34d' : '#92400e' },
    { bg: isDark ? 'rgba(30, 58, 138, 0.35)' : 'rgba(199, 210, 254, 0.9)', text: isDark ? '#a5b4fc' : '#1e3a8a' },
  ];

  return (
    <Animated.View style={[monthlyStyles.outerCard, { backgroundColor: outerBg, opacity: fadeAnim }]}>
      {/* Header */}
      <View style={monthlyStyles.headerRow}>
        <Text style={monthlyStyles.calendarIcon}>📅</Text>
        <Text style={[monthlyStyles.mainTitle, { color: titleColor }]}>Monthly Journey</Text>
      </View>
      {monthName.length > 0 && (
        <View style={[monthlyStyles.monthBadge, { backgroundColor: badgeBg }]}>
          <Text style={[monthlyStyles.monthBadgeText, { color: badgeText }]}>{monthName}</Text>
        </View>
      )}
      {message.length > 0 && (
        <Text style={[monthlyStyles.subtitleText, { color: subtitleColor }]}>{message}</Text>
      )}

      {/* Loading */}
      {monthlyLoading && (
        <View style={monthlyStyles.loadingBox}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[monthlyStyles.loadingLabel, { color: subtitleColor }]}>Gathering your month...</Text>
        </View>
      )}

      {/* Error */}
      {!monthlyLoading && monthlyError && (
        <View style={[monthlyStyles.notEnoughBox, { backgroundColor: notEnoughBg }]}>
          <Text style={[monthlyStyles.notEnoughText, { color: notEnoughColor }]}>Unable to load monthly summary. Please try again later.</Text>
        </View>
      )}

      {/* Not enough data */}
      {!monthlyLoading && !monthlyError && !hasData && (
        <View style={[monthlyStyles.notEnoughBox, { backgroundColor: notEnoughBg }]}>
          <Text style={{ fontSize: 28, marginBottom: spacing.sm }}>🌱</Text>
          <Text style={[monthlyStyles.notEnoughText, { color: notEnoughColor }]}>{message || 'Keep journaling and checking in — your monthly insights will appear here.'}</Text>
        </View>
      )}

      {/* Rich content */}
      {!monthlyLoading && !monthlyError && hasData && s && (
        <>
          {/* Stats Grid */}
          <View style={[monthlyStyles.divider, { backgroundColor: dividerColor }]} />
          <Text style={[monthlyStyles.sectionLabel, { color: labelColor }]}>This Month</Text>
          <View style={monthlyStyles.statsGrid}>
            <AnimatedStatCard icon="🙏" value={Number(s.totalCheckIns) || 0} label="Check-ins" isDark={isDark} delay={0} />
            <AnimatedStatCard icon="📖" value={Number(s.totalEntries) || 0} label="Journal Entries" isDark={isDark} delay={80} />
            <AnimatedStatCard icon="✍️" value={Number(s.totalWords) || 0} label="Words Written" isDark={isDark} delay={160} />
            <AnimatedStatCard icon="🤝" value={Number(s.communityPosts) || 0} label="Community Posts" isDark={isDark} delay={240} />
            <AnimatedStatCard icon="🌿" value={Number(s.practicesCompleted) || 0} label="Practices Done" isDark={isDark} delay={320} />
            <AnimatedStatCard icon="🔥" value={Number(s.currentStreak) || 0} label="Day Streak" suffix=" days" isDark={isDark} delay={400} />
          </View>

          {/* Top Moods */}
          {topMoodsSlice.length > 0 && (
            <>
              <View style={[monthlyStyles.divider, { backgroundColor: dividerColor }]} />
              <Text style={[monthlyStyles.sectionLabel, { color: labelColor }]}>Your Moods This Month</Text>
              <View style={monthlyStyles.moodsRow}>
                {topMoodsSlice.map((item, index) => {
                  const mc = moodColors[index % moodColors.length];
                  const moodCountText = String(item.count);
                  return (
                    <View key={index} style={[monthlyStyles.moodChip, { backgroundColor: mc.bg }]}>
                      <Text style={[monthlyStyles.moodName, { color: mc.text }]}>{item.mood}</Text>
                      <Text style={[monthlyStyles.moodCount, { color: mc.text }]}>{moodCountText}x</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Growth Highlight */}
          {s.growthHighlight ? (
            <>
              <View style={[monthlyStyles.divider, { backgroundColor: dividerColor }]} />
              <Text style={[monthlyStyles.sectionLabel, { color: labelColor }]}>Growth Pattern</Text>
              <View style={[monthlyStyles.growthBox, { backgroundColor: growthBg }]}>
                <Text style={[monthlyStyles.growthText, { color: growthText }]}>{s.growthHighlight}</Text>
              </View>
            </>
          ) : null}

          {/* AI Journey Summary */}
          {s.conversationSummary ? (
            <>
              <View style={[monthlyStyles.divider, { backgroundColor: dividerColor }]} />
              <Text style={[monthlyStyles.sectionLabel, { color: labelColor }]}>Your Journey This Month</Text>
              <Text style={[monthlyStyles.journeyText, { color: journeyColor }]}>{s.conversationSummary}</Text>
            </>
          ) : null}

          {/* Personalized Suggestions */}
          {suggestionsSlice.length > 0 && (
            <>
              <View style={[monthlyStyles.divider, { backgroundColor: dividerColor }]} />
              <Text style={[monthlyStyles.sectionLabel, { color: labelColor }]}>For Next Month</Text>
              {suggestionsSlice.map((suggestion, index) => (
                <View key={index} style={[monthlyStyles.suggestionCard, { backgroundColor: suggBg }]}>
                  <Text style={[monthlyStyles.suggestionTitle, { color: suggTitleColor }]}>{suggestion.title}</Text>
                  <Text style={[monthlyStyles.suggestionDesc, { color: suggDescColor }]}>{suggestion.description}</Text>
                </View>
              ))}
            </>
          )}

          {/* Top Scriptures */}
          {topScripturesSlice.length > 0 && (
            <>
              <View style={[monthlyStyles.divider, { backgroundColor: dividerColor }]} />
              <Text style={[monthlyStyles.sectionLabel, { color: labelColor }]}>Scriptures This Month</Text>
              {topScripturesSlice.map((item, index) => (
                <View key={index} style={monthlyStyles.scriptureItem}>
                  <View style={monthlyStyles.scriptureDot} />
                  <Text style={[monthlyStyles.scriptureText, { color: scriptureColor }]}>{item.reference}</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </Animated.View>
  );
}

interface WeeklyRecap {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  isPremium: boolean;
  scriptureSection: {
    reflections: string[];
    sharedReflections: string[];
  };
  bodySection: {
    practices: string[];
    notes: string[];
  };
  communitySection: {
    checkInSummary: string;
    sharedPosts: string[];
  };
  promptingSection: {
    suggestions: string[];
  };
  personalSynthesis?: string;
  practiceVisualization?: {
    weeklyData: number[];
  };
  createdAt: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.semibold,
    color: colors.primaryVeryDark,
    marginBottom: spacing.xs,
  },
  dateRange: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
  },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.medium,
    color: colors.primaryDark,
  },
  sectionIcon: {
    marginRight: spacing.sm,
  },
  itemText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 24,
  },
  emptyText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  synthesisText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: colors.primaryVeryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonSecondary: {
    backgroundColor: colors.border,
  },
  buttonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
    marginLeft: spacing.sm,
  },
  buttonTextSecondary: {
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    color: colors.primaryDark,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  generateButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.primaryVeryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
    marginLeft: spacing.sm,
  },
  reflectionNote: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  monthlySubtitle: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  monthlyNotEnough: {
    fontSize: typography.body,
    color: colors.textLight,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  monthlySubLabel: {
    fontSize: 13,
    fontWeight: typography.semibold as '600',
    color: colors.primaryDark,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  monthlyParagraph: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  monthlyBullet: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 2,
  },
  monthlyEncouragement: {
    fontSize: 17,
    color: colors.primary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 26,
    marginTop: spacing.md,
  },
  themesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  themePill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  themePillText: {
    fontSize: 12,
    fontWeight: typography.semibold as '600',
    color: '#FFFFFF',
  },
  monthlyError: {
    fontSize: typography.body,
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  monthlyLoadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
});

/** Parse an ISO date string (YYYY-MM-DD or ISO-8601) into a local-time Date,
 *  avoiding the UTC-midnight timezone shift that causes off-by-one day bugs. */
function parseDateLocal(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Try to extract YYYY-MM-DD from the start of the string
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // months are 0-indexed
    const day = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  // Fallback: try native parse
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function formatDateRange(start: string, end: string): string {
  const startDate = parseDateLocal(start);
  const endDate = parseDateLocal(end);

  if (!startDate || !endDate) return '';

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const startMonth = MONTHS[startDate.getMonth()];
  const startDay = startDate.getDate();
  const endMonth = MONTHS[endDate.getMonth()];
  const endDay = endDate.getDate();
  const year = endDate.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }

  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

export default function WeeklyRecapScreen() {
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryResponse | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState(false);
  const router = useRouter();
  const { isDark } = useTheme();
  const cardBg = isDark ? colors.cardDark : 'rgba(255, 255, 255, 0.7)';
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    console.log('Loading weekly recap and monthly summary');
    setLoading(true);
    setMonthlyLoading(true);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    console.log(`[Monthly] Fetching summary for ${currentYear}-${currentMonth}`);
    const [recapResult, monthlyResult] = await Promise.allSettled([
      authenticatedGet('/api/weekly-recap/current'),
      authenticatedGet(`/api/monthly-summary?year=${currentYear}&month=${currentMonth}`),
    ]);

    if (recapResult.status === 'fulfilled') {
      console.log('Weekly recap loaded:', recapResult.value);
      setRecap(recapResult.value);
    } else {
      console.error('Error loading weekly recap:', recapResult.reason);
      setRecap(null);
    }

    if (monthlyResult.status === 'fulfilled') {
      console.log('Monthly summary loaded:', monthlyResult.value);
      setMonthlySummary(monthlyResult.value);
      setMonthlyError(false);
    } else {
      console.error('Error loading monthly summary:', monthlyResult.reason);
      setMonthlyError(true);
    }

    setLoading(false);
    setMonthlyLoading(false);
  }

  async function loadCurrentRecap() {
    try {
      setLoading(true);
      console.log('Loading current weekly recap');
      const response = await authenticatedGet('/api/weekly-recap/current');
      console.log('Weekly recap loaded:', response);
      setRecap(response);
    } catch (error) {
      console.error('Error loading weekly recap:', error);
      setRecap(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateRecap() {
    try {
      setGenerating(true);
      console.log('Generating weekly recap');
      const response = await authenticatedPost('/api/weekly-recap/generate', {});
      console.log('Weekly recap generated:', response);
      setRecap(response);
      Alert.alert('Success', 'Your weekly recap has been generated');
    } catch (error) {
      console.error('Error generating recap:', error);
      Alert.alert('Error', 'Failed to generate weekly recap. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  function handleViewHistory() {
    console.log('Navigating to weekly recap history');
    router.push('/weekly-recap-history');
  }

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Stack.Screen
            options={{
              title: 'Recap',
              headerShown: true,
              headerTransparent: true,
              headerBlurEffect: 'light',
              headerStyle: { backgroundColor: 'transparent' },
              headerTintColor: colors.primaryVeryDark,
              headerLeft: () => (
                <TouchableOpacity onPress={() => { console.log('Back pressed from weekly recap'); router.back(); }} style={{ paddingRight: 8 }}>
                  <ChevronLeft size={24} color={colors.primary} />
                </TouchableOpacity>
              ),
            }}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your recap...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!recap) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Stack.Screen
            options={{
              title: 'Recap',
              headerShown: true,
              headerTransparent: true,
              headerBlurEffect: 'light',
              headerStyle: { backgroundColor: 'transparent' },
              headerTintColor: colors.primaryVeryDark,
              headerLeft: () => (
                <TouchableOpacity onPress={() => { console.log('Back pressed from weekly recap'); router.back(); }} style={{ paddingRight: 8 }}>
                  <ChevronLeft size={24} color={colors.primary} />
                </TouchableOpacity>
              ),
            }}
          />
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name="calendar-today"
              size={64}
              color={colors.primary}
            />
            <Text style={styles.emptyTitle}>No Recap Yet</Text>
            <Text style={styles.emptyDescription}>
              Generate your weekly recap to see a gentle reflection on your week of prayer, presence, and community.
            </Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateRecap}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="sparkles"
                    android_material_icon_name="auto-awesome"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.generateButtonText}>Generate Recap</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const dateRangeText = formatDateRange(recap.weekStartDate, recap.weekEndDate);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Recap',
            headerShown: true,
            headerTransparent: true,
            headerBlurEffect: 'light',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: colors.primaryVeryDark,
            headerLeft: () => (
              <TouchableOpacity onPress={() => { console.log('Back pressed from weekly recap'); router.back(); }} style={{ paddingRight: 8 }}>
                <ChevronLeft size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Your Journey in Review</Text>
          </View>

          {/* Scripture Section */}
          {recap.scriptureSection && (recap.scriptureSection.reflections.length > 0 || recap.scriptureSection.sharedReflections.length > 0) && (
            <View style={[styles.section, { backgroundColor: cardBg }]}>
              <View style={styles.sectionTitleContainer}>
                <IconSymbol
                  ios_icon_name="book"
                  android_material_icon_name="menu-book"
                  size={24}
                  color={colors.primary}
                  style={styles.sectionIcon}
                />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Scripture & Reflection</Text>
              </View>
              {recap.scriptureSection.reflections.map((reflection, index) => (
                <Text key={index} style={[styles.itemText, { color: textSecondaryColor }]}>{reflection}</Text>
              ))}
              {recap.scriptureSection.sharedReflections.map((reflection, index) => (
                <Text key={`shared-${index}`} style={[styles.itemText, { color: textSecondaryColor }]}>{reflection}</Text>
              ))}
            </View>
          )}

          {/* Body Section */}
          {recap.bodySection && (recap.bodySection.practices.length > 0 || recap.bodySection.notes.length > 0) && (
            <View style={[styles.section, { backgroundColor: cardBg }]}>
              <View style={styles.sectionTitleContainer}>
                <IconSymbol
                  ios_icon_name="figure.walk"
                  android_material_icon_name="directions-walk"
                  size={24}
                  color={colors.primary}
                  style={styles.sectionIcon}
                />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Body & Practice</Text>
              </View>
              {recap.bodySection.practices.map((practice, index) => (
                <Text key={index} style={[styles.itemText, { color: textSecondaryColor }]}>{practice}</Text>
              ))}
              {recap.bodySection.notes.map((note, index) => (
                <Text key={`note-${index}`} style={[styles.itemText, { color: textSecondaryColor }]}>{note}</Text>
              ))}
            </View>
          )}

          {/* Community Section */}
          {recap.communitySection && (recap.communitySection.checkInSummary || recap.communitySection.sharedPosts.length > 0) && (
            <View style={[styles.section, { backgroundColor: cardBg }]}>
              <View style={styles.sectionTitleContainer}>
                <IconSymbol
                  ios_icon_name="person.3"
                  android_material_icon_name="group"
                  size={24}
                  color={colors.primary}
                  style={styles.sectionIcon}
                />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Community</Text>
              </View>
              {recap.communitySection.checkInSummary && (
                <Text style={[styles.itemText, { color: textSecondaryColor }]}>{recap.communitySection.checkInSummary}</Text>
              )}
              {recap.communitySection.sharedPosts.map((post, index) => (
                <Text key={index} style={[styles.itemText, { color: textSecondaryColor }]}>{post}</Text>
              ))}
            </View>
          )}

          {/* Prompting Section */}
          {recap.promptingSection && recap.promptingSection.suggestions.length > 0 && (
            <View style={[styles.section, { backgroundColor: cardBg }]}>
              <View style={styles.sectionTitleContainer}>
                <IconSymbol
                  ios_icon_name="lightbulb"
                  android_material_icon_name="lightbulb"
                  size={24}
                  color={colors.primary}
                  style={styles.sectionIcon}
                />
                <Text style={[styles.sectionTitle, { color: textColor }]}>Gentle Invitations</Text>
              </View>
              {recap.promptingSection.suggestions.map((suggestion, index) => (
                <Text key={index} style={[styles.itemText, { color: textSecondaryColor }]}>{suggestion}</Text>
              ))}
            </View>
          )}

          {/* Personal Synthesis */}
          {recap.personalSynthesis && (
            <View style={[styles.section, { backgroundColor: cardBg }]}>
              <View style={styles.sectionTitleContainer}>
                <IconSymbol
                  ios_icon_name="heart"
                  android_material_icon_name="favorite"
                  size={24}
                  color={colors.primary}
                  style={styles.sectionIcon}
                />
                <Text style={[styles.sectionTitle, { color: textColor }]}>A Word for You</Text>
              </View>
              <Text style={[styles.synthesisText, { color: textColor }]}>{recap.personalSynthesis}</Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleViewHistory}
            >
              <IconSymbol
                ios_icon_name="clock"
                android_material_icon_name="history"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>View History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={handleGenerateRecap}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="arrow.clockwise"
                    android_material_icon_name="refresh"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.buttonText}>Regenerate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.reflectionNote}>
            Tracking your progress helps you grow and develop. Sometimes we need to look back to move forward. This summary shows your week in review — a reflection of your journey, your moments of peace, and the steps you've taken. You'll also find personalized suggestions to guide and inspire you in the week ahead.
          </Text>

          {/* Monthly Summary Section */}
          <MonthlySummarySection
            monthlySummary={monthlySummary}
            monthlyLoading={monthlyLoading}
            monthlyError={monthlyError}
            isDark={isDark}
          />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
