
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Modal, ScrollView, Linking, Alert, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/IconSymbol';
import { GradientBackground } from '@/components/GradientBackground';
import FloatingTabBar from '@/components/FloatingTabBar';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing
} from 'react-native-reanimated';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface Prayer {
  id: string;
  content: string;
  createdAt: Date;
  isSaid: boolean;
  isShared: boolean;
}



const tabs = [
  { name: 'home', route: '/(tabs)/' as const, icon: 'home' as const, ios_icon_name: 'house.fill', label: 'Home' },
  { name: 'community', route: '/(tabs)/community' as const, icon: 'people' as const, ios_icon_name: 'person.3.fill', label: 'Community' },
  { name: 'profile', route: '/(tabs)/profile' as const, icon: 'person' as const, ios_icon_name: 'person.circle.fill', label: 'Profile' },
];

export default function CheckInScreen() {
  console.log('[CheckIn] User viewing Check-In screen');
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [companionName, setCompanionName] = useState<string | null>(null);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [showPrayerOptions, setShowPrayerOptions] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCareModal, setShowCareModal] = useState(false);
  const [showCareSuccessModal, setShowCareSuccessModal] = useState(false);
  const [showPrayerSuccessModal, setShowPrayerSuccessModal] = useState(false);
  const [generatedPrayer, setGeneratedPrayer] = useState<string>('');
  const [generatedPrayerId, setGeneratedPrayerId] = useState<string>('');
  const [isGeneratingPrayer, setIsGeneratingPrayer] = useState(false);
  const [shareCategory, setShareCategory] = useState<'prayer' | 'wisdom' | 'care'>('prayer');
  const [shareAnonymous, setShareAnonymous] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [careRequestText, setCareRequestText] = useState('');
  const [careAnonymous, setCareAnonymous] = useState(false);
  const [isSubmittingCare, setIsSubmittingCare] = useState(false);
  const [showMessageShareModal, setShowMessageShareModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string>('');
  const [selectedMessageContent, setSelectedMessageContent] = useState<string>('');
  const [messageShareAnonymous, setMessageShareAnonymous] = useState(false);
  const [isSharingMessage, setIsSharingMessage] = useState(false);
  const [prayerShared, setPrayerShared] = useState(false);
  const [prayerSharedConfirm, setPrayerSharedConfirm] = useState(false);

  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Color variables for consistency
  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const inputBg = isDark ? colors.cardDark : colors.card;
  const inputBorder = isDark ? colors.borderDark : colors.border;

  useEffect(() => {
    let isMounted = true;
    
    const startConversation = async () => {
      try {
        console.log('[CheckIn] Starting check-in conversation...');
        const { authenticatedPost, authenticatedGet } = await import('@/utils/api');
        
        // Fetch companion name from profile
        try {
          const profile = await authenticatedGet<{ companionName: string | null }>('/api/profile');
          if (isMounted) {
            console.log('[CheckIn] Companion name loaded:', profile.companionName);
            setCompanionName(profile.companionName);
          }
        } catch (error) {
          console.error('[CheckIn] Failed to load companion name:', error);
        }
        
        const response = await authenticatedPost<{ 
          conversationId: string; 
          messages: { id: string; role: string; content: string; createdAt: string }[];
          isNewConversation: boolean;
        }>('/api/check-in/start', {});
        
        if (!isMounted) {
          console.log('[CheckIn] Component unmounted, skipping state updates');
          return;
        }
        
        console.log('[CheckIn] Conversation started successfully:', response);
        console.log('[CheckIn] Message IDs from backend:', response.messages.map(m => ({ id: m.id, role: m.role })));
        setConversationId(response.conversationId);
        
        // Load existing messages (but don't show initial AI greeting for new conversations)
        const loadedMessages = response.messages
          .filter(msg => msg.role === 'user' || response.messages.length > 1)
          .map((msg) => ({
            id: msg.id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            createdAt: new Date(msg.createdAt),
          }));
        
        // Only set messages if there's actual conversation history
        if (loadedMessages.length > 1 || (loadedMessages.length === 1 && loadedMessages[0].role === 'user')) {
          setMessages(loadedMessages);
        }
        
        if (response.isNewConversation) {
          console.log('[CheckIn] New 24-hour conversation thread started');
        } else {
          console.log('[CheckIn] Continuing existing conversation thread');
        }
      } catch (error) {
        console.error('[CheckIn] Failed to start conversation - will retry on first message:', error);
        if (isMounted) {
          // Don't set a temp ID - let the backend create one when the first message is sent
          setConversationId(null);
        }
      }
    };

    startConversation();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
      console.log('[CheckIn] Component unmounting, cleaning up');
    };
  }, []);

  const checkForCrisis = async (message: string): Promise<boolean> => {
    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ isCrisis: boolean; keywords: string[] }>('/api/check-in/detect-crisis', {
        message,
      });
      
      if (response.isCrisis) {
        console.log('[CheckIn] Crisis keywords detected:', response.keywords);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[CheckIn] Failed to check for crisis:', error);
      return false;
    }
  };

  const handleSend = async () => {
    const messageText = inputText.trim();
    if (!messageText || isLoading) {
      return;
    }

    console.log('[CheckIn] User sending message:', messageText);

    // Check for crisis keywords
    const isCrisis = await checkForCrisis(messageText);
    if (isCrisis) {
      setShowCrisisModal(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      console.log('[CheckIn] Sending message to backend with conversationId:', conversationId);
      const response = await authenticatedPost<{ 
        response: string; 
        messageId: string;
        conversationId?: string;
      }>('/api/check-in/message', {
        conversationId: conversationId || undefined,
        message: messageText,
      });
      
      console.log('[CheckIn] AI response received:', response);
      
      // Update conversationId if backend created a new one
      if (response.conversationId && !conversationId) {
        console.log('[CheckIn] Backend created new conversation:', response.conversationId);
        setConversationId(response.conversationId);
      }
      
      const aiMessage: Message = {
        id: response.messageId,
        role: 'assistant',
        content: response.response,
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
      
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    } catch (error) {
      console.error('[CheckIn] Failed to send message:', error);
      setIsLoading(false);
      
      // Show error message to user
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  };

  const handlePrayerIconPress = () => {
    console.log('[CheckIn] User tapped prayer icon');
    setShowPrayerOptions(true);
  };

  const handleGeneratePrayer = async () => {
    console.log('[CheckIn] User requested prayer generation');
    setIsGeneratingPrayer(true);
    setShowPrayerOptions(false);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ prayer: string; prayerId: string }>('/api/check-in/generate-prayer', {
        conversationId,
      });
      
      console.log('[CheckIn] ✅ Prayer generated successfully:', { prayerId: response.prayerId, prayerLength: response.prayer.length });
      setGeneratedPrayer(response.prayer);
      setGeneratedPrayerId(response.prayerId);
      // Reset share state each time a new prayer is generated
      setPrayerShared(false);
      setPrayerSharedConfirm(false);
      console.log('[CheckIn] 🔵 Prayer ID set in state:', response.prayerId);
      setShowPrayerModal(true);
      setIsGeneratingPrayer(false);
    } catch (error) {
      console.error('[CheckIn] ❌ Failed to generate prayer:', error);
      setIsGeneratingPrayer(false);
      Alert.alert('Error', 'Failed to generate prayer. Please try again.');
    }
  };

  const handleShareToCommunity = async () => {
    console.log('[CheckIn] 🔵 handleShareToCommunity called');
    console.log('[CheckIn] 🔵 Prayer text length:', generatedPrayer.length);
    console.log('[CheckIn] 🔵 Anonymous:', shareAnonymous);

    if (!generatedPrayer) {
      console.error('[CheckIn] ❌ No prayer text available for sharing');
      Alert.alert('Error', 'No prayer to share. Please generate a prayer first.');
      return;
    }

    setIsSharing(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      console.log('[CheckIn] 🔵 POST /api/community/posts with category: prayer');

      const requestBody = {
        content: generatedPrayer,
        category: 'prayer',
        anonymous: false,
      };
      console.log('[CheckIn] 🔵 Request body:', requestBody);

      const response = await authenticatedPost('/api/community/posts', requestBody);

      console.log('[CheckIn] ✅ Prayer shared to community successfully!', response);

      setShowShareModal(false);
      setShowPrayerModal(false);
      setIsSharing(false);
      setPrayerShared(true);

      // Show celebratory success modal
      setShowPrayerSuccessModal(true);
    } catch (error: any) {
      console.error('[CheckIn] ❌ Failed to share prayer:', error);
      console.error('[CheckIn] ❌ Error details:', {
        message: error?.message,
        response: error?.response,
        status: error?.status
      });
      setIsSharing(false);
      const errorMessage = error?.message || 'Failed to share prayer. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleSharePrayerDirect = async () => {
    console.log('[CheckIn] User tapped "Share with community" on prayer modal');
    if (prayerShared) {
      console.log('[CheckIn] Prayer already shared, ignoring tap');
      return;
    }
    if (!generatedPrayer) {
      console.error('[CheckIn] ❌ No prayer text available for sharing');
      Alert.alert('Error', 'No prayer to share. Please generate a prayer first.');
      return;
    }

    setIsSharing(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      console.log('[CheckIn] 🔵 POST /api/community/posts — category: prayer, anonymous: false');

      const response = await authenticatedPost('/api/community/posts', {
        content: generatedPrayer,
        category: 'prayer',
        anonymous: false,
      });

      console.log('[CheckIn] ✅ Prayer shared to community successfully!', response);

      setIsSharing(false);
      setPrayerShared(true);
      setPrayerSharedConfirm(true);

      // Hide confirmation after 3 seconds then close modal and show success
      setTimeout(() => {
        setPrayerSharedConfirm(false);
        setShowPrayerModal(false);
        setShowPrayerSuccessModal(true);
      }, 3000);
    } catch (error: any) {
      console.error('[CheckIn] ❌ Failed to share prayer:', error);
      setIsSharing(false);
      const errorMessage = error?.message || 'Failed to share prayer. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleRequestCare = () => {
    console.log('[CheckIn] User opening care request modal');
    setShowCareModal(true);
  };

  const handleSubmitCareRequest = async () => {
    const requestText = careRequestText.trim();
    if (!requestText) {
      Alert.alert('Required', 'Please share what you need care for.');
      return;
    }

    console.log('[CheckIn] 🔵 User submitting care request', { anonymous: careAnonymous });
    setIsSubmittingCare(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      console.log('[CheckIn] 🔵 POST /api/community/posts with category: care');

      const response = await authenticatedPost('/api/community/posts', {
        content: requestText,
        category: 'care',
        isAnonymous: careAnonymous,
      });

      console.log('[CheckIn] ✅ Care request submitted successfully!', response);
      setShowCareModal(false);
      setCareRequestText('');
      setIsSubmittingCare(false);

      // Show celebratory success modal
      setShowCareSuccessModal(true);
    } catch (error: any) {
      console.error('[CheckIn] ❌ Failed to submit care request:', error);
      console.error('[CheckIn] ❌ Error details:', {
        message: error?.message,
        response: error?.response,
        status: error?.status
      });
      setIsSubmittingCare(false);
      const errorMessage = error?.message || 'Failed to share care request. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleShareMessage = async () => {
    if (!selectedMessageContent) {
      console.error('[CheckIn] ❌ No message content selected for sharing');
      return;
    }

    console.log('[CheckIn] 🔵 User sharing AI message to Wisdom feed', {
      contentLength: selectedMessageContent.length,
      anonymous: messageShareAnonymous,
    });
    setIsSharingMessage(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      console.log('[CheckIn] 🔵 POST /api/community/posts with category: wisdom');

      const response = await authenticatedPost('/api/community/posts', {
        content: selectedMessageContent,
        category: 'wisdom',
        isAnonymous: messageShareAnonymous,
      });

      console.log('[CheckIn] ✅ AI message shared to Wisdom feed successfully!', response);
      setShowMessageShareModal(false);
      setSelectedMessageId('');
      setSelectedMessageContent('');
      setMessageShareAnonymous(false);
      setIsSharingMessage(false);

      // Show inline confirmation then navigate
      Alert.alert(
        'Shared with community',
        'This reflection now appears in the Wisdom tab.',
        [
          {
            text: 'View Community',
            onPress: () => {
              console.log('[CheckIn] User navigating to community Wisdom tab');
              setTimeout(() => {
                try {
                  router.navigate('/(tabs)/community');
                } catch (navError) {
                  console.error('[CheckIn] Navigation error:', navError);
                  router.replace('/(tabs)');
                }
              }, 100);
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      console.error('[CheckIn] ❌ Failed to share AI message:', error);
      console.error('[CheckIn] ❌ Error details:', {
        message: error?.message,
        response: error?.response,
        status: error?.status,
      });
      setIsSharingMessage(false);
      const errorMessage = error?.message || 'Failed to share message. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleAcknowledgeCrisis = () => {
    console.log('[CheckIn] User acknowledged crisis resources');
    setShowCrisisModal(false);
  };

  const handleCall988 = () => {
    console.log('[CheckIn] User tapping to call 988');
    Linking.openURL('tel:988');
  };

  const handleTextCrisisLine = () => {
    console.log('[CheckIn] User tapping to text Crisis Line');
    Linking.openURL('sms:741741&body=HOME');
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const messageContent = item.content;

    return (
      <View style={[styles.messageContainer, isUser && styles.messageContainerUser]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.messageBubbleUser : [styles.messageBubbleAssistant, { backgroundColor: bgColor }]
        ]}>
          {isUser ? (
            <Text style={[styles.messageText, styles.messageTextUser]}>
              {messageContent}
            </Text>
          ) : (
            <React.Fragment>
              <View style={styles.aiMessageContent}>
                <Text style={[styles.aiMessageText, { color: textColor }]}>
                  {messageContent}
                </Text>
              </View>
              {companionName && (
                <Text style={[styles.companionSignature, { color: textSecondaryColor }]}>
                  — {companionName}
                </Text>
              )}
            </React.Fragment>
          )}
        </View>
        {!isUser && (
          <TouchableOpacity 
            style={styles.shareMessageButton}
            onPress={() => {
              console.log('[CheckIn] User tapped share icon for message:', item.id);
              setSelectedMessageId(item.id);
              setSelectedMessageContent(item.content);
              setShowMessageShareModal(true);
            }}
          >
            <IconSymbol 
              ios_icon_name="square.and.arrow.up"
              android_material_icon_name="share"
              size={18}
              color={textSecondaryColor}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyStateContent}>
          <View style={styles.iconContainer}>
            <IconSymbol
              ios_icon_name="heart.text.square.fill"
              android_material_icon_name="favorite"
              size={64}
              color={colors.primary}
            />
          </View>

          <Text style={[styles.emptyStateTitle, { color: textColor }]}>
            A gentle space for reflection
          </Text>

          <Text style={[styles.groundingBreath, { color: textSecondaryColor }]}>
            Take a breath.
          </Text>

          <View style={styles.groundingLines}>
            <Text style={[styles.groundingLine, { color: textSecondaryColor }]}>
              I'm here with you.
            </Text>
            <Text style={[styles.groundingLine, { color: textSecondaryColor }]}>
              You can share whatever is on your heart.
            </Text>
            <Text style={[styles.groundingLine, { color: textSecondaryColor }]}>
              There's no right way to begin.
            </Text>
          </View>

          <View style={styles.disclaimerContainer}>
            <Text style={[styles.disclaimerText, { color: textSecondaryColor }]}>
              {"This is not therapy or medical care. If you're in crisis, please reach out to 988 Lifeline or text HOME to 741741."}
            </Text>
          </View>
        </View>
    );
  };

  const categories = [
    { id: 'prayers' as const, label: 'Prayers', icon: 'church' as const },
    { id: 'wisdom' as const, label: 'Wisdom', icon: 'menu-book' as const },
    { id: 'care' as const, label: 'Care', icon: 'favorite' as const },
    { id: 'feed' as const, label: 'Feed', icon: 'home' as const },
  ];

  const prayerIconColor = isDark ? '#6ee7b7' : 'rgba(4,120,87,0.75)';
  const careIconColor = isDark ? '#6ee7b7' : 'rgba(4,120,87,0.75)';
  const labelColor = isDark ? '#d4d4d8' : 'rgba(120,113,108,0.75)';
  
  const headerTitle = companionName ? `Conversation with ${companionName}` : 'Heart Conversation';

  const headerHeight = Platform.OS === 'ios' ? (insets.top + 44) : (StatusBar.currentHeight ?? 24) + 56;

  return (
    <GradientBackground>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: headerTitle,
          headerBackTitle: '',
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: '#047857',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '400' as const,
            color: isDark ? '#fafaf9' : '#1c1917',
            fontFamily: 'Georgia',
          },
          tabBarStyle: { display: 'none' },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => { console.log('[CheckIn] Back button pressed'); router.back(); }}
              style={{ paddingRight: 8, flexDirection: 'row', alignItems: 'center' }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronLeft size={24} color="#047857" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                onPress={handlePrayerIconPress}
                style={styles.headerButtonContainer}
                disabled={isGeneratingPrayer}
              >
                <IconSymbol 
                  ios_icon_name="hands.sparkles"
                  android_material_icon_name="auto-awesome"
                  size={24}
                  color={prayerIconColor}
                />
                <Text style={[styles.headerButtonLabel, { color: labelColor }]}>
                  Prayer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleRequestCare}
                style={styles.headerButtonContainer}
              >
                <IconSymbol 
                  ios_icon_name="heart.fill"
                  android_material_icon_name="favorite"
                  size={24}
                  color={careIconColor}
                />
                <Text style={[styles.headerButtonLabel, { color: labelColor }]}>
                  Care
                </Text>
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        {messages.length === 0 ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.emptyStateScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderEmptyState()}
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={[styles.messagesList, { paddingBottom: 16 }]}
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onContentSizeChange={() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }}
          />
        )}

        <View style={[styles.inputContainer, {
          backgroundColor: inputBg,
          borderTopColor: inputBorder,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        }]}>
          <TextInput
            style={[styles.input, {
              backgroundColor: isDark ? colors.cardDark : colors.card,
              borderColor: inputBorder,
              color: textColor,
            }]}
            placeholder="What's on your heart?"
            placeholderTextColor={textSecondaryColor}
            value={inputText}
            onChangeText={setInputText}
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            multiline={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => { console.log('[CheckIn] Send button pressed'); handleSend(); }}
            disabled={!inputText.trim() || isLoading}
          >
            <IconSymbol
              ios_icon_name="arrow.up"
              android_material_icon_name="send"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

        {/* Crisis Resources Modal */}
        <Modal
          visible={showCrisisModal}
          transparent
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <View style={styles.modalHeader}>
                <IconSymbol 
                  ios_icon_name="heart.fill"
                  android_material_icon_name="favorite"
                  size={32}
                  color={colors.primary}
                />
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  {"You're Not Alone"}
                </Text>
              </View>
              
              <Text style={[styles.modalText, { color: textColor }]}>
                {"It sounds like you're going through something really difficult. Please know that support is available right now."}
              </Text>

              <View style={styles.crisisButtons}>
                <TouchableOpacity 
                  style={[styles.crisisButton, { backgroundColor: colors.primary }]}
                  onPress={handleCall988}
                >
                  <IconSymbol 
                    ios_icon_name="phone.fill"
                    android_material_icon_name="phone"
                    size={24}
                    color="#FFFFFF"
                  />
                  <Text style={styles.crisisButtonText}>
                    Call 988 Lifeline
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.crisisButton, { backgroundColor: colors.accent }]}
                  onPress={handleTextCrisisLine}
                >
                  <IconSymbol 
                    ios_icon_name="message.fill"
                    android_material_icon_name="message"
                    size={24}
                    color="#FFFFFF"
                  />
                  <Text style={styles.crisisButtonText}>
                    Text HOME to 741741
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.acknowledgeButton}
                onPress={handleAcknowledgeCrisis}
              >
                <Text style={[styles.acknowledgeButtonText, { color: colors.primary }]}>
                  I understand
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Prayer Options Modal */}
        <Modal
          visible={showPrayerOptions}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPrayerOptions(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPrayerOptions(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <View style={styles.modalHeader}>
                <IconSymbol 
                  ios_icon_name="hands.sparkles"
                  android_material_icon_name="auto-awesome"
                  size={32}
                  color={colors.primary}
                />
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Generate Prayer
                </Text>
              </View>
              
              <Text style={[styles.modalText, { color: textSecondaryColor }]}>
                {"I can craft a prayer from our conversation—something short, honest, and rooted in what you've shared. It will be written in your own voice, naming what's real for you right now."}
              </Text>
              
              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleGeneratePrayer}
              >
                <Text style={styles.primaryButtonText}>
                  Create Prayer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowPrayerOptions(false)}
              >
                <Text style={[styles.cancelButtonText, { color: textSecondaryColor }]}>
                  Maybe later
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Generated Prayer Modal */}
        <Modal
          visible={showPrayerModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPrayerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
              <View style={styles.modalHeader}>
                <IconSymbol 
                  ios_icon_name="hands.sparkles"
                  android_material_icon_name="auto-awesome"
                  size={32}
                  color={colors.primary}
                />
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Your Prayer
                </Text>
              </View>
              
              <ScrollView style={styles.prayerScroll} nestedScrollEnabled scrollEnabled>
                <Text style={[styles.prayerText, { color: textColor }]}>
                  {generatedPrayer}
                </Text>
              </ScrollView>

              <Text style={[styles.prayerNote, { color: textSecondaryColor }]}>
                You can pray this aloud, edit it, or simply let it rest with you.
              </Text>

              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 12, opacity: isSharing ? 0.7 : 1 }]}
                onPress={() => {
                  console.log('[CheckIn] User tapped "Share with Community" button');
                  handleSharePrayerDirect();
                }}
                activeOpacity={0.7}
                disabled={isSharing || prayerShared}
              >
                <IconSymbol 
                  ios_icon_name="square.and.arrow.up"
                  android_material_icon_name="share"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryButtonText}>
                  {isSharing ? 'Sharing...' : prayerShared ? 'Shared!' : 'Share with Community'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  console.log('[CheckIn] User keeping prayer private');
                  setShowPrayerModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: textSecondaryColor }]}>
                  Keep Private
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Share to Community Modal */}
        <Modal
          visible={showShareModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowShareModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.shareModalContent, { backgroundColor: cardBg }]}>
              <View style={styles.modalHeader}>
                <IconSymbol 
                  ios_icon_name="square.and.arrow.up"
                  android_material_icon_name="share"
                  size={32}
                  color={colors.primary}
                />
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Share with Community
                </Text>
              </View>

              <Text style={[styles.modalText, { color: textSecondaryColor }]}>
                Choose where to share your prayer:
              </Text>

              <View style={styles.categoryGrid}>
                {categories.map(category => {
                  const isSelected = shareCategory === category.id;
                  const categoryLabel = category.label;
                  
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryCard,
                        { backgroundColor: inputBg, borderColor: inputBorder },
                        isSelected && [styles.categoryCardSelected, { backgroundColor: colors.primary, borderColor: colors.primary }]
                      ]}
                      onPress={() => {
                        console.log('[CheckIn] 🔵 User selected category:', category.id);
                        setShareCategory(category.id);
                      }}
                    >
                      <IconSymbol 
                        ios_icon_name={category.icon}
                        android_material_icon_name={category.icon}
                        size={32}
                        color={isSelected ? '#FFFFFF' : colors.primary}
                      />
                      <Text style={[
                        styles.categoryLabel,
                        { color: isSelected ? '#FFFFFF' : textColor }
                      ]}>
                        {categoryLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity 
                style={styles.anonymousToggle}
                onPress={() => {
                  console.log('[CheckIn] 🔵 User toggled anonymous:', !shareAnonymous);
                  setShareAnonymous(!shareAnonymous);
                }}
              >
                <IconSymbol 
                  ios_icon_name={shareAnonymous ? 'checkmark.square.fill' : 'square'}
                  android_material_icon_name={shareAnonymous ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color={colors.primary}
                />
                <Text style={[styles.anonymousLabel, { color: textColor }]}>
                  Share anonymously
                </Text>
              </TouchableOpacity>

              <View style={styles.shareActions}>
                <TouchableOpacity 
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    console.log('[CheckIn] 🔵 User clicked final "Share" button');
                    handleShareToCommunity();
                  }}
                  disabled={isSharing}
                >
                  {isSharing ? (
                    <Text style={styles.primaryButtonText}>
                      Sharing...
                    </Text>
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Share
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    console.log('[CheckIn] 🔵 User cancelled sharing');
                    setShowShareModal(false);
                  }}
                  disabled={isSharing}
                >
                  <Text style={[styles.cancelButtonText, { color: textSecondaryColor }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Care Request Modal - FIXED FOR KEYBOARD */}
        <Modal
          visible={showCareModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowCareModal(false);
            setCareRequestText('');
            setCareAnonymous(false);
          }}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
            keyboardVerticalOffset={0}
          >
            <TouchableOpacity 
              style={styles.modalOverlayInner}
              activeOpacity={1}
              onPress={() => {
                setShowCareModal(false);
                setCareRequestText('');
                setCareAnonymous(false);
              }}
            >
              <TouchableOpacity 
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
                style={styles.careModalWrapper}
              >
                <View style={[styles.careModalContainer, { backgroundColor: cardBg }]}>
                  <ScrollView 
                    style={styles.careModalScrollView}
                    contentContainerStyle={styles.careModalContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                    <View style={styles.modalHeader}>
                      <IconSymbol 
                        ios_icon_name="heart.fill"
                        android_material_icon_name="favorite"
                        size={32}
                        color={colors.primary}
                      />
                      <Text style={[styles.modalTitle, { color: textColor }]}>
                        Request Care
                      </Text>
                    </View>

                    <Text style={[styles.modalText, { color: textSecondaryColor }]}>
                      Share what you need care for. The community can send you encouragement and prayers.
                    </Text>

                    <TextInput
                      style={[styles.careInput, { 
                        backgroundColor: inputBg,
                        borderColor: inputBorder,
                        color: textColor 
                      }]}
                      placeholder="What do you need care for?"
                      placeholderTextColor={textSecondaryColor}
                      value={careRequestText}
                      onChangeText={setCareRequestText}
                      multiline
                      maxLength={500}
                      numberOfLines={6}
                      textAlignVertical="top"
                    />

                    <TouchableOpacity 
                      style={styles.anonymousToggle}
                      onPress={() => setCareAnonymous(!careAnonymous)}
                    >
                      <IconSymbol 
                        ios_icon_name={careAnonymous ? 'checkmark.square.fill' : 'square'}
                        android_material_icon_name={careAnonymous ? 'check-box' : 'check-box-outline-blank'}
                        size={24}
                        color={colors.primary}
                      />
                      <Text style={[styles.anonymousLabel, { color: textColor }]}>
                        Share anonymously
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.shareActions}>
                      <TouchableOpacity 
                        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                        onPress={handleSubmitCareRequest}
                        disabled={isSubmittingCare}
                      >
                        {isSubmittingCare ? (
                          <Text style={styles.primaryButtonText}>
                            Sharing...
                          </Text>
                        ) : (
                          <Text style={styles.primaryButtonText}>
                            Share
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={() => {
                          setShowCareModal(false);
                          setCareRequestText('');
                          setCareAnonymous(false);
                        }}
                        disabled={isSubmittingCare}
                      >
                        <Text style={[styles.cancelButtonText, { color: textSecondaryColor }]}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

        {/* Celebratory Care Success Modal */}
        <Modal
          visible={showCareSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowCareSuccessModal(false);
            setCareAnonymous(false);
          }}
        >
          <View style={styles.celebrationOverlay}>
            <View style={styles.celebrationModal}>
              {/* Decorative hearts */}
              <View style={styles.decorativeHeartTopLeft}>
                <Text style={styles.decorativeHeartText}>
                  ♡
                </Text>
              </View>
              <View style={styles.decorativeHeartBottomRight}>
                <Text style={styles.decorativeHeartText}>
                  ♡
                </Text>
              </View>
              
              {/* Sparkle decorations */}
              <View style={styles.sparkleTopRight}>
                <Text style={styles.sparkleText}>
                  ✨
                </Text>
              </View>
              <View style={styles.sparkleBottomLeft}>
                <Text style={styles.sparkleText}>
                  ✨
                </Text>
              </View>

              {/* Main icon with circle background */}
              <View style={styles.celebrationIconContainer}>
                <View style={styles.celebrationIconCircle}>
                  <IconSymbol 
                    ios_icon_name="message.fill"
                    android_material_icon_name="chat"
                    size={48}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.celebrationSparkle}>
                  <Text style={styles.celebrationSparkleText}>
                    ✨
                  </Text>
                </View>
              </View>

              {/* Title */}
              <Text style={[styles.celebrationTitle, { color: textColor }]}>
                Your Request is Shared 🎉
              </Text>

              {/* Subtitle */}
              <Text style={[styles.celebrationSubtitle, { color: textSecondaryColor }]}>
                The community will be able to send you encouragement
              </Text>

              {/* Anonymous note */}
              {careAnonymous && (
                <Text style={[styles.celebrationAnonymousNote, { color: textSecondaryColor }]}>
                  (shared anonymously)
                </Text>
              )}

              {/* Reassurance box */}
              <View style={styles.celebrationReassuranceBox}>
                <Text style={[styles.celebrationReassuranceText, { color: textColor }]}>
                  You are not alone. The community is here to hold you with gentle care and support.
                </Text>
              </View>

              {/* Continue button */}
              <TouchableOpacity 
                style={styles.celebrationButton}
                onPress={() => {
                  console.log('[CheckIn] User closing celebration modal');
                  setShowCareSuccessModal(false);
                  setCareAnonymous(false);
                }}
              >
                <Text style={styles.celebrationButtonText}>
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Celebratory Prayer Success Modal - GREEN THEME */}
        <Modal
          visible={showPrayerSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowPrayerSuccessModal(false);
            setShareAnonymous(false);
          }}
        >
          <View style={styles.prayerCelebrationOverlay}>
            <View style={styles.prayerCelebrationModal}>
              {/* Decorative hearts */}
              <View style={styles.prayerDecorativeHeartTopLeft}>
                <Text style={styles.prayerDecorativeHeartText}>
                  ♡
                </Text>
              </View>
              <View style={styles.prayerDecorativeHeartBottomRight}>
                <Text style={styles.prayerDecorativeHeartText}>
                  ♡
                </Text>
              </View>
              
              {/* Sparkle decorations */}
              <View style={styles.prayerSparkleTopRight}>
                <Text style={styles.prayerSparkleText}>
                  ✨
                </Text>
              </View>
              <View style={styles.prayerSparkleBottomLeft}>
                <Text style={styles.prayerSparkleText}>
                  ✨
                </Text>
              </View>

              {/* Main icon with circle background */}
              <View style={styles.prayerCelebrationIconContainer}>
                <View style={styles.prayerCelebrationIconCircle}>
                  <IconSymbol 
                    ios_icon_name="person.3.fill"
                    android_material_icon_name="group"
                    size={48}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.prayerCelebrationSparkle}>
                  <Text style={styles.prayerCelebrationSparkleText}>
                    ✨
                  </Text>
                </View>
              </View>

              {/* Title */}
              <Text style={[styles.prayerCelebrationTitle, { color: textColor }]}>
                Thank you for sharing 🙏
              </Text>

              {/* Subtitle */}
              <Text style={[styles.prayerCelebrationSubtitle, { color: textSecondaryColor }]}>
                Your prayer has been shared with the community
              </Text>

              {/* Anonymous note */}
              {shareAnonymous && (
                <Text style={[styles.prayerCelebrationAnonymousNote, { color: textSecondaryColor }]}>
                  (shared anonymously)
                </Text>
              )}

              {/* Reassurance box */}
              <View style={styles.prayerCelebrationReassuranceBox}>
                <Text style={[styles.prayerCelebrationReassuranceText, { color: textColor }]}>
                  Your prayer may comfort and encourage someone who needs it today. Thank you for sharing your heart with the community.
                </Text>
              </View>

              {/* Continue button */}
              <TouchableOpacity 
                style={styles.prayerCelebrationButton}
                onPress={() => {
                  console.log('[CheckIn] User closing prayer celebration modal');
                  setShowPrayerSuccessModal(false);
                  setShareAnonymous(false);
                }}
              >
                <Text style={styles.prayerCelebrationButtonText}>
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Floating Tab Bar */}
        {/* FloatingTabBar hidden on this screen */}

        {/* Share AI Message Modal - Wisdom Only */}
        <Modal
          visible={showMessageShareModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowMessageShareModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.shareModalContent, { backgroundColor: cardBg }]}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setShowMessageShareModal(false);
                  setSelectedMessageId('');
                  setSelectedMessageContent('');
                  setMessageShareAnonymous(false);
                }}
              >
                <IconSymbol 
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={textSecondaryColor}
                />
              </TouchableOpacity>

              <View style={styles.modalHeader}>
                <IconSymbol 
                  ios_icon_name="heart.fill"
                  android_material_icon_name="favorite"
                  size={32}
                  color={colors.primary}
                />
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  Share to Community Wisdom
                </Text>
              </View>

              <Text style={[styles.modalText, { color: textColor }]}>
                This message touched your heart. Would you like to share it with the community so others can be encouraged?
              </Text>

              <View style={styles.messagePreviewContainer}>
                <Text style={[styles.messagePreviewText, { color: textSecondaryColor }]} numberOfLines={4}>
                  {selectedMessageContent}
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.anonymousToggle}
                onPress={() => setMessageShareAnonymous(!messageShareAnonymous)}
              >
                <IconSymbol 
                  ios_icon_name={messageShareAnonymous ? 'checkmark.square.fill' : 'square'}
                  android_material_icon_name={messageShareAnonymous ? 'check-box' : 'check-box-outline-blank'}
                  size={24}
                  color={colors.primary}
                />
                <Text style={[styles.anonymousLabel, { color: textColor }]}>
                  {"Share anonymously (don't show my name)"}
                </Text>
              </TouchableOpacity>

              <View style={styles.shareActions}>
                <TouchableOpacity 
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  onPress={handleShareMessage}
                  disabled={isSharingMessage}
                >
                  {isSharingMessage ? (
                    <Text style={styles.primaryButtonText}>
                      Sharing...
                    </Text>
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Share
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowMessageShareModal(false);
                    setSelectedMessageId('');
                    setSelectedMessageContent('');
                    setMessageShareAnonymous(false);
                  }}
                  disabled={isSharingMessage}
                >
                  <Text style={[styles.cancelButtonText, { color: textSecondaryColor }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Floating Tab Bar */}

    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flex: 1,
  },
  messagesArea: {
    flex: 1,
    minHeight: 0,
  },
  messagesFlatList: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  emptyStateContainer: {
    flex: 1,
  },
  emptyStateScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyStateContent: {
    alignItems: 'center',
    gap: 0,
  },
  iconContainer: {
    marginBottom: 28,
    opacity: 0.85,
  },
  groundingBreath: {
    fontSize: 14,
    opacity: 0.5,
    marginTop: 6,
    marginBottom: 28,
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 32,
    lineHeight: 30,
  },
  groundingLines: {
    marginTop: 32,
    alignItems: 'center',
    gap: 14,
    marginBottom: 36,
  },
  groundingLine: {
    marginBottom: 16,
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    fontStyle: 'italic',
    opacity: 0.9,
  },
  softNoteContainerUnused: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 48,
  },
  softNoteText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.65,
  },
  disclaimerContainer: {
    marginTop: 32,
    opacity: 0.65,
    paddingHorizontal: 8,
  },
  disclaimerText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    opacity: 0.45,
  },
  messagesList: {
    paddingTop: 100,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingBottom: 0,
    flexGrow: 1,
  },
  emptyStateContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  emptyStateContent: {
    alignItems: 'center',
    maxWidth: 500,
    width: '100%',
  },
  iconContainer: {
    marginTop: 120,
    marginBottom: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  groundingLines: {
    width: '100%',
    marginBottom: 36,
    paddingHorizontal: spacing.md,
    gap: 20,
  },
  groundingLine: {
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center' as const,
    fontFamily: 'Georgia',
    letterSpacing: 0.1,
  },
  softLines: {
    width: '100%',
    marginBottom: 36,
    paddingHorizontal: spacing.lg,
    gap: 14,
  },
  softLine: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center' as const,
    opacity: 0.7,
    letterSpacing: 0.1,
  },
  emptyStateSubtitle: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: spacing.xl,
  },
  guidanceContainer: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  guidanceTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
  },
  guidanceText: {
    fontSize: typography.small,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  disclaimerContainer: {
    marginTop: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  disclaimerText: {
    fontSize: typography.small,
    textAlign: 'center',
    lineHeight: 20,
  },
  messagesList: {
    paddingTop: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    paddingBottom: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  messageContainerUser: {
    justifyContent: 'flex-end',
  },
  shareMessageButton: {
    padding: spacing.xs,
    marginBottom: spacing.xs,
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  messageBubbleAssistant: {
    borderWidth: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  messageBubbleUser: {
    backgroundColor: colors.primary,
  },
  messageText: {
    fontSize: typography.body,
    lineHeight: 22,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  aiMessageContent: {
    width: '100%',
  },
  aiMessageText: {
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  companionSignature: {
    fontSize: typography.small,
    fontStyle: 'italic',
    marginTop: spacing.md,
    textAlign: 'left',
  },
  inputContainer: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
    marginBottom: 80, // Add margin for FloatingTabBar
  },
  input: {
    height: 44,
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    height: 44,
    borderWidth: 1,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginRight: spacing.sm,
  },
  headerButtonContainer: {
    opacity: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  headerButtonLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: typography.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalOverlayInner: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  careModalWrapper: {
    width: '100%',
    maxHeight: '90%',
  },
  careModalContainer: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '100%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  careModalScrollView: {
    maxHeight: '100%',
  },
  careModalContent: {
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
  },
  modalContent: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  shareModalContent: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.xs,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  modalText: {
    fontSize: typography.body,
    lineHeight: 24,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  messagePreviewContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messagePreviewText: {
    fontSize: typography.small,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  crisisButtons: {
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  crisisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    minHeight: 60,
  },
  crisisButtonText: {
    color: '#FFFFFF',
    fontSize: typography.h4,
    fontWeight: typography.semibold,
  },
  acknowledgeButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  acknowledgeButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  cancelButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.body,
  },
  prayerScroll: {
    maxHeight: 300,
    marginBottom: spacing.md,
  },
  prayerText: {
    fontSize: typography.body,
    lineHeight: 28,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  prayerNote: {
    fontSize: typography.small,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  prayerActions: {
    gap: spacing.xs,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  categoryCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  categoryCardSelected: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryLabel: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    marginTop: spacing.sm,
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  anonymousLabel: {
    fontSize: typography.body,
  },
  shareActions: {
    gap: spacing.xs,
  },
  careInput: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    minHeight: 120,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  // Celebratory Care Modal Styles (Pink)
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  celebrationModal: {
    backgroundColor: '#FFF5F7',
    borderRadius: 24,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  decorativeHeartTopLeft: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  decorativeHeartBottomRight: {
    position: 'absolute',
    bottom: 80,
    right: 20,
  },
  decorativeHeartText: {
    fontSize: 24,
    color: '#FFB6C1',
  },
  sparkleTopRight: {
    position: 'absolute',
    top: 30,
    right: 30,
  },
  sparkleBottomLeft: {
    position: 'absolute',
    bottom: 90,
    left: 30,
  },
  sparkleText: {
    fontSize: 20,
    color: '#FFD700',
  },
  celebrationIconContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  celebrationIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  celebrationSparkle: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  celebrationSparkleText: {
    fontSize: 32,
    color: '#FFD700',
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B1538',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  celebrationSubtitle: {
    fontSize: 16,
    color: '#57534e',
    textAlign: 'center',
    marginBottom: spacing.xs,
    lineHeight: 22,
  },
  celebrationAnonymousNote: {
    fontSize: 14,
    color: '#E91E63',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  celebrationReassuranceBox: {
    backgroundColor: '#FFF0F3',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#FFD6E0',
  },
  celebrationReassuranceText: {
    fontSize: 14,
    color: '#57534e',
    textAlign: 'center',
    lineHeight: 20,
  },
  celebrationButton: {
    backgroundColor: '#E91E63',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 28,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  celebrationButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  // Celebratory Prayer Modal Styles (Green/Mint)
  prayerCelebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  prayerCelebrationModal: {
    backgroundColor: '#F0F9F4',
    borderRadius: 24,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  prayerDecorativeHeartTopLeft: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  prayerDecorativeHeartBottomRight: {
    position: 'absolute',
    bottom: 80,
    right: 20,
  },
  prayerDecorativeHeartText: {
    fontSize: 24,
    color: '#B8E6CC',
  },
  prayerSparkleTopRight: {
    position: 'absolute',
    top: 30,
    right: 30,
  },
  prayerSparkleBottomLeft: {
    position: 'absolute',
    bottom: 90,
    left: 30,
  },
  prayerSparkleText: {
    fontSize: 20,
    color: '#FFD700',
  },
  prayerCelebrationIconContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  prayerCelebrationIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4A9B6E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A9B6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  prayerCelebrationSparkle: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  prayerCelebrationSparkleText: {
    fontSize: 32,
    color: '#FFD700',
  },
  prayerCelebrationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D5F45',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  prayerCelebrationSubtitle: {
    fontSize: 16,
    color: '#57534e',
    textAlign: 'center',
    marginBottom: spacing.xs,
    lineHeight: 22,
  },
  prayerCelebrationAnonymousNote: {
    fontSize: 14,
    color: '#4A9B6E',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  prayerCelebrationReassuranceBox: {
    backgroundColor: '#E8F5ED',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#C8E6D4',
  },
  prayerCelebrationReassuranceText: {
    fontSize: 14,
    color: '#57534e',
    textAlign: 'center',
    lineHeight: 20,
  },
  prayerCelebrationButton: {
    backgroundColor: '#4A9B6E',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 28,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#4A9B6E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  prayerCelebrationButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
