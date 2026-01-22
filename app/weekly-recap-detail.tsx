
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet } from '@/utils/api';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';

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
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.xl,
  },
  weekRange: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  premiumBadgeText: {
    ...typography.caption,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  synthesisCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  synthesisText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  sectionContent: {
    gap: spacing.md,
  },
  itemText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
    marginTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemContent: {
    flex: 1,
  },
  visualizationCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  visualizationTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    marginTop: spacing.md,
  },
  chartBar: {
    width: 40,
    backgroundColor: colors.primary + '40',
    borderRadius: borderRadius.sm,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  chartLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  chartValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
});

export default function WeeklyRecapDetailScreen() {
  const router = useRouter();
  const { weekStartDate } = useLocalSearchParams<{ weekStartDate: string }>();
  const [loading, setLoading] = useState(true);
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);

  useEffect(() => {
    if (weekStartDate) {
      loadRecap();
    }
  }, [weekStartDate]);

  const loadRecap = async () => {
    console.log('Loading recap for week:', weekStartDate);
    try {
      setLoading(true);
      const response = await authenticatedGet(`/api/weekly-recap/${weekStartDate}`);
      const data = await response.json();
      
      console.log('Recap loaded:', data);
      setRecap(data.recap);
    } catch (error) {
      console.error('Error loading recap:', error);
      Alert.alert('Error', 'Failed to load recap. Please try again.');
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Weekly Recap',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!recap) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Weekly Recap',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.itemText}>Recap not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dateRangeDisplay = formatDateRange(recap.weekStartDate, recap.weekEndDate);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Weekly Recap',
          headerShown: true,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.weekRange}>{dateRangeDisplay}</Text>
          {recap.isPremium && (
            <View style={styles.premiumBadge}>
              <IconSymbol
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.premiumBadgeText}>Enhanced Recap</Text>
            </View>
          )}
        </View>

        {recap.personalSynthesis && (
          <View style={styles.synthesisCard}>
            <Text style={styles.synthesisText}>{recap.personalSynthesis}</Text>
          </View>
        )}

        {/* Scripture Section */}
        {(recap.scriptureSection.reflections.length > 0 || recap.scriptureSection.sharedReflections.length > 0) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="book.fill"
                android_material_icon_name="menu-book"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.sectionTitle}>Scripture</Text>
            </View>
            <View style={styles.sectionContent}>
              {recap.scriptureSection.reflections.map((reflection, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.bulletPoint} />
                  <View style={styles.itemContent}>
                    <Text style={styles.itemText}>{reflection}</Text>
                  </View>
                </View>
              ))}
              {recap.scriptureSection.sharedReflections.map((reflection, index) => (
                <View key={`shared-${index}`} style={styles.itemRow}>
                  <View style={styles.bulletPoint} />
                  <View style={styles.itemContent}>
                    <Text style={styles.itemText}>{reflection}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Body Section */}
        {(recap.bodySection.practices.length > 0 || recap.bodySection.notes.length > 0) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="figure.walk"
                android_material_icon_name="directions-walk"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.sectionTitle}>Body</Text>
            </View>
            <View style={styles.sectionContent}>
              {recap.bodySection.practices.map((practice, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.bulletPoint} />
                  <View style={styles.itemContent}>
                    <Text style={styles.itemText}>{practice}</Text>
                  </View>
                </View>
              ))}
              {recap.bodySection.notes.map((note, index) => (
                <View key={`note-${index}`} style={styles.itemRow}>
                  <View style={styles.bulletPoint} />
                  <View style={styles.itemContent}>
                    <Text style={styles.itemText}>{note}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Community Section */}
        {(recap.communitySection.checkInSummary || recap.communitySection.sharedPosts.length > 0) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="person.3.fill"
                android_material_icon_name="group"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.sectionTitle}>Community</Text>
            </View>
            <View style={styles.sectionContent}>
              {recap.communitySection.checkInSummary && (
                <Text style={styles.itemText}>{recap.communitySection.checkInSummary}</Text>
              )}
              {recap.communitySection.sharedPosts.map((post, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.bulletPoint} />
                  <View style={styles.itemContent}>
                    <Text style={styles.itemText}>{post}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Prompting Section */}
        {recap.promptingSection.suggestions.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="lightbulb.fill"
                android_material_icon_name="lightbulb"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.sectionTitle}>For the Week Ahead</Text>
            </View>
            <View style={styles.sectionContent}>
              {recap.promptingSection.suggestions.map((suggestion, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.bulletPoint} />
                  <View style={styles.itemContent}>
                    <Text style={styles.itemText}>{suggestion}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Practice Visualization (Premium) */}
        {recap.practiceVisualization && recap.practiceVisualization.weeklyData.length > 0 && (
          <View style={styles.visualizationCard}>
            <Text style={styles.visualizationTitle}>Practice Patterns</Text>
            <View style={styles.chartContainer}>
              {recap.practiceVisualization.weeklyData.map((count, index) => {
                const weekLabel = `W${index + 1}`;
                const heightPercentage = count > 0 ? (count / Math.max(...recap.practiceVisualization!.weeklyData)) * 100 : 10;
                
                return (
                  <View key={index} style={{ alignItems: 'center' }}>
                    <View style={[styles.chartBar, { height: `${heightPercentage}%` }]}>
                      <Text style={styles.chartValue}>{count}</Text>
                    </View>
                    <Text style={styles.chartLabel}>{weekLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
