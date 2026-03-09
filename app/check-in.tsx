
import { IconSymbol } from '@/components/IconSymbol';
import FloatingTabBar from '@/components/FloatingTabBar';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Modal, ScrollView, Linking, Alert } from 'react-native';
import { StreamdownRN } from 'streamdown-rn';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing
} from 'react-native-reanimated';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';

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

const ENCOURAGING_MESSAGES = [
  "Each reflection below is held with care and prayer ✨",
  "You are not alone in this journey 🕊️",
  "Every word here is received with gentleness 💚",
  "This is a sacred space for your heart 🌿",
  "Your reflections are held in prayer 🙏",
  "Peace be with you as you share 💫",
  "God walks with you in this moment ✨",
  "You are seen, heard, and loved 💚"
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    fontFamily: typography.fontFamily,
  },
  exitButton: {
    padding: spacing.xs,
  },
  encouragementText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  messagesContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  messageContainer: {
    marginBottom: spacing.lg,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: typography.fontFamily,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: colors.text,
  },
  messageTime: {
    fontSize: 12,
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  assistantMessageTime: {
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: typography.fontFamily,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: typography.fontFamily,
    minHeight: 44,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  prayerButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  modalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 24,
    fontFamily: typography.fontFamily,
  },
  prayerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prayerText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  prayerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  prayerActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  prayerActionButtonActive: {
    backgroundColor: colors.primary,
  },
  prayerActionText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: typography.fontFamily,
  },
  prayerActionTextActive: {
    color: '#FFFFFF',
  },
  generatePrayerButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  generatePrayerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily,
  },
  closeModalButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  crisisCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  crisisTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#856404',
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  crisisText: {
    fontSize: 16,
    color: '#856404',
    lineHeight: 24,
    marginBottom: spacing.md,
    fontFamily: typography.fontFamily,
  },
  crisisButtons: {
    gap: spacing.sm,
  },
  crisisButton: {
    backgroundColor: '#856404',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  crisisButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#856404',
  },
  crisisButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily,
  },
  crisisButtonTextSecondary: {
    color: '#856404',
  },
  shareOptionsContainer: {
    gap: spacing.md,
  },
  shareOption: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shareOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  shareOptionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: typography.fontFamily,
  },
  shareButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily,
  },
  careRequestInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
    textAlignVertical: 'top',
    fontFamily: typography.fontFamily,
    marginBottom: spacing.md,
  },
});

export default function CheckInScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPrayerModal, setShowPrayerModal] = useState(false);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCareModal, setShowCareModal] = useState(false);
  const [careRequestText, setCareRequestText] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [encouragementMessage] = useState(
    ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)]
  );
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Load conversation history
    // TODO: Backend Integration - GET /api/check-in/messages to load conversation history
    console.log('CheckInScreen mounted - ready to load conversation history');
  }, []);

  const handleExit = () => {
    router.back();
  };

  const checkForCrisis = (message: string): boolean => {
    const crisisKeywords = [
      'suicide', 'kill myself', 'end my life', 'want to die',
      'hurt myself', 'self harm', 'no reason to live'
    ];
    
    const lowerMessage = message.toLowerCase();
    const hasCrisisKeyword = crisisKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (hasCrisisKeyword) {
      setShowCrisisModal(true);
      return true;
    }
    
    return false;
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Check for crisis keywords
    if (checkForCrisis(userMessage.content)) {
      setIsLoading(false);
      return;
    }

    // TODO: Backend Integration - POST /api/check-in/messages with { message: userMessage.content }
    // The backend should use the Linen system prompt for gentle, non-directive responses
    console.log('Sending message to companion:', userMessage.content);

    // Simulate AI response for now
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I hear you. Take your time... there is no rush here. What feels most present for you right now?',
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handlePrayerIconPress = () => {
    setShowPrayerModal(true);
  };

  const handleGeneratePrayer = () => {
    // TODO: Backend Integration - POST /api/check-in/generate-prayer
    console.log('Generating prayer from conversation');
    
    const newPrayer: Prayer = {
      id: Date.now().toString(),
      content: 'God of all comfort, I bring before you the weight I carry today. Help me to rest in your presence and trust in your gentle guidance. Amen.',
      createdAt: new Date(),
      isSaid: false,
      isShared: false,
    };
    
    setPrayers(prev => [...prev, newPrayer]);
  };

  const handleShareToCommunity = () => {
    setShowPrayerModal(false);
    setShowShareModal(true);
  };

  const handleRequestCare = () => {
    setShowShareModal(false);
    setShowCareModal(true);
  };

  const handleSubmitCareRequest = () => {
    // TODO: Backend Integration - POST /api/community/care-request with { message: careRequestText }
    console.log('Submitting care request:', careRequestText);
    setCareRequestText('');
    setShowCareModal(false);
    Alert.alert('Sent', 'Your request for care has been shared with the community.');
  };

  const handleShareMessage = () => {
    // TODO: Backend Integration - POST /api/community/posts with selected message
    console.log('Sharing message to community');
    setShowShareModal(false);
    Alert.alert('Shared', 'Your reflection has been shared with the community.');
  };

  const handleAcknowledgeCrisis = () => {
    setShowCrisisModal(false);
  };

  const handleCall988 = () => {
    Linking.openURL('tel:988');
  };

  const handleTextCrisisLine = () => {
    Linking.openURL('sms:741741');
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const timeString = item.createdAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        {isUser ? (
          <>
            <Text style={[styles.messageText, styles.userMessageText]}>{item.content}</Text>
            <Text style={[styles.messageTime, styles.userMessageTime]}>{timeString}</Text>
          </>
        ) : (
          <>
            <StreamdownRN theme="light">
              {item.content}
            </StreamdownRN>
            <Text style={[styles.messageTime, styles.assistantMessageTime]}>{timeString}</Text>
          </>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <IconSymbol 
          ios_icon_name="heart.circle.fill" 
          android_material_icon_name="favorite" 
          size={64} 
          color={colors.primary} 
        />
      </View>
      <Text style={styles.emptyTitle}>A Gentle Space</Text>
      <Text style={styles.emptySubtitle}>
        This is a place for reflection, prayer, and presence. Share what's on your heart, and I will listen with care.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Check-In</Text>
          <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
            <IconSymbol 
              ios_icon_name="xmark.circle.fill" 
              android_material_icon_name="close" 
              size={28} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.encouragementText}>{encouragementMessage}</Text>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          ListEmptyComponent={renderEmptyState}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={handlePrayerIconPress} style={styles.prayerButton}>
            <IconSymbol 
              ios_icon_name="hands.sparkles" 
              android_material_icon_name="favorite-border" 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Share what's on your heart..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity 
            onPress={handleSend} 
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
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

      {/* Prayer Modal */}
      <Modal
        visible={showPrayerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrayerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Prayers</Text>
            <Text style={styles.modalSubtitle}>
              These prayers are held with care. You may keep them private or share them with the community.
            </Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {prayers.map(prayer => (
                <View key={prayer.id} style={styles.prayerCard}>
                  <Text style={styles.prayerText}>{prayer.content}</Text>
                  <View style={styles.prayerActions}>
                    <TouchableOpacity 
                      style={[styles.prayerActionButton, prayer.isSaid && styles.prayerActionButtonActive]}
                    >
                      <IconSymbol 
                        ios_icon_name="checkmark.circle" 
                        android_material_icon_name="check-circle" 
                        size={20} 
                        color={prayer.isSaid ? '#FFFFFF' : colors.text} 
                      />
                      <Text style={[styles.prayerActionText, prayer.isSaid && styles.prayerActionTextActive]}>
                        Prayed
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.prayerActionButton, prayer.isShared && styles.prayerActionButtonActive]}
                      onPress={handleShareToCommunity}
                    >
                      <IconSymbol 
                        ios_icon_name="square.and.arrow.up" 
                        android_material_icon_name="share" 
                        size={20} 
                        color={prayer.isShared ? '#FFFFFF' : colors.text} 
                      />
                      <Text style={[styles.prayerActionText, prayer.isShared && styles.prayerActionTextActive]}>
                        Share
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              
              <TouchableOpacity onPress={handleGeneratePrayer} style={styles.generatePrayerButton}>
                <Text style={styles.generatePrayerButtonText}>Generate Prayer</Text>
              </TouchableOpacity>
            </ScrollView>
            
            <TouchableOpacity onPress={() => setShowPrayerModal(false)} style={styles.closeModalButton}>
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Crisis Modal */}
      <Modal
        visible={showCrisisModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCrisisModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.crisisCard}>
              <Text style={styles.crisisTitle}>You Are Not Alone</Text>
              <Text style={styles.crisisText}>
                If you're in crisis or need immediate support, please reach out to trained professionals who can help.
              </Text>
              <View style={styles.crisisButtons}>
                <TouchableOpacity onPress={handleCall988} style={styles.crisisButton}>
                  <Text style={styles.crisisButtonText}>Call 988 (Suicide & Crisis Lifeline)</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleTextCrisisLine} style={[styles.crisisButton, styles.crisisButtonSecondary]}>
                  <Text style={[styles.crisisButtonText, styles.crisisButtonTextSecondary]}>
                    Text "HELLO" to 741741 (Crisis Text Line)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAcknowledgeCrisis} style={[styles.crisisButton, styles.crisisButtonSecondary]}>
                  <Text style={[styles.crisisButtonText, styles.crisisButtonTextSecondary]}>
                    Continue Conversation
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Share with Community</Text>
            <Text style={styles.modalSubtitle}>
              Your reflection will be held with care and prayer by the community.
            </Text>
            
            <View style={styles.shareOptionsContainer}>
              <TouchableOpacity onPress={handleShareMessage} style={styles.shareOption}>
                <Text style={styles.shareOptionTitle}>Share Reflection</Text>
                <Text style={styles.shareOptionDescription}>
                  Share this moment with the community for prayer and support
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleRequestCare} style={styles.shareOption}>
                <Text style={styles.shareOptionTitle}>Request Care</Text>
                <Text style={styles.shareOptionDescription}>
                  Ask for specific prayers or encouragement from the community
                </Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity onPress={() => setShowShareModal(false)} style={styles.closeModalButton}>
              <Text style={styles.closeModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Care Request Modal */}
      <Modal
        visible={showCareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Request Care</Text>
            <Text style={styles.modalSubtitle}>
              Share what kind of support would be most helpful right now.
            </Text>
            
            <TextInput
              style={styles.careRequestInput}
              value={careRequestText}
              onChangeText={setCareRequestText}
              placeholder="What would be most helpful for you right now?"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={500}
            />
            
            <TouchableOpacity 
              onPress={handleSubmitCareRequest} 
              style={styles.shareButton}
              disabled={!careRequestText.trim()}
            >
              <Text style={styles.shareButtonText}>Send Request</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setShowCareModal(false)} style={styles.closeModalButton}>
              <Text style={styles.closeModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <FloatingTabBar
        tabs={[
          { name: 'Home', icon: 'house', route: '/(tabs)/(home)' },
          { name: 'Community', icon: 'person.2', route: '/(tabs)/community' },
          { name: 'Profile', icon: 'person.crop.circle', route: '/(tabs)/profile' },
        ]}
      />
    </SafeAreaView>
  );
}
