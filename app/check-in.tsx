
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Modal, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
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
  console.log('User viewing Check-In screen');
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [showPrayerOptions, setShowPrayerOptions] = useState(false);
  const [generatedPrayer, setGeneratedPrayer] = useState<string>('');
  const [isGeneratingPrayer, setIsGeneratingPrayer] = useState(false);

  useEffect(() => {
    const startConversation = async () => {
      try {
        const { authenticatedPost } = await import('@/utils/api');
        const response = await authenticatedPost<{ 
          conversationId: string; 
          messages: Array<{ role: string; content: string; createdAt: string }>;
          isNewConversation: boolean;
        }>('/api/check-in/start', {});
        console.log('Conversation started:', response);
        setConversationId(response.conversationId);
        
        // Load existing messages or use initial message
        const loadedMessages = response.messages.map((msg, index) => ({
          id: `${index}`,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          createdAt: new Date(msg.createdAt),
        }));
        
        setMessages(loadedMessages);
        
        if (response.isNewConversation) {
          console.log('New 24-hour conversation thread started');
        } else {
          console.log('Continuing existing conversation thread');
        }
      } catch (error) {
        console.error('Failed to start conversation:', error);
        // Use default message on error
        setConversationId('temp-conversation-id');
        setMessages([{
          id: '1',
          role: 'assistant',
          content: 'Peace to you. What\'s on your heart today?',
          createdAt: new Date(),
        }]);
      }
    };

    startConversation();
  }, []);

  // Always use light theme colors
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
        console.log('Crisis keywords detected:', response.keywords);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to check for crisis:', error);
      return false;
    }
  };

  const handleSend = async () => {
    const messageText = inputText.trim();
    if (!messageText || isLoading) {
      return;
    }

    console.log('User sending message:', messageText);

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
      const response = await authenticatedPost<{ response: string; messageId: string }>('/api/check-in/message', {
        conversationId,
        message: messageText,
      });
      
      console.log('AI response received:', response);
      
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
      console.error('Failed to send message:', error);
      setIsLoading(false);
      // Optionally show an error message to the user
    }

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleGeneratePrayer = async () => {
    console.log('User requested prayer generation');
    setIsGeneratingPrayer(true);
    setShowPrayerOptions(false);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ prayer: string; prayerId: string }>('/api/check-in/generate-prayer', {
        conversationId,
      });
      
      console.log('Prayer generated:', response);
      setGeneratedPrayer(response.prayer);
      setShowPrayerModal(true);
      setIsGeneratingPrayer(false);
    } catch (error) {
      console.error('Failed to generate prayer:', error);
      setIsGeneratingPrayer(false);
    }
  };

  const handleAcknowledgeCrisis = () => {
    console.log('User acknowledged crisis resources');
    setShowCrisisModal(false);
  };

  const handleCall988 = () => {
    console.log('User tapping to call 988');
    Linking.openURL('tel:988');
  };

  const handleTextCrisisLine = () => {
    console.log('User tapping to text Crisis Line');
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
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Check-In',
          headerBackTitle: 'Home',
          headerStyle: {
            backgroundColor: bgColor,
          },
          headerTintColor: colors.primary,
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => setShowPrayerOptions(true)}
              style={styles.headerButton}
              disabled={messages.length < 3 || isGeneratingPrayer}
            >
              <IconSymbol 
                ios_icon_name="hands.sparkles"
                android_material_icon_name="auto-awesome"
                size={24}
                color={messages.length < 3 ? textSecondaryColor : colors.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

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
                  size={20}
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
                  size={20}
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
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Generate Prayer
            </Text>
            <Text style={[styles.modalText, { color: textSecondaryColor }]}>
              I can craft a prayer from our conversation—something short, honest, and rooted in what you&apos;ve shared.
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
                Cancel
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

            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                console.log('User closed prayer modal');
                setShowPrayerModal(false);
              }}
            >
              <Text style={styles.primaryButtonText}>
                Close
              </Text>
            </TouchableOpacity>
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
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: spacing.sm,
  },
  messageContainerUser: {
    justifyContent: 'flex-end',
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
  headerButton: {
    marginRight: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
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
  crisisButtons: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  crisisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  crisisButtonText: {
    color: '#FFFFFF',
    fontSize: typography.body,
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
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
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
    marginBottom: spacing.lg,
  },
  prayerText: {
    fontSize: typography.body,
    lineHeight: 26,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
