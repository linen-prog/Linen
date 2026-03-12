
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { GradientBackground } from '@/components/GradientBackground';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { Stack, useRouter } from 'expo-router';
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
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.emerald[900],
    marginBottom: spacing.xs,
  },
  dateRange: {
    ...typography.body,
    color: colors.stone[600],
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.stone[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.emerald[800],
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: spacing.sm,
  },
  itemText: {
    ...typography.body,
    color: colors.stone[700],
    marginBottom: spacing.sm,
    lineHeight: 24,
  },
  emptyText: {
    ...typography.body,
    color: colors.stone[500],
    fontStyle: 'italic',
  },
  synthesisText: {
    ...typography.body,
    color: colors.stone[800],
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
    backgroundColor: colors.emerald[600],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: colors.emerald[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonSecondary: {
    backgroundColor: colors.stone[200],
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
    marginLeft: spacing.sm,
  },
  buttonTextSecondary: {
    color: colors.stone[700],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.stone[600],
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.emerald[800],
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    ...typography.body,
    color: colors.stone[600],
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  generateButton: {
    backgroundColor: colors.emerald[600],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.emerald[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonText: {
    ...typography.button,
    color: colors.white,
    marginLeft: spacing.sm,
  },
});

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const endDay = endDate.getDate();
  
  if (startMonth === endMonth) {
    const monthText = startMonth;
    const startDayText = String(startDay);
    const endDayText = String(endDay);
    return `${monthText} ${startDayText} - ${endDayText}`;
  }
  
  const startMonthText = startMonth;
  const startDayText = String(startDay);
  const endMonthText = endMonth;
  const endDayText = String(endDay);
  return `${startMonthText} ${startDayText} - ${endMonthText} ${endDayText}`;
}

export default function WeeklyRecapScreen() {
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

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

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Stack.Screen
            options={{
              title: 'Weekly Recap',
              headerShown: true,
              headerTransparent: true,
              headerBlurEffect: 'light',
              headerStyle: { backgroundColor: 'transparent' },
              headerTintColor: colors.emerald[900],
            }}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.emerald[600]} />
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
              title: 'Weekly Recap',
              headerShown: true,
              headerTransparent: true,
              headerBlurEffect: 'light',
              headerStyle: { backgroundColor: 'transparent' },
              headerTintColor: colors.emerald[900],
            }}
          />
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name="calendar-today"
              size={64}
              color={colors.emerald[600]}
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
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="sparkles"
                    android_material_icon_name="auto-awesome"
                    size={20}
                    color={colors.white}
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
            title: 'Weekly Recap',
            headerShown: true,
            headerTransparent: true,
            headerBlurEffect: 'light',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: colors.emerald[900],
          }}
        />
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Your Week in Review</Text>
            <Text style={styles.dateRange}>{dateRangeText}</Text>
          </View>

          {/* Scripture Section */}
          {recap.scriptureSection && (recap.scriptureSection.reflections.length > 0 || recap.scriptureSection.sharedReflections.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionTitle}>
                <IconSymbol
                  ios_icon_name="book"
                  android_material_icon_name="menu-book"
                  size={24}
                  color={colors.emerald[700]}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Scripture & Reflection</Text>
              </View>
              {recap.scriptureSection.reflections.map((reflection, index) => (
                <Text key={index} style={styles.itemText}>{reflection}</Text>
              ))}
              {recap.scriptureSection.sharedReflections.map((reflection, index) => (
                <Text key={`shared-${index}`} style={styles.itemText}>{reflection}</Text>
              ))}
            </View>
          )}

          {/* Body Section */}
          {recap.bodySection && (recap.bodySection.practices.length > 0 || recap.bodySection.notes.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionTitle}>
                <IconSymbol
                  ios_icon_name="figure.walk"
                  android_material_icon_name="directions-walk"
                  size={24}
                  color={colors.emerald[700]}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Body & Practice</Text>
              </View>
              {recap.bodySection.practices.map((practice, index) => (
                <Text key={index} style={styles.itemText}>{practice}</Text>
              ))}
              {recap.bodySection.notes.map((note, index) => (
                <Text key={`note-${index}`} style={styles.itemText}>{note}</Text>
              ))}
            </View>
          )}

          {/* Community Section */}
          {recap.communitySection && (recap.communitySection.checkInSummary || recap.communitySection.sharedPosts.length > 0) && (
            <View style={styles.section}>
              <View style={styles.sectionTitle}>
                <IconSymbol
                  ios_icon_name="person.3"
                  android_material_icon_name="group"
                  size={24}
                  color={colors.emerald[700]}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Community</Text>
              </View>
              {recap.communitySection.checkInSummary && (
                <Text style={styles.itemText}>{recap.communitySection.checkInSummary}</Text>
              )}
              {recap.communitySection.sharedPosts.map((post, index) => (
                <Text key={index} style={styles.itemText}>{post}</Text>
              ))}
            </View>
          )}

          {/* Prompting Section */}
          {recap.promptingSection && recap.promptingSection.suggestions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitle}>
                <IconSymbol
                  ios_icon_name="lightbulb"
                  android_material_icon_name="lightbulb"
                  size={24}
                  color={colors.emerald[700]}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Gentle Invitations</Text>
              </View>
              {recap.promptingSection.suggestions.map((suggestion, index) => (
                <Text key={index} style={styles.itemText}>{suggestion}</Text>
              ))}
            </View>
          )}

          {/* Personal Synthesis */}
          {recap.personalSynthesis && (
            <View style={styles.section}>
              <View style={styles.sectionTitle}>
                <IconSymbol
                  ios_icon_name="heart"
                  android_material_icon_name="favorite"
                  size={24}
                  color={colors.emerald[700]}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>A Word for You</Text>
              </View>
              <Text style={styles.synthesisText}>{recap.personalSynthesis}</Text>
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
                color={colors.stone[700]}
              />
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>View History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={handleGenerateRecap}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <IconSymbol
                    ios_icon_name="arrow.clockwise"
                    android_material_icon_name="refresh"
                    size={20}
                    color={colors.white}
                  />
                  <Text style={styles.buttonText}>Regenerate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
