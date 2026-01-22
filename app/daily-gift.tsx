
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, useColorScheme, Switch, ActivityIndicator } from 'react-native';
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

interface Artwork {
  id: string;
  artworkData: string;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export default function DailyGiftScreen() {
  console.log('User viewing Daily Gift screen');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [dailyGift, setDailyGift] = useState<DailyGift | null>(null);
  const [weeklyTheme, setWeeklyTheme] = useState<WeeklyTheme | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [shareToComm, setShareToComm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGift, setIsLoadingGift] = useState(true);
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [isLoadingArtwork, setIsLoadingArtwork] = useState(true);

  useEffect(() => {
    const loadDailyGift = async () => {
      try {
        console.log('[DailyGift] Loading daily gift...');
        const response = await authenticatedGet<DailyGift>('/api/daily-gift/today');
        
        console.log('[DailyGift] Daily gift loaded:', response);
        setDailyGift(response);
        setIsLoadingGift(false);
      } catch (error) {
        console.error('[DailyGift] Failed to load daily gift:', error);
        setIsLoadingGift(false);
      }
    };

    loadDailyGift();
  }, []);

  useEffect(() => {
    const loadWeeklyTheme = async () => {
      try {
        console.log('[DailyGift] Loading weekly theme...');
        const response = await authenticatedGet<WeeklyTheme>('/api/weekly-theme/current');
        
        console.log('[DailyGift] Weekly theme loaded:', response);
        setWeeklyTheme(response);
        setIsLoadingTheme(false);
      } catch (error) {
        console.error('[DailyGift] Failed to load weekly theme:', error);
        setIsLoadingTheme(false);
      }
    };

    loadWeeklyTheme();
  }, []);

  useEffect(() => {
    const loadArtwork = async () => {
      try {
        console.log('[DailyGift] Loading artwork...');
        const response = await authenticatedGet<Artwork | null>('/api/artwork/current');
        
        console.log('[DailyGift] Artwork loaded:', response);
        setArtwork(response);
        setIsLoadingArtwork(false);
      } catch (error) {
        console.error('[DailyGift] Failed to load artwork:', error);
        setIsLoadingArtwork(false);
      }
    };

    loadArtwork();
  }, []);

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const inputBg = isDark ? colors.cardDark : colors.card;
  const inputBorder = isDark ? colors.borderDark : colors.border;

  const handleSaveReflection = async () => {
    if (!reflectionText.trim() || !dailyGift || !dailyGift.id) {
      console.log('[DailyGift] Cannot save reflection - missing data');
      return;
    }

    console.log('[DailyGift] User saving reflection', { reflectionText, shareToComm });
    setIsLoading(true);

    try {
      const response = await authenticatedPost<{ reflectionId: string }>('/api/daily-gift/reflect', {
        dailyGiftId: dailyGift.id,
        reflectionText: reflectionText.trim(),
        shareToComm,
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

  const handleSkipPractice = () => {
    console.log('[DailyGift] User tapped Skip for somatic exercise');
  };

  const handleCreateArtwork = () => {
    console.log('[DailyGift] User tapped Create Artwork');
    router.push('/artwork-canvas');
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

  const scriptureDisplay = dailyGift.scriptureText;
  const referenceDisplay = dailyGift.scriptureReference;
  const promptDisplay = dailyGift.reflectionPrompt;
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
  const reflectionTitle = 'Your Reflection';
  const reflectionSubtitle = 'Take your time. There\'s no rush.';
  const reflectionPlaceholder = 'Write, draw with words, or simply notice what arises...';
  const shareToggleLabel = 'Share to Community';
  const shareToggleDescription = 'Others can hold your reflection in prayer';
  const promptTitle = 'Reflection Prompt';
  const somaticTitle = 'WEEKLY SOMATIC INVITATION';
  const beginButtonText = 'Begin Practice';
  const skipButtonText = 'Skip';

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

        {!isLoadingTheme && hasSomaticExercise && (
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
                onPress={handleSkipPractice}
                activeOpacity={0.8}
              >
                <Text style={[styles.skipButtonText, { color: textSecondaryColor }]}>
                  {skipButtonText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={[styles.giftCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.scriptureText, { color: textColor }]}>
            {scriptureDisplay}
          </Text>
          
          <Text style={[styles.scriptureReference, { color: colors.primary }]}>
            {referenceDisplay}
          </Text>
        </View>

        <View style={[styles.promptCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.promptTitle, { color: textColor }]}>
            {promptTitle}
          </Text>
          <Text style={[styles.promptText, { color: textSecondaryColor }]}>
            {promptDisplay}
          </Text>
        </View>

        {!dailyGift.hasReflected ? (
          <View style={[styles.reflectionCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.reflectionTitle, { color: textColor }]}>
              {reflectionTitle}
            </Text>
            <Text style={[styles.reflectionSubtitle, { color: textSecondaryColor }]}>
              {reflectionSubtitle}
            </Text>
            
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
                onValueChange={setShareToComm}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={shareToComm ? colors.primary : colors.card}
              />
            </View>

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
    marginBottom: spacing.md,
  },
  reflectionInput: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    lineHeight: 22,
    minHeight: 150,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  shareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
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
