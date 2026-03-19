
/**
 * Community Screen - Tab-based content sharing
 * 
 * DATA FLOW DOCUMENTATION:
 * 
 * Feed Tab:
 * - Shows reflections shared from Daily Gift page (app/daily-gift.tsx) when category: 'feed' is selected
 * - Shows prayers shared from Check-In page (app/check-in.tsx) when category: 'feed' is selected
 * - Creates posts with contentType: 'daily-gift' or 'companion' and category: 'feed'
 * 
 * Wisdom Tab:
 * - Shows reflections shared from Daily Gift page (app/daily-gift.tsx) when category: 'wisdom' is selected
 * - Shows prayers shared from Check-In page (app/check-in.tsx) when category: 'wisdom' is selected
 * - Creates posts with contentType: 'daily-gift' or 'companion' and category: 'wisdom'
 * 
 * Care Tab:
 * - Shows reflections shared from Daily Gift page (app/daily-gift.tsx) when category: 'care' is selected
 * - Shows prayers shared from Check-In page (app/check-in.tsx) when category: 'care' is selected
 * - Creates posts with contentType: 'daily-gift' or 'companion' and category: 'care'
 * 
 * Prayers Tab:
 * - Shows reflections shared from Daily Gift page (app/daily-gift.tsx) when category: 'prayers' is selected
 * - Shows prayers shared from Check-In page (app/check-in.tsx) when category: 'prayers' is selected
 * - Creates posts with contentType: 'daily-gift' or 'companion' and category: 'prayers'
 * 
 * My Shared Tab:
 * - Shows all posts created by the current user
 * - Includes both Daily Gift reflections and Check-In prayers from all categories
 * - Fetched from /api/community/my-posts endpoint
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Modal, Pressable, Image, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/GradientBackground';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface Post {
  id: string;
  authorName: string | null;
  isAnonymous: boolean;
  category: string;
  content: string;
  prayerCount: number;
  createdAt: Date;
  userHasPrayed: boolean;
  contentType?: 'companion' | 'daily-gift' | 'somatic' | 'manual';
  scriptureReference?: string;
  isFlagged?: boolean;
  userId?: string;
  reactions: {
    praying: number;
    holding: number;
    light: number;
    amen: number;
    growing: number;
    peace: number;
  };
  userReactions: string[];
  artworkUrl?: string | null;
}

interface CareMessage {
  id: string;
  message: string;
  senderName: string | null;
  isAnonymous: boolean;
  postContent: string;
  createdAt: Date;
}

interface CommunityStats {
  sharedToday: number;
  liftedInPrayer: number;
}

export default function CommunityScreen() {
  console.log('User viewing Community screen');

  const router = useRouter();
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<CommunityStats>({ sharedToday: 0, liftedInPrayer: 0 });
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [showCareModal, setShowCareModal] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [careMessages, setCareMessages] = useState<CareMessage[]>([]);
  const [isLoadingCareMessages, setIsLoadingCareMessages] = useState(false);
  const [selectedCareMessage, setSelectedCareMessage] = useState<string>('');
  const [careAnonymous, setCareAnonymous] = useState(false);

  // Encouragement state
  const [showEncouragementModal, setShowEncouragementModal] = useState(false);
  const [encouragementEntryId, setEncouragementEntryId] = useState<string | null>(null);
  const [selectedEncouragementId, setSelectedEncouragementId] = useState<number | null>(null);
  const [selectedEncouragement, setSelectedEncouragement] = useState('');
  const [isSendingEncouragement, setIsSendingEncouragement] = useState(false);
  const [showEncouragementSentToast, setShowEncouragementSentToast] = useState(false);
  const [showEncouragementCelebration, setShowEncouragementCelebration] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[Community] Tab changed to:', selectedTab);
    if (selectedTab === 'care' && user) {
      // Only load care messages if user is authenticated
      loadCareMessages();
    }
    loadPosts(selectedTab);
    loadStats();
  }, [selectedTab, user]);

  const loadStats = async () => {
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const response = await authenticatedGet<CommunityStats>('/api/community/stats');
      console.log('[Community] Stats loaded:', response);
      setStats(response);
    } catch (error) {
      console.error('[Community] Failed to load community stats:', error);
    }
  };

  const loadPosts = async (category: string) => {
    console.log('[Community] 🔵 Loading posts for category:', category);
    setIsLoading(true);
    
    try {
      const { authenticatedGet } = await import('@/utils/api');
      
      let allPosts: Post[] = [];
      
      if (category === 'my-shared') {
        const endpoint = '/api/community/my-posts';
        console.log('[Community] 🔵 Fetching user\'s shared posts from:', endpoint);
        allPosts = await authenticatedGet<Post[]>(endpoint);
      } else if (category === 'feed') {
        // For feed tab, fetch posts from ALL categories (feed, wisdom, care, prayers)
        console.log('[Community] 🔵 Fetching posts from ALL categories for feed');
        const categories = ['feed', 'wisdom', 'care', 'prayers'];
        const categoryPromises = categories.map(cat => 
          authenticatedGet<Post[]>(`/api/community/posts?category=${cat}`)
        );
        const categoryResults = await Promise.all(categoryPromises);
        
        // Combine all posts from all categories
        allPosts = categoryResults.flat();
        
        // Sort by createdAt (newest first)
        allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        console.log('[Community] ✅ Combined posts from all categories:', allPosts.length, 'posts');
      } else {
        // For specific category tabs (wisdom, care, prayers), only show that category
        const endpoint = `/api/community/posts?category=${category}`;
        console.log('[Community] 🔵 Fetching posts from:', endpoint);
        allPosts = await authenticatedGet<Post[]>(endpoint);
      }
      
      console.log('[Community] ✅ Posts loaded for', category, ':', allPosts.length, 'posts');

      const defaultReactions = { praying: 0, holding: 0, light: 0, amen: 0, growing: 0, peace: 0 };

      type RawPost = Record<string, unknown>;
      const mappedPosts: Post[] = (Array.isArray(allPosts) ? allPosts as RawPost[] : []).map((post) => {
        const rawReactions = (post.reactionCounts ?? post.reactions) as Record<string, number> | null | undefined;
        const safeReactions: Post['reactions'] = {
          praying: Number(rawReactions?.praying ?? 0),
          holding: Number(rawReactions?.holding ?? 0),
          light: Number(rawReactions?.light ?? 0),
          amen: Number(rawReactions?.amen ?? 0),
          growing: Number(rawReactions?.growing ?? 0),
          peace: Number(rawReactions?.peace ?? 0),
        };
        return {
          ...(post as Omit<Post, 'reactions' | 'userReactions' | 'createdAt'>),
          createdAt: new Date(post.createdAt as string),
          reactions: safeReactions,
          userReactions: Array.isArray(post.userReactions) ? (post.userReactions as string[]) : [],
        };
      });

      setPosts(mappedPosts);
    } catch (error) {
      console.error('[Community] ❌ Failed to load posts:', error);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePray = async (postId: string) => {
    console.log('[Community] User holding post in prayer:', postId);
    
    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ prayerCount: number; userHasPrayed: boolean }>(`/api/community/pray/${postId}`, {});
      
      console.log('[Community] Prayer toggled:', response);
      if (response.userHasPrayed) {
        triggerPushNotification(postId, 'prayer');
      }
      
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            userHasPrayed: response.userHasPrayed,
            prayerCount: response.prayerCount,
          };
        }
        return post;
      }));
      
      loadStats();
    } catch (error) {
      console.error('[Community] Failed to toggle prayer:', error);
    }
  };

  const handleFlagPost = async (postId: string) => {
    console.log('[Community] User flagging post:', postId);
    
    console.log('[Community] Flag post feature - requires confirmation modal');
    
    try {
      const { authenticatedPost } = await import('@/utils/api');
      await authenticatedPost(`/api/community/flag/${postId}`, {});
      console.log('[Community] Post flagged successfully');
      loadPosts(selectedTab);
    } catch (error) {
      console.error('[Community] Failed to flag post:', error);
    }
  };

  const handleReact = async (postId: string, reactionType: string) => {
    console.log('[Community] User tapped reaction:', reactionType, 'on post:', postId);
    
    // Check if user is authenticated
    if (!user?.id) {
      console.log('[Community] ⚠️ Guest user cannot react - showing auth prompt');
      setShowAuthPrompt(true);
      setShowReactionPicker(null);
      return;
    }
    
    // Optimistically update the UI — keep picker open
    const previousPosts = [...posts];
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const currentReactions = post.reactions || { praying: 0, holding: 0, light: 0, amen: 0, growing: 0, peace: 0 };
        const currentUserReactions = post.userReactions || [];
        const isTogglingOff = currentUserReactions.includes(reactionType);
        
        const newReactions = { ...currentReactions };
        if (isTogglingOff) {
          newReactions[reactionType as keyof typeof newReactions] = Math.max(0, (newReactions[reactionType as keyof typeof newReactions] || 0) - 1);
        } else {
          newReactions[reactionType as keyof typeof newReactions] = (newReactions[reactionType as keyof typeof newReactions] || 0) + 1;
        }
        
        const newUserReactions = isTogglingOff
          ? currentUserReactions.filter(r => r !== reactionType)
          : [...currentUserReactions, reactionType];
        
        return {
          ...post,
          reactions: newReactions,
          userReactions: newUserReactions,
        };
      }
      return post;
    }));
    
    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ reactionCounts: any; userReactions: string[] }>(
        `/api/community/react/${postId}`,
        { reactionType }
      );
      
      console.log('[Community] ✅ Reaction toggled successfully:', response);
      triggerPushNotification(postId, 'reaction', reactionType);
      
      // Update with actual server response — do NOT close picker
      const serverReactionCounts = response.reactionCounts || {};
      const safeServerReactions: Post['reactions'] = {
        praying: Number(serverReactionCounts.praying ?? 0),
        holding: Number(serverReactionCounts.holding ?? 0),
        light: Number(serverReactionCounts.light ?? 0),
        amen: Number(serverReactionCounts.amen ?? 0),
        growing: Number(serverReactionCounts.growing ?? 0),
        peace: Number(serverReactionCounts.peace ?? 0),
      };
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            reactions: safeServerReactions,
            userReactions: Array.isArray(response.userReactions) ? response.userReactions : [],
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('[Community] ❌ Failed to toggle reaction:', error);
      // Revert optimistic update on error
      setPosts(previousPosts);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        console.log('[Community] ⚠️ Reaction requires authentication - showing auth prompt');
        setShowAuthPrompt(true);
        setShowReactionPicker(null);
      } else {
        console.error('[Community] Unexpected error toggling reaction:', errorMessage);
      }
    }
  };

  const handleDeletePost = async (postId: string) => {
    console.log('[Community] User tapped delete on post:', postId);
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => console.log('[Community] User cancelled post deletion') },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[Community] User confirmed delete for post:', postId);
            try {
              const { authenticatedDelete } = await import('@/utils/api');
              console.log('[Community] DELETE /api/community/posts/', postId);
              await authenticatedDelete(`/api/community/posts/${postId}`);
              console.log('[Community] ✅ Post deleted successfully:', postId);
              setPosts(prev => prev.filter(p => p.id !== postId));
            } catch (error) {
              console.error('[Community] ❌ Failed to delete post:', postId, error);
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          },
        },
      ]
    );
  };

  const loadCareMessages = async () => {
    console.log('[Community] Loading care messages');
    setIsLoadingCareMessages(true);
    
    try {
      const { authenticatedGet } = await import('@/utils/api');
      const response = await authenticatedGet<CareMessage[]>('/api/community/care-messages');
      console.log('[Community] Care messages loaded:', response.length);
      
      setCareMessages(response.map(msg => ({
        ...msg,
        createdAt: new Date(msg.createdAt),
      })));
    } catch (error) {
      console.error('[Community] Failed to load care messages:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's an authentication error
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        console.log('[Community] ⚠️ Authentication required to view care messages');
        // User needs to authenticate to see care messages
        setCareMessages([]);
      } else {
        console.error('[Community] Unexpected error loading care messages:', errorMessage);
        setCareMessages([]);
      }
    } finally {
      setIsLoadingCareMessages(false);
    }
  };

  const ENCOURAGEMENT_MESSAGES = [
    "Your heart is heard and held.",
    "You are not alone in what you're carrying.",
    "May gentleness find you today.",
    "Your feelings are valid and real.",
    "Holy Spirit is tending to you here.",
    "Walking alongside you with love.",
    "Holding you with such care.",
    "May you sense the grace beneath you.",
  ];

  const handleOpenEncouragement = (postId: string) => {
    console.log('[Community] User tapped Send Encouragement for post:', postId);
    if (!user) {
      console.log('[Community] ⚠️ Guest user cannot send encouragement - showing auth prompt');
      setShowAuthPrompt(true);
      return;
    }
    setEncouragementEntryId(postId);
    setSelectedEncouragementId(null);
    setSelectedEncouragement('');
    setShowEncouragementModal(true);
  };

  const handleSendEncouragement = async () => {
    if (!selectedEncouragement || !encouragementEntryId) return;
    console.log('[Community] User sending encouragement to post:', encouragementEntryId, '| message:', selectedEncouragement);
    setIsSendingEncouragement(true);
    try {
      const { authenticatedPost } = await import('@/utils/api');
      const responseData = await authenticatedPost(
        `/api/community/posts/${encouragementEntryId}/encourage`,
        { message: selectedEncouragement }
      );
      console.log('[Community] ✅ Encouragement sent successfully:', responseData);
      setShowEncouragementModal(false);
      setSelectedEncouragement('');
      setSelectedEncouragementId(null);
      setShowEncouragementCelebration(true);
      // Show toast
      setShowEncouragementSentToast(true);
      Animated.sequence([
        Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2400),
        Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setShowEncouragementSentToast(false));
    } catch (error: any) {
      console.error('[Community] ❌ Error sending encouragement:', error);
      const msg = error?.message || '';
      if (msg.includes('requiresUpgrade') || msg.includes('subscription')) {
        Alert.alert('Subscription Required', 'Sending encouragement requires a subscription.');
      } else if (msg.includes('own')) {
        Alert.alert('Cannot encourage your own post', 'You cannot send encouragement to yourself.');
      } else {
        Alert.alert("Couldn't send encouragement", 'Please try again.');
      }
    } finally {
      setIsSendingEncouragement(false);
    }
  };

  const triggerPushNotification = async (postId: string, type: 'care_message' | 'prayer' | 'reaction', reactionType?: string) => {
    try {
      console.log('[Community] Triggering push notification for post:', postId, 'type:', type);
      await authenticatedPost('/api/notifications/trigger', { postId, type, reactionType });
      console.log('[Community] Push notification triggered successfully');
    } catch (error: any) {
      // Non-critical — notification failure should never block the main action
      console.log('[Community] Push notification trigger failed (non-critical):', error?.message || error);
    }
  };

  const handleSendCare = async () => {
    if (!showCareModal || !selectedCareMessage) {
      return;
    }
    
    console.log('[Community] Sending care message to post:', showCareModal);
    
    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost(`/api/community/send-care/${showCareModal}`, {
        message: selectedCareMessage,
        isAnonymous: careAnonymous,
      });
      
      console.log('[Community] ✅ Care message sent successfully:', response);
      triggerPushNotification(showCareModal, 'care_message');
      setShowCareModal(null);
      setSelectedCareMessage('');
      setCareAnonymous(false);
    } catch (error) {
      console.error('[Community] ❌ Failed to send care message:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's an authentication error
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        console.log('[Community] ⚠️ Authentication required - this should not happen as we check before showing modal');
        // Close the modal and show auth prompt
        setShowCareModal(null);
        setSelectedCareMessage('');
        setCareAnonymous(false);
        setShowAuthPrompt(true);
      } else {
        console.error('[Community] Unexpected error sending care message:', errorMessage);
        // Keep modal open so user can try again
      }
    }
  };

  const { isDark } = useTheme();
  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;

  const tabs = [
    { id: 'feed', label: 'Feed', icon: 'favorite' as const },
    { id: 'wisdom', label: 'Wisdom', icon: 'auto-stories' as const },
    { id: 'care', label: 'Care', icon: 'chat' as const },
    { id: 'prayers', label: 'Prayers', icon: 'church' as const },
    { id: 'my-shared', label: 'My Shared', icon: 'share' as const },
  ];

  const sharedTodayText = `${stats.sharedToday}`;
  const liftedInPrayerText = `${stats.liftedInPrayer}`;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'feed':
        return colors.primary;
      case 'wisdom':
        return '#9C27B0';
      case 'care':
        return '#FF5722';
      case 'prayers':
        return '#2196F3';
      default:
        return colors.primary;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'feed':
        return 'Feed';
      case 'wisdom':
        return 'Wisdom';
      case 'care':
        return 'Care';
      case 'prayers':
        return 'Prayers';
      default:
        return category;
    }
  };

  // Helper function to get reaction emoji
  const getReactionEmoji = (reactionType: string) => {
    switch (reactionType) {
      case 'praying':
        return '🙏';
      case 'holding':
        return '💙';
      case 'light':
        return '🕯️';
      case 'amen':
        return '✨';
      case 'growing':
        return '🌱';
      case 'peace':
        return '🕊️';
      default:
        return '';
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* Header Message */}
        <View style={styles.headerMessage}>
          <Text style={styles.headerMessageText}>
            ✨ You are not alone in this journey
          </Text>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: textColor }]}>
            Community
          </Text>
          <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
            A gentle space where hearts meet, prayers are lifted, and encouragement flows freely
          </Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <View style={styles.statDot} />
            <Text style={[styles.statNumber, { color: textColor }]}>
              {sharedTodayText}
            </Text>
            <Text style={[styles.statLabel, { color: textSecondaryColor }]}>
              shared today
            </Text>
          </View>
          <View style={styles.statItem}>
            <IconSymbol 
              ios_icon_name="heart.fill"
              android_material_icon_name="favorite"
              size={16}
              color={colors.prayer}
            />
            <Text style={[styles.statNumber, { color: textColor }]}>
              {liftedInPrayerText}
            </Text>
            <Text style={[styles.statLabel, { color: textSecondaryColor }]}>
              lifted in prayer
            </Text>
          </View>
        </View>

        {/* Tabs Section */}
        <View style={styles.tabsSection}>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {tabs.map(tab => {
              const isSelected = selectedTab === tab.id;
              const tabLabel = tab.label;
              
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tab,
                    isSelected && [styles.tabSelected, { backgroundColor: colors.primary }]
                  ]}
                  onPress={() => {
                    console.log('[Community] User selected tab:', tab.id);
                    setSelectedTab(tab.id);
                  }}
                >
                  <IconSymbol 
                    ios_icon_name={tab.icon}
                    android_material_icon_name={tab.icon}
                    size={16}
                    color={isSelected ? '#FFFFFF' : textSecondaryColor}
                  />
                  <Text style={[
                    styles.tabText,
                    isSelected ? styles.tabTextSelected : { color: textSecondaryColor }
                  ]}>
                    {tabLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Care Message */}
        <View style={styles.careMessage}>
          <Text style={[styles.careMessageText, { color: textSecondaryColor }]}>
            {selectedTab === 'my-shared' 
              ? 'Your shared reflections and prayers ✨'
              : selectedTab === 'feed'
              ? 'All shared reflections, wisdom, care, and prayers from the community ✨'
              : 'Each reflection below is held with care and prayer ✨'
            }
          </Text>
        </View>

        {/* Care Messages Section (only in Care tab) */}
        {selectedTab === 'care' && (
          <View style={styles.careMessagesSection}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Messages You've Received
            </Text>
            {!user ? (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="lock.fill"
                  android_material_icon_name="lock"
                  size={32}
                  color={textSecondaryColor}
                />
                <Text style={[styles.emptyStateText, { color: textSecondaryColor }]}>
                  Sign in to view care messages
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: textSecondaryColor }]}>
                  Create an account to receive and send care messages
                </Text>
                <TouchableOpacity
                  style={[styles.signInButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/auth')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.signInButtonText}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            ) : isLoadingCareMessages ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: textSecondaryColor }]}>
                  Loading messages...
                </Text>
              </View>
            ) : careMessages.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol
                  ios_icon_name="heart"
                  android_material_icon_name="favorite-border"
                  size={32}
                  color={textSecondaryColor}
                />
                <Text style={[styles.emptyStateText, { color: textSecondaryColor }]}>
                  No care messages yet
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: textSecondaryColor }]}>
                  When someone sends you care, it will appear here
                </Text>
              </View>
            ) : (
              careMessages.map(msg => {
                const senderDisplay = msg.isAnonymous ? 'Anonymous' : msg.senderName;
                const timeAgo = formatTimeAgo(msg.createdAt);
                
                return (
                  <View key={msg.id} style={[styles.careMessageCard, { backgroundColor: cardBg }]}>
                    <View style={styles.careMessageHeader}>
                      <IconSymbol
                        ios_icon_name="heart.fill"
                        android_material_icon_name="favorite"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={[styles.careMessageSender, { color: textColor }]}>
                        {senderDisplay}
                      </Text>
                      <Text style={[styles.careMessageTime, { color: textSecondaryColor }]}>
                        {timeAgo}
                      </Text>
                    </View>
                    <Text style={[styles.careMessageText, { color: textColor }]}>
                      {msg.message}
                    </Text>
                    <Text style={[styles.careMessageContext, { color: textSecondaryColor }]}>
                      In response to: {msg.postContent.substring(0, 60)}...
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Posts Section */}
        <View style={styles.postsSection}>
          {isLoading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: textSecondaryColor }]}>
                Loading...
              </Text>
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol 
                ios_icon_name="hands.sparkles"
                android_material_icon_name="favorite-border"
                size={48}
                color={textSecondaryColor}
              />
              <Text style={[styles.emptyStateText, { color: textSecondaryColor }]}>
                {selectedTab === 'my-shared' 
                  ? 'You haven\'t shared anything yet'
                  : 'No posts yet in this category'
                }
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: textSecondaryColor }]}>
                {selectedTab === 'my-shared'
                  ? 'Share from your check-ins, daily gifts, or practices'
                  : 'Share from your check-ins, daily gifts, or practices'
                }
              </Text>
            </View>
          ) : (
            posts.map(post => {
              const authorDisplay = post.isAnonymous ? 'Anonymous' : (post.authorName || 'You');
              const prayerCountText = `${post.prayerCount}`;
              const categoryColor = getCategoryColor(post.category);
              const categoryLabel = getCategoryLabel(post.category);
              
              const reactions = post.reactions || { praying: 0, holding: 0, light: 0, amen: 0, growing: 0, peace: 0 };
              const userReactions = post.userReactions || [];
              const isOwnPost = !!user?.id && post.userId === user.id;
              const activeReactionBadges = (Object.keys(reactions) as (keyof typeof reactions)[]).filter(k => reactions[k] > 0);
              const hasUserReacted = userReactions.length > 0;
              
              return (
                <View key={post.id} style={[styles.postCard, { backgroundColor: cardBg }]}>
                  <View style={styles.postHeader}>
                    <View style={styles.postAuthor}>
                      <IconSymbol 
                        ios_icon_name={post.isAnonymous ? 'person.fill.questionmark' : 'person.fill'}
                        android_material_icon_name={post.isAnonymous ? 'help' : 'person'}
                        size={20}
                        color={textSecondaryColor}
                      />
                      <Text style={[styles.postAuthorName, { color: textSecondaryColor }]}>
                        {authorDisplay}
                      </Text>
                      {(selectedTab === 'my-shared' || selectedTab === 'feed') && post.category !== 'feed' && (
                        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
                          <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
                            {categoryLabel}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.postHeaderActions}>
                      {isOwnPost && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeletePost(post.id)}
                        >
                          <IconSymbol
                            ios_icon_name="trash"
                            android_material_icon_name="delete"
                            size={18}
                            color="#9ca3af"
                          />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity 
                        style={styles.flagButton}
                        onPress={() => handleFlagPost(post.id)}
                      >
                        <IconSymbol 
                          ios_icon_name="flag"
                          android_material_icon_name="flag"
                          size={18}
                          color={textSecondaryColor}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {post.scriptureReference && (
                    <Text style={[styles.scriptureReference, { color: textSecondaryColor }]}>
                      {post.scriptureReference}
                    </Text>
                  )}

                  {post.artworkUrl && post.artworkUrl.trim().length > 0 && (
                    <View style={styles.artworkImageContainer}>
                      {console.log('[Community] 🖼️ Rendering artwork image for post:', post.id, 'URL:', post.artworkUrl)}
                      <Image 
                        source={{ uri: post.artworkUrl }}
                        style={styles.artworkImage}
                        resizeMode="cover"
                        onError={(error) => {
                          console.error('[Community] ❌ Failed to load artwork image for post:', post.id);
                          console.error('[Community] ❌ Artwork URL:', post.artworkUrl);
                          console.error('[Community] ❌ Error:', error.nativeEvent.error);
                        }}
                        onLoad={() => {
                          console.log('[Community] ✅ Artwork image loaded successfully for post:', post.id);
                          console.log('[Community] ✅ Artwork URL:', post.artworkUrl);
                        }}
                      />
                    </View>
                  )}

                  {post.content && post.content.trim().length > 0 && (
                    <Text style={[styles.postContent, { color: textColor }]}>
                      {post.content}
                    </Text>
                  )}

                  <View style={styles.postFooter}>
                    <TouchableOpacity 
                      style={styles.prayButton}
                      onPress={() => handlePray(post.id)}
                    >
                      <IconSymbol 
                        ios_icon_name={post.userHasPrayed ? 'hands.sparkles.fill' : 'hands.sparkles'}
                        android_material_icon_name={post.userHasPrayed ? 'favorite' : 'favorite-border'}
                        size={22}
                        color={post.userHasPrayed ? colors.prayer : textSecondaryColor}
                      />
                      <View style={styles.prayTextContainer}>
                        <Text style={[styles.prayCount, { color: textColor }]}>
                          {prayerCountText}
                        </Text>
                        <Text style={[styles.prayLabel, { color: textSecondaryColor }]}>
                          Held in Prayer
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Reaction Section */}
                  <View style={styles.reactionSection}>
                    <View style={styles.reactionBadgesRow}>
                      {activeReactionBadges.map(reactionKey => {
                        const isUserReaction = userReactions.includes(reactionKey);
                        const reactionCountVal = reactions[reactionKey];
                        const reactionEmoji = getReactionEmoji(reactionKey);
                        const countText = `${reactionCountVal}`;
                        return (
                          <TouchableOpacity
                            key={reactionKey}
                            style={[styles.reactionBadge, isUserReaction && styles.reactionBadgeActive]}
                            onPress={() => {
                              console.log('[Community] User tapped reaction badge:', reactionKey, 'on post:', post.id);
                              handleReact(post.id, reactionKey);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.reactionEmoji}>{reactionEmoji}</Text>
                            <Text style={[styles.reactionCount, { color: isUserReaction ? colors.primary : colors.textSecondary }]}>
                              {countText}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      {!hasUserReacted && (
                        <TouchableOpacity
                          style={styles.reactButton}
                          onPress={() => {
                            console.log('[Community] User tapped React button for post:', post.id);
                            if (!user?.id) {
                              console.log('[Community] ⚠️ Guest user cannot react - showing auth prompt');
                              setShowAuthPrompt(true);
                            } else {
                              setShowReactionPicker(post.id);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.reactButtonEmoji}>
                            😊
                          </Text>
                          <Text style={[styles.reactButtonText, { color: textSecondaryColor }]}>
                            React
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Send Encouragement Button (only for other users' posts) */}
                  {!isOwnPost && (
                    <TouchableOpacity
                      style={styles.encourageButton}
                      onPress={() => handleOpenEncouragement(post.id)}
                      activeOpacity={0.7}
                    >
                      <IconSymbol
                        ios_icon_name="heart"
                        android_material_icon_name="favorite-border"
                        size={18}
                        color="#E8A0A0"
                      />
                      <Text style={styles.encourageButtonText}>
                        Encourage
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Send Care Button (only for care category posts) */}
                  {post.category === 'care' && (
                    <TouchableOpacity
                      style={[styles.sendCareButton, { backgroundColor: colors.primaryLight || '#FFF9E6' }]}
                      onPress={() => {
                        // Check if user is authenticated
                        if (!user) {
                          console.log('[Community] User must authenticate to send care');
                          setShowAuthPrompt(true);
                        } else {
                          setShowCareModal(post.id);
                        }
                      }}
                    >
                      <IconSymbol
                        ios_icon_name="heart.fill"
                        android_material_icon_name="favorite"
                        size={18}
                        color={colors.primary}
                      />
                      <Text style={[styles.sendCareButtonText, { color: colors.primary }]}>
                        Send Care
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Reaction Picker Modal */}
      <Modal
        visible={showReactionPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReactionPicker(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={[styles.reactionPickerModal, { backgroundColor: cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.reactionPickerHeader}>
              <Text style={[styles.reactionPickerTitle, { color: textColor }]}>
                Choose reactions
              </Text>
              <TouchableOpacity onPress={() => {
                console.log('[Community] User tapped Done on reaction picker');
                setShowReactionPicker(null);
              }} hitSlop={8}>
                <Text style={[styles.reactionPickerClose, { color: colors.primary }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            {(() => {
              const pickerPost = posts.find(p => p.id === showReactionPicker);
              const pickerUserReactions = pickerPost?.userReactions || [];
              const reactionOptions = [
                { type: 'praying', emoji: '🙏', label: 'Praying' },
                { type: 'holding', emoji: '💙', label: 'Holding you' },
                { type: 'light', emoji: '🕯️', label: 'Light with you' },
                { type: 'amen', emoji: '✨', label: 'Amen' },
                { type: 'growing', emoji: '🌱', label: 'Growing together' },
                { type: 'peace', emoji: '🕊️', label: 'Peace' },
              ];
              return (
                <View style={styles.reactionGrid}>
                  {reactionOptions.map(opt => {
                    const isActive = pickerUserReactions.includes(opt.type);
                    return (
                      <ReactionPickerOption
                        key={opt.type}
                        emoji={opt.emoji}
                        label={opt.label}
                        isActive={isActive}
                        onPress={() => {
                          console.log('[Community] User selected reaction:', opt.type, 'on post:', showReactionPicker);
                          if (showReactionPicker) {
                            handleReact(showReactionPicker, opt.type);
                          }
                        }}
                        textColor={textColor}
                      />
                    );
                  })}
                </View>
              );
            })()}
          </Pressable>
        </View>
      </Modal>

      {/* Authentication Prompt Modal */}
      <Modal
        visible={showAuthPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAuthPrompt(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowAuthPrompt(false)}
        >
          <Pressable 
            style={[styles.authPromptModal, { backgroundColor: cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.authPromptHeader}>
              <IconSymbol
                ios_icon_name="lock.fill"
                android_material_icon_name="lock"
                size={48}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.authPromptTitle, { color: textColor }]}>
              Sign In Required
            </Text>
            <Text style={[styles.authPromptMessage, { color: textSecondaryColor }]}>
              To react to posts, send care messages, and connect with the community, please sign in or create an account.
            </Text>
            <View style={styles.authPromptButtons}>
              <TouchableOpacity
                style={[styles.authPromptButton, styles.authPromptButtonPrimary]}
                onPress={() => {
                  console.log('[Community] User tapped Sign In from auth prompt');
                  setShowAuthPrompt(false);
                  router.push('/auth');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.authPromptButtonTextPrimary}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authPromptButton, styles.authPromptButtonSecondary]}
                onPress={() => {
                  console.log('[Community] User dismissed auth prompt');
                  setShowAuthPrompt(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.authPromptButtonTextSecondary, { color: textColor }]}>
                  Maybe Later
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Encouragement Toast */}
      {showEncouragementSentToast && (
        <Animated.View style={[styles.encouragementToast, { opacity: toastOpacity }]}>
          <Text style={styles.encouragementToastText}>
            Encouragement sent 🌿
          </Text>
        </Animated.View>
      )}

      {/* Encouragement Modal */}
      <Modal
        visible={showEncouragementModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          console.log('[Community] User closed encouragement modal');
          setShowEncouragementModal(false);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            console.log('[Community] User dismissed encouragement modal by tapping overlay');
            setShowEncouragementModal(false);
          }}
        >
          <Pressable
            style={[styles.encouragementModal, { backgroundColor: cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.encouragementModalHeader}>
              <View style={styles.encouragementModalTitleRow}>
                <IconSymbol
                  ios_icon_name="heart.fill"
                  android_material_icon_name="favorite"
                  size={20}
                  color="#E8A0A0"
                />
                <Text style={[styles.encouragementModalTitle, { color: textColor }]}>
                  Send Encouragement
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  console.log('[Community] User tapped X to close encouragement modal');
                  setShowEncouragementModal(false);
                }}
                hitSlop={8}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={22}
                  color={textSecondaryColor}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.encouragementModalSubtitle, { color: textSecondaryColor }]}>
              Choose a gentle message to send
            </Text>

            {/* Message list */}
            <ScrollView
              style={styles.encouragementMessagesList}
              showsVerticalScrollIndicator={false}
            >
              {ENCOURAGEMENT_MESSAGES.map((msg, idx) => {
                const isSelected = selectedEncouragementId === idx;
                return (
                  <EncouragementMessageOption
                    key={idx}
                    message={msg}
                    isSelected={isSelected}
                    onPress={() => {
                      console.log('[Community] User selected encouragement message:', idx, msg);
                      setSelectedEncouragementId(idx);
                      setSelectedEncouragement(msg);
                    }}
                    textColor={textColor}
                    bgColor={bgColor}
                  />
                );
              })}
              <View style={{ height: 150 }} />
            </ScrollView>

            {/* Send button */}
            <TouchableOpacity
              style={[
                styles.sendEncouragementButton,
                !selectedEncouragement && styles.sendEncouragementButtonDisabled,
              ]}
              onPress={() => {
                console.log('[Community] User tapped Send Encouragement button');
                handleSendEncouragement();
              }}
              disabled={!selectedEncouragement || isSendingEncouragement}
              activeOpacity={0.8}
            >
              <Text style={styles.sendEncouragementButtonText}>
                {isSendingEncouragement ? 'Sending...' : 'Send Encouragement'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Encouragement Celebration Modal */}
      <Modal
        visible={showEncouragementCelebration}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEncouragementCelebration(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEncouragementCelebration(false)}
        >
          <Pressable
            style={[styles.celebrationCard, { backgroundColor: cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.celebrationEmoji}>
              🌿
            </Text>
            <Text style={[styles.celebrationTitle, { color: textColor }]}>
              Encouragement Sent
            </Text>
            <View style={styles.celebrationAnonymousBadge}>
              <Text style={styles.celebrationAnonymousText}>
                Sent with your name
              </Text>
            </View>
            <Text style={[styles.celebrationMessage, { color: textSecondaryColor }]}>
              Thank you for thinking of others. Your gentle words carry more weight than you know.
            </Text>
            <TouchableOpacity
              style={styles.celebrationDismissButton}
              onPress={() => {
                console.log('[Community] User dismissed encouragement celebration');
                setShowEncouragementCelebration(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.celebrationDismissText}>
                Close
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Send Care Modal */}
      <Modal
        visible={showCareModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCareModal(null);
          setSelectedCareMessage('');
          setCareAnonymous(false);
        }}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => {
            setShowCareModal(null);
            setSelectedCareMessage('');
            setCareAnonymous(false);
          }}
        >
          <Pressable 
            style={[styles.careModal, { backgroundColor: cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.careModalHeader}>
              <Text style={[styles.careModalTitle, { color: textColor }]}>
                Send Care
              </Text>
              <TouchableOpacity onPress={() => {
                setShowCareModal(null);
                setSelectedCareMessage('');
                setCareAnonymous(false);
              }}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={textSecondaryColor}
                />
              </TouchableOpacity>
            </View>
            <Text style={[styles.careModalSubtitle, { color: textSecondaryColor }]}>
              Choose a gentle message to send
            </Text>

            <ScrollView style={styles.careMessagesList}>
              <CareMessageOption
                message="Holding you gently in this moment"
                onPress={() => setSelectedCareMessage("Holding you gently in this moment")}
                textColor={textColor}
                bgColor={bgColor}
                isSelected={selectedCareMessage === "Holding you gently in this moment"}
              />
              <CareMessageOption
                message="You are not walking this path alone"
                onPress={() => setSelectedCareMessage("You are not walking this path alone")}
                textColor={textColor}
                bgColor={bgColor}
                isSelected={selectedCareMessage === "You are not walking this path alone"}
              />
              <CareMessageOption
                message="May you feel surrounded by care today"
                onPress={() => setSelectedCareMessage("May you feel surrounded by care today")}
                textColor={textColor}
                bgColor={bgColor}
                isSelected={selectedCareMessage === "May you feel surrounded by care today"}
              />
              <CareMessageOption
                message="Sending gentle strength your way"
                onPress={() => setSelectedCareMessage("Sending gentle strength your way")}
                textColor={textColor}
                bgColor={bgColor}
                isSelected={selectedCareMessage === "Sending gentle strength your way"}
              />
              <CareMessageOption
                message="Your courage in sharing is beautiful"
                onPress={() => setSelectedCareMessage("Your courage in sharing is beautiful")}
                textColor={textColor}
                bgColor={bgColor}
                isSelected={selectedCareMessage === "Your courage in sharing is beautiful"}
              />
              <CareMessageOption
                message="May you sense the warmth of community around you"
                onPress={() => setSelectedCareMessage("May you sense the warmth of community around you")}
                textColor={textColor}
                bgColor={bgColor}
                isSelected={selectedCareMessage === "May you sense the warmth of community around you"}
              />
              <CareMessageOption
                message="Breathing alongside you with compassion"
                onPress={() => setSelectedCareMessage("Breathing alongside you with compassion")}
                textColor={textColor}
                bgColor={bgColor}
                isSelected={selectedCareMessage === "Breathing alongside you with compassion"}
              />
              <CareMessageOption
                message="You are worthy of all the care you need"
                onPress={() => setSelectedCareMessage("You are worthy of all the care you need")}
                textColor={textColor}
                bgColor={bgColor}
                isSelected={selectedCareMessage === "You are worthy of all the care you need"}
              />
            </ScrollView>

            <View style={styles.careModalFooter}>
              <TouchableOpacity
                style={styles.anonymousToggleRow}
                onPress={() => setCareAnonymous(!careAnonymous)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, careAnonymous && styles.checkboxChecked]}>
                  {careAnonymous && (
                    <IconSymbol
                      ios_icon_name="checkmark"
                      android_material_icon_name="check"
                      size={14}
                      color="#FFFFFF"
                    />
                  )}
                </View>
                <Text style={[styles.anonymousToggleText, { color: textColor }]}>
                  Send anonymously
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sendCareButtonModal,
                  !selectedCareMessage && styles.sendCareButtonDisabled
                ]}
                onPress={handleSendCare}
                disabled={!selectedCareMessage}
                activeOpacity={0.8}
              >
                <Text style={styles.sendCareButtonModalText}>
                  Send Care
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
    </GradientBackground>
  );
}

function ReactionPickerOption({
  emoji,
  label,
  isActive,
  onPress,
  textColor,
}: {
  emoji: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
  textColor: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.reactionOption, isActive && styles.reactionOptionActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.reactionOptionEmoji}>
        {emoji}
      </Text>
      <Text style={[styles.reactionOptionLabel, { color: isActive ? colors.primary : textColor }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function EncouragementMessageOption({
  message,
  isSelected,
  onPress,
  textColor,
  bgColor,
}: {
  message: string;
  isSelected: boolean;
  onPress: () => void;
  textColor: string;
  bgColor: string;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.encouragementMessageButton,
        { backgroundColor: isSelected ? '#FDF0F0' : bgColor, borderColor: isSelected ? '#E8A0A0' : colors.border },
        isSelected && styles.encouragementMessageButtonSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isSelected && (
        <Text style={styles.encouragementMessageCheckmark}>
          ✓
        </Text>
      )}
      <Text style={[
        styles.encouragementMessageButtonText,
        { color: isSelected ? '#C06060' : textColor, fontWeight: isSelected ? '600' : '400' },
      ]}>
        {message}
      </Text>
    </TouchableOpacity>
  );
}

function CareMessageOption({ 
  message, 
  onPress, 
  textColor, 
  bgColor,
  isSelected 
}: { 
  message: string; 
  onPress: () => void;
  textColor: string;
  bgColor: string;
  isSelected: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.careMessageButton, 
        { backgroundColor: bgColor, borderColor: colors.border },
        isSelected && styles.careMessageButtonSelected
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.careMessageButtonText, 
        { color: isSelected ? colors.primary : textColor }
      ]}>
        {message}
      </Text>
    </TouchableOpacity>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  }
  if (diffMins < 60) {
    const minsText = `${diffMins}m ago`;
    return minsText;
  }
  if (diffHours < 24) {
    const hoursText = `${diffHours}h ago`;
    return hoursText;
  }
  if (diffDays < 7) {
    const daysText = `${diffDays}d ago`;
    return daysText;
  }
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  backRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMessage: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 48 : spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerMessageText: {
    fontSize: typography.bodySmall,
    color: colors.primary,
    backgroundColor: colors.primaryLight || '#E8F5E9',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: typography.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statNumber: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
  },
  statLabel: {
    fontSize: typography.bodySmall,
  },
  tabsSection: {
    marginBottom: spacing.md,
  },
  tabsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  tabSelected: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: typography.medium,
  },
  tabTextSelected: {
    color: '#FFFFFF',
  },
  careMessage: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  careMessageText: {
    fontSize: typography.bodySmall,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  postsSection: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyStateText: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  emptyStateSubtext: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  postCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  postAuthorName: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginLeft: spacing.xs,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  postHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  flagButton: {
    padding: spacing.xs,
  },
  scriptureReference: {
    fontSize: typography.caption,
    fontWeight: typography.medium,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  artworkImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: colors.border || '#F5F5F5',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  postContent: {
    fontSize: typography.body,
    lineHeight: 26,
    marginBottom: spacing.md,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  prayTextContainer: {
    flexDirection: 'column',
  },
  prayCount: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  prayLabel: {
    fontSize: typography.caption,
  },
  reactionBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reactionSection: {
    marginTop: spacing.md,
  },
  reactButtonEmoji: {
    fontSize: 14,
  },
  reactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border || '#E0E0E0',
  },
  reactButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
  },
  userReactionDisplay: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight || '#F5F5F5',
    minWidth: 44,
    minHeight: 32,
    justifyContent: 'center',
  },
  reactionBadgeActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#047857',
    borderWidth: 1,
    backgroundColor: colors.primary + '30',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontSize: typography.caption,
    fontWeight: typography.medium,
  },
  sendCareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  sendCareButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPickerModal: {
    width: '85%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  reactionPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  reactionPickerClose: {
    fontSize: 14,
    fontWeight: '600',
  },
  reactionPickerTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  reactionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'center',
  },
  reactionOption: {
    alignItems: 'center',
    gap: spacing.xs,
    width: '30%',
    paddingVertical: spacing.md,
  },
  reactionOptionEmoji: {
    fontSize: 32,
  },
  reactionOptionActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#047857',
    borderWidth: 1,
    backgroundColor: colors.primaryLight || '#E8F5E9',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  reactionOptionLabel: {
    fontSize: typography.caption,
    textAlign: 'center',
    fontWeight: typography.medium,
  },
  careModal: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  careModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  careModalTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
  },
  careModalSubtitle: {
    fontSize: typography.body,
    marginBottom: spacing.lg,
  },
  careMessagesList: {
    maxHeight: 400,
    marginBottom: spacing.md,
  },
  careMessageButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  careMessageButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '15',
  },
  careMessageButtonText: {
    fontSize: typography.body,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  careModalFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border || '#E0E0E0',
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  anonymousToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  anonymousToggleText: {
    fontSize: typography.body,
  },
  sendCareButtonModal: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  sendCareButtonDisabled: {
    opacity: 0.4,
  },
  // Encourage button on post cards
  encourageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: '#FDF0F0',
    alignSelf: 'flex-start',
  },
  encourageButtonText: {
    fontSize: 13,
    color: '#E8A0A0',
    fontWeight: '500',
  },
  // Encouragement modal
  encouragementModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    maxHeight: '85%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  encouragementModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  encouragementModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  encouragementModalTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
  },
  encouragementModalSubtitle: {
    fontSize: typography.bodySmall,
    marginBottom: spacing.md,
  },
  encouragementMessagesList: {
    maxHeight: 320,
    marginBottom: spacing.md,
  },
  encouragementMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  encouragementMessageButtonSelected: {
    borderWidth: 1.5,
  },
  encouragementMessageCheckmark: {
    fontSize: 14,
    color: '#E8A0A0',
    fontWeight: '700',
  },
  encouragementMessageButtonText: {
    fontSize: typography.body,
    lineHeight: 22,
    flex: 1,
  },
  sendEncouragementButton: {
    backgroundColor: '#E8A0A0',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  sendEncouragementButtonDisabled: {
    backgroundColor: '#E8A0A0',
    opacity: 0.4,
  },
  sendEncouragementButtonText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: typography.semiBold,
  },
  // Toast
  encouragementToast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(50, 50, 50, 0.88)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    zIndex: 999,
  },
  encouragementToastText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: '500',
  },
  // Celebration card
  celebrationCard: {
    borderRadius: 20,
    padding: spacing.xl,
    marginHorizontal: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0D0D0',
    shadowColor: '#E8A0A0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  celebrationTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  celebrationAnonymousBadge: {
    backgroundColor: '#FDF0F0',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginBottom: spacing.md,
  },
  celebrationAnonymousText: {
    fontSize: typography.bodySmall,
    color: '#C06060',
    fontWeight: '500',
  },
  celebrationMessage: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  celebrationDismissButton: {
    backgroundColor: '#E8A0A0',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  celebrationDismissText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: typography.semiBold,
  },
  sendCareButtonModalText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  careMessagesSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.bold,
    marginBottom: spacing.sm,
  },
  careMessageCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    gap: spacing.sm,
  },
  careMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  careMessageSender: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    flex: 1,
  },
  careMessageTime: {
    fontSize: typography.caption,
  },
  authPromptModal: {
    width: '85%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
  },
  authPromptHeader: {
    marginBottom: spacing.lg,
  },
  authPromptTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  authPromptMessage: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  authPromptButtons: {
    width: '100%',
    gap: spacing.md,
  },
  authPromptButton: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  authPromptButtonPrimary: {
    backgroundColor: colors.primary,
  },
  authPromptButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border || '#E0E0E0',
  },
  authPromptButtonTextPrimary: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  authPromptButtonTextSecondary: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  signInButton: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  signInButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
});
