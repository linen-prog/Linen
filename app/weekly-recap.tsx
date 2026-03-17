
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { GradientBackground } from '@/components/GradientBackground';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';

interface MonthlySummaryResponse {
  summary: {
    monthName: string;
    mainThemes: string[];
    emotionalJourney: string;
    reflections: string[];
    checkInInsights: string;
    encouragement: string;
  } | null;
  hasEnoughData: boolean;
  message?: string;
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
    const [recapResult, monthlyResult] = await Promise.allSettled([
      authenticatedGet('/api/weekly-recap/current'),
      authenticatedGet('/api/monthly-summary'),
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
          <View style={[styles.section, { backgroundColor: cardBg }]}>
            <View style={styles.sectionTitleContainer}>
              <IconSymbol
                ios_icon_name="calendar.badge.clock"
                android_material_icon_name="calendar-month"
                size={24}
                color={colors.primary}
                style={styles.sectionIcon}
              />
              <Text style={[styles.sectionTitle, { color: textColor }]}>Your Month in Review</Text>
            </View>

            {monthlyLoading ? (
              <View style={styles.monthlyLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : monthlyError ? (
              <Text style={styles.monthlyError}>Unable to load monthly summary</Text>
            ) : monthlySummary ? (
              <>
                {monthlySummary.summary && (
                  <Text style={styles.monthlySubtitle}>{monthlySummary.summary.monthName}</Text>
                )}
                {!monthlySummary.hasEnoughData ? (
                  <Text style={styles.monthlyNotEnough}>{monthlySummary.message}</Text>
                ) : monthlySummary.summary ? (
                  <>
                    {/* Main Themes */}
                    {monthlySummary.summary.mainThemes.length > 0 && (
                      <>
                        <Text style={styles.monthlySubLabel}>Main Themes</Text>
                        <View style={styles.themesRow}>
                          {monthlySummary.summary.mainThemes.map((theme, index) => (
                            <View key={index} style={styles.themePill}>
                              <Text style={styles.themePillText}>{theme}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}

                    {/* Emotional Journey */}
                    {monthlySummary.summary.emotionalJourney ? (
                      <>
                        <Text style={styles.monthlySubLabel}>Emotional Journey</Text>
                        <Text style={styles.monthlyParagraph}>{monthlySummary.summary.emotionalJourney}</Text>
                      </>
                    ) : null}

                    {/* Reflections */}
                    {monthlySummary.summary.reflections.length > 0 && (
                      <>
                        <Text style={styles.monthlySubLabel}>Key Reflections</Text>
                        {monthlySummary.summary.reflections.map((reflection, index) => (
                          <Text key={index} style={styles.monthlyBullet}>{'• '}{reflection}</Text>
                        ))}
                      </>
                    )}

                    {/* Check-In Insights */}
                    {monthlySummary.summary.checkInInsights ? (
                      <>
                        <Text style={styles.monthlySubLabel}>Conversations with Dove</Text>
                        <Text style={styles.monthlyParagraph}>{monthlySummary.summary.checkInInsights}</Text>
                      </>
                    ) : null}

                    {/* Encouragement */}
                    {monthlySummary.summary.encouragement ? (
                      <Text style={styles.monthlyEncouragement}>{monthlySummary.summary.encouragement}</Text>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
