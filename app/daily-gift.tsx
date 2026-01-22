
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, useColorScheme, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface WeeklyTheme {
  id: string;
  weekStartDate: string;
  liturgicalSeason: string;
  themeTitle: string;
  themeDescription: string;
  somaticExercise: {
    id: string;
    title: string;
    description: string;
    category: string;
    duration: string;
    instructions: string;
  } | null;
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

  const [scriptureText, setScriptureText] = useState('');
  const [scriptureReference, setScriptureReference] = useState('');
  const [reflectionPrompt, setReflectionPrompt] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  const [shareToComm, setShareToComm] = useState(false);
  const [hasReflected, setHasReflected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dailyGiftId, setDailyGiftId] = useState<string | null>(null);

  const [weeklyTheme, setWeeklyTheme] = useState<WeeklyTheme | null>(null);
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [isLoadingTheme, setIsLoadingTheme] = useState(true);
  const [isLoadingArtwork, setIsLoadingArtwork] = useState(true);

  useEffect(() => {
    const loadDailyGift = async () => {
      try {
        const { authenticatedGet } = await import('@/utils/api');
        const response = await authenticatedGet<{
          id: string;
          date: string;
          scriptureText: string;
          scriptureReference: string;
          reflectionPrompt: string;
          hasReflected: boolean;
        }>('/api/daily-gift/today');
        
        console.log('Daily gift loaded:', response);
        setDailyGiftId(response.id);
        setScriptureText(response.scriptureText);
        setScriptureReference(response.scriptureReference);
        setReflectionPrompt(response.reflectionPrompt);
        setHasReflected(response.hasReflected);
      } catch (error) {
        console.error('Failed to load daily gift:', error);
        setScriptureText('Be still, and know that I am God.');
        setScriptureReference('Psalm 46:10');
        setReflectionPrompt('Where in your body do you feel stillness today? What does it feel like to simply be, without doing?');
        setHasReflected(false);
      }
    };

    loadDailyGift();
  }, []);

  useEffect(() => {
    const loadWeeklyTheme = async () => {
      try {
        const { authenticatedGet } = await import('@/utils/api');
        const response = await authenticatedGet<WeeklyTheme>('/api/weekly-theme/current');
        
        console.log('Weekly theme loaded:', response);
        setWeeklyTheme(response);
        setIsLoadingTheme(false);
      } catch (error) {
        console.error('Failed to load weekly theme:', error);
        setIsLoadingTheme(false);
      }
    };

    loadWeeklyTheme();
  }, []);

  useEffect(() => {
    const loadArtwork = async () => {
      try {
        const { authenticatedGet } = await import('@/utils/api');
        const response = await authenticatedGet<Artwork | null>('/api/artwork/current');
        
        console.log('Artwork loaded:', response);
        setArtwork(response);
        setIsLoadingArtwork(false);
      } catch (error) {
        console.error('Failed to load artwork:', error);
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
    if (!reflectionText.trim()) {
      return;
    }

    console.log('User saving reflection', { reflectionText, shareToComm });
    setIsLoading(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ reflectionId: string }>('/api/daily-gift/reflect', {
        dailyGiftId,
        reflectionText: reflectionText.trim(),
        shareToComm,
      });
      
      console.log('Reflection saved successfully:', response);
      setIsLoading(false);
      setHasReflected(true);
    } catch (error) {
      console.error('Failed to save reflection:', error);
      setIsLoading(false);
    }
  };

  const handleBeginPractice = () => {
    console.log('User tapped Begin Practice for somatic exercise');
    if (weeklyTheme?.somaticExercise) {
      router.push({
        pathname: '/somatic-practice',
        params: {
          exerciseId: weeklyTheme.somaticExercise.id,
          title: weeklyTheme.somaticExercise.title,
          description: weeklyTheme.somaticExercise.description,
          duration: weeklyTheme.somaticExercise.duration,
          instructions: weeklyTheme.somaticExercise.instructions,
        },
      });
    }
  };

  const handleSkipPractice = () => {
    console.log('User tapped Skip for somatic exercise');
  };

  const handleCreateArtwork = () => {
    console.log('User tapped Create Artwork');
    router.push('/artwork-canvas');
  };

  const scriptureDisplay = scriptureText;
  const referenceDisplay = scriptureReference;
  const promptDisplay = reflectionPrompt;
  const saveButtonText = isLoading ? 'Saving...' : 'Save Reflection';

  const seasonDisplay = weeklyTheme?.liturgicalSeason.toUpperCase() || '';
  const themeTitleDisplay = weeklyTheme?.themeTitle || '';
  const themeDescriptionDisplay = weeklyTheme?.themeDescription || '';
  const exerciseTitleDisplay = weeklyTheme?.somaticExercise?.title || '';
  const exerciseDescriptionDisplay = weeklyTheme?.somaticExercise?.description || '';
  const invitationText = 'You are invited to practice with us this week';

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
        {isLoadingTheme ? (
          <View style={[styles.loadingCard, { backgroundColor: cardBg }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : weeklyTheme ? (
          <View style={styles.themeSection}>
            <Text style={[styles.seasonLabel, { color: textSecondaryColor }]}>
              {seasonDisplay}
            </Text>
            
            <View style={styles.themeTitleContainer}>
              <IconSymbol 
                ios_icon_name="sparkles"
                android_material_icon_name="auto-awesome"
                size={24}
                color={colors.accent}
              />
              <Text style={[styles.themeTitle, { color: textColor }]}>
                {themeTitleDisplay}
              </Text>
              <IconSymbol 
                ios_icon_name="sparkles"
                android_material_icon_name="auto-awesome"
                size={24}
                color={colors.accent}
              />
            </View>
            
            <Text style={[styles.themeDescription, { color: textSecondaryColor }]}>
              {themeDescriptionDisplay}
            </Text>
          </View>
        ) : null}

        <View style={[styles.giftCard, { backgroundColor: cardBg }]}>
          <View style={styles.giftIcon}>
            <IconSymbol 
              ios_icon_name="gift.fill"
              android_material_icon_name="card-giftcard"
              size={48}
              color={colors.accent}
            />
          </View>
          
          <Text style={[styles.scriptureText, { color: textColor }]}>
            {scriptureDisplay}
          </Text>
          
          <Text style={[styles.scriptureReference, { color: colors.primary }]}>
            {referenceDisplay}
          </Text>
        </View>

        {weeklyTheme?.somaticExercise && (
          <View style={[styles.somaticCard, { backgroundColor: cardBg }]}>
            <View style={styles.somaticHeader}>
              <IconSymbol 
                ios_icon_name="figure.mind.and.body"
                android_material_icon_name="self-improvement"
                size={32}
                color={colors.primary}
              />
              <View style={styles.somaticHeaderText}>
                <Text style={[styles.somaticTitle, { color: textColor }]}>
                  WEEKLY SOMATIC INVITATION
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
                  Begin Practice
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={handleSkipPractice}
                activeOpacity={0.8}
              >
                <Text style={[styles.skipButtonText, { color: textSecondaryColor }]}>
                  Skip
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={[styles.artworkCard, { backgroundColor: cardBg }]}>
          <View style={styles.artworkHeader}>
            <IconSymbol 
              ios_icon_name="paintbrush.fill"
              android_material_icon_name="brush"
              size={28}
              color={colors.accent}
            />
            <Text style={[styles.artworkTitle, { color: textColor }]}>
              CREATIVE EXPRESSION
            </Text>
          </View>
          
          {isLoadingArtwork ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.artworkLoader} />
          ) : artwork ? (
            <View style={styles.artworkPreview}>
              <Text style={[styles.artworkSavedText, { color: textSecondaryColor }]}>
                You have created artwork for this week
              </Text>
              <TouchableOpacity 
                style={styles.viewArtworkButton}
                onPress={handleCreateArtwork}
                activeOpacity={0.8}
              >
                <Text style={[styles.viewArtworkButtonText, { color: colors.primary }]}>
                  View & Edit
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.artworkEmpty}>
              <Text style={[styles.artworkEmptyText, { color: textSecondaryColor }]}>
                Express this week&apos;s theme through art, color, or form
              </Text>
              <TouchableOpacity 
                style={styles.createArtworkButton}
                onPress={handleCreateArtwork}
                activeOpacity={0.8}
              >
                <Text style={styles.createArtworkButtonText}>
                  Create Artwork
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.promptCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.promptTitle, { color: textColor }]}>
            Reflection Prompt
          </Text>
          <Text style={[styles.promptText, { color: textSecondaryColor }]}>
            {promptDisplay}
          </Text>
        </View>

        {!hasReflected ? (
          <View style={[styles.reflectionCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.reflectionTitle, { color: textColor }]}>
              Your Reflection
            </Text>
            <Text style={[styles.reflectionSubtitle, { color: textSecondaryColor }]}>
              Take your time. There&apos;s no rush.
            </Text>
            
            <TextInput
              style={[styles.reflectionInput, { 
                backgroundColor: inputBg,
                borderColor: inputBorder,
                color: textColor 
              }]}
              placeholder="Write, draw with words, or simply notice what arises..."
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
                  Share to Community
                </Text>
                <Text style={[styles.shareToggleDescription, { color: textSecondaryColor }]}>
                  Others can hold your reflection in prayer
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
              Reflection Saved
            </Text>
            <Text style={[styles.completedText, { color: textSecondaryColor }]}>
              Your reflection has been saved. Return tomorrow for a new gift.
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
  loadingCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  themeSection: {
    alignItems: 'center',
    marginBottom: spacing.md,
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
  giftCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  giftIcon: {
    marginBottom: spacing.lg,
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
  artworkCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  artworkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  artworkTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    letterSpacing: 1.2,
  },
  artworkLoader: {
    marginVertical: spacing.md,
  },
  artworkPreview: {
    alignItems: 'center',
  },
  artworkSavedText: {
    fontSize: typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  viewArtworkButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  viewArtworkButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  artworkEmpty: {
    alignItems: 'center',
  },
  artworkEmptyText: {
    fontSize: typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  createArtworkButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  createArtworkButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
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
