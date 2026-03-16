
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanionPreferences {
  tone: string;
  directness: string;
  spiritualIntegration: string;
  responseLength: string;
  customPreferences: string;
  preferencesSet: boolean;
}

interface Option {
  value: string;
  icon: string;
  title: string;
  description: string;
}

// ─── Option Data ──────────────────────────────────────────────────────────────

const TONE_OPTIONS: Option[] = [
  { value: 'gentle_friend', icon: '🌿', title: 'Gentle Friend', description: 'Warm, conversational, like talking with a wise friend' },
  { value: 'compassionate_guide', icon: '🕊️', title: 'Compassionate Guide', description: 'More gentle, teaching and guiding' },
  { value: 'contemplative', icon: '🌙', title: 'Contemplative Companion', description: 'Quieter, more spacious, using fewer words' },
  { value: 'direct_clear', icon: '⚡', title: 'Direct & Clear', description: 'Straightforward, less metaphor, practical' },
  { value: 'poetic', icon: '✨', title: 'Poetic & Reflective', description: 'More imagery, contemplative language, lyrical' },
];

const DIRECTNESS_OPTIONS: Option[] = [
  { value: 'gentle_indirect', icon: '🌱', title: 'Gentle & Indirect', description: 'More questions, less direct naming, inviting you to discover' },
  { value: 'balanced', icon: '⚖️', title: 'Balanced', description: 'Name patterns with compassion when helpful' },
  { value: 'direct_clear', icon: '🎯', title: 'Direct & Clear', description: 'Calls things out explicitly, names patterns directly' },
];

const SPIRITUAL_OPTIONS: Option[] = [
  { value: 'scripture_rich', icon: '📖', title: 'Scripture-Rich', description: 'More frequent Bible references woven throughout' },
  { value: 'balanced', icon: '⚖️', title: 'Balanced Integration', description: '1-2 scripture references per conversation when relevant' },
  { value: 'light_touch', icon: '🕯️', title: 'Light Touch', description: 'Scripture only when specifically relevant or requested' },
  { value: 'minimal', icon: '🧘', title: 'Minimal', description: 'Focus on somatic/psychological insights, rarely use religious language' },
];

const LENGTH_OPTIONS: Option[] = [
  { value: 'brief', icon: '✦', title: 'Brief & Focused', description: 'Shorter responses, 1-3 sentences typically' },
  { value: 'concise', icon: '📝', title: 'Concise', description: 'To the point without being abrupt, 2-3 sentences' },
  { value: 'varies', icon: '🔄', title: 'Varies', description: 'Adjusts based on context' },
  { value: 'detailed', icon: '📚', title: 'In-Depth', description: 'Longer responses with more teaching and exploration' },
];

const STEPS = [
  { key: 'tone', question: 'How would you like me to speak?', description: 'Choose the voice and style that feels most natural and supportive for you.', options: TONE_OPTIONS },
  { key: 'directness', question: 'How direct should I be?', description: 'Some people prefer gentle exploration; others want clear, direct observations.', options: DIRECTNESS_OPTIONS },
  { key: 'spiritualIntegration', question: 'How much scripture integration?', description: 'Choose how often you\'d like scripture and spiritual language woven into our conversations.', options: SPIRITUAL_OPTIONS },
  { key: 'responseLength', question: 'How much should I say?', description: 'Find the response length that feels right — brief and focused, or more expansive.', options: LENGTH_OPTIONS },
  { key: 'customPreferences', question: 'Anything else you\'d like me to know?', description: 'Share any other preferences that would help me support you better.', options: [] },
];

const TONE_LABELS: Record<string, string> = {
  gentle_friend: 'Gentle Friend',
  compassionate_guide: 'Compassionate Guide',
  contemplative: 'Contemplative',
  direct_clear: 'Direct & Clear',
  poetic: 'Poetic',
};

const DIRECTNESS_LABELS: Record<string, string> = {
  gentle_indirect: 'Gentle',
  balanced: 'Balanced',
  direct_clear: 'Direct',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  const safeTotal = typeof total === 'number' && total > 0 ? total : 0;
  const safeCurrent = typeof current === 'number' ? current : 0;

  if (safeTotal === 0) {
    return <View style={styles.progressDots} />;
  }

  return (
    <View style={styles.progressDots}>
      {Array.from({ length: safeTotal }).map((_, i) => {
        const isActive = i <= safeCurrent;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              isActive ? styles.dotActive : styles.dotInactive,
            ]}
          />
        );
      })}
    </View>
  );
}

function OptionCard({
  option,
  selected,
  onPress,
}: {
  option: Option;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionCard, selected && styles.optionCardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.optionRow}>
        <Text style={styles.optionIcon}>{option.icon}</Text>
        <View style={styles.optionTextContainer}>
          <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
            {option.title}
          </Text>
          <Text style={styles.optionDescription}>{option.description}</Text>
        </View>
        <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
          {selected && <View style={styles.radioInner} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CompanionPreferencesScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [tone, setTone] = useState('gentle_friend');
  const [directness, setDirectness] = useState('balanced');
  const [spiritualIntegration, setSpiritualIntegration] = useState('balanced');
  const [responseLength, setResponseLength] = useState('varies');
  const [customPreferences, setCustomPreferences] = useState('');

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const MAX_CUSTOM_CHARS = 500;

  useEffect(() => {
    console.log('CompanionPreferences: Screen mounted, loading preferences');
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      console.log('CompanionPreferences: GET /api/companion/preferences');
      const data = await authenticatedGet<CompanionPreferences>('/api/companion/preferences');
      console.log('CompanionPreferences: Preferences loaded:', data);
      if (data && data.tone) setTone(data.tone);
      if (data && data.directness) setDirectness(data.directness);
      if (data && data.spiritualIntegration) setSpiritualIntegration(data.spiritualIntegration);
      if (data && data.responseLength) setResponseLength(data.responseLength);
      if (data && data.customPreferences) setCustomPreferences(data.customPreferences);
    } catch (error) {
      console.error('CompanionPreferences: Failed to load preferences:', error);
      // Do not navigate on error — just show defaults
    } finally {
      setLoading(false);
    }
  };

  const animateStep = (next: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setTimeout(next, 150);
  };

  const handleNext = () => {
    console.log(`CompanionPreferences: Step ${currentStep + 1} → ${currentStep + 2}, value:`, getCurrentValue());
    animateStep(() => setCurrentStep((s) => s + 1));
  };

  const handleBack = () => {
    console.log(`CompanionPreferences: Step ${currentStep + 1} → ${currentStep}`);
    animateStep(() => setCurrentStep((s) => s - 1));
  };

  const handleCancel = () => {
    console.log('CompanionPreferences: Cancel pressed, navigating back');
    router.back();
  };

  const handleSave = async () => {
    console.log('CompanionPreferences: Save pressed — POST /api/companion/preferences', {
      tone, directness, spiritualIntegration, responseLength, customPreferences,
    });
    setSaving(true);
    try {
      const result = await authenticatedPost('/api/companion/preferences', {
        tone,
        directness,
        spiritualIntegration,
        responseLength,
        customPreferences: customPreferences.trim() || undefined,
      });
      console.log('CompanionPreferences: Preferences saved successfully:', result);
      setSaveSuccess(true);
      setTimeout(() => {
        router.back();
      }, 800);
    } catch (error) {
      console.error('CompanionPreferences: Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const getCurrentValue = () => {
    const step = STEPS[currentStep];
    if (step.key === 'tone') return tone;
    if (step.key === 'directness') return directness;
    if (step.key === 'spiritualIntegration') return spiritualIntegration;
    if (step.key === 'responseLength') return responseLength;
    return customPreferences;
  };

  const handleOptionSelect = (value: string) => {
    const step = STEPS[currentStep];
    console.log(`CompanionPreferences: Selected ${step.key} = ${value}`);
    if (step.key === 'tone') setTone(value);
    else if (step.key === 'directness') setDirectness(value);
    else if (step.key === 'spiritualIntegration') setSpiritualIntegration(value);
    else if (step.key === 'responseLength') setResponseLength(value);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your preferences…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const currentValue = getCurrentValue();
  const charCount = customPreferences.length;
  const toneLabel = TONE_LABELS[tone] || tone;
  const directnessLabel = DIRECTNESS_LABELS[directness] || directness;
  const subtitleText = `${toneLabel} · ${directnessLabel}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <ProgressDots total={STEPS.length} current={currentStep} />
          <Text style={styles.stepCounter}>
            {currentStep + 1}
          </Text>
          <Text style={styles.stepCounterOf}>
            {' / '}
          </Text>
          <Text style={styles.stepCounter}>
            {STEPS.length}
          </Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Question header */}
            <Text style={styles.question}>{step.question}</Text>
            <Text style={styles.description}>{step.description}</Text>

            {/* Options or custom text */}
            {step.options.length > 0 ? (
              <View style={styles.optionsList}>
                {step.options.map((option) => (
                  <OptionCard
                    key={option.value}
                    option={option}
                    selected={currentValue === option.value}
                    onPress={() => handleOptionSelect(option.value)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.customSection}>
                <Text style={styles.customLabel}>Optional</Text>
                <TextInput
                  style={styles.customInput}
                  value={customPreferences}
                  onChangeText={(text) => {
                    if (text.length <= MAX_CUSTOM_CHARS) {
                      setCustomPreferences(text);
                    }
                  }}
                  placeholder="e.g. I prefer concrete examples over abstract concepts. Please use gender-neutral language."
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.charHint}>
                  {charCount}
                </Text>
                <Text style={styles.charHintOf}>
                  {' / '}
                </Text>
                <Text style={styles.charHint}>
                  {MAX_CUSTOM_CHARS}
                </Text>
              </View>
            )}

            {/* Summary preview on last step */}
            {isLastStep && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Your selections</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Tone</Text>
                  <Text style={styles.summaryValue}>{TONE_LABELS[tone] || tone}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Directness</Text>
                  <Text style={styles.summaryValue}>{DIRECTNESS_LABELS[directness] || directness}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Scripture</Text>
                  <Text style={styles.summaryValue}>{spiritualIntegration.replace('_', ' ')}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Length</Text>
                  <Text style={styles.summaryValue}>{responseLength}</Text>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Bottom buttons */}
        <View style={styles.bottomBar}>
          {isFirstStep ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCancel}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          {isLastStep ? (
            <TouchableOpacity
              style={[styles.primaryButton, saveSuccess && styles.primaryButtonSuccess]}
              onPress={handleSave}
              disabled={saving || saveSuccess}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : saveSuccess ? (
                <Text style={styles.primaryButtonText}>Saved!</Text>
              ) : (
                <Text style={styles.primaryButtonText}>Save Preferences</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const EMERALD_50 = '#ecfdf5';
const EMERALD_200 = '#a7f3d0';
const EMERALD_500 = '#10b981';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  flex: {
    flex: 1,
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
    marginRight: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: EMERALD_500,
  },
  dotInactive: {
    backgroundColor: '#e7e5e4',
  },
  stepCounter: {
    fontSize: typography.caption,
    color: colors.textLight,
    fontWeight: typography.medium,
  },
  stepCounterOf: {
    fontSize: typography.caption,
    color: colors.textLight,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  question: {
    fontSize: 26,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 34,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  description: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  optionCardSelected: {
    backgroundColor: EMERALD_50,
    borderWidth: 2,
    borderColor: EMERALD_200,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: colors.primaryDark,
  },
  optionDescription: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d6d3d1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: EMERALD_500,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: EMERALD_500,
  },
  customSection: {
    gap: 6,
  },
  customLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  customInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  charHint: {
    fontSize: typography.caption,
    color: colors.textLight,
    textAlign: 'right',
  },
  charHintOf: {
    fontSize: typography.caption,
    color: colors.textLight,
    textAlign: 'right',
  },
  summaryCard: {
    backgroundColor: EMERALD_50,
    borderRadius: 12,
    padding: 16,
    marginTop: spacing.xl,
    gap: 8,
    borderWidth: 1,
    borderColor: EMERALD_200,
  },
  summaryTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryKey: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.text,
    textTransform: 'capitalize',
  },
  bottomBar: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e7e5e4',
    backgroundColor: '#fafaf9',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: EMERALD_500,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButtonSuccess: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#e7e5e4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
});
