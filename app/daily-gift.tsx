
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Switch, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
  dayOfYear?: number;
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
  const timestamp = new Date().toISOString();
  console.log(`[DailyGift] ${timestamp} - Component rendered`);
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
  const [showSomaticModal, setShowSomaticModal] = useState(false);
  const [somaticTimerActive, setSomaticTimerActive] = useState(false);
  const [somaticTimeRemaining, setSomaticTimeRemaining] = useState(60);
  const [showSomaticCelebration, setShowSomaticCelebration] = useState(false);

  const [shareCategory, setShareCategory] = useState<'feed' | 'wisdom' | 'care' | 'prayers'>('feed');

  const [responseMode, setResponseMode] = useState<'text' | 'create' | 'voice'>('text');

  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedSensations, setSelectedSensations] = useState<string[]>([]);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showShareSuccessModal, setShowShareSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const moodOptions = ['peaceful', 'anxious', 'grateful', 'heavy', 'joyful', 'hopeful', 'uncertain', 'weary'];
  const sensationOptions = ['tense', 'grounded', 'restless', 'calm', 'energized', 'tired', 'open', 'constricted'];

  const glitterParticles: GlitterParticle[] = Array.from({ length: 30 }, (_, index) => ({
    id: index,
    angle: (index / 30) * Math.PI * 2,
    distance: 80 + Math.random() * 60,
    delay: Math.random() * 100,
    color: index % 3 === 0 ? colors.accent : index % 3 === 1 ? colors.primary : colors.prayer,
  }));

  // Timer effect for somatic invitation
  useEffect(() => {
    let timerInterval: ReturnType<typeof setInterval> | null = null;
    
    if (somaticTimerActive && somaticTimeRemaining > 0) {
      timerInterval = setInterval(() => {
        setSomaticTimeRemaining((prevTime) => {
          if (prevTime <= 1) {
            setSomaticTimerActive(false);
            console.log('[DailyGift] Somatic timer completed');
            setShowSomaticModal(false);
            setShowSomaticCelebration(true);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [somaticTimerActive, somaticTimeRemaining]);

  const loadDailyGift = useCallback(async () => {
    let isMounted = true;
    
    try {
      const loadTimestamp = new Date().toISOString();
      const now = new Date();
      const currentHour = now.getHours();
      console.log(`[DailyGift] ${loadTimestamp} - Loading daily gift from /api/weekly-theme/current...`);
      setIsLoadingGift(true);
      
      const response = await authenticatedGet<DailyGiftResponse>('/api/weekly-theme/current');
      
      if (!isMounted) {
        console.log('[DailyGift] Component unmounted, skipping state updates');
        return;
      }
      
      if (!response || !response.weeklyTheme) {
        throw new Error('Invalid response from server - missing weekly theme data');
      }
      
      const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`[DailyGift] ${loadTimestamp} - Daily gift loaded successfully:`, {
        timestamp: loadTimestamp,
        currentDate: now.toLocaleDateString(),
        clientDayOfYear: dayOfYear,
        serverDayOfYear: response.dailyContent?.dayOfYear,
        dayOfYearMatch: response.dailyContent?.dayOfYear === dayOfYear,
        themeTitle: response.weeklyTheme.themeTitle,
        liturgicalSeason: response.weeklyTheme.liturgicalSeason,
        weekStartDate: response.weeklyTheme.weekStartDate,
        hasSomaticExercise: !!response.weeklyTheme.somaticExercise,
        somaticExerciseTitle: response.weeklyTheme.somaticExercise?.title,
        hasDailyContent: !!response.dailyContent,
        dayOfWeek: response.dailyContent?.dayOfWeek,
        dayTitle: response.dailyContent?.dayTitle,
        scriptureReference: response.dailyContent?.scriptureReference,
        scriptureTextPreview: response.dailyContent?.scriptureText?.substring(0, 100) + '...',
        reflectionPromptPreview: response.dailyContent?.reflectionQuestion?.substring(0, 100) + '...',
      });
      
      if (response.dailyContent) {
        console.log(`[DailyGift] ${loadTimestamp} - 📖 SCRIPTURE VERIFICATION:`, {
          date: now.toLocaleDateString(),
          clientDayOfYear: dayOfYear,
          serverDayOfYear: response.dailyContent.dayOfYear,
          dayOfYearMatch: response.dailyContent.dayOfYear === dayOfYear,
          reference: response.dailyContent.scriptureReference,
          fullText: response.dailyContent.scriptureText,
          fullPrompt: response.dailyContent.reflectionQuestion,
        });
        
        // Alert if there's a mismatch between client and server day calculations
        if (response.dailyContent.dayOfYear !== undefined && response.dailyContent.dayOfYear !== dayOfYear) {
          console.warn(`[DailyGift] ⚠️ DAY MISMATCH: Client calculated day ${dayOfYear} but server returned day ${response.dailyContent.dayOfYear}`);
        }
      }
      
      if (!response.weeklyTheme.somaticExercise) {
        console.warn(`[DailyGift] ${loadTimestamp} - ⚠️ WARNING: No somatic exercise returned from backend!`, {
          featuredExerciseId: response.weeklyTheme.featuredExerciseId,
          themeId: response.weeklyTheme.id,
        });
      }
      
      if (isMounted) {
        setDailyGiftResponse(response);
        setIsLoadingGift(false);

        if (response.dailyContent) {
          await checkReflectionStatus(response.dailyContent.id);
        }

        if (response.weeklyTheme.somaticExercise) {
          await checkWeeklyPracticeStatus();
        }
      }
    } catch (error) {
      const errorTimestamp = new Date().toISOString();
      console.error(`[DailyGift] ${errorTimestamp} - Failed to load daily gift:`, error);
      console.error(`[DailyGift] ${errorTimestamp} - Error details:`, error);
      if (isMounted) {
        setIsLoadingGift(false);
      }
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const focusTimestamp = new Date().toISOString();
      console.log(`[DailyGift] ${focusTimestamp} - Screen focused - reloading daily gift data`);
      loadDailyGift();
    }, [loadDailyGift])
  );

  // Auto-refresh removed - scriptures change daily, not hourly

  const checkReflectionStatus = async (dailyContentId: string) => {
    try {
      const checkTimestamp = new Date().toISOString();
      console.log(`[DailyGift] ${checkTimestamp} - Checking if user has reflected today for dailyContentId:`, dailyContentId);
      const response = await authenticatedGet<any[]>('/api/daily-gift/my-reflections');
      
      const todayReflection = response.find(
        (r: any) => r.dailyGiftId === dailyContentId
      );
      
      console.log(`[DailyGift] ${checkTimestamp} - Reflection status:`, { 
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
      const practiceTimestamp = new Date().toISOString();
      console.log(`[DailyGift] ${practiceTimestamp} - Checking weekly practice completion status...`);
      const response = await authenticatedGet<WeeklyPracticeStatus>('/api/weekly-practice/check-completion');
      
      console.log(`[DailyGift] ${practiceTimestamp} - Weekly practice status:`, response);
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
    const saveTimestamp = new Date().toISOString();
    console.log(`[DailyGift] ${saveTimestamp} - handleSaveReflection called`);
    
    if (!reflectionText.trim()) {
      console.log(`[DailyGift] ${saveTimestamp} - Cannot save: reflection text is empty`);
      return;
    }
    
    if (!dailyGiftResponse) {
      console.log(`[DailyGift] ${saveTimestamp} - Cannot save: dailyGiftResponse is null`);
      return;
    }
    
    if (!dailyGiftResponse.dailyContent) {
      console.log(`[DailyGift] ${saveTimestamp} - Cannot save: dailyContent is null`);
      return;
    }
    
    if (!dailyGiftResponse.dailyContent.id) {
      console.log(`[DailyGift] ${saveTimestamp} - Cannot save: dailyContent.id is null or undefined`);
      return;
    }

    const requestData = {
      dailyGiftId: dailyGiftResponse.dailyContent.id,
      reflectionText: reflectionText.trim(),
      shareToComm,
      category: shareCategory,
      isAnonymous: shareAnonymously,
    };

    console.log(`[DailyGift] ${saveTimestamp} - Preparing to save reflection:`, { 
      reflectionTextLength: reflectionText.trim().length,
      shareToComm,
      shareAnonymously,
      responseMode,
      selectedMoods,
      selectedSensations,
      dailyContentId: dailyGiftResponse.dailyContent.id,
      requestData
    });
    
    setIsLoading(true);

    try {
      console.log(`[DailyGift] ${saveTimestamp} - Calling authenticatedPost to /api/daily-gift/reflect...`);
      
      const response = await authenticatedPost<{ reflectionId: string; postId?: string }>('/api/daily-gift/reflect', requestData);
      
      console.log(`[DailyGift] ${saveTimestamp} - Reflection saved successfully:`, response);
      setIsLoading(false);
      setHasReflected(true);
      
      // Show success modal if shared to community
      if (shareToComm) {
        console.log(`[DailyGift] ${saveTimestamp} - Showing share success modal`);
        setShowShareSuccessModal(true);
      }
    } catch (error: any) {
      const errorTimestamp = new Date().toISOString();
      console.error(`[DailyGift] ${errorTimestamp} - Failed to save reflection:`, error);
      console.error(`[DailyGift] ${errorTimestamp} - Error type:`, typeof error);
      console.error(`[DailyGift] ${errorTimestamp} - Error name:`, error?.name);
      console.error(`[DailyGift] ${errorTimestamp} - Error message:`, error?.message);
      console.error(`[DailyGift] ${errorTimestamp} - Error stack:`, error?.stack);
      console.error(`[DailyGift] ${errorTimestamp} - Full error object:`, JSON.stringify(error, null, 2));
      console.error(`[DailyGift] ${errorTimestamp} - Request data that failed:`, requestData);
      setIsLoading(false);
      
      // Create a user-friendly error message
      let userMessage = 'We\'re having trouble saving your reflection right now. ';
      
      // Check if it's the foreign key constraint error
      if (error?.message && error.message.includes('foreign key constraint')) {
        userMessage = 'The daily gift is still being prepared. Please wait a moment and try again.';
      } else if (error?.message && error.message.includes('body stream already read')) {
        userMessage = 'There was a connection issue. Please try saving your reflection again.';
      } else if (error?.status === 500) {
        userMessage = 'The server is processing your request. Please try again in a moment.';
      } else if (error?.message) {
        userMessage += error.message;
      } else {
        userMessage += 'Please try again.';
      }
      
      console.error(`[DailyGift] ${errorTimestamp} - Showing error to user:`, userMessage);
      setErrorMessage(userMessage);
      setShowErrorModal(true);
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
    console.log('[DailyGift] User tapped Try for somatic prompt - opening modal with timer');
    setShowSomaticModal(true);
    setSomaticTimerActive(true);
    setSomaticTimeRemaining(60); // 60 seconds timer
  };

  const handleSkipSomaticPrompt = () => {
    console.log('[DailyGift] User skipped somatic prompt');
    setHasSkippedSomaticPrompt(true);
  };

  const handleCloseSomaticModal = () => {
    console.log('[DailyGift] User closed somatic modal');
    setShowSomaticModal(false);
    setSomaticTimerActive(false);
    setHasSkippedSomaticPrompt(true);
  };

  const handleCloseSomaticCelebration = () => {
    console.log('[DailyGift] User closed somatic celebration');
    setShowSomaticCelebration(false);
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

  const handleRefresh = async () => {
    if (isRefreshing) {
      console.log('[DailyGift] Already refreshing, ignoring tap');
      return;
    }

    console.log('[DailyGift] User manually refreshing daily gift');
    setIsRefreshing(true);
    
    try {
      await loadDailyGift();
      console.log('[DailyGift] Manual refresh completed successfully');
    } catch (error) {
      console.error('[DailyGift] Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
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
              const retryTimestamp = new Date().toISOString();
              console.log(`[DailyGift] ${retryTimestamp} - User tapped retry button`);
              loadDailyGift();
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

  const invitationLabel = 'SOMATIC INVITATION';
  const invitationText = 'You are invited to practice';

  const somaticPromptDisplay = dailyContent.somaticPrompt || '';
  const hasSomaticPrompt = !!dailyContent.somaticPrompt;
  const tryButtonText = 'Try';

  const dayTitles = ['Rest', 'Beginnings', 'Presence', 'Gratitude', 'Compassion', 'Joy', 'Sabbath'];
  const dayTitleDisplay = dailyContent.dayTitle || dayTitles[dailyContent.dayOfWeek] || 'Reflection';

  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const todayDateDisplay = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Format timer display
  const timerMinutes = Math.floor(somaticTimeRemaining / 60);
  const timerSeconds = somaticTimeRemaining % 60;
  const timerDisplay = `${timerMinutes}:${timerSeconds.toString().padStart(2, '0')}`;

  console.log('[DailyGift] Displaying content:', {
    date: todayDateDisplay,
    clientDayOfYear: dayOfYear,
    serverDayOfYear: dailyContent.dayOfYear,
    displayedDayOfYear: dailyContent.dayOfYear !== undefined ? dailyContent.dayOfYear : dayOfYear,
    dayTitle: dayTitleDisplay,
    scriptureRef: referenceDisplay,
    scripturePreview: scriptureDisplay.substring(0, 50) + '...',
    somaticExercise: exerciseTitleDisplay,
  });

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
            onPress={handleRefresh}
            style={styles.headerButton}
            activeOpacity={0.7}
            disabled={isRefreshing}
          >
            <IconSymbol 
              ios_icon_name={isRefreshing ? "arrow.clockwise" : "arrow.clockwise"}
              android_material_icon_name="refresh"
              size={24}
              color={isRefreshing ? colors.textSecondary : textColor}
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => {
              console.log('[DailyGift] User tapped verification icon');
              router.push('/scripture-verification');
            }}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <IconSymbol 
              ios_icon_name="checkmark.seal"
              android_material_icon_name="verified"
              size={24}
              color={textColor}
            />
          </TouchableOpacity>
          
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
          
          <Text style={[styles.dateDisplay, { color: textSecondaryColor }]}>
            {todayDateDisplay}
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

          {hasSomaticPrompt && !hasSkippedSomaticPrompt && (
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
                {somaticPromptDisplay}
              </Text>

              <View style={styles.dailyIndicator}>
                <IconSymbol 
                  ios_icon_name="calendar"
                  android_material_icon_name="calendar-today"
                  size={12}
                  color={textSecondaryColor}
                />
                <Text style={[styles.dailyIndicatorText, { color: textSecondaryColor }]}>
                  Changes daily at midnight
                </Text>
              </View>

              <View style={styles.invitationActions}>
                <TouchableOpacity 
                  style={styles.beginPracticeButton}
                  onPress={handleTrySomaticPrompt}
                  activeOpacity={0.8}
                >
                  <Text style={styles.beginPracticeText}>
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
              
              <View style={styles.dailyIndicator}>
                <IconSymbol 
                  ios_icon_name="calendar"
                  android_material_icon_name="calendar-today"
                  size={12}
                  color={textSecondaryColor}
                />
                <Text style={[styles.dailyIndicatorText, { color: textSecondaryColor }]}>
                  Day {dailyContent.dayOfYear !== undefined ? dailyContent.dayOfYear + 1 : dayOfYear + 1} of 365 • Changes daily at midnight
                </Text>
              </View>
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
                onPress={() => {
                  const buttonPressTimestamp = new Date().toISOString();
                  console.log(`[DailyGift] ${buttonPressTimestamp} - Save button pressed`);
                  console.log(`[DailyGift] ${buttonPressTimestamp} - Button state:`, {
                    hasReflectionText: !!reflectionText.trim(),
                    reflectionTextLength: reflectionText.trim().length,
                    isLoading,
                    isDisabled: !reflectionText.trim() || isLoading,
                    hasDailyContent: !!dailyGiftResponse?.dailyContent,
                    dailyContentId: dailyGiftResponse?.dailyContent?.id
                  });
                  handleSaveReflection();
                }}
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

      {/* Somatic Practice Modal with Timer */}
      <Modal
        visible={showSomaticModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseSomaticModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.plantEmoji}>
                🌱
              </Text>
              <TouchableOpacity 
                onPress={handleCloseSomaticModal}
                style={styles.modalCloseButton}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={textColor}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalTitle, { color: textColor }]}>
              {somaticPromptDisplay}
            </Text>

            {/* Timer Display */}
            <View style={styles.modalTimerContainer}>
              <Text style={[styles.modalTimerLabel, { color: textSecondaryColor }]}>
                Time Remaining
              </Text>
              <Text style={[styles.modalTimerDisplay, { color: colors.primary }]}>
                {timerDisplay}
              </Text>
            </View>

            <Text style={[styles.modalInstructions, { color: textSecondaryColor }]}>
              Take a moment to notice your body. There&apos;s no right or wrong way to do this.
            </Text>

            <View style={[styles.modalSteps, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalStepText, { color: textColor }]}>
                • Find a comfortable position
              </Text>
              <Text style={[styles.modalStepText, { color: textColor }]}>
                • Take a few gentle breaths
              </Text>
              <Text style={[styles.modalStepText, { color: textColor }]}>
                • Notice what you notice
              </Text>
              <Text style={[styles.modalStepText, { color: textColor }]}>
                • No need to change anything
              </Text>
            </View>

            <Text style={[styles.modalNote, { color: textSecondaryColor }]}>
              When you&apos;re ready, you can return to your reflection.
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCloseSomaticModal}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Somatic Celebration Modal */}
      <Modal
        visible={showSomaticCelebration}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseSomaticCelebration}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconCircle}>
              <IconSymbol 
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={48}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.successModalTitle}>
              Congratulations! 🎉
            </Text>

            <Text style={styles.successModalMessage}>
              You completed your somatic invitation
            </Text>

            <View style={styles.successModalNote}>
              <Text style={styles.successModalNoteText}>
                You took time to be present with yourself. That&apos;s a beautiful gift you&apos;ve given yourself today.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.successModalButton}
              onPress={handleCloseSomaticCelebration}
              activeOpacity={0.8}
            >
              <Text style={styles.successModalButtonText}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={showErrorModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.errorModalOverlay}>
          <View style={styles.errorModalContent}>
            <IconSymbol 
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={48}
              color={colors.accent}
            />

            <Text style={styles.errorModalTitle}>
              Unable to Save
            </Text>

            <Text style={styles.errorModalMessage}>
              {errorMessage}
            </Text>

            <TouchableOpacity
              style={styles.errorModalButton}
              onPress={() => setShowErrorModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.errorModalButtonText}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Share Success Modal */}
      <Modal
        visible={showShareSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowShareSuccessModal(false);
        }}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconCircle}>
              <IconSymbol 
                ios_icon_name="person.2.fill"
                android_material_icon_name="group"
                size={48}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.successModalTitle}>
              Beautiful! 🎉
            </Text>

            <Text style={styles.successModalMessage}>
              Your reflection has been shared with the community
            </Text>

            <View style={styles.successModalNote}>
              <Text style={styles.successModalNoteText}>
                Your words or art may be exactly what someone else needs to see today. Thank you for your courage in sharing.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => {
                setShowShareSuccessModal(false);
                router.push('/(tabs)/community');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.successModalButtonText}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: spacing.xs,
    textAlign: 'center',
    fontWeight: '300',
  },
  dateDisplay: {
    fontSize: 13,
    marginBottom: spacing.xxl * 2,
    textAlign: 'center',
    fontWeight: '400',
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
  dailyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dailyIndicatorText: {
    fontSize: 11,
    fontWeight: '400',
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

  // Somatic Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 28,
  },
  modalTimerContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primaryLight + '15',
  },
  modalTimerLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  modalTimerDisplay: {
    fontSize: 48,
    fontWeight: typography.bold,
  },
  modalInstructions: {
    fontSize: typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  modalSteps: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  modalStepText: {
    fontSize: typography.body,
    lineHeight: 24,
  },
  modalNote: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontStyle: 'italic',
  },
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },

  // Error Modal Styles
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  errorModalTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorModalMessage: {
    fontSize: typography.body,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  errorModalButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.xxl,
    width: '100%',
    alignItems: 'center',
  },
  errorModalButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },

  // Share Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successModalTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successModalMessage: {
    fontSize: typography.body,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  successModalNote: {
    backgroundColor: colors.primaryLight + '20',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    width: '100%',
  },
  successModalNoteText: {
    fontSize: typography.bodySmall,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  successModalButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.xxl,
    width: '100%',
    alignItems: 'center',
  },
  successModalButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
});
