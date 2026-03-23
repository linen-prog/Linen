
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Alert, ActionSheetIOS, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/GradientBackground';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet } from '@/utils/api';
import FloatingTabBar from '@/components/FloatingTabBar';
import { useSubscription } from '@/contexts/SubscriptionContext';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

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

const tabs = [
  { name: 'home', route: '/(tabs)/(home)' as const, icon: 'home' as const, ios_icon_name: 'house.fill', label: 'Home' },
  { name: 'community', route: '/(tabs)/community' as const, icon: 'group' as const, ios_icon_name: 'person.3.fill', label: 'Community' },
  { name: 'profile', route: '/(tabs)/profile' as const, icon: 'account-circle' as const, ios_icon_name: 'person.circle.fill', label: 'Profile' },
];

interface Attachment {
  uri: string;
  name: string;
  mimeType: string;
  isImage: boolean;
}

export default function DailyGiftScreen() {
  const timestamp = new Date().toISOString();
  console.log(`[DailyGift] ${timestamp} - Component rendered`);
  const router = useRouter();
  const { isSubscribed, loading: subLoading } = useSubscription();
  const { session } = useAuth();

  const [dailyGiftResponse, setDailyGiftResponse] = useState<DailyGiftResponse | null>(null);
  const [hasReflected, setHasReflected] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
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

  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [selectedSensations, setSelectedSensations] = useState<string[]>([]);
  
  const [shareToCommunity, setShareToCommunity] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);

  const moodOptions = ['peaceful', 'anxious', 'grateful', 'heavy', 'joyful', 'hopeful', 'uncertain', 'weary'];
  const sensationOptions = ['tense', 'grounded', 'restless', 'calm', 'energized', 'tired', 'open', 'constricted'];

  const glitterParticles: GlitterParticle[] = Array.from({ length: 30 }, (_, index) => ({
    id: index,
    angle: (index / 30) * Math.PI * 2,
    distance: 80 + Math.random() * 60,
    delay: Math.random() * 100,
    color: index % 3 === 0 ? colors.accent : index % 3 === 1 ? colors.primary : colors.prayer,
  }));

  // Use ref to track timer interval
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer effect for somatic invitation - FIXED
  useEffect(() => {
    console.log('[DailyGift] Timer effect triggered:', { 
      somaticTimerActive, 
      somaticTimeRemaining 
    });

    if (somaticTimerActive && somaticTimeRemaining > 0) {
      console.log('[DailyGift] Starting timer interval');
      
      timerIntervalRef.current = setInterval(() => {
        setSomaticTimeRemaining((prevTime) => {
          console.log('[DailyGift] Timer tick:', prevTime);
          
          if (prevTime <= 1) {
            console.log('[DailyGift] Timer completed! Showing celebration');
            setSomaticTimerActive(false);
            setShowSomaticModal(false);
            setShowSomaticCelebration(true);
            
            // Clear interval when timer completes
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            
            return 0;
          }
          
          return prevTime - 1;
        });
      }, 1000);
    } else if (!somaticTimerActive && timerIntervalRef.current) {
      // Clear interval if timer is stopped
      console.log('[DailyGift] Clearing timer interval (timer stopped)');
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Cleanup function
    return () => {
      if (timerIntervalRef.current) {
        console.log('[DailyGift] Cleanup: clearing timer interval');
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [somaticTimerActive]); // Only depend on somaticTimerActive, not somaticTimeRemaining

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
      // Use console.log instead of console.error to avoid triggering error overlay for recoverable errors
      console.log(`[DailyGift] ${errorTimestamp} - Failed to load daily gift (will show retry UI):`, error);
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
      console.log('[DailyGift] Failed to check reflection status (non-critical):', error);
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
      console.log('[DailyGift] Failed to check weekly practice status (non-critical):', error);
    }
  };

  const { isDark } = useTheme();
  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const inputBg = isDark ? colors.cardDark : colors.card;
  const inputBorder = isDark ? colors.borderDark : colors.border;

  const handleOpenGift = () => {
    if (isOpening) {
      console.log('[DailyGift] Already opening, ignoring tap');
      return;
    }

    if (!isSubscribed) {
      console.log('[DailyGift] User not subscribed — redirecting to paywall on gift open');
      router.replace('/paywall');
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

  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please allow camera access in Settings to take a photo.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo Library Permission Required',
        'Please allow photo library access in Settings to choose a photo.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    console.log('[DailyGift] User tapped Take Photo');
    const granted = await requestCameraPermission();
    if (!granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    console.log('[DailyGift] Camera result:', { cancelled: result.canceled });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
      setAttachment({ uri: asset.uri, name: fileName, mimeType: asset.mimeType || 'image/jpeg', isImage: true });
      console.log('[DailyGift] Photo attached:', fileName);
    }
  };

  const handleChooseFromLibrary = async () => {
    console.log('[DailyGift] User tapped Choose from Library');
    const granted = await requestMediaLibraryPermission();
    if (!granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    console.log('[DailyGift] Library result:', { cancelled: result.canceled });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const fileName = asset.fileName || `image_${Date.now()}.jpg`;
      setAttachment({ uri: asset.uri, name: fileName, mimeType: asset.mimeType || 'image/jpeg', isImage: true });
      console.log('[DailyGift] Image attached:', fileName);
    }
  };

  const handleChooseFile = async () => {
    console.log('[DailyGift] User tapped Choose File');
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    console.log('[DailyGift] Document picker result:', { cancelled: result.canceled });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'application/octet-stream';
      const isImage = mimeType.startsWith('image/');
      setAttachment({ uri: asset.uri, name: asset.name, mimeType, isImage });
      console.log('[DailyGift] File attached:', asset.name);
    }
  };

  const handleAttachmentPress = () => {
    console.log('[DailyGift] User tapped attachment button');
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', 'Choose File'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleTakePhoto();
          else if (buttonIndex === 2) handleChooseFromLibrary();
          else if (buttonIndex === 3) handleChooseFile();
        }
      );
    } else {
      setShowAttachmentSheet(true);
    }
  };

  const handleRemoveAttachment = () => {
    console.log('[DailyGift] User removed attachment');
    setAttachment(null);
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

    console.log(`[DailyGift] ${saveTimestamp} - Preparing to save reflection:`, { 
      reflectionTextLength: reflectionText.trim().length,
      selectedMoods,
      selectedSensations,
      dailyContentId: dailyGiftResponse.dailyContent.id,
      hasAttachment: !!attachment,
      attachmentName: attachment?.name,
    });
    
    setIsLoading(true);

    try {
      let response: { reflectionId: string; postId?: string };

      if (attachment) {
        console.log(`[DailyGift] ${saveTimestamp} - Uploading with attachment via multipart/form-data`);
        const formData = new FormData();
        formData.append('dailyGiftId', dailyGiftResponse.dailyContent.id);
        formData.append('reflectionText', reflectionText.trim());
        formData.append('attachment', { uri: attachment.uri, name: attachment.name, type: attachment.mimeType } as any);

        const backendUrl = 'https://mdex7zmyjmrw8reaeyzfnp7z3r6fj2v2.app.specular.dev';
        const token = (session as any)?.token || (session as any)?.session?.token;
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        console.log(`[DailyGift] ${saveTimestamp} - POST ${backendUrl}/api/daily-gift/reflect (multipart)`);
        formData.append('selectedMoods', JSON.stringify(selectedMoods));
        formData.append('selectedSensations', JSON.stringify(selectedSensations));
        formData.append('shareToCommunity', String(shareToCommunity));
        formData.append('isAnonymous', String(isAnonymous));

        console.log(`[DailyGift] ${saveTimestamp} - Appended share fields:`, { shareToCommunity, isAnonymous });
        const res = await fetch(`${backendUrl}/api/daily-gift/reflect`, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!res.ok) {
          const errText = await res.text();
          console.log(`[DailyGift] ${saveTimestamp} - Upload failed (${res.status}):`, errText);
          throw new Error(`Server error ${res.status}`);
        }
        response = await res.json();
      } else {
        console.log(`[DailyGift] ${saveTimestamp} - Saving reflection (JSON) to /api/daily-gift/reflect`);
        const backendUrl = 'https://mdex7zmyjmrw8reaeyzfnp7z3r6fj2v2.app.specular.dev';
        const token = (session as any)?.token || (session as any)?.session?.token;
        const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${backendUrl}/api/daily-gift/reflect`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            dailyGiftId: dailyGiftResponse.dailyContent.id,
            reflectionText: reflectionText.trim(),
            selectedMoods,
            selectedSensations,
            shareToCommunity,
            isAnonymous,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.log(`[DailyGift] ${saveTimestamp} - Save failed (${res.status}):`, errText);
          throw new Error(`Server error ${res.status}`);
        }
        response = await res.json();
      }
      
      console.log(`[DailyGift] ${saveTimestamp} - Reflection saved successfully:`, response);
      setIsLoading(false);
      setHasReflected(true);
      setAttachment(null);
      setShareToCommunity(false);
      setIsAnonymous(false);
    } catch (error: any) {
      const errorTimestamp = new Date().toISOString();
      console.log(`[DailyGift] ${errorTimestamp} - Failed to save reflection:`, error);
      console.log(`[DailyGift] ${errorTimestamp} - Error details:`, {
        type: typeof error,
        name: error?.name,
        message: error?.message,
      });
      setIsLoading(false);
      
      let userMessage = 'We\'re having trouble saving your reflection right now. ';
      
      if (error?.message && error.message.includes('foreign key constraint')) {
        userMessage = 'The daily gift is still being prepared. Please wait a moment and try again.';
      } else if (error?.message && error.message.includes('body stream already read')) {
        userMessage = 'There was a connection issue. Please try saving your reflection again.';
      } else if (error?.message && error.message.includes('Server error 500')) {
        userMessage = 'The server is processing your request. Please try again in a moment.';
      } else if (error?.message) {
        userMessage += error.message;
      } else {
        userMessage += 'Please try again.';
      }
      
      console.log(`[DailyGift] ${errorTimestamp} - Showing error to user:`, userMessage);
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
    setSomaticTimeRemaining(60); // Reset to 60 seconds
    setSomaticTimerActive(true); // Start timer
  };

  const handleSkipSomaticPrompt = () => {
    console.log('[DailyGift] User skipped somatic prompt');
    setHasSkippedSomaticPrompt(true);
  };

  const handleCloseSomaticModal = () => {
    console.log('[DailyGift] User closed somatic modal');
    setSomaticTimerActive(false); // Stop timer first
    setShowSomaticModal(false);
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

  const handleCommunityPress = () => {
    console.log('[DailyGift] User tapped Community icon');
    router.navigate('/(tabs)/community');
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
      console.log('[DailyGift] Manual refresh failed (non-critical):', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoadingGift) {
    const loadingMessage = 'Loading today\'s gift...';
    
    return (
      <GradientBackground>
        <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
          <Stack.Screen 
            options={{
              headerShown: true,
              title: 'Daily Gift',
              headerBackTitle: '',
              headerTransparent: true,
              headerStyle: { backgroundColor: 'transparent' },
              headerTintColor: '#047857',
              headerTitleStyle: {
                fontSize: 18,
                fontWeight: '400' as const,
                color: '#1c1917',
                fontFamily: 'Georgia',
              },
              headerLeft: () => (
                <TouchableOpacity
                  onPress={() => { console.log('[DailyGift] Back button pressed'); router.back(); }}
                  style={{ paddingRight: 8, flexDirection: 'row' as const, alignItems: 'center' as const }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ChevronLeft size={24} color="#047857" />
                </TouchableOpacity>
              ),
            }}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
              {loadingMessage}
            </Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!dailyGiftResponse || !dailyGiftResponse.dailyContent) {
    const errorTitle = 'Unable to load today\'s gift';
    const errorSubtext = 'The daily gift is being prepared. Please try again in a moment.';
    const retryButtonText = 'Try Again';
    
    return (
      <GradientBackground>
        <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
          <Stack.Screen 
            options={{
              headerShown: true,
              title: 'Daily Gift',
              headerBackTitle: '',
              headerTransparent: true,
              headerStyle: { backgroundColor: 'transparent' },
              headerTintColor: '#047857',
              headerTitleStyle: {
                fontSize: 18,
                fontWeight: '400' as const,
                color: '#1c1917',
                fontFamily: 'Georgia',
              },
              headerLeft: () => (
                <TouchableOpacity
                  onPress={() => { console.log('[DailyGift] Back button pressed'); router.back(); }}
                  style={{ paddingRight: 8, flexDirection: 'row' as const, alignItems: 'center' as const }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ChevronLeft size={24} color="#047857" />
                </TouchableOpacity>
              ),
              headerRight: () => (
                <TouchableOpacity
                  onPress={handleCommunityPress}
                  style={{ paddingLeft: 8 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IconSymbol
                    ios_icon_name="person.2"
                    android_material_icon_name="group"
                    size={24}
                    color="#047857"
                  />
                </TouchableOpacity>
              ),
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
      </GradientBackground>
    );
  }

  const dailyContent = dailyGiftResponse.dailyContent;
  const scriptureDisplay = dailyContent.scriptureText;
  const referenceDisplay = dailyContent.scriptureReference;
  const reflectionPromptDisplay = dailyContent.reflectionQuestion;
  const saveButtonText = isLoading ? 'Holding...' : 'Hold this';

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
  const reflectionPlaceholder = 'You can write here if you\'d like...';
  const moodTagsTitle = 'If it helps, you can name it';
  const sensationTagsTitle = 'What do you notice in your body?';
  const moodTagsSubtitle = 'Optional';
  const sensationTagsSubtitle = 'Optional';

  const beginButtonText = 'Begin Practice';
  const skipButtonText = 'Not right now';

  const giftTitleText = 'Your Daily Gift';
  const giftSubtitleText = 'A word for your heart today';
  const tapText = 'Tap to open';

  const invitationLabel = 'SOMATIC INVITATION';
  const invitationText = 'A gentle invitation';

  const somaticPromptDisplay = dailyContent.somaticPrompt || '';
  const hasSomaticPrompt = !!dailyContent.somaticPrompt;
  const tryButtonText = 'Begin';

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
    <GradientBackground>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
        <Stack.Screen 
          options={{
            headerShown: true,
            title: 'Daily Gift',
            headerBackTitle: '',
            headerTransparent: true,
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: '#047857',
            headerTitleStyle: {
              fontSize: 18,
              fontWeight: '400' as const,
              color: '#1c1917',
              fontFamily: 'Georgia',
            },
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => { console.log('[DailyGift] Back button pressed'); router.back(); }}
                style={{ paddingRight: 8, flexDirection: 'row' as const, alignItems: 'center' as const }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ChevronLeft size={24} color="#047857" />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <TouchableOpacity
                onPress={handleCommunityPress}
                style={{ paddingLeft: 8 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol
                  ios_icon_name="person.2"
                  android_material_icon_name="group"
                  size={24}
                  color="#047857"
                />
              </TouchableOpacity>
            ),
          }}
        />

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
          contentContainerStyle={[styles.scrollContent, { paddingTop: 60 }]}
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
              {"A place to be with what you're carrying."}
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
                    {'Not right now'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.transitionMicrocopy}>
            {'Take your time here'}
          </Text>

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
                {'\u201C'}{scriptureDisplay}{'\u201D'}
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

              {/* Attachment button row */}
              <View style={styles.attachmentRow}>
                <TouchableOpacity
                  onPress={handleAttachmentPress}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.attachmentLinkText, { color: textSecondaryColor }]}>
                    Prefer to write on paper or create art?{' '}
                    <Text style={styles.attachmentLinkUnderline}>
                      Upload here
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Attachment preview */}
              {attachment && (
                <View style={[styles.attachmentPreview, { borderColor: inputBorder, backgroundColor: inputBg }]}>
                  {attachment.isImage ? (
                    <Image
                      source={{ uri: attachment.uri }}
                      style={styles.attachmentThumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.fileIconContainer, { backgroundColor: colors.primaryLight || '#e6f4f0' }]}>
                      <Ionicons name="document-outline" size={28} color={colors.primary} />
                    </View>
                  )}
                  <Text style={[styles.attachmentName, { color: textColor }]} numberOfLines={1}>
                    {attachment.name}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeAttachmentButton}
                    onPress={handleRemoveAttachment}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={20} color={textSecondaryColor} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Share with Community toggle */}
              <View style={styles.shareToggleRow}>
                <View style={styles.shareToggleLeft}>
                  <Ionicons name="people-outline" size={18} color={textSecondaryColor} />
                  <Text style={styles.shareToggleLabel}>Share with community</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    console.log('[DailyGift] Share with community toggled:', !shareToCommunity);
                    setShareToCommunity(prev => !prev);
                  }}
                  style={[styles.toggleTrack, shareToCommunity && styles.toggleTrackActive]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.toggleThumb, shareToCommunity && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>

              {/* Anonymous toggle — only shown when sharing */}
              {shareToCommunity && (
                <View style={[styles.shareToggleRow, { marginTop: 8 }]}>
                  <View style={styles.shareToggleLeft}>
                    <Ionicons name="eye-off-outline" size={18} color={textSecondaryColor} />
                    <Text style={styles.shareToggleLabel}>Post anonymously</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('[DailyGift] Post anonymously toggled:', !isAnonymous);
                      setIsAnonymous(prev => !prev);
                    }}
                    style={[styles.toggleTrack, isAnonymous && styles.toggleTrackActive]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.toggleThumb, isAnonymous && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.saveRow}>
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
                      dailyContentId: dailyGiftResponse?.dailyContent?.id,
                      hasAttachment: !!attachment,
                    });
                    handleSaveReflection();
                  }}
                  disabled={!reflectionText.trim() || isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {saveButtonText}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

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
              {"Take a moment to notice your body. There's no right or wrong way to do this."}
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
              {"When you're ready, you can return to your reflection."}
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
          <View style={[styles.successModalContent, { backgroundColor: cardBg }]}>
            <View style={styles.successIconCircle}>
              <IconSymbol 
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={48}
                color="#FFFFFF"
              />
            </View>

            <Text style={[styles.successModalTitle, { color: textColor }]}>
              Congratulations! 🎉
            </Text>

            <Text style={[styles.successModalMessage, { color: textSecondaryColor }]}>
              You completed your somatic invitation
            </Text>

            <View style={[styles.successModalNote, { backgroundColor: isDark ? colors.borderDark : colors.primaryLight }]}>
              <Text style={[styles.successModalNoteText, { color: textColor }]}>
                {"You took time to be present with yourself. That's a beautiful gift you've given yourself today."}
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
          <View style={[styles.errorModalContent, { backgroundColor: cardBg }]}>
            <IconSymbol 
              ios_icon_name="exclamationmark.triangle.fill"
              android_material_icon_name="warning"
              size={48}
              color={colors.accent}
            />

            <Text style={[styles.errorModalTitle, { color: textColor }]}>
              Unable to Save
            </Text>

            <Text style={[styles.errorModalMessage, { color: textSecondaryColor }]}>
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



      {/* Android Attachment Action Sheet */}
      <Modal
        visible={showAttachmentSheet}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAttachmentSheet(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachmentSheet(false)}
        >
          <View style={[styles.sheetContainer, { backgroundColor: cardBg }]}>
            <View style={[styles.sheetHandle, { backgroundColor: inputBorder }]} />
            <Text style={[styles.sheetTitle, { color: textSecondaryColor }]}>
              Add Attachment
            </Text>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => { setShowAttachmentSheet(false); setTimeout(handleTakePhoto, 300); }}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
              <Text style={[styles.sheetOptionText, { color: textColor }]}>
                Take Photo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => { setShowAttachmentSheet(false); setTimeout(handleChooseFromLibrary, 300); }}
              activeOpacity={0.7}
            >
              <Ionicons name="image-outline" size={22} color={colors.primary} />
              <Text style={[styles.sheetOptionText, { color: textColor }]}>
                Choose from Library
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => { setShowAttachmentSheet(false); setTimeout(handleChooseFile, 300); }}
              activeOpacity={0.7}
            >
              <Ionicons name="document-outline" size={22} color={colors.primary} />
              <Text style={[styles.sheetOptionText, { color: textColor }]}>
                Choose File
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetCancelButton, { borderColor: inputBorder }]}
              onPress={() => { console.log('[DailyGift] Attachment sheet cancelled'); setShowAttachmentSheet(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.sheetCancelText, { color: textSecondaryColor }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Floating Tab Bar */}
      <FloatingTabBar tabs={tabs} />
    </SafeAreaView>
    </GradientBackground>
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
    marginBottom: spacing.xl,
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

  transitionMicrocopy: {
    textAlign: 'center' as const,
    fontSize: 13,
    fontStyle: 'italic' as const,
    color: '#9ca3af',
    marginTop: 8,
    marginBottom: 28,
    opacity: 0.85,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.xl,
    paddingBottom: 120, // Add padding for FloatingTabBar
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
  shareToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  shareToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleTrackActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  shareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.xs,
    marginTop: 4,
  },
  anonymousToggleLabel: {
    fontSize: typography.body,
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
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  attachmentLinkText: {
    fontSize: 13,
    fontFamily: 'Georgia',
    lineHeight: 18,
  },
  attachmentLinkUnderline: {
    textDecorationLine: 'underline',
    fontStyle: 'italic',
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  attachmentButtonText: {
    fontSize: 13,
    fontWeight: '400',
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  attachmentThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  fileIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
  },
  removeAttachmentButton: {
    padding: 2,
  },
  saveRow: {
    marginTop: spacing.md,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: spacing.lg,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  sheetOptionText: {
    fontSize: 16,
    fontWeight: '400',
  },
  sheetCancelButton: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 16,
    fontWeight: '400',
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
