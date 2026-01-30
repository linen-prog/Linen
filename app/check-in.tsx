
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Modal, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { StreamdownRN } from 'streamdown-rn';

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

export default function CheckInScreen() {
  console.log('[CheckIn] User viewing Check-In screen');
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [showPrayerOptions, setShowPrayerOptions] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCareModal, setShowCareModal] = useState(false);
  const [showCareShareModal, setShowCareShareModal] = useState(false);
  const [generatedPrayer, setGeneratedPrayer] = useState<string>('');
  const [generatedPrayerId, setGeneratedPrayerId] = useState<string>('');
  const [isGeneratingPrayer, setIsGeneratingPrayer] = useState(false);
  const [shareCategory, setShareCategory] = useState<'feed' | 'wisdom' | 'care' | 'prayers'>('prayers');
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

  useEffect(() => {
    const startConversation = async () => {
      try {
        console.log('[CheckIn] Starting check-in conversation...');
        const { authenticatedPost } = await import('@/utils/api');
        const response = await authenticatedPost<{ 
          conversationId: string; 
          messages: { id: string; role: string; content: string; createdAt: string }[];
          isNewConversation: boolean;
        }>('/api/check-in/start', {});
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
        // Don't set a temp ID - let the backend create one when the first message is sent
        setConversationId(null);
      }
    };

    startConversation();
  }, []);

  const bgColor = colors.background;
  const textColor = colors.text;
  const textSecondaryColor = colors.textSecondary;
  const cardBg = colors.card;
  const inputBg = colors.card;
  const inputBorder = colors.border;

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
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('[CheckIn] Failed to send message:', error);
      setIsLoading(false);
      
      // Show error message to user
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I&apos;m having trouble responding right now. Please try again in a moment.',
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
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
    console.log('[CheckIn] 🔵 Prayer ID:', generatedPrayerId);
    console.log('[CheckIn] 🔵 Category:', shareCategory);
    console.log('[CheckIn] 🔵 Anonymous:', shareAnonymous);
    
    if (!generatedPrayerId) {
      console.error('[CheckIn] ❌ No prayer ID available for sharing');
      Alert.alert('Error', 'No prayer to share. Please generate a prayer first.');
      return;
    }
    
    setIsSharing(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      console.log('[CheckIn] 🔵 Calling /api/check-in/share-prayer endpoint...');
      
      const requestBody = {
        prayerId: generatedPrayerId,
        category: shareCategory,
        isAnonymous: shareAnonymous,
      };
      console.log('[CheckIn] 🔵 Request body:', requestBody);
      
      const response = await authenticatedPost('/api/check-in/share-prayer', requestBody);
      
      console.log('[CheckIn] ✅ Prayer shared to community successfully!', response);
      
      setShowShareModal(false);
      setShowPrayerModal(false);
      setIsSharing(false);
      
      const categoryLabel = shareCategory.charAt(0).toUpperCase() + shareCategory.slice(1);
      
      // Show success message with option to view community
      Alert.alert(
        'Shared!',
        `Your prayer has been shared with the community in the ${categoryLabel} tab.`,
        [
          {
            text: 'View Community',
            onPress: () => {
              console.log('[CheckIn] User navigating to community page');
              router.push('/(tabs)/community');
            }
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
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
      console.log('[CheckIn] 🔵 Calling /api/check-in/request-care endpoint...');
      
      const response = await authenticatedPost('/api/check-in/request-care', {
        content: requestText,
        isAnonymous: careAnonymous,
      });
      
      console.log('[CheckIn] ✅ Care request submitted successfully!', response);
      setShowCareModal(false);
      setCareRequestText('');
      setCareAnonymous(false);
      setIsSubmittingCare(false);
      
      // Show success message with option to view community
      Alert.alert(
        'Shared!',
        'Your care request has been shared with the community in the Care tab.',
        [
          {
            text: 'View Community',
            onPress: () => {
              console.log('[CheckIn] User navigating to community page');
              router.push('/(tabs)/community');
            }
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
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
    if (!selectedMessageId) {
      console.error('[CheckIn] ❌ No message ID selected for sharing');
      return;
    }

    console.log('[CheckIn] 🔵 User sharing AI message to Wisdom feed', { 
      messageId: selectedMessageId, 
      messageIdType: typeof selectedMessageId,
      anonymous: messageShareAnonymous 
    });
    setIsSharingMessage(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      console.log('[CheckIn] 🔵 Calling /api/check-in/share-message endpoint with messageId:', selectedMessageId);
      
      const response = await authenticatedPost('/api/check-in/share-message', {
        messageId: selectedMessageId,
        category: 'wisdom',
        isAnonymous: messageShareAnonymous,
      });
      
      console.log('[CheckIn] ✅ AI message shared to Wisdom feed successfully!', response);
      setShowMessageShareModal(false);
      setSelectedMessageId('');
      setSelectedMessageContent('');
      setMessageShareAnonymous(false);
      setIsSharingMessage(false);
      
      // Show success message with option to view community
      Alert.alert(
        'Shared!',
        'This reflection has been shared with the community in the Wisdom tab.',
        [
          {
            text: 'View Community',
            onPress: () => {
              console.log('[CheckIn] User navigating to community page');
              router.push('/(tabs)/community');
            }
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
    } catch (error: any) {
      console.error('[CheckIn] ❌ Failed to share AI message:', error);
      console.error('[CheckIn] ❌ Error details:', {
        message: error?.message,
        response: error?.response,
        status: error?.status
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
          isUser ? styles.messageBubbleUser : [styles.messageBubbleAssistant, { backgroundColor: cardBg }]
        ]}>
          {isUser ? (
            <Text style={[styles.messageText, styles.messageTextUser]}>
              {messageContent}
            </Text>
          ) : (
            <StreamdownRN theme="light">
              {messageContent}
            </StreamdownRN>
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
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyStateContent}>
          <View style={styles.iconContainer}>
            <IconSymbol 
              ios_icon_name="heart.text.square.fill"
              android_material_icon_name="favorite"
              size={72}
              color={colors.primary}
            />
          </View>
          
          <Text style={[styles.emptyStateTitle, { color: textColor }]}>
            A gentle space for reflection
          </Text>
          
          <Text style={[styles.emptyStateSubtitle, { color: textSecondaryColor }]}>
            I&apos;m here to listen with compassion and gentle presence. Share what&apos;s on your heart—your joys, struggles, questions, or simply what you&apos;re noticing in this moment.
          </Text>

          <View style={styles.guidanceContainer}>
            <Text style={[styles.guidanceTitle, { color: textColor }]}>
              What to expect:
            </Text>
            <Text style={[styles.guidanceText, { color: textSecondaryColor }]}>
              • I&apos;ll help you notice what&apos;s happening in your body
            </Text>
            <Text style={[styles.guidanceText, { color: textSecondaryColor }]}>
              • We&apos;ll explore sensations, emotions, and patterns together
            </Text>
            <Text style={[styles.guidanceText, { color: textSecondaryColor }]}>
              • Scripture and prayer may weave naturally into our conversation
            </Text>
            <Text style={[styles.guidanceText, { color: textSecondaryColor }]}>
              • I&apos;m not here to fix or advise, but to witness and companion
            </Text>
          </View>
          
          <View style={styles.disclaimerContainer}>
            <Text style={[styles.disclaimerText, { color: textSecondaryColor }]}>
              This is not therapy or medical care. If you&apos;re in crisis, please reach out to 988 Lifeline or text HOME to 741741.
            </Text>
          </View>
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

  const prayerIconColor = colors.primary;
  const careIconColor = colors.primary;
  const labelColor = colors.textSecondary;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Heart Conversation',
          headerBackTitle: 'Home',
          headerStyle: {
            backgroundColor: bgColor,
          },
          headerTintColor: colors.primary,
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        <View style={[styles.inputContainer, { 
          backgroundColor: bgColor,
          borderTopColor: inputBorder 
        }]}>
          <TextInput
            style={[styles.input, { 
              backgroundColor: inputBg,
              borderColor: inputBorder,
              color: textColor 
            }]}
            placeholder="Share what's on your heart..."
            placeholderTextColor={textSecondaryColor}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={handleSend}
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
                You&apos;re Not Alone
              </Text>
            </View>
            
            <Text style={[styles.modalText, { color: textColor }]}>
              It sounds like you&apos;re going through something really difficult. Please know that support is available right now.
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
              I can craft a prayer from our conversation—something short, honest, and rooted in what you&apos;ve shared. It will be written in your own voice, naming what&apos;s real for you right now.
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
            
            <ScrollView style={styles.prayerScroll}>
              <Text style={[styles.prayerText, { color: textColor }]}>
                {generatedPrayer}
              </Text>
            </ScrollView>

            <Text style={[styles.prayerNote, { color: textSecondaryColor }]}>
              You can pray this aloud, edit it, or simply let it rest with you.
            </Text>

            <View style={styles.prayerActions}>
              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  console.log('[CheckIn] 🔵 User clicked "Share with Community" button in prayer modal');
                  console.log('[CheckIn] 🔵 Current prayer ID:', generatedPrayerId);
                  if (!generatedPrayerId) {
                    console.error('[CheckIn] ❌ Prayer ID is empty when trying to share!');
                    Alert.alert('Error', 'Prayer ID is missing. Please try generating the prayer again.');
                    return;
                  }
                  setShowShareModal(true);
                }}
              >
                <IconSymbol 
                  ios_icon_name="square.and.arrow.up"
                  android_material_icon_name="share"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryButtonText}>
                  Share with Community
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  console.log('[CheckIn] User keeping prayer private');
                  setShowPrayerModal(false);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: textSecondaryColor }]}>
                  Keep Private
                </Text>
              </TouchableOpacity>
            </View>
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
                Share anonymously (don&apos;t show my name)
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyStateContent: {
    alignItems: 'center',
    maxWidth: 500,
    width: '100%',
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    textAlign: 'center',
    marginBottom: spacing.md,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.md,
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
    maxWidth: '80%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  messageBubbleAssistant: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body,
    maxHeight: 100,
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
});
