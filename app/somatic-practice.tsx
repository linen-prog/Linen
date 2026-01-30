
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedPost } from '@/utils/api';

export default function SomaticPracticeScreen() {
  console.log('User viewing Somatic Practice screen');
  const router = useRouter();
  const params = useLocalSearchParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [reflection, setReflection] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const exerciseId = params.exerciseId as string;
  const title = params.title as string;
  const description = params.description as string;
  const duration = params.duration as string;
  const instructions = params.instructions as string;

  // Parse instructions into steps (assume newline-separated or JSON array)
  const steps = React.useMemo(() => {
    try {
      const parsed = JSON.parse(instructions);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // If not JSON, split by newlines
      return instructions.split('\n').filter(step => step.trim().length > 0);
    }
    return [instructions];
  }, [instructions]);

  // Parse duration to get total seconds
  const totalSeconds = React.useMemo(() => {
    const match = duration.match(/(\d+)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      return minutes * 60;
    }
    return 300; // Default 5 minutes
  }, [duration]);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isTimerRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTimerRunning, timeRemaining, handleTimerComplete]);

  const handleTimerComplete = useCallback(() => {
    console.log('[SomaticPractice] Timer completed');
    setShowCelebration(true);
  }, []);

  const handleStartPractice = () => {
    console.log('[SomaticPractice] User started practice');
    setTimeRemaining(totalSeconds);
    setIsTimerRunning(true);
  };

  const handlePauseResume = () => {
    console.log('[SomaticPractice] User toggled pause/resume');
    setIsTimerRunning(!isTimerRunning);
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      console.log('[SomaticPractice] User moved to next step');
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      console.log('[SomaticPractice] User moved to previous step');
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    console.log('[SomaticPractice] User completing practice', { exerciseId, reflection });
    setIsLoading(true);

    try {
      const response = await authenticatedPost<{ success: boolean; completion: { id: string; exerciseId: string; completedAt: string } }>('/api/weekly-practice/complete', {
        exerciseId,
        reflection: reflection.trim() || undefined,
      });
      
      console.log('[SomaticPractice] Practice marked complete:', response);
      setIsLoading(false);
      
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error) {
      console.error('[SomaticPractice] Failed to mark practice complete:', error);
      setIsLoading(false);
    }
  };

  const handleSkipReflection = async () => {
    console.log('[SomaticPractice] User skipped reflection');
    setIsLoading(true);

    try {
      const response = await authenticatedPost<{ success: boolean; completion: { id: string; exerciseId: string; completedAt: string } }>('/api/weekly-practice/complete', {
        exerciseId,
      });
      
      console.log('[SomaticPractice] Practice marked complete without reflection:', response);
      setIsLoading(false);
      router.back();
    } catch (error) {
      console.error('[SomaticPractice] Failed to mark practice complete:', error);
      setIsLoading(false);
    }
  };

  const bgColor = colors.background;
  const textColor = colors.text;
  const textSecondaryColor = colors.textSecondary;
  const cardBg = colors.card;

  // Format time remaining
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const titleDisplay = title;
  const descriptionDisplay = description;
  const durationDisplay = duration;
  const currentStepDisplay = steps[currentStep] || '';
  const stepCountDisplay = `Step ${currentStep + 1} of ${steps.length}`;
  const startButtonText = 'Start Practice';
  const pauseButtonText = 'Pause';
  const resumeButtonText = 'Resume';
  const nextStepText = 'Next Step';
  const previousStepText = 'Previous';
  const completeEarlyText = 'Complete Early';
  const celebrationTitle = 'You completed';
  const celebrationSubtitle = title;
  const celebrationMessage = 'Well done. You showed up for yourself today.';
  const reflectionPrompt = 'How did that feel in your body?';
  const reflectionPlaceholder = 'Notice what arises... warmth, tension, peace, release...';
  const saveReflectionText = isLoading ? 'Saving...' : 'Save & Complete';
  const skipReflectionText = 'Skip';

  const hasStarted = timeRemaining > 0 || !isTimerRunning;
  const canGoNext = currentStep < steps.length - 1;
  const canGoPrevious = currentStep > 0;

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

      {/* Celebration Modal */}
      <Modal
        visible={showCelebration}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCelebration(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.celebrationContent, { backgroundColor: cardBg }]}>
            <View style={styles.celebrationHeader}>
              <IconSymbol 
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={64}
                color={colors.accent}
              />
              <Text style={[styles.celebrationTitle, { color: textColor }]}>
                {celebrationTitle}
              </Text>
              <Text style={[styles.celebrationSubtitle, { color: colors.primary }]}>
                {celebrationSubtitle}
              </Text>
              <Text style={[styles.celebrationMessage, { color: textSecondaryColor }]}>
                {celebrationMessage}
              </Text>
            </View>

            <View style={styles.reflectionSection}>
              <Text style={[styles.reflectionPrompt, { color: textColor }]}>
                {reflectionPrompt}
              </Text>
              <TextInput
                style={[styles.reflectionInput, { 
                  backgroundColor: bgColor,
                  borderColor: colors.border,
                  color: textColor 
                }]}
                placeholder={reflectionPlaceholder}
                placeholderTextColor={textSecondaryColor}
                value={reflection}
                onChangeText={setReflection}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.celebrationButtons}>
              <TouchableOpacity 
                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={handleComplete}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {saveReflectionText}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.skipButton}
                onPress={handleSkipReflection}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={[styles.skipButtonText, { color: textSecondaryColor }]}>
                  {skipReflectionText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
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

        {/* Timer Display */}
        {timeRemaining > 0 && (
          <View style={[styles.timerCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.timerLabel, { color: textSecondaryColor }]}>
              Time Remaining
            </Text>
            <Text style={[styles.timerDisplay, { color: colors.primary }]}>
              {timeDisplay}
            </Text>
            <TouchableOpacity 
              style={styles.pauseButton}
              onPress={handlePauseResume}
              activeOpacity={0.8}
            >
              <IconSymbol 
                ios_icon_name={isTimerRunning ? "pause.circle.fill" : "play.circle.fill"}
                android_material_icon_name={isTimerRunning ? "pause-circle" : "play-circle"}
                size={48}
                color={colors.primary}
              />
              <Text style={[styles.pauseButtonText, { color: colors.primary }]}>
                {isTimerRunning ? pauseButtonText : resumeButtonText}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step-by-step Instructions */}
        {timeRemaining > 0 ? (
          <View style={[styles.stepCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.stepCount, { color: textSecondaryColor }]}>
              {stepCountDisplay}
            </Text>
            <Text style={[styles.stepText, { color: textColor }]}>
              {currentStepDisplay}
            </Text>

            <View style={styles.stepNavigation}>
              <TouchableOpacity 
                style={[styles.navButton, !canGoPrevious && styles.navButtonDisabled]}
                onPress={handlePreviousStep}
                disabled={!canGoPrevious}
                activeOpacity={0.8}
              >
                <IconSymbol 
                  ios_icon_name="chevron.left"
                  android_material_icon_name="chevron-left"
                  size={24}
                  color={canGoPrevious ? colors.primary : textSecondaryColor}
                />
                <Text style={[
                  styles.navButtonText, 
                  { color: canGoPrevious ? colors.primary : textSecondaryColor }
                ]}>
                  {previousStepText}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
                onPress={handleNextStep}
                disabled={!canGoNext}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.navButtonText, 
                  { color: canGoNext ? colors.primary : textSecondaryColor }
                ]}>
                  {nextStepText}
                </Text>
                <IconSymbol 
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron-right"
                  size={24}
                  color={canGoNext ? colors.primary : textSecondaryColor}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.completeEarlyButton}
              onPress={() => {
                console.log('[SomaticPractice] User completing practice early');
                setIsTimerRunning(false);
                setShowCelebration(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.completeEarlyText, { color: textSecondaryColor }]}>
                {completeEarlyText}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.instructionsCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.instructionsTitle, { color: textColor }]}>
              Instructions
            </Text>
            {steps.map((step, index) => (
              <View key={index} style={styles.instructionStep}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.stepNumberText, { color: colors.primary }]}>
                    {(index + 1).toString()}
                  </Text>
                </View>
                <Text style={[styles.instructionText, { color: textSecondaryColor }]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        )}

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

        {timeRemaining === 0 && (
          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleStartPractice}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>
              {startButtonText}
            </Text>
          </TouchableOpacity>
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
    paddingBottom: spacing.xxl,
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
  timerCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  timerLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  timerDisplay: {
    fontSize: 56,
    fontWeight: typography.bold,
    marginBottom: spacing.lg,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pauseButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  stepCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  stepCount: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  stepText: {
    fontSize: typography.h3,
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  stepNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  completeEarlyButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
  },
  completeEarlyText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
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
    marginBottom: spacing.lg,
  },
  instructionStep: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  instructionText: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 24,
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
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  startButtonText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  celebrationContent: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  celebrationHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  celebrationTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  celebrationMessage: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  reflectionSection: {
    marginBottom: spacing.xl,
  },
  reflectionPrompt: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  reflectionInput: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    lineHeight: 22,
    minHeight: 120,
    borderWidth: 1,
  },
  celebrationButtons: {
    gap: spacing.md,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
});
