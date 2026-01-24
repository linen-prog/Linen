
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Switch, ActivityIndicator, Modal } from 'react-native';
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

interface WeeklyPracticeStatus {
  hasCompleted: boolean;
  exercise: SomaticExercise | null;
  weeklyTheme?: {
    id: string;
    themeTitle: string;
  };
}

export default function DailyGiftScreen() {
  console.log('User viewing Daily Gift screen');
  const router = useRouter();

  const [dailyGift, setDailyGift] = useState<DailyGift | null>(null);
  const [weeklyTheme, setWeeklyTheme] = useState<WeeklyTheme | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [shareToComm, setShareToComm] = useState(false);
  const [shareAnonymously, setShareAnonymously] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGift, setIsLoadingGift] = useState(true);

  // Weekly practice invitation state
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [hasCompletedPractice, setHasCompletedPractice] = useState(false);
  const [hasSeenInvitation, setHasSeenInvitation] = useState(false);

  // Category for sharing to community
  const [shareCategory, setShareCategory] = useState<'feed' | 'wisdom' | 'care' | 'prayers'>('feed');

  // Mood and body sensation tags
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedSensations, setSelectedSensations] = useState<string[]>([]);

  const moodOptions = ['peaceful', 'anxious', 'grateful', 'heavy', 'joyful', 'hopeful', 'uncertain', 'weary'];
  const sensationOptions = ['tense', 'grounded', 'restless', 'calm', 'energized', 'tired', 'open', 'constricted'];

  useEffect(() => {
    const loadDailyGift = async () => {
      try {
        console.log('[DailyGift] Loading daily gift...');
        const response = await authenticatedGet<DailyGift>('/api/daily-gift/today');
        
        console.log('[DailyGift] Daily gift loaded:', response);
        setDailyGift(response);
        setWeeklyTheme(response.weeklyTheme);
        setIsLoadingGift(false);

        // Check weekly practice completion status
        if (response.weeklyTheme?.somaticExercise) {
          await checkWeeklyPracticeStatus();
        }
      } catch (error) {
        console.error('[DailyGift] Failed to load daily gift:', error);
        setIsLoadingGift(false);
      }
    };

    loadDailyGift();
  }, []);

  const checkWeeklyPracticeStatus = async () => {
    try {
      console.log('[DailyGift] Checking weekly practice completion status...');
      const response = await authenticatedGet<WeeklyPracticeStatus>('/api/weekly-practice/current');
      
      console.log('[DailyGift] Weekly practice status:', response);
      setHasCompletedPractice(response.hasCompleted);

      // Show invitation modal if not completed and not seen yet
      if (!response.hasCompleted && !hasSeenInvitation && response.exercise) {
        console.log('[DailyGift] Showing weekly practice invitation modal');
        setShowInvitationModal(true);
      }
    } catch (error) {
      console.error('[DailyGift] Failed to check weekly practice status:', error);
    }
  };

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
      shareAnonymously,
      selectedMoods,
      selectedSensations 
    });
    setIsLoading(true);

    try {
      const response = await authenticatedPost<{ reflectionId: string }>('/api/daily-gift/reflect', {
        dailyGiftId: dailyGift.id,
        reflectionText: reflectionText.trim(),
        shareToComm,
        category: shareCategory,
        isAnonymous: shareAnonymously,
        responseMode: 'text',
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
      setShowInvitationModal(false);
      setHasSeenInvitation(true);
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

  const handleMaybeLater = () => {
    console.log('[DailyGift] User skipped weekly practice invitation');
    setShowInvitationModal(false);
    setHasSeenInvitation(true);
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
            title: '',
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
            title: '',
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
  const saveButtonText = isLoading ? 'Saving...' : 'Save';

  const hasWeeklyTheme = weeklyTheme !== null;
  const themeTitleDisplay = hasWeeklyTheme ? weeklyTheme.themeTitle : '';
  const themeDescriptionDisplay = hasWeeklyTheme ? weeklyTheme.themeDescription : '';
  
  const somaticExercise = weeklyTheme?.somaticExercise;
  const hasSomaticExercise = somaticExercise !== null && somaticExercise !== undefined;
  const exerciseTitleDisplay = somaticExercise?.title || '';
  const exerciseDescriptionDisplay = somaticExercise?.description || '';

  const completedTitle = 'Reflection Saved';
  const completedText = 'Your reflection has been saved. Return tomorrow for a new gift.';
  const reflectionTitle = 'Your Reflection';
  const reflectionPlaceholder = 'Write openly in your own words today...';
  const shareToggleLabel = 'Share with community';
  const moodTagsTitle = 'How are you feeling?';
  const sensationTagsTitle = 'How is your body?';
  const moodTagsSubtitle = 'Optional';
  const sensationTagsSubtitle = 'Optional';

  const beginButtonText = 'Begin Practice';
  const skipButtonText = 'Skip';

  // Invitation modal text
  const modalTitle = 'This Week\'s Practice';
  const modalInvitation = 'This week\'s theme invites you to try...';
  const modalBeginButton = 'Begin Practice';
  const modalLaterButton = 'Maybe Later';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: '',
          headerBackTitle: 'Home',
          headerStyle: {
            backgroundColor: bgColor,
          },
          headerTintColor: colors.primary,
        }}
      />

      {/* Weekly Practice Invitation Modal */}
      <Modal
        visible={showInvitationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleMaybeLater}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <IconSymbol 
                ios_icon_name="figure.mind.and.body"
                android_material_icon_name="self-improvement"
                size={48}
                color={colors.primary}
              />
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {modalTitle}
              </Text>
            </View>

            <Text style={[styles.modalInvitation, { color: textSecondaryColor }]}>
              {modalInvitation}
            </Text>

            <View style={styles.modalExerciseInfo}>
              <Text style={[styles.modalExerciseTitle, { color: textColor }]}>
                {exerciseTitleDisplay}
              </Text>
              <Text style={[styles.modalExerciseDescription, { color: textSecondaryColor }]}>
                {exerciseDescriptionDisplay}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalBeginButton}
                onPress={handleBeginPractice}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBeginButtonText}>
                  {modalBeginButton}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalLaterButton}
                onPress={handleMaybeLater}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalLaterButtonText, { color: textSecondaryColor }]}>
                  {modalLaterButton}
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
        {/* Simple Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.titleIconRow}>
            <IconSymbol 
              ios_icon_name="sparkles"
              android_material_icon_name="auto-awesome"
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.pageTitle, { color: textColor }]}>
              {themeTitleDisplay}
            </Text>
            <IconSymbol 
              ios_icon_name="sparkles"
              android_material_icon_name="auto-awesome"
              size={16}
              color={colors.primary}
            />
          </View>
          
          <Text style={[styles.pageSubtitle, { color: textSecondaryColor }]}>
            {themeDescriptionDisplay}
          </Text>
        </View>

        {/* Weekly Somatic Invitation Card (Simple) */}
        {hasSomaticExercise && (
          <View style={[styles.somaticCard, { backgroundColor: cardBg }]}>
            <View style={styles.somaticHeader}>
              <IconSymbol 
                ios_icon_name="figure.mind.and.body"
                android_material_icon_name="self-improvement"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.somaticLabel, { color: textColor }]}>
                WEEKLY SOMATIC INVITATION
              </Text>
            </View>

            <Text style={[styles.somaticTitle, { color: textColor }]}>
              {exerciseTitleDisplay}
            </Text>
            
            <Text style={[styles.somaticDescription, { color: textSecondaryColor }]}>
              {exerciseDescriptionDisplay}
            </Text>

            {!hasCompletedPractice && (
              <TouchableOpacity 
                style={styles.beginButton}
                onPress={handleBeginPractice}
                activeOpacity={0.8}
              >
                <Text style={styles.beginButtonText}>
                  {beginButtonText}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Scripture Section (Simple) */}
        <View style={styles.scriptureSection}>
          <Text style={[styles.scriptureReference, { color: colors.primary }]}>
            {referenceDisplay}
          </Text>
          
          <Text style={[styles.scriptureText, { color: textColor }]}>
            {scriptureDisplay}
          </Text>
          
          <Text style={[styles.reflectionPrompt, { color: textSecondaryColor }]}>
            {reflectionPromptDisplay}
          </Text>
        </View>

        {/* Response Section (Keep existing formatting) */}
        {!dailyGift.hasReflected ? (
          <View style={[styles.reflectionCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.reflectionTitle, { color: textColor }]}>
              {reflectionTitle}
            </Text>

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

            {/* Text Input */}
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
              numberOfLines={6}
              textAlignVertical="top"
            />

            {/* Share Toggle */}
            <TouchableOpacity 
              style={styles.shareToggle}
              onPress={() => {
                console.log('[DailyGift] User toggled share to community:', !shareToComm);
                setShareToComm(!shareToComm);
              }}
              activeOpacity={0.7}
            >
              <IconSymbol 
                ios_icon_name={shareToComm ? 'checkmark.square.fill' : 'square'}
                android_material_icon_name={shareToComm ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.shareToggleLabel, { color: textColor }]}>
                {shareToggleLabel}
              </Text>
            </TouchableOpacity>

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
    paddingVertical: spacing.xl,
    gap: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },
  
  // Simple Title Section
  titleSection: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '300',
    lineHeight: 20,
  },

  // Simple Somatic Card
  somaticCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 1,
  },
  somaticHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  somaticLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  somaticTitle: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  somaticDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '300',
  },
  beginButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  beginButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Simple Scripture Section
  scriptureSection: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  scriptureReference: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  scriptureText: {
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  reflectionPrompt: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
    fontWeight: '300',
  },

  // Reflection Card (Keep existing formatting)
  reflectionCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 1,
  },
  reflectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tag: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  tagSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '15',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '400',
  },
  reflectionInput: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 120,
    borderWidth: 1,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  shareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  shareToggleLabel: {
    fontSize: 14,
    fontWeight: '400',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completedCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 1,
  },
  completedTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
  },
  completedText: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
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
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  modalInvitation: {
    fontSize: typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  modalExerciseInfo: {
    marginBottom: spacing.xl,
  },
  modalExerciseTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalExerciseDescription: {
    fontSize: typography.body,
    lineHeight: 24,
    textAlign: 'center',
  },
  modalButtons: {
    gap: spacing.md,
  },
  modalBeginButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
  },
  modalBeginButtonText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  modalLaterButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalLaterButtonText: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
});
