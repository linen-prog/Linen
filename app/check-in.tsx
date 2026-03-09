
import { IconSymbol } from '@/components/IconSymbol';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Modal, TextInput, Linking, FlatList } from 'react-native';
import { StreamdownRN } from 'streamdown-rn';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { Stack, useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/GradientBackground';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: typography.fontFamily,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerActionButton: {
    padding: spacing.xs,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl * 2,
  },
  heartIcon: {
    marginBottom: spacing.xl,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  welcomeDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    fontFamily: typography.fontFamily,
  },
  expectationsSection: {
    width: '100%',
    marginTop: spacing.lg,
  },
  expectationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    fontFamily: typography.fontFamily,
  },
  expectationItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    paddingLeft: spacing.md,
  },
  bulletPoint: {
    fontSize: 16,
    color: colors.textSecondary,
    marginRight: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  expectationText: {
    flex: 1,
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    fontFamily: typography.fontFamily,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl * 2,
    marginTop: spacing.xl,
    alignSelf: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: typography.fontFamily,
  },
  chatContainer: {
    flex: 1,
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
  const [hasStarted, setHasStarted] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    console.log('CheckInScreen mounted - ready to load conversation history');
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleStartConversation = () => {
    setHasStarted(true);
  };

  const handlePrayerPress = () => {
    setShowPrayerModal(true);
  };

  const handleCarePress = () => {
    setShowCareModal(true);
  };

  const handleCommunityPress = () => {
    router.push('/(tabs)/community');
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

    if (checkForCrisis(userMessage.content)) {
      setIsLoading(false);
      return;
    }

    console.log('Sending message to companion:', userMessage.content);

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

  const handleGeneratePrayer = () => {
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

  const handleSubmitCareRequest = () => {
    console.log('Submitting care request:', careRequestText);
    setCareRequestText('');
    setShowCareModal(false);
  };

  const handleShareMessage = () => {
    console.log('Sharing message to community');
    setShowShareModal(false);
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

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <IconSymbol 
            ios_icon_name="arrow.left" 
            android_material_icon_name="arrow-back" 
            size={24} 
            color={colors.text} 
          />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Heart Conversation</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handlePrayerPress} style={styles.headerActionButton}>
            <IconSymbol 
              ios_icon_name="hands.sparkles" 
              android_material_icon_name="favorite-border" 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleCarePress} style={styles.headerActionButton}>
            <IconSymbol 
              ios_icon_name="heart" 
              android_material_icon_name="favorite" 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {!hasStarted && messages.length === 0 ? (
        <ScrollView contentContainerStyle={styles.welcomeContainer}>
          <View style={styles.heartIcon}>
            <IconSymbol 
              ios_icon_name="heart.fill" 
              android_material_icon_name="favorite" 
              size={80} 
              color={colors.primary} 
            />
          </View>
          
          <Text style={styles.welcomeTitle}>A gentle space for reflection</Text>
          
          <Text style={styles.welcomeDescription}>
            I'm here to listen with compassion and gentle presence. Share what's on your heart—your joys, struggles, questions, or simply what you're noticing in this moment.
          </Text>
          
          <View style={styles.expectationsSection}>
            <Text style={styles.expectationsTitle}>What to expect:</Text>
            
            <View style={styles.expectationItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.expectationText}>
                I'll help you notice what's happening in your body
              </Text>
            </View>
            
            <View style={styles.expectationItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.expectationText}>
                We'll explore sensations, emotions, and patterns together
              </Text>
            </View>
            
            <View style={styles.expectationItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.expectationText}>
                Scripture and prayer may weave naturally into our conversation
              </Text>
            </View>
            
            <View style={styles.expectationItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.expectationText}>
                I'm not here to fix or advise, but to witness and companion
              </Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={handleStartConversation} style={styles.startButton}>
            <Text style={styles.startButtonText}>Begin</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <KeyboardAvoidingView 
          style={styles.chatContainer} 
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
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={styles.inputContainer}>
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
      )}

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
      </SafeAreaView>
    </GradientBackground>
  );
}
