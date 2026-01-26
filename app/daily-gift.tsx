
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Switch, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';

interface WeeklyTheme {
  id: string;
  weekStartDate: string;
  liturgicalSeason: string;
  themeTitle: string;
  themeDescription: string;
  somaticExercise: SomaticExercise | null;
}

interface DailyContent {
  id: string;
  dayOfWeek: number;
  dayTitle?: string;
  scriptureReference: string;
  scriptureText: string;
  reflectionQuestion: string;
  somaticPrompt?: string | null;
}

interface DailyGiftResponse {
  weeklyTheme: {
    id: string;
    weekStartDate: string;
    liturgicalSeason: string;
    themeTitle: string;
    themeDescription: string;
    featuredExerciseId: string | null;
    reflectionPrompt: string | null;
    somaticExercise: SomaticExercise | null;
  };
  dailyContent: DailyContent | null;
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

interface GlitterParticle {
  id: number;
  angle: number;
  distance: number;
  delay: number;
  color: string;
}

export default function DailyGiftScreen() {
  console.log('User viewing Daily Gift screen');
  const router = useRouter();

  const [dailyGiftResponse, setDailyGiftResponse] = useState<DailyGiftResponse | null>(null);
  const [hasReflected, setHasReflected] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [shareToComm, setShareToComm] = useState(false);
  const [shareAnonymously, setShareAnonymously] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGift, setIsLoadingGift] = useState(true);

  const [isGiftOpened, setIsGiftOpened] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  const [hasCompletedPractice, setHasCompletedPractice] = useState(false);
  const [hasSkippedPractice, setHasSkippedPractice] = useState(false);

  const [hasSkippedSomaticPrompt, setHasSkippedSomaticPrompt] = useState(false);

  const [shareCategory, setShareCategory] = useState<'feed' | 'wisdom' | 'care' | 'prayers'>('feed');

  const [responseMode, setResponseMode] = useState<'text' | 'create' | 'voice'>('text');

  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedSensations, setSelectedSensations] = useState<string[]>([]);

  const moodOptions = ['peaceful', 'anxious', 'grateful', 'heavy', 'joyful', 'hopeful', 'uncertain', 'weary'];
  const sensationOptions = ['tense', 'grounded', 'restless', 'calm', 'energized', 'tired', 'open', 'constricted'];

  const glitterParticles: GlitterParticle[] = Array.from({ length: 30 }, (_, index) => ({
    id: index,
    angle: (index / 30) * Math.PI * 2,
    distance: 80 + Math.random() * 60,
    delay: Math.random() * 100,
    color: index % 3 === 0 ? colors.accent : index % 3 === 1 ? colors.primary : colors.prayer,
  }));

  useEffect(() => {
    const loadDailyGift = async () => {
      try {
        console.log('[DailyGift] Loading daily gift from /api/weekly-theme/current...');
        const response = await authenticatedGet<DailyGiftResponse>('/api/weekly-theme/current');
        
        console.log('[DailyGift] Daily gift loaded successfully:', {
          themeTitle: response.weeklyTheme.themeTitle,
          liturgicalSeason: response.weeklyTheme.liturgicalSeason,
          themeDescription: response.weeklyTheme.themeDescription,
          weekStartDate: response.weeklyTheme.weekStartDate,
          hasSomaticExercise: !!response.weeklyTheme.somaticExercise,
          somaticExerciseTitle: response.weeklyTheme.somaticExercise?.title,
          featuredExerciseId: response.weeklyTheme.featuredExerciseId,
          hasDailyContent: !!response.dailyContent,
          dayOfWeek: response.dailyContent?.dayOfWeek,
        });
        
        if (!response.weeklyTheme.somaticExercise) {
          console.warn('[DailyGift] ⚠️ WARNING: No somatic exercise returned from backend!', {
            featuredExerciseId: response.weeklyTheme.featuredExerciseId,
            themeId: response.weeklyTheme.id,
          });
        }
        
        setDailyGiftResponse(response);
        setIsLoadingGift(false);

        if (response.dailyContent) {
          await checkReflectionStatus(response.dailyContent.id);
        }

        if (response.weeklyTheme.somaticExercise) {
          await checkWeeklyPracticeStatus();
        }
      } catch (error) {
        console.error('[DailyGift] Failed to load daily gift:', error);
        console.error('[DailyGift] Error details:', error);
        setIsLoadingGift(false);
      }
    };

    loadDailyGift();
  }, []);

  const checkReflectionStatus = async (dailyContentId: string) => {
    try {
      console.log('[DailyGift] Checking if user has reflected today for dailyContentId:', dailyContentId);
      const response = await authenticatedGet<any[]>('/api/daily-gift/my-reflections');
      
      const todayReflection = response.find(
        (r: any) => r.dailyGiftId === dailyContentId
      );
      
      console.log('[DailyGift] Reflection status:', { 
        hasReflected: !!todayReflection, 
        totalReflections: response.length,
        lookingFor: dailyContentId 
      });
      setHasReflected(!!todayReflection);
    } catch (error) {
      console.error('[DailyGift] Failed to check reflection status:', error);
      setHasReflected(false);
    }
  };

  const checkWeeklyPracticeStatus = async () => {
    try {
      console.log('[DailyGift] Checking weekly practice completion status...');
      const response = await authenticatedGet<WeeklyPracticeStatus>('/api/weekly-practice/check-completion');
      
      console.log('[DailyGift] Weekly practice status:', response);
      setHasCompletedPractice(response.hasCompleted);
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

  const handleOpenGift = () => {
    if (isOpening) {
      console.log('[DailyGift] Already opening, ignoring tap');
      return;
    }

    console.log('[DailyGift] User tapped gift box - starting glitter animation');
    setIsOpening(true);

    setTimeout(() => {
      console.log('[DailyGift] Animation complete - revealing content');
      setIsGiftOpened(true);
      setIsOpening(false);
    }, 1200);
  };

  const handleSaveReflection = async () => {
    if (!reflectionText.trim() || !dailyGiftResponse || !dailyGiftResponse.dailyContent) {
      console.log('[DailyGift] Cannot save reflection - missing data');
      return;
    }

    console.log('[DailyGift] User saving reflection', { 
      reflectionText, 
      shareToComm,
      shareAnonymously,
      responseMode,
      selectedMoods,
      selectedSensations 
    });
    setIsLoading(true);

    try {
      const response = await authenticatedPost<{ reflectionId: string; postId?: string }>('/api/daily-gift/reflect', {
        dailyGiftId: dailyGiftResponse.dailyContent.id,
        reflectionText: reflectionText.trim(),
        shareToComm,
        category: shareCategory,
        isAnonymous: shareAnonymously,
      });
      
      console.log('[DailyGift] Reflection saved successfully:', response);
      setIsLoading(false);
      setHasReflected(true);
    } catch (error) {
      console.error('[DailyGift] Failed to save reflection:', error);
      setIsLoading(false);
      alert('Failed to save reflection. Please try again.');
    }
  };

  const handleBeginPractice = () => {
    console.log('[DailyGift] User tapped Begin Practice for somatic exercise');
    const somaticExercise = dailyGiftResponse?.weeklyTheme.somaticExercise;
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
    console.log('[DailyGift] User skipped weekly practice invitation');
    setHasSkippedPractice(true);
  };

  const handleTrySomaticPrompt = () => {
    console.log('[DailyGift] User tapped Try for somatic prompt');
    setHasSkippedSomaticPrompt(true);
  };

  const handleSkipSomaticPrompt = () => {
    console.log('[DailyGift] User skipped somatic prompt');
    setHasSkippedSomaticPrompt(true);
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

  const handleResponseModeSelect = (mode: 'text' | 'create' | 'voice') => {
    console.log('[DailyGift] User selected response mode:', mode);
    setResponseMode(mode);
    
    if (mode === 'create') {
      router.push('/artwork-canvas');
    }
    
    if (mode === 'voice') {
      console.log('[DailyGift] Voice recording not yet implemented');
    }
  };

  const handleCommunityPress = () => {
    console.log('[DailyGift] User tapped Community icon');
    router.push('/(tabs)/community');
  };

  if (isLoadingGift) {
    const loadingMessage = 'Loading today\'s gift...';
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen 
          options={{
            headerShown: false,
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

  if (!dailyGiftResponse || !dailyGiftResponse.dailyContent) {
    const errorTitle = 'Unable to load today\'s gift';
    const errorSubtext = 'The daily gift is being prepared. Please try again in a moment.';
    const retryButtonText = 'Try Again';
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen 
          options={{
            headerShown: false,
          }}
        />
        
        <View style={[styles.header, { backgroundColor: bgColor }]}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <IconSymbol 
              ios_icon_name="arrow.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={textColor}
            />
          </TouchableOpacity>
          <View style={styles.headerRight} />
        </View>
        
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
          
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              console.log('[DailyGift] User tapped retry button');
              setIsLoadingGift(true);
              router.back();
              setTimeout(() => {
                router.push('/daily-gift');
              }, 100);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>
              {retryButtonText}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const dailyContent = dailyGiftResponse.dailyContent;
  const scriptureDisplay = dailyContent.scriptureText;
  const referenceDisplay = dailyContent.scriptureReference;
  const reflectionPromptDisplay = dailyContent.reflectionQuestion;
  const saveButtonText = isLoading ? 'Saving...' : 'Save';

  const liturgicalSeasonDisplay = dailyGiftResponse.weeklyTheme.liturgicalSeason.toUpperCase();
  const themeTitleDisplay = dailyGiftResponse.weeklyTheme.themeTitle;
  const themeDescriptionDisplay = dailyGiftResponse.weeklyTheme.themeDescription;
  
  const somaticExercise = dailyGiftResponse.weeklyTheme.somaticExercise;
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
  const responseModeTitle = 'How would you like to respond?';

  const beginButtonText = 'Begin Practice';
  const skipButtonText = 'Skip';

  const giftTitleText = 'Your Daily Gift';
  const giftSubtitleText = 'A word for your heart today';
  const tapText = 'Tap to open';

  const invitationLabel = 'WEEKLY SOMATIC INVITATION';
  const invitationText = 'You are invited to practice';

  const somaticPromptDisplay = dailyContent.somaticPrompt || '';
  const hasSomaticPrompt = !!dailyContent.somaticPrompt;
  const tryButtonText = 'Try';

  const dayTitles = ['Rest', 'Beginnings', 'Presence', 'Gratitude', 'Compassion', 'Joy', 'Sabbath'];
  const dayTitleDisplay = dailyContent.dayTitle || dayTitles[dailyContent.dayOfWeek] || 'Reflection';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />

      <View style={[styles.header, { backgroundColor: bgColor }]}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <IconSymbol 
            ios_icon_name="arrow.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={textColor}
          />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={handleCommunityPress}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <IconSymbol 
              ios_icon_name="person.2"
              android_material_icon_name="group"
              size={24}
              color={textColor}
            />
          </TouchableOpacity>
        </View>
      </View>

      {!isGiftOpened ? (
        <View style={styles.unopenedContainer}>
          <Text style={[styles.giftTitle, { color: textColor }]}>
            {giftTitleText}
          </Text>
          
          <Text style={[styles.giftSubtitle, { color: textSecondaryColor }]}>
            {giftSubtitleText}
          </Text>

          <View style={styles.giftBoxContainer}>
            <TouchableOpacity 
              style={[styles.giftBox, { backgroundColor: colors.primary }]}
              onPress={handleOpenGift}
              activeOpacity={0.8}
              disabled={isOpening}
            >
              <IconSymbol 
                ios_icon_name="gift.fill"
                android_material_icon_name="card-giftcard"
                size={80}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {isOpening && glitterParticles.map((particle) => (
              <GlitterParticle
                key={particle.id}
                angle={particle.angle}
                distance={particle.distance}
                delay={particle.delay}
                color={particle.color}
              />
            ))}
          </View>

          <Text style={[styles.tapText, { color: textSecondaryColor }]}>
            {tapText}
          </Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.themeSection}>
            <Text style={[styles.liturgicalSeason, { color: textSecondaryColor }]}>
              {liturgicalSeasonDisplay}
            </Text>
            
            <View style={styles.themeTitleRow}>
              <Text style={[styles.diamond, { color: colors.primary }]}>
                ◆
              </Text>
              <Text style={[styles.themeTitle, { color: textColor }]}>
                {themeTitleDisplay}
              </Text>
              <Text style={[styles.diamond, { color: colors.primary }]}>
                ◆
              </Text>
            </View>
            
            <Text style={[styles.themeDescription, { color: textSecondaryColor }]}>
              {themeDescriptionDisplay}
            </Text>
          </View>

          {hasSomaticExercise && (
            <View style={[styles.invitationCard, { backgroundColor: cardBg }]}>
              <Text style={styles.plantEmoji}>
                🌱
              </Text>
              
              <Text style={[styles.invitationLabel, { color: colors.primary }]}>
                {invitationLabel}
              </Text>
              
              <Text style={[styles.invitationText, { color: textSecondaryColor }]}>
                {invitationText}
              </Text>

              <Text style={[styles.practiceTitle, { color: textColor }]}>
                {exerciseTitleDisplay}
              </Text>
              
              <Text style={[styles.practiceDescription, { color: textSecondaryColor }]}>
                {exerciseDescriptionDisplay}
              </Text>

              <View style={styles.invitationActions}>
                <TouchableOpacity 
                  style={styles.beginPracticeButton}
                  onPress={handleBeginPractice}
                  activeOpacity={0.8}
                >
                  <Text style={styles.beginPracticeText}>
                    {beginButtonText}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handleSkipPractice}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.skipPracticeText, { color: textSecondaryColor }]}>
                    {skipButtonText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {hasSomaticPrompt && !hasSkippedSomaticPrompt && (
            <View style={[styles.somaticPromptCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.somaticPromptText, { color: textColor }]}>
                {somaticPromptDisplay}
              </Text>

              <View style={styles.somaticPromptActions}>
                <TouchableOpacity 
                  style={styles.tryButton}
                  onPress={handleTrySomaticPrompt}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tryButtonText}>
                    {tryButtonText}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={handleSkipSomaticPrompt}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.skipPracticeText, { color: textSecondaryColor }]}>
                    {skipButtonText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.dailyScriptureSection}>
            <View style={styles.dailyThemeTitleRow}>
              <Text style={[styles.diamond, { color: colors.primary }]}>
                ◆
              </Text>
              <Text style={[styles.dailyThemeTitle, { color: textColor }]}>
                {dayTitleDisplay}
              </Text>
              <Text style={[styles.diamond, { color: colors.primary }]}>
                ◆
              </Text>
            </View>
            
            <View style={[styles.scriptureCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.scriptureReference, { color: colors.primary }]}>
                {referenceDisplay}
              </Text>
              
              <Text style={[styles.scriptureQuote, { color: textColor }]}>
                &ldquo;{scriptureDisplay}&rdquo;
              </Text>
              
              <Text style={[styles.scripturePrompt, { color: textSecondaryColor }]}>
                {reflectionPromptDisplay}
              </Text>
            </View>
          </View>

          {!hasReflected ? (
            <View style={[styles.reflectionCard, { backgroundColor: cardBg }]}>
              <Text style={[styles.reflectionTitle, { color: textColor }]}>
                {reflectionTitle}
              </Text>

              <Text style={[styles.sectionTitle, { color: textColor }]}>
                {responseModeTitle}
              </Text>
              <View style={styles.responseModeContainer}>
                <TouchableOpacity
                  style={[
                    styles.responseModeButton,
                    { borderColor: inputBorder },
                    responseMode === 'text' && styles.responseModeButtonSelected
                  ]}
                  onPress={() => handleResponseModeSelect('text')}
                  activeOpacity={0.7}
                >
                  <IconSymbol 
                    ios_icon_name="text.alignleft"
                    android_material_icon_name="text-fields"
                    size={24}
                    color={responseMode === 'text' ? colors.primary : textSecondaryColor}
                  />
                  <Text style={[
                    styles.responseModeText,
                    { color: responseMode === 'text' ? colors.primary : textSecondaryColor }
                  ]}>
                    Text
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.responseModeButton,
                    { borderColor: inputBorder },
                    responseMode === 'create' && styles.responseModeButtonSelected
                  ]}
                  onPress={() => handleResponseModeSelect('create')}
                  activeOpacity={0.7}
                >
                  <IconSymbol 
                    ios_icon_name="paintbrush.fill"
                    android_material_icon_name="brush"
                    size={24}
                    color={responseMode === 'create' ? colors.primary : textSecondaryColor}
                  />
                  <Text style={[
                    styles.responseModeText,
                    { color: responseMode === 'create' ? colors.primary : textSecondaryColor }
                  ]}>
                    Create
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.responseModeButton,
                    { borderColor: inputBorder },
                    responseMode === 'voice' && styles.responseModeButtonSelected
                  ]}
                  onPress={() => handleResponseModeSelect('voice')}
                  activeOpacity={0.7}
                >
                  <IconSymbol 
                    ios_icon_name="mic.fill"
                    android_material_icon_name="mic"
                    size={24}
                    color={responseMode === 'voice' ? colors.primary : textSecondaryColor}
                  />
                  <Text style={[
                    styles.responseModeText,
                    { color: responseMode === 'voice' ? colors.primary : textSecondaryColor }
                  ]}>
                    Voice
                  </Text>
                </TouchableOpacity>
              </View>

              {responseMode === 'text' && (
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
              )}

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

              <Text style={[styles.sectionTitle, { color: textColor, marginTop: spacing.lg }]}>
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
      )}
    </SafeAreaView>
  );
}

function GlitterParticle({ 
  angle, 
  distance, 
  delay, 
  color 
}: { 
  angle: number; 
  distance: number; 
  delay: number; 
  color: string;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  React.useEffect(() => {
    const targetX = Math.cos(angle) * distance;
    const targetY = Math.sin(angle) * distance;

    setTimeout(() => {
      translateX.value = withTiming(targetX, { 
        duration: 800, 
        easing: Easing.out(Easing.cubic) 
      });
      translateY.value = withTiming(targetY, { 
        duration: 800, 
        easing: Easing.out(Easing.cubic) 
      });
      opacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) })
      );
      scale.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0.5, { duration: 600 })
      );
    }, delay);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.glitterParticle,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerButton: {
    padding: spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
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
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  unopenedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  giftTitle: {
    fontSize: 36,
    fontFamily: 'serif',
    fontWeight: '400',
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  giftSubtitle: {
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: spacing.xxl * 2,
    textAlign: 'center',
    fontWeight: '300',
  },
  giftBoxContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    width: 200,
    height: 200,
  },
  giftBox: {
    width: 140,
    height: 140,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  glitterParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tapText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '300',
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },

  themeSection: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  liturgicalSeason: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  themeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: spacing.sm,
  },
  themeTitle: {
    fontSize: 22,
    fontFamily: 'serif',
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  themeIcons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  themeIconButton: {
    padding: spacing.xs,
  },
  themeDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '300',
    paddingHorizontal: spacing.md,
  },

  invitationCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
    alignItems: 'center',
  },
  plantEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  invitationLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  invitationText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  practiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  practiceDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '300',
    textAlign: 'center',
  },
  invitationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  beginPracticeButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
  },
  beginPracticeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipPracticeText: {
    fontSize: 13,
    fontWeight: '400',
  },

  somaticPromptCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
    alignItems: 'center',
  },
  somaticPromptText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  somaticPromptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  tryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
  },
  tryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  dailyScriptureSection: {
    gap: spacing.sm,
  },
  dailyThemeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  diamond: {
    fontSize: 16,
  },
  dailyThemeTitle: {
    fontSize: 20,
    fontFamily: 'serif',
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  scriptureCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  scriptureReference: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  scriptureQuote: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  scripturePrompt: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
    fontWeight: '300',
    marginTop: spacing.xs,
  },

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
  
  responseModeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  responseModeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    gap: spacing.xs,
  },
  responseModeButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '15',
  },
  responseModeText: {
    fontSize: 13,
    fontWeight: '500',
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
});
