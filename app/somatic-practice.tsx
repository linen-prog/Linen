
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function SomaticPracticeScreen() {
  console.log('User viewing Somatic Practice screen');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const params = useLocalSearchParams();

  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const exerciseId = params.exerciseId as string;
  const title = params.title as string;
  const description = params.description as string;
  const duration = params.duration as string;
  const instructions = params.instructions as string;

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;

  const handleComplete = async () => {
    console.log('User marking somatic exercise as complete', { exerciseId });
    setIsLoading(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      await authenticatedPost('/api/somatic/complete', {
        exerciseId,
      });
      
      console.log('Somatic exercise marked complete');
      setIsCompleted(true);
      setIsLoading(false);
      
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Failed to mark exercise complete:', error);
      setIsLoading(false);
    }
  };

  const titleDisplay = title;
  const descriptionDisplay = description;
  const durationDisplay = duration;
  const instructionsDisplay = instructions;
  const completeButtonText = isLoading ? 'Saving...' : 'Mark Complete';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Somatic Practice',
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: bgColor,
          },
          headerTintColor: colors.primary,
        }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <IconSymbol 
            ios_icon_name="figure.mind.and.body"
            android_material_icon_name="self-improvement"
            size={64}
            color={colors.primary}
          />
          
          <Text style={[styles.title, { color: textColor }]}>
            {titleDisplay}
          </Text>
          
          <Text style={[styles.description, { color: textSecondaryColor }]}>
            {descriptionDisplay}
          </Text>
          
          <View style={[styles.durationBadge, { backgroundColor: colors.primaryLight }]}>
            <IconSymbol 
              ios_icon_name="clock.fill"
              android_material_icon_name="schedule"
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.durationText, { color: colors.primary }]}>
              {durationDisplay}
            </Text>
          </View>
        </View>

        <View style={[styles.instructionsCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.instructionsTitle, { color: textColor }]}>
            Instructions
          </Text>
          <Text style={[styles.instructionsText, { color: textSecondaryColor }]}>
            {instructionsDisplay}
          </Text>
        </View>

        <View style={[styles.reminderCard, { backgroundColor: cardBg }]}>
          <IconSymbol 
            ios_icon_name="heart.fill"
            android_material_icon_name="favorite"
            size={32}
            color={colors.accent}
          />
          <Text style={[styles.reminderTitle, { color: textColor }]}>
            Gentle Reminder
          </Text>
          <Text style={[styles.reminderText, { color: textSecondaryColor }]}>
            There is no right or wrong way to practice. Listen to your body. Honor what you feel. Move at your own pace.
          </Text>
        </View>

        {!isCompleted ? (
          <TouchableOpacity 
            style={[styles.completeButton, isLoading && styles.completeButtonDisabled]}
            onPress={handleComplete}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.completeButtonText}>
              {completeButtonText}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.completedCard, { backgroundColor: cardBg }]}>
            <IconSymbol 
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={48}
              color={colors.success}
            />
            <Text style={[styles.completedTitle, { color: textColor }]}>
              Practice Complete
            </Text>
            <Text style={[styles.completedText, { color: textSecondaryColor }]}>
              Well done. You showed up for yourself today.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  durationText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
  },
  instructionsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    marginBottom: spacing.md,
  },
  instructionsText: {
    fontSize: typography.body,
    lineHeight: 26,
  },
  reminderCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  reminderTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  reminderText: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  completeButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  completeButtonDisabled: {
    opacity: 0.4,
  },
  completeButtonText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  completedCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    marginTop: spacing.md,
  },
  completedTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  completedText: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
});
