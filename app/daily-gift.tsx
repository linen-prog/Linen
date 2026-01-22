
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost } from '@/utils/api';

interface WeeklyTheme {
  id: string;
  weekStartDate: string;
  liturgicalSeason: string;
  themeTitle: string;
  themeDescription: string;
  somaticExercise: SomaticExercise | null;
}

interface DailyGift {
  id: string | null;
  date: string;
  scriptureText: string;
  scriptureReference: string;
  reflectionPrompt: string;
  somaticPrompt?: string;
  hasReflected: boolean;
  weeklyTheme: WeeklyTheme | null;
}

interface SomaticExercise {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  instructions: string;
}

export default function DailyGiftScreen() {
  console.log('User viewing Daily Gift screen');
  const router = useRouter();

  const [dailyGift, setDailyGift] = useState<DailyGift | null>(null);
  const [weeklyTheme, setWeeklyTheme] = useState<WeeklyTheme | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [shareToComm, setShareToComm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGift, setIsLoadingGift] = useState(true);

  // Response mode: 'text', 'art', or 'voice'
  const [responseMode, setResponseMode] = useState<'text' | 'art' | 'voice'>('text');

  // Mood and body sensation tags
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedSensations, setSelectedSensations] = useState<string[]>([]);

  const moodOptions = ['Peaceful', 'Anxious', 'Grateful', 'Heavy', 'Hopeful', 'Uncertain', 'Joyful', 'Weary'];
  const sensationOptions = ['Warmth', 'Tension', 'Lightness', 'Heaviness', 'Expansion', 'Constriction', 'Tingling', 'Numbness'];

  useEffect(() => {
    const loadDailyGift = async () => {
      try {
        console.log('[DailyGift] Loading daily gift...');
        const response = await authenticatedGet<DailyGift>('/api/daily-gift/today');
        
        console.log('[DailyGift] Daily gift loaded:', response);
        setDailyGift(response);
        setWeeklyTheme(response.weeklyTheme);
        setIsLoadingGift(false);
      } catch (error) {
        console.error('[DailyGift] Failed to load daily gift:', error);
        setIsLoadingGift(false);
      }
    };

    loadDailyGift();
  }, []);

  const bgColor = colors.background;
  const textColor = colors.text;
  const textSecondaryColor = colors.textSecondary;
  const cardBg = colors.card;
  const inputBg = colors.card;
  const inputBorder = colors.border;

  const handleSaveReflection = async () => {
    if (!reflectionText.trim() || !dailyGift || !dailyGift.id) {
      console.log('[DailyGift] Cannot save reflection - missing data');
      return;
    }

    console.log('[DailyGift] User saving reflection', { 
      reflectionText, 
      shareToComm, 
      responseMode,
      selectedMoods,
      selectedSensations 
    });
    setIsLoading(true);

    try {
      const response = await authenticatedPost<{ reflectionId: string }>('/api/daily-gift/reflect', {
        dailyGiftId: dailyGift.id,
        reflectionText: reflectionText.trim(),
        shareToComm,
        responseMode,
        moods: selectedMoods,
        sensations: selectedSensations,
      });
      
      console.log('[DailyGift] Reflection saved successfully:', response);
      setIsLoading(false);
      setDailyGift({ ...dailyGift, hasReflected: true });
    } catch (error) {
      console.error('[DailyGift] Failed to save reflection:', error);
      setIsLoading(false);
    }
  };

  const handleBeginPractice = () => {
    console.log('[DailyGift] User tapped Begin Practice for somatic exercise');
    const somaticExercise = weeklyTheme?.somaticExercise;
    if (somaticExercise) {
      router.push({
        pathname: '/somatic-practice',
        params: {
          exerciseId: somaticExercise.id,
          title: somaticExercise.title,
          description: somaticExercise.description,
          duration: somaticExercise.duration,
          instructions: somaticExercise.instructions,
        },
      });
    }
  };

  const handleCreateArtwork = () => {
    console.log('[DailyGift] User tapped Create Artwork');
    router.push('/artwork-canvas');
  };

  const toggleMood = (mood: string) => {
    console.log('[DailyGift] User toggled mood:', mood);
    setSelectedMoods(prev => 
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
    );
  };

  const toggleSensation = (sensation: string) => {
    console.log('[DailyGift] User toggled sensation:', sensation);
    setSelectedSensations(prev => 
      prev.includes(sensation) ? prev.filter(s => s !== sensation) : [...prev, sensation]
    );
  };

  if (isLoadingGift) {
    const loadingMessage = 'Loading today\'s gift...';
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen 
          options={{
            headerShown: true,
            title: 'Today\'s Gift',
            headerBackTitle: 'Home',
            headerStyle: {
              backgroundColor: bgColor,
            },
            headerTintColor: colors.primary,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
            {loadingMessage}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!dailyGift) {
    const errorTitle = 'Unable to load today\'s gift';
    const errorSubtext = 'Please try again later';
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen 
          options={{
            headerShown: true,
            title: 'Today\'s Gift',
            headerBackTitle: 'Home',
            headerStyle: {
              backgroundColor: bgColor,
            },
            headerTintColor: colors.primary,
          }}
        />
        <View style={styles.errorContainer}>
          <IconSymbol 
            ios_icon_name="exclamationmark.triangle"
            android_material_icon_name="warning"
            size={48}
            color={colors.accent}
          />
          <Text style={[styles.errorText, { color: textColor }]}>
            {errorTitle}
          </Text>
          <Text style={[styles.errorSubtext, { color: textSecondaryColor }]}>
            {errorSubtext}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Prepare display variables (ATOMIC JSX)
  const scriptureDisplay = dailyGift.scriptureText;
  const referenceDisplay = dailyGift.scriptureReference;
  const reflectionPromptDisplay = dailyGift.reflectionPrompt;
  const somaticPromptDisplay = dailyGift.somaticPrompt || 'Where in your body do you feel this scripture? What sensations arise?';
  const saveButtonText = isLoading ? 'Saving...' : 'Save Reflection';

  const hasWeeklyTheme = weeklyTheme !== null;
  const seasonDisplay = hasWeeklyTheme ? weeklyTheme.liturgicalSeason.toUpperCase() : '';
  const themeTitleDisplay = hasWeeklyTheme ? weeklyTheme.themeTitle : '';
  const themeDescriptionDisplay = hasWeeklyTheme ? weeklyTheme.themeDescription : '';
  
  const somaticExercise = weeklyTheme?.somaticExercise;
  const hasSomaticExercise = somaticExercise !== null && somaticExercise !== undefined;
  const exerciseTitleDisplay = somaticExercise?.title || '';
  const exerciseDescriptionDisplay = somaticExercise?.description || '';
  const invitationText = 'You are invited to practice with us this week';

  const completedTitle = 'Reflection Saved';
  const completedText = 'Your reflection has been saved. Return tomorrow for a new gift.';
  const reflectionTitle = 'Your Response';
  const reflectionSubtitle = 'Take your time. There\'s no rush.';
  const reflectionPlaceholder = 'Write, draw with words, or simply notice what arises...';
  const shareToggleLabel = 'Share to Community';
  const shareToggleDescription = 'Others can hold your reflection in prayer';
  const reflectionPromptTitle = 'Reflection Question';
  const somaticPromptTitle = 'Somatic Prompt';
  const somaticTitle = 'WEEKLY SOMATIC INVITATION';
  const beginButtonText = 'Begin Practice';
  const skipButtonText = 'Skip';
  const responseModeTitle = 'How would you like to respond?';
  const moodTagsTitle = 'How are you feeling?';
  const sensationTagsTitle = 'What do you notice in your body?';
  const moodTagsSubtitle = 'Select all that apply';
  const sensationTagsSubtitle = 'Select all that apply';

  const textModeLabel = 'Text';
  const artModeLabel = 'Art';
  const voiceModeLabel = 'Voice';

  const textModeActive = responseMode === 'text';
  const artModeActive = responseMode === 'art';
  const voiceModeActive = responseMode === 'voice';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Today\'s Gift',
          headerBackTitle: 'Home',
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
        {/* Weekly Theme Section */}
        {hasWeeklyTheme && (
          <View style={styles.themeSection}>
            <Text style={[styles.seasonLabel, { color: textSecondaryColor }]}>
              {seasonDisplay}
            </Text>
            
            <View style={styles.themeTitleContainer}>
              <IconSymbol 
                ios_icon_name="sparkles"
                android_material_icon_name="auto-awesome"
                size={20}
                color={colors.accent}
              />
              <Text style={[styles.themeTitle, { color: textColor }]}>
                {themeTitleDisplay}
              </Text>
              <IconSymbol 
                ios_icon_name="sparkles"
                android_material_icon_name="auto-awesome"
                size={20}
                color={colors.accent}
              />
            </View>
            
            <Text style={[styles.themeDescription, { color: textSecondaryColor }]}>
              {themeDescriptionDisplay}
            </Text>
          </View>
        )}

        {/* Weekly Somatic Exercise (Optional) */}
        {hasSomaticExercise && (
          <View style={[styles.somaticCard, { backgroundColor: cardBg }]}>
            <View style={styles.somaticHeader}>
              <IconSymbol 
                ios_icon_name="figure.mind.and.body"
                android_material_icon_name="self-improvement"
                size={28}
                color={colors.primary}
              />
              <View style={styles.somaticHeaderText}>
                <Text style={[styles.somaticTitle, { color: textColor }]}>
                  {somaticTitle}
                </Text>
                <Text style={[styles.somaticInvitation, { color: colors.primary }]}>
                  {invitationText}
                </Text>
              </View>
            </View>

            <Text style={[styles.exerciseTitle, { color: textColor }]}>
              {exerciseTitleDisplay}
            </Text>
            <Text style={[styles.exerciseDescription, { color: textSecondaryColor }]}>
              {exerciseDescriptionDisplay}
            </Text>

            <View style={styles.somaticButtons}>
              <TouchableOpacity 
                style={styles.beginButton}
                onPress={handleBeginPractice}
                activeOpacity={0.8}
              >
                <Text style={styles.beginButtonText}>
                  {beginButtonText}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={() => console.log('[DailyGift] User skipped somatic practice')}
                activeOpacity={0.8}
              >
                <Text style={[styles.skipButtonText, { color: textSecondaryColor }]}>
                  {skipButtonText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Scripture Card */}
        <View style={[styles.giftCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.scriptureText, { color: textColor }]}>
            {scriptureDisplay}
          </Text>
          
          <Text style={[styles.scriptureReference, { color: colors.primary }]}>
            {referenceDisplay}
          </Text>
        </View>

        {/* Reflection Prompt Card */}
        <View style={[styles.promptCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.promptTitle, { color: textColor }]}>
            {reflectionPromptTitle}
          </Text>
          <Text style={[styles.promptText, { color: textSecondaryColor }]}>
            {reflectionPromptDisplay}
          </Text>
        </View>

        {/* Somatic Prompt Card */}
        <View style={[styles.promptCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.promptTitle, { color: textColor }]}>
            {somaticPromptTitle}
          </Text>
          <Text style={[styles.promptText, { color: textSecondaryColor }]}>
            {somaticPromptDisplay}
          </Text>
        </View>

        {/* Response Section (if not yet reflected) */}
        {!dailyGift.hasReflected ? (
          <View style={[styles.reflectionCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.reflectionTitle, { color: textColor }]}>
              {reflectionTitle}
            </Text>
            <Text style={[styles.reflectionSubtitle, { color: textSecondaryColor }]}>
              {reflectionSubtitle}
            </Text>

            {/* Response Mode Selector */}
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {responseModeTitle}
            </Text>
            <View style={styles.responseModeButtons}>
              <TouchableOpacity 
                style={[
                  styles.modeButton, 
                  textModeActive && styles.modeButtonActive
                ]}
                onPress={() => {
                  console.log('[DailyGift] User selected text response mode');
                  setResponseMode('text');
                }}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  ios_icon_name="text.alignleft"
                  android_material_icon_name="text-fields"
                  size={24}
                  color={textModeActive ? colors.primary : textSecondaryColor}
                />
                <Text style={[
                  styles.modeButtonText, 
                  { color: textModeActive ? colors.primary : textSecondaryColor }
                ]}>
                  {textModeLabel}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.modeButton, 
                  artModeActive && styles.modeButtonActive
                ]}
                onPress={() => {
                  console.log('[DailyGift] User selected art response mode');
                  setResponseMode('art');
                  handleCreateArtwork();
                }}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  ios_icon_name="paintbrush"
                  android_material_icon_name="brush"
                  size={24}
                  color={artModeActive ? colors.primary : textSecondaryColor}
                />
                <Text style={[
                  styles.modeButtonText, 
                  { color: artModeActive ? colors.primary : textSecondaryColor }
                ]}>
                  {artModeLabel}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.modeButton, 
                  voiceModeActive && styles.modeButtonActive
                ]}
                onPress={() => {
                  console.log('[DailyGift] User selected voice response mode');
                  setResponseMode('voice');
                }}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  ios_icon_name="mic"
                  android_material_icon_name="mic"
                  size={24}
                  color={voiceModeActive ? colors.primary : textSecondaryColor}
                />
                <Text style={[
                  styles.modeButtonText, 
                  { color: voiceModeActive ? colors.primary : textSecondaryColor }
                ]}>
                  {voiceModeLabel}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Text Input (if text mode) */}
            {textModeActive && (
              <TextInput
                style={[styles.reflectionInput, { 
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  color: textColor 
                }]}
                placeholder={reflectionPlaceholder}
                placeholderTextColor={textSecondaryColor}
                value={reflectionText}
                onChangeText={setReflectionText}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
            )}

            {/* Voice Recording Placeholder (if voice mode) */}
            {voiceModeActive && (
              <View style={[styles.voicePlaceholder, { borderColor: inputBorder }]}>
                <IconSymbol 
                  ios_icon_name="mic.circle"
                  android_material_icon_name="mic"
                  size={48}
                  color={colors.primary}
                />
                <Text style={[styles.voicePlaceholderText, { color: textSecondaryColor }]}>
                  Voice recording coming soon
                </Text>
              </View>
            )}

            {/* Mood Tags */}
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {moodTagsTitle}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
              {moodTagsSubtitle}
            </Text>
            <View style={styles.tagsContainer}>
              {moodOptions.map((mood, index) => {
                const isSelected = selectedMoods.includes(mood);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.tag,
                      { borderColor: inputBorder },
                      isSelected && styles.tagSelected
                    ]}
                    onPress={() => toggleMood(mood)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.tagText,
                      { color: isSelected ? colors.primary : textSecondaryColor }
                    ]}>
                      {mood}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Body Sensation Tags */}
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {sensationTagsTitle}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: textSecondaryColor }]}>
              {sensationTagsSubtitle}
            </Text>
            <View style={styles.tagsContainer}>
              {sensationOptions.map((sensation, index) => {
                const isSelected = selectedSensations.includes(sensation);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.tag,
                      { borderColor: inputBorder },
                      isSelected && styles.tagSelected
                    ]}
                    onPress={() => toggleSensation(sensation)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.tagText,
                      { color: isSelected ? colors.primary : textSecondaryColor }
                    ]}>
                      {sensation}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Share Toggle */}
            <View style={styles.shareToggle}>
              <View style={styles.shareToggleText}>
                <Text style={[styles.shareToggleLabel, { color: textColor }]}>
                  {shareToggleLabel}
                </Text>
                <Text style={[styles.shareToggleDescription, { color: textSecondaryColor }]}>
                  {shareToggleDescription}
                </Text>
              </View>
              <Switch
                value={shareToComm}
                onValueChange={(value) => {
                  console.log('[DailyGift] User toggled share to community:', value);
                  setShareToComm(value);
                }}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={shareToComm ? colors.primary : colors.card}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity 
              style={[styles.saveButton, (!reflectionText.trim() || isLoading) && styles.saveButtonDisabled]}
              onPress={handleSaveReflection}
              disabled={!reflectionText.trim() || isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>
                {saveButtonText}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.completedCard, { backgroundColor: cardBg }]}>
            <IconSymbol 
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={48}
              color={colors.success}
            />
            <Text style={[styles.completedTitle, { color: textColor }]}>
              {completedTitle}
            </Text>
            <Text style={[styles.completedText, { color: textSecondaryColor }]}>
              {completedText}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.body,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: typography.body,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  themeSection: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  seasonLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  themeTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  themeTitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    textAlign: 'center',
  },
  themeDescription: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  somaticCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  somaticHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  somaticHeaderText: {
    flex: 1,
  },
  somaticTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
  },
  somaticInvitation: {
    fontSize: typography.bodySmall,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  exerciseTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
  },
  exerciseDescription: {
    fontSize: typography.body,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  somaticButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  beginButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    flex: 1,
  },
  beginButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  skipButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  skipButtonText: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  giftCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  scriptureText: {
    fontSize: typography.h3,
    fontWeight: typography.medium,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: spacing.md,
  },
  scriptureReference: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  promptCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  promptTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
  },
  promptText: {
    fontSize: typography.body,
    lineHeight: 24,
  },
  reflectionCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  reflectionTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
  },
  reflectionSubtitle: {
    fontSize: typography.bodySmall,
    fontStyle: 'italic',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionSubtitle: {
    fontSize: typography.bodySmall,
    marginBottom: spacing.sm,
  },
  responseModeButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  modeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  modeButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
  },
  reflectionInput: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    lineHeight: 22,
    minHeight: 150,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  voicePlaceholder: {
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  voicePlaceholderText: {
    fontSize: typography.body,
    textAlign: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tag: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  tagSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '15',
  },
  tagText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
  },
  shareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  shareToggleText: {
    flex: 1,
    marginRight: spacing.md,
  },
  shareToggleLabel: {
    fontSize: typography.body,
    fontWeight: typography.medium,
    marginBottom: spacing.xs,
  },
  shareToggleDescription: {
    fontSize: typography.bodySmall,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
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
