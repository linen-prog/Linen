
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet } from '@/utils/api';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

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
    fontSize: typography.h2,
    fontWeight: typography.semibold,
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
    fontSize: typography.caption,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  synthesisCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  synthesisText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  sectionCard: {
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
    fontSize: typography.h3,
    fontWeight: typography.medium,
    marginLeft: spacing.sm,
    flex: 1,
  },
  sectionContent: {
    gap: spacing.md,
  },
  itemText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
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
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  visualizationTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
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
    fontSize: typography.caption,
    fontWeight: typography.regular,
    marginTop: spacing.xs,
  },
  chartValue: {
    fontSize: typography.caption,
    fontWeight: '600',
  },
});

export default function WeeklyRecapDetailScreen() {
  const { weekStartDate } = useLocalSearchParams<{ weekStartDate: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
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
      const data = await authenticatedGet<{ recap: WeeklyRecap }>(`/api/weekly-recap/${weekStartDate}`);
      
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

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Weekly Recap',
            headerShown: true,
            headerBackTitle: '',
            headerTransparent: true,
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#047857',
            headerTitleStyle: {
              fontSize: 18,
              fontWeight: '400' as const,
              fontFamily: 'Georgia',
              color: '#1c1917',
            },
            headerLeft: () => (
              <TouchableOpacity onPress={() => { console.log('Back pressed from weekly recap detail'); router.back(); }} style={{ paddingRight: 8 }}>
                <ChevronLeft size={24} color="#047857" />
              </TouchableOpacity>
            ),
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
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Weekly Recap',
            headerShown: true,
            headerBackTitle: '',
            headerTransparent: true,
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#047857',
            headerTitleStyle: {
              fontSize: 18,
              fontWeight: '400' as const,
              fontFamily: 'Georgia',
              color: '#1c1917',
            },
            headerLeft: () => (
              <TouchableOpacity onPress={() => { console.log('Back pressed from weekly recap detail'); router.back(); }} style={{ paddingRight: 8 }}>
                <ChevronLeft size={24} color="#047857" />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.itemText, { color: textColor }]}>Recap not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dateRangeDisplay = formatDateRange(recap.weekStartDate, recap.weekEndDate);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Weekly Recap',
          headerShown: true,
          headerBackTitle: '',
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: '#047857',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '400' as const,
            fontFamily: 'Georgia',
            color: '#1c1917',
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => { console.log('Back pressed from weekly recap detail'); router.back(); }} style={{ paddingRight: 8 }}>
              <ChevronLeft size={24} color="#047857" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: bgColor }]} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.weekRange, { color: textColor }]}>{dateRangeDisplay}</Text>
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
          <View style={[styles.synthesisCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.synthesisText, { color: textColor }]}>{recap.personalSynthesis}</Text>
          </View>
        )}

        {/* Scripture Section */}
        {(recap.scriptureSection.reflections.length > 0 || recap.scriptureSection.sharedReflections.length > 0) && (
          <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="book.fill"
                android_material_icon_name="menu-book"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.sectionTitle, { color: textColor }]}>Scripture</Text>
            </View>
            <View style={styles.sectionContent}>
              {recap.scriptureSection.reflections.map((reflection, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.bulletPoint} />
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemText, { color: textColor }]}>{reflection}</Text>
                  </View>
                </View>
              ))}
              {recap.scriptureSection.sharedReflections.map((reflection, index) => (
                <View key={`shared-${index}`} style={styles.itemRow}>
                  <View style={styles.bulletPoint} />
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemText, { color: textColor }]}>{reflection}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Body Section */}
        {(recap.bodySection.practices.length > 0 || recap.bodySection.notes.length > 0) && (
          <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="figure.walk"
                android_material_icon_name="directions-walk"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.sectionTitle, { color: textColor }]}>Body</Text>
            </View>
            <View style={styles.sectionContent}>
              {recap.bodySection.practices.map((practice, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.bulletPoint} />
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemText, { color: textColor }]}>{practice}</Text>
                  </View>
                </View>
              ))}
              {recap.bodySection.notes.map((note, index) => (
                <View key={`note-${index}`} style={styles.itemRow}>
                  <View style={styles.bulletPoint} />
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemText, { color: textColor }]}>{note}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Community Section */}
        {(recap.communitySection.checkInSummary || recap.communitySection.sharedPosts.length > 0) && (
          <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="person.3.fill"
                android_material_icon_name="group"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.sectionTitle, { color: textColor }]}>Community</Text>
            </View>
            <View style={styles.sectionContent}>
              {recap.communitySection.checkInSummary && (
                <Text style={[styles.itemText, { color: textColor }]}>{recap.communitySection.checkInSummary}</Text>
              )}
              {recap.communitySection.sharedPosts.map((post, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.bulletPoint} />
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemText, { color: textColor }]}>{post}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Prompting Section */}
        {recap.promptingSection.suggestions.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="lightbulb.fill"
                android_material_icon_name="lightbulb"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.sectionTitle, { color: textColor }]}>For the Week Ahead</Text>
            </View>
            <View style={styles.sectionContent}>
              {recap.promptingSection.suggestions.map((suggestion, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.bulletPoint} />
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemText, { color: textColor }]}>{suggestion}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Practice Visualization (Premium) */}
        {recap.practiceVisualization && recap.practiceVisualization.weeklyData.length > 0 && (
          <View style={[styles.visualizationCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.visualizationTitle, { color: textColor }]}>Practice Patterns</Text>
            <View style={styles.chartContainer}>
              {recap.practiceVisualization.weeklyData.map((count, index) => {
                const weekLabel = `W${index + 1}`;
                const maxVal = Math.max(...recap.practiceVisualization!.weeklyData);
                const barHeight = count > 0 ? Math.max((count / maxVal) * 100, 10) : 10;
                const countText = String(count);
                
                return (
                  <View key={index} style={{ alignItems: 'center' }}>
                    <View style={[styles.chartBar, { height: barHeight }]}>
                      <Text style={[styles.chartValue, { color: textColor }]}>{countText}</Text>
                    </View>
                    <Text style={[styles.chartLabel, { color: textSecondaryColor }]}>{weekLabel}</Text>
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
