
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Animated } from 'react-native';
import { GradientBackground } from '@/components/GradientBackground';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { Stack, useRouter } from 'expo-router';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  BookOpen,
  PenLine,
  Users,
  Leaf,
  Flame,
  AlertCircle,
  Sparkles,
} from 'lucide-react-native';
import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  topMoods: { mood: string; count: number }[];
  topScriptures: { reference: string; count: number }[];
  conversationSummary: string;
  suggestions: { title: string; description: string }[];
  growthHighlight: string;
  hasEnoughData: boolean;
}

interface MonthlySummaryResponse {
  summary: MonthlySummaryData | null;
  hasEnoughData: boolean;
  message: string;
}

// ─── Animated stat counter card ──────────────────────────────────────────────

function AnimatedStatCard({
  icon: Icon,
  value,
  label,
  suffix,
  isDark,
  delay,
  formatValue,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  value: number;
  label: string;
  suffix?: string;
  isDark: boolean;
  delay: number;
  formatValue?: (v: number) => string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);

  const cardBg = isDark ? 'rgba(120, 53, 15, 0.22)' : 'rgba(254, 243, 199, 0.85)';
  const cardBorder = isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(217, 119, 6, 0.12)';
  const numColor = isDark ? '#fcd34d' : '#b45309';
  const labelColor = isDark ? '#d6d3d1' : '#78716c';
  const iconColor = isDark ? '#fbbf24' : '#d97706';
  const displayText = formatValue ? formatValue(displayValue) : String(displayValue);
  const suffixText = suffix ?? '';

  return (
    <Animated.View
      style={[
        mStyles.statCard,
        { backgroundColor: cardBg, borderColor: cardBorder, opacity: fadeAnim, transform: [{ translateY }] },
      ]}
    >
      <Icon size={20} color={iconColor} />
      <View style={mStyles.statNumberRow}>
        <Text style={[mStyles.statNumber, { color: numColor }]}>{displayText}</Text>
        {suffixText.length > 0 && (
          <Text style={[mStyles.statSuffix, { color: numColor }]}>{suffixText}</Text>
        )}
      </View>
      <Text style={[mStyles.statLabel, { color: labelColor }]}>{label}</Text>
    </Animated.View>
  );
}

// ─── Skeleton pulse card ──────────────────────────────────────────────────────

function SkeletonCard({ isDark }: { isDark: boolean }) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bg = isDark ? 'rgba(68, 64, 60, 0.6)' : 'rgba(214, 211, 209, 0.5)';

  return (
    <Animated.View style={[mStyles.skeletonCard, { backgroundColor: bg, opacity: pulse }]} />
  );
}

// ─── Staggered fade-in wrapper ────────────────────────────────────────────────

function FadeInView({ delay, children }: { delay: number; children: React.ReactNode }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Monthly Summary Section ──────────────────────────────────────────────────

const EARLIEST_YEAR = 2024;
const EARLIEST_MONTH = 1;

function MonthlySummarySection({ isDark }: { isDark: boolean }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryData | null>(null);
  const [monthlyMessage, setMonthlyMessage] = useState('');
  const [hasEnoughData, setHasEnoughData] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  const fetchMonthly = useCallback(async (year: number, month: number) => {
    console.log(`[MonthlySummary] Fetching summary for ${year}-${month}`);
    setMonthlyLoading(true);
    setMonthlyError(null);
    try {
      const data: MonthlySummaryResponse = await authenticatedGet(
        `/api/monthly-summary?year=${year}&month=${month}`
      );
      console.log('[MonthlySummary] Loaded:', data);
      setMonthlySummary(data.summary ?? null);
      setHasEnoughData(data.hasEnoughData ?? false);
      setMonthlyMessage(data.message ?? '');
    } catch (err: any) {
      console.error('[MonthlySummary] Error:', err);
      setMonthlyError(err?.message ?? 'Unknown error');
      setMonthlySummary(null);
    } finally {
      setMonthlyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonthly(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchMonthly]);

  function navigateMonth(direction: -1 | 1) {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    if (newMonth > 12) { newMonth = 1; newYear += 1; }
    const atEarliest = newYear < EARLIEST_YEAR || (newYear === EARLIEST_YEAR && newMonth < EARLIEST_MONTH);
    const atFuture = newYear > currentYear || (newYear === currentYear && newMonth > currentMonth);
    if (atEarliest || atFuture) return;
    console.log(`[MonthlySummary] Navigating to ${newYear}-${newMonth}`);
    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
  }

  const isPrevDisabled =
    selectedYear < EARLIEST_YEAR ||
    (selectedYear === EARLIEST_YEAR && selectedMonth <= EARLIEST_MONTH);
  const isNextDisabled =
    selectedYear > currentYear ||
    (selectedYear === currentYear && selectedMonth >= currentMonth);

  // Derived colors
  const outerBg = isDark ? 'rgba(28, 25, 23, 0.97)' : 'rgba(255, 251, 235, 0.97)';
  const outerBorder = isDark ? 'rgba(120, 53, 15, 0.3)' : 'rgba(217, 119, 6, 0.15)';
  const titleColor = isDark ? '#fcd34d' : '#92400e';
  const subtitleColor = isDark ? '#a8a29e' : '#78716c';
  const labelColor = isDark ? '#78716c' : '#a8a29e';
  const dividerColor = isDark ? 'rgba(68, 64, 60, 0.6)' : 'rgba(214, 211, 209, 0.5)';
  const navBg = isDark ? 'rgba(68, 64, 60, 0.5)' : 'rgba(245, 245, 244, 0.8)';
  const navBorder = isDark ? 'rgba(120, 53, 15, 0.3)' : 'rgba(214, 211, 209, 0.8)';
  const navMonthColor = isDark ? '#e7e5e4' : '#292524';
  const arrowColor = isDark ? '#fbbf24' : '#d97706';
  const arrowDisabledColor = isDark ? 'rgba(120, 100, 60, 0.3)' : 'rgba(214, 211, 209, 0.6)';
  const growthBg = isDark ? 'rgba(6, 78, 59, 0.25)' : 'rgba(209, 250, 229, 0.65)';
  const growthBorder = '#059669';
  const growthTextColor = isDark ? '#6ee7b7' : '#065f46';
  const growthArrowColor = isDark ? '#fbbf24' : '#d97706';
  const journeyBg = isDark ? 'rgba(41, 37, 36, 0.6)' : 'rgba(254, 252, 243, 0.9)';
  const journeyBorder = isDark ? 'rgba(120, 53, 15, 0.25)' : 'rgba(217, 119, 6, 0.12)';
  const journeyColor = isDark ? '#e7e5e4' : '#44403c';
  const suggBg = isDark ? 'rgba(120, 53, 15, 0.18)' : 'rgba(254, 243, 199, 0.75)';
  const suggBorder = isDark ? 'rgba(251, 191, 36, 0.12)' : 'rgba(217, 119, 6, 0.1)';
  const suggTitleColor = isDark ? '#fcd34d' : '#92400e';
  const suggDescColor = isDark ? '#d6d3d1' : '#57534e';
  const scriptureColor = isDark ? '#d6d3d1' : '#57534e';
  const scriptureDotColor = isDark ? '#fbbf24' : '#d97706';
  const notEnoughBg = isDark ? 'rgba(41, 37, 36, 0.5)' : 'rgba(254, 243, 199, 0.5)';
  const notEnoughBorder = isDark ? 'rgba(120, 53, 15, 0.3)' : 'rgba(217, 119, 6, 0.15)';
  const notEnoughTextColor = isDark ? '#a8a29e' : '#78716c';
  const errorBg = isDark ? 'rgba(41, 37, 36, 0.5)' : 'rgba(254, 242, 242, 0.8)';
  const errorBorder = isDark ? 'rgba(185, 28, 28, 0.3)' : 'rgba(252, 165, 165, 0.5)';
  const errorTextColor = isDark ? '#fca5a5' : '#991b1b';
  const retryBg = isDark ? 'rgba(120, 53, 15, 0.35)' : 'rgba(254, 243, 199, 0.9)';
  const retryTextColor = isDark ? '#fcd34d' : '#92400e';

  const moodColors = [
    { bg: isDark ? 'rgba(159, 18, 57, 0.3)' : 'rgba(254, 205, 211, 0.9)', text: isDark ? '#fda4af' : '#9f1239' },
    { bg: isDark ? 'rgba(120, 53, 15, 0.3)' : 'rgba(253, 230, 138, 0.9)', text: isDark ? '#fcd34d' : '#92400e' },
    { bg: isDark ? 'rgba(30, 58, 138, 0.3)' : 'rgba(199, 210, 254, 0.9)', text: isDark ? '#a5b4fc' : '#1e3a8a' },
  ];

  const s = monthlySummary;
  const topMoodsSlice = s?.topMoods?.slice(0, 3) ?? [];
  const topScripturesSlice = s?.topScriptures?.slice(0, 3) ?? [];
  const suggestionsSlice = s?.suggestions?.slice(0, 4) ?? [];

  // Month name display
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const displayMonthName = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;

  return (
    <View style={[mStyles.outerCard, { backgroundColor: outerBg, borderColor: outerBorder }]}>
      {/* ── Section header ── */}
      <View style={mStyles.sectionHeaderRow}>
        <Text style={[mStyles.mainTitle, { color: titleColor }]}>Monthly Journey</Text>
      </View>

      {/* ── Month navigator ── */}
      <View style={[mStyles.navRow, { backgroundColor: navBg, borderColor: navBorder }]}>
        <TouchableOpacity
          onPress={() => { console.log('[MonthlySummary] Prev month pressed'); navigateMonth(-1); }}
          disabled={isPrevDisabled}
          style={mStyles.navArrow}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={20} color={isPrevDisabled ? arrowDisabledColor : arrowColor} />
        </TouchableOpacity>
        <Text style={[mStyles.navMonthText, { color: navMonthColor }]}>{displayMonthName}</Text>
        <TouchableOpacity
          onPress={() => { console.log('[MonthlySummary] Next month pressed'); navigateMonth(1); }}
          disabled={isNextDisabled}
          style={mStyles.navArrow}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronRight size={20} color={isNextDisabled ? arrowDisabledColor : arrowColor} />
        </TouchableOpacity>
      </View>

      {/* ── Subtitle / message ── */}
      {monthlyMessage.length > 0 && !monthlyLoading && !monthlyError && (
        <Text style={[mStyles.subtitleText, { color: subtitleColor }]}>{monthlyMessage}</Text>
      )}

      {/* ── Skeleton loading ── */}
      {monthlyLoading && (
        <View style={mStyles.skeletonContainer}>
          <SkeletonCard isDark={isDark} />
          <SkeletonCard isDark={isDark} />
          <SkeletonCard isDark={isDark} />
        </View>
      )}

      {/* ── Error state ── */}
      {!monthlyLoading && monthlyError && (
        <View style={[mStyles.stateCard, { backgroundColor: errorBg, borderColor: errorBorder }]}>
          <AlertCircle size={28} color={isDark ? '#fbbf24' : '#d97706'} />
          <Text style={[mStyles.stateTitle, { color: errorTextColor }]}>Couldn't load your recap</Text>
          <Text style={[mStyles.stateBody, { color: subtitleColor }]}>Check your connection and try again</Text>
          <TouchableOpacity
            style={[mStyles.retryButton, { backgroundColor: retryBg }]}
            onPress={() => { console.log('[MonthlySummary] Retry pressed'); fetchMonthly(selectedYear, selectedMonth); }}
          >
            <Text style={[mStyles.retryText, { color: retryTextColor }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Not enough data ── */}
      {!monthlyLoading && !monthlyError && !hasEnoughData && (
        <View style={[mStyles.stateCard, { backgroundColor: notEnoughBg, borderColor: notEnoughBorder }]}>
          <Sparkles size={28} color={isDark ? '#fbbf24' : '#d97706'} />
          <Text style={[mStyles.stateTitle, { color: titleColor }]}>Your recap is growing</Text>
          <Text style={[mStyles.stateBody, { color: notEnoughTextColor }]}>
            Complete a few check-ins this month and your personalized recap will appear here.
          </Text>
        </View>
      )}

      {/* ── Rich content ── */}
      {!monthlyLoading && !monthlyError && hasEnoughData && s && (
        <>
          {/* Stats grid */}
          <View style={[mStyles.divider, { backgroundColor: dividerColor }]} />
          <FadeInView delay={0}>
            <Text style={[mStyles.sectionLabel, { color: labelColor }]}>This Month</Text>
            <View style={mStyles.statsGrid}>
              <AnimatedStatCard icon={Heart} value={Number(s.totalCheckIns) || 0} label="Check-ins" isDark={isDark} delay={0} />
              <AnimatedStatCard icon={BookOpen} value={Number(s.totalEntries) || 0} label="Journal Entries" isDark={isDark} delay={80} />
              <AnimatedStatCard
                icon={PenLine}
                value={Number(s.totalWords) || 0}
                label="Words Written"
                isDark={isDark}
                delay={160}
                formatValue={(v) => v.toLocaleString()}
              />
              <AnimatedStatCard icon={Users} value={Number(s.communityPosts) || 0} label="Community Posts" isDark={isDark} delay={240} />
              <AnimatedStatCard icon={Leaf} value={Number(s.practicesCompleted) || 0} label="Practices Done" isDark={isDark} delay={320} />
              <AnimatedStatCard icon={Flame} value={Number(s.currentStreak) || 0} label="Day Streak" suffix=" days" isDark={isDark} delay={400} />
            </View>
          </FadeInView>

          {/* Top Moods */}
          {topMoodsSlice.length > 0 && (
            <>
              <View style={[mStyles.divider, { backgroundColor: dividerColor }]} />
              <FadeInView delay={100}>
                <Text style={[mStyles.sectionLabel, { color: labelColor }]}>Your Moods This Month</Text>
                <View style={mStyles.moodsRow}>
                  {topMoodsSlice.map((item, index) => {
                    const mc = moodColors[index % moodColors.length];
                    const moodCountText = String(item.count);
                    return (
                      <View key={index} style={[mStyles.moodChip, { backgroundColor: mc.bg }]}>
                        <Text style={[mStyles.moodName, { color: mc.text }]}>{item.mood}</Text>
                        <Text style={[mStyles.moodCount, { color: mc.text }]}>
                          (
                        </Text>
                        <Text style={[mStyles.moodCount, { color: mc.text }]}>{moodCountText}</Text>
                        <Text style={[mStyles.moodCount, { color: mc.text }]}>
                          )
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </FadeInView>
            </>
          )}

          {/* Growth Highlight */}
          {s.growthHighlight ? (
            <>
              <View style={[mStyles.divider, { backgroundColor: dividerColor }]} />
              <FadeInView delay={200}>
                <Text style={[mStyles.sectionLabel, { color: labelColor }]}>Growth Pattern</Text>
                <View style={[mStyles.growthBox, { backgroundColor: growthBg, borderLeftColor: growthBorder }]}>
                  <Text style={[mStyles.growthText, { color: growthTextColor }]}>
                    {s.growthHighlight.replace(/→/g, '').trim()}
                  </Text>
                  {s.growthHighlight.includes('→') && (
                    <Text style={[mStyles.growthArrow, { color: growthArrowColor }]}>→</Text>
                  )}
                </View>
              </FadeInView>
            </>
          ) : null}

          {/* Journey Summary */}
          {s.conversationSummary ? (
            <>
              <View style={[mStyles.divider, { backgroundColor: dividerColor }]} />
              <FadeInView delay={250}>
                <Text style={[mStyles.sectionLabel, { color: labelColor }]}>Your Journey This Month</Text>
                <View style={[mStyles.journeyCard, { backgroundColor: journeyBg, borderColor: journeyBorder }]}>
                  <Text style={[mStyles.journeyText, { color: journeyColor }]}>{s.conversationSummary}</Text>
                </View>
              </FadeInView>
            </>
          ) : null}

          {/* Personalized Suggestions */}
          {suggestionsSlice.length > 0 && (
            <>
              <View style={[mStyles.divider, { backgroundColor: dividerColor }]} />
              <FadeInView delay={300}>
                <Text style={[mStyles.sectionLabel, { color: labelColor }]}>For Next Month</Text>
                {suggestionsSlice.map((suggestion, index) => (
                  <FadeInView key={index} delay={300 + index * 80}>
                    <View style={[mStyles.suggestionCard, { backgroundColor: suggBg, borderColor: suggBorder }]}>
                      <View style={mStyles.suggestionInner}>
                        <View style={mStyles.suggestionTextBlock}>
                          <Text style={[mStyles.suggestionTitle, { color: suggTitleColor }]}>{suggestion.title}</Text>
                          <Text style={[mStyles.suggestionDesc, { color: suggDescColor }]}>{suggestion.description}</Text>
                        </View>
                        <ChevronRight size={16} color={isDark ? '#fbbf24' : '#d97706'} />
                      </View>
                    </View>
                  </FadeInView>
                ))}
              </FadeInView>
            </>
          )}

          {/* Top Scriptures */}
          {topScripturesSlice.length > 0 && (
            <>
              <View style={[mStyles.divider, { backgroundColor: dividerColor }]} />
              <FadeInView delay={400}>
                <Text style={[mStyles.sectionLabel, { color: labelColor }]}>Scriptures This Month</Text>
                {topScripturesSlice.map((item, index) => (
                  <View key={index} style={mStyles.scriptureItem}>
                    <View style={[mStyles.scriptureDot, { backgroundColor: scriptureDotColor }]} />
                    <Text style={[mStyles.scriptureText, { color: scriptureColor }]}>{item.reference}</Text>
                  </View>
                ))}
              </FadeInView>
            </>
          )}
        </>
      )}
    </View>
  );
}

// ─── Monthly styles ───────────────────────────────────────────────────────────

const mStyles = StyleSheet.create({
  outerCard: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    shadowColor: 'rgba(180, 83, 9, 0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: spacing.sm,
  },
  navArrow: {
    padding: 4,
  },
  navMonthText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  subtitleText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.sm,
    marginTop: 2,
  },
  skeletonContainer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  skeletonCard: {
    height: 72,
    borderRadius: 12,
  },
  stateCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateBody: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
    opacity: 0.5,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
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
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
  },
  statSuffix: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
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
    borderRadius: 20,
    gap: 2,
  },
  moodName: {
    fontSize: 13,
    fontWeight: '600',
  },
  moodCount: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.85,
  },
  growthBox: {
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 3,
  },
  growthText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  growthArrow: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  journeyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
  },
  journeyText: {
    fontSize: 15,
    lineHeight: 26,
    fontStyle: 'italic',
  },
  suggestionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  suggestionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  suggestionTextBlock: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  suggestionDesc: {
    fontSize: 13,
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
  },
  scriptureText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

// ─── Weekly Recap interfaces & helpers ───────────────────────────────────────

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

/** Parse an ISO date string (YYYY-MM-DD or ISO-8601) into a local-time Date,
 *  avoiding the UTC-midnight timezone shift that causes off-by-one day bugs. */
function parseDateLocal(dateStr: string): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
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

// ─── Weekly Recap screen styles ───────────────────────────────────────────────

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
    backgroundColor: '#FDE68A',
  },
  buttonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
    marginLeft: spacing.sm,
  },
  buttonTextHistory: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#78350f',
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
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WeeklyRecapScreen() {
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const router = useRouter();
  const { isDark } = useTheme();
  const { isSubscribed, loading: subLoading } = useSubscription();

  useEffect(() => {
    if (subLoading) return;
    if (!isSubscribed) {
      console.log('[WeeklyRecap] User not subscribed — redirecting to paywall');
      router.replace('/paywall');
    }
  }, [isSubscribed, subLoading, router]);
  const cardBg = isDark ? colors.cardDark : 'rgba(255, 255, 255, 0.7)';
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

  useEffect(() => {
    loadCurrentRecap();
  }, []);

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

  const headerOptions = {
    title: 'Heart Threads',
    headerShown: true,
    headerTransparent: true,
    headerStyle: { backgroundColor: 'transparent' },
    headerBackTitle: '',
    headerTintColor: '#047857',
    headerTitleStyle: {
      fontSize: 18,
      fontWeight: '400' as const,
      fontFamily: 'Georgia',
      color: '#1c1917',
    },
    headerLeft: () => (
      <TouchableOpacity
        onPress={() => { console.log('[HeartThreads] Back button pressed — navigating back'); router.back(); }}
        style={{ paddingRight: 8, flexDirection: 'row' as const, alignItems: 'center' as const }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ChevronLeft size={24} color="#047857" />
      </TouchableOpacity>
    ),
  };

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Stack.Screen options={headerOptions} />
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
          <Stack.Screen options={headerOptions} />
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
        <Stack.Screen options={headerOptions} />
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Your Journey in Review</Text>
            {dateRangeText.length > 0 && (
              <Text style={styles.dateRange}>{dateRangeText}</Text>
            )}
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
                color="#78350f"
              />
              <Text style={styles.buttonTextHistory}>View Weekly History</Text>
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
          <MonthlySummarySection isDark={isDark} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
