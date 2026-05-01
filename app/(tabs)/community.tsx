
/**
 * Community Screen - Tab-based content sharing
 *
 * DATA FLOW DOCUMENTATION:
 *
 * All Tab (feed):
 * - Shows posts from ALL categories combined, sorted newest first
 *
 * Wisdom Tab:
 * - Shows posts with category: 'wisdom'
 *
 * Care Tab:
 * - Shows posts with category: 'care'
 * - Also shows care messages received by the current user
 *
 * Prayer Tab:
 * - Shows posts with category: 'prayers'
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Modal, Pressable, Image, Alert, Animated, ImageSourcePropType, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/GradientBackground';
import { useRouter, Href } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import FloatingTabBar from '@/components/FloatingTabBar';

const TABS = [
  { name: 'home', route: '/(tabs)' as Href, icon: 'home' as const, ios_icon_name: 'house.fill', label: 'Home' },
  { name: 'community', route: '/(tabs)/community' as Href, icon: 'group' as const, ios_icon_name: 'person.3.fill', label: 'Community' },
  { name: 'profile', route: '/(tabs)/profile' as Href, icon: 'account-circle' as const, ios_icon_name: 'person.circle.fill', label: 'Profile' },
];
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

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
  const { isSubscribed, loading: subLoading, testerBypass } = useSubscription();
  const [selectedTab, setSelectedTab] = useState('feed');

  useEffect(() => {
    if (subLoading) return;
    // TEMPORARY GOOGLE PLAY CLOSED TESTING BYPASS — REMOVE BEFORE PRODUCTION
    const hasAppAccess = isSubscribed || testerBypass;
    console.log('[PAYWALL REDIRECT BLOCKED/ALLOWED]', {
      screenName: 'Community',
      isSubscribed,
      testerBypass,
      hasAppAccess,
      redirectingToPaywall: !hasAppAccess,
    });
    if (!hasAppAccess) {
      console.log('[Community] User not subscribed — redirecting to paywall');
      router.replace('/paywall');
    }
  }, [isSubscribed, subLoading, testerBypass, router]);
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
  const [fullscreenArtworkUrl, setFullscreenArtworkUrl] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Moderation state
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState<{ postId: string; userId: string } | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);

  // Load blocked users from cache on first mount for instant filtering
  useEffect(() => {
    loadBlockedUsersFromCache();
  }, []);

  useEffect(() => {
    console.log('[Community] Tab changed to:', selectedTab);
    if (selectedTab === 'care' && user) {
      // Only load care messages if user is authenticated
      loadCareMessages();
    }
    loadPosts(selectedTab);
    loadStats();
    loadBlockedUsers();
  }, [selectedTab, user]);

  // Reload posts every time the screen comes into focus (e.g. after sharing artwork)
  useFocusEffect(
    useCallback(() => {
      console.log('[Community] Screen focused — refreshing posts for tab:', selectedTab);
      loadPosts(selectedTab);
      loadStats();
    }, [selectedTab])
  );

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

      const unwrapPosts = (raw: unknown): Post[] => {
        if (Array.isArray(raw)) return raw as Post[];
        if (raw && typeof raw === 'object') {
          const obj = raw as Record<string, unknown>;
          if (Array.isArray(obj.posts)) return obj.posts as Post[];
          if (Array.isArray(obj.data)) return obj.data as Post[];
        }
        console.warn('[Community] ⚠️ Unexpected posts response shape:', raw);
        return [];
      };
      
      const excludeParam = blockedUserIds.length > 0 ? `excludeUserIds=${blockedUserIds.join(',')}` : '';

      if (category === 'my-shared') {
        const endpoint = '/api/community/my-posts';
        console.log('[Community] 🔵 Fetching user\'s shared posts from:', endpoint);
        const raw = await authenticatedGet<unknown>(endpoint);
        allPosts = unwrapPosts(raw);
      } else if (category === 'feed') {
        // For feed tab, fetch all posts (no category filter)
        const endpoint = excludeParam ? `/api/community/posts?${excludeParam}` : '/api/community/posts';
        console.log('[Community] 🔵 Fetching all posts for feed from:', endpoint);
        const raw = await authenticatedGet<unknown>(endpoint);
        allPosts = unwrapPosts(raw);
        // Sort by createdAt (newest first)
        allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        console.log('[Community] ✅ All posts loaded for feed:', allPosts.length, 'posts');
      } else {
        // Map tab id to the correct category query param
        // prayers tab → category=prayer (singular, matches what check-in posts)
        const categoryParam = category === 'prayers' ? 'prayer' : category;
        const endpoint = excludeParam
          ? `/api/community/posts?category=${categoryParam}&${excludeParam}`
          : `/api/community/posts?category=${categoryParam}`;
        console.log('[Community] 🔵 Fetching posts from:', endpoint);
        const raw = await authenticatedGet<unknown>(endpoint);
        allPosts = unwrapPosts(raw);
      }
      
      console.log('[Community] ✅ Posts loaded for', category, ':', allPosts.length, 'posts');

      const defaultReactions = { praying: 0, holding: 0, light: 0, amen: 0, growing: 0, peace: 0 };

      type RawPost = Record<string, unknown>;
      const mappedPosts: Post[] = (Array.isArray(allPosts) ? allPosts as RawPost[] : []).map((post) => {
        // Support both camelCase and snake_case field names from the backend
        const rawReactions = (post.reactionCounts ?? post.reaction_counts ?? post.reactions) as Record<string, number> | null | undefined;
        const safeReactions: Post['reactions'] = {
          praying: Number(rawReactions?.praying ?? 0),
          holding: Number(rawReactions?.holding ?? 0),
          light: Number(rawReactions?.light ?? 0),
          amen: Number(rawReactions?.amen ?? 0),
          growing: Number(rawReactions?.growing ?? 0),
          peace: Number(rawReactions?.peace ?? 0),
        };

        // Resolve author name — backend may return authorName or author_name
        const rawAuthorName = (post.authorName ?? post.author_name) as string | null | undefined;
        const authorName = (rawAuthorName && String(rawAuthorName) !== 'undefined') ? String(rawAuthorName) : null;

        // Resolve boolean flags — backend may use camelCase or snake_case
        const isAnonymous = Boolean(post.isAnonymous ?? post.is_anonymous ?? false);
        const userHasPrayed = Boolean(post.userHasPrayed ?? post.user_has_prayed ?? false);
        const isFlagged = Boolean(post.isFlagged ?? post.is_flagged ?? false);

        // Resolve counts
        const prayerCount = Number(post.prayerCount ?? post.prayer_count ?? 0);

        // Resolve string/optional fields
        const contentType = (post.contentType ?? post.content_type) as Post['contentType'] | undefined;
        const scriptureReference = (post.scriptureReference ?? post.scripture_reference) as string | undefined;
        const userId = (post.userId ?? post.user_id) as string | undefined;
        // Support all possible field names the backend may use for the artwork image URL
        const artworkUrl = (post.artworkUrl ?? post.artwork_url ?? post.imageUrl ?? post.image_url ?? post.artworkImageUrl ?? post.artwork_image_url) as string | null | undefined;

        // Resolve content — guard against undefined rendering as the string "undefined"
        const rawContent = post.content as string | null | undefined;
        const content = (rawContent && String(rawContent) !== 'undefined') ? String(rawContent) : '';

        console.log('[Community] Mapping post:', {
          id: post.id,
          authorName,
          isAnonymous,
          content: content.substring(0, 60),
          artworkUrl,
        });

        return {
          id: String(post.id ?? ''),
          category: String(post.category ?? 'feed'),
          content,
          authorName,
          isAnonymous,
          userHasPrayed,
          isFlagged,
          prayerCount,
          contentType,
          scriptureReference,
          userId,
          artworkUrl: artworkUrl ?? null,
          createdAt: new Date(post.createdAt as string),
          reactions: safeReactions,
          userReactions: Array.isArray(post.userReactions)
            ? (post.userReactions as string[])
            : Array.isArray(post.user_reactions)
              ? (post.user_reactions as string[])
              : [],
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

  const loadBlockedUsersFromCache = async () => {
    try {
      const cached = await AsyncStorage.getItem('linen_blocked_users');
      if (cached) {
        setBlockedUserIds(JSON.parse(cached));
      }
    } catch {}
  };

  const loadBlockedUsers = async () => {
    if (!user?.id) return;
    try {
      console.log('[Community] Loading blocked users from API');
      const { authenticatedGet } = await import('@/utils/api');
      const res = await authenticatedGet<{ blockedUserIds: string[] }>('/api/community/blocks');
      const ids = res.blockedUserIds || [];
      setBlockedUserIds(ids);
      await AsyncStorage.setItem('linen_blocked_users', JSON.stringify(ids));
      console.log('[Community] Blocked users loaded:', ids.length);
    } catch (e) {
      console.error('[Community] Failed to load blocked users:', e);
    }
  };

  const handleSubmitReport = async () => {
    if (!showReportModal || !reportReason) return;
    console.log('[Community] User submitting report for post:', showReportModal, '| reason:', reportReason);
    setIsSubmittingReport(true);
    try {
      const post = posts.find(p => p.id === showReportModal);
      const { authenticatedPost } = await import('@/utils/api');
      await authenticatedPost('/api/community/report', {
        postId: showReportModal,
        reportedUserId: post?.userId || '',
        reason: reportReason,
        note: reportNote || undefined,
      });
      console.log('[Community] Report submitted successfully');
      setReportSubmitted(true);
      setTimeout(() => {
        const reportedPostId = showReportModal;
        setPosts(prev => prev.filter(p => p.id !== reportedPostId));
        setShowReportModal(null);
        setReportReason('');
        setReportNote('');
        setReportSubmitted(false);
      }, 2000);
    } catch (e) {
      console.error('[Community] Failed to submit report:', e);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleBlockUser = async () => {
    if (!showBlockModal) return;
    console.log('[Community] User blocking userId:', showBlockModal.userId, '| from postId:', showBlockModal.postId);
    setIsBlocking(true);
    try {
      const { authenticatedPost } = await import('@/utils/api');
      await authenticatedPost('/api/community/block', {
        blockedUserId: showBlockModal.userId,
        postId: showBlockModal.postId,
      });
      console.log('[Community] User blocked successfully:', showBlockModal.userId);
      const newBlockedIds = [...blockedUserIds, showBlockModal.userId];
      setBlockedUserIds(newBlockedIds);
      setPosts(prev => prev.filter(p => p.userId !== showBlockModal.userId));
      await AsyncStorage.setItem('linen_blocked_users', JSON.stringify(newBlockedIds));
      setShowBlockModal(null);
    } catch (e) {
      console.error('[Community] Failed to block user:', e);
    } finally {
      setIsBlocking(false);
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
    console.log('[Community] User tapped delete on post:', postId, '| current user id:', user?.id);

    // Guard: never attempt a delete with a missing id
    if (!postId) {
      console.error('[Community] ❌ handleDeletePost called with null/undefined postId — aborting');
      return;
    }

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => console.log('[Community] User cancelled post deletion') },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('[Community] User confirmed delete — postId:', postId, 'userId:', user?.id);
            try {
              const { authenticatedDelete } = await import('@/utils/api');
              console.log('[Community] → DELETE /api/community/posts/' + postId);
              await authenticatedDelete(`/api/community/posts/${postId}`);
              console.log('[Community] ✅ Post deleted successfully:', postId);
              // Immediately remove from local state — no refresh needed
              setPosts(prev => prev.filter(p => p.id !== postId));
            } catch (error: any) {
              const status: number | undefined = error?.status;
              const body: string = error?.responseBody || error?.message || 'Unknown error';
              console.error('[Community] ❌ Delete failed — postId:', postId, '| userId:', user?.id, '| status:', status, '| error:', body);

              let userMessage = 'Could not delete this post. Please try again.';
              if (status === 403) {
                userMessage = 'You can only delete your own posts.';
              } else if (status === 404) {
                userMessage = 'Post not found — it may have already been deleted.';
                // Remove from local state anyway since it no longer exists
                setPosts(prev => prev.filter(p => p.id !== postId));
              } else if (body) {
                // Surface the real backend error message
                try {
                  const parsed = JSON.parse(body);
                  if (parsed?.error || parsed?.message) {
                    userMessage = parsed.error || parsed.message;
                  }
                } catch {
                  // body is plain text — use it directly if short enough
                  if (body.length < 200) userMessage = body;
                }
              }

              Alert.alert('Delete Failed', userMessage);
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
      const raw = await authenticatedGet<unknown>('/api/community/care-messages');
      let response: CareMessage[] = [];
      if (Array.isArray(raw)) {
        response = raw as CareMessage[];
      } else if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if (Array.isArray(obj.messages)) response = obj.messages as CareMessage[];
        else if (Array.isArray(obj.data)) response = obj.data as CareMessage[];
        else console.warn('[Community] ⚠️ Unexpected care-messages response shape:', raw);
      }
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
      const { authenticatedPost: authPost } = await import('@/utils/api');
      await authPost('/api/notifications/trigger', { postId, type, reactionType });
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
    { id: 'feed', label: 'All', icon: 'favorite' as const },
    { id: 'wisdom', label: 'Wisdom', icon: 'auto-stories' as const },
    { id: 'care', label: 'Care', icon: 'chat' as const },
    { id: 'prayers', label: 'Prayer', icon: 'church' as const },
    { id: 'my-shared', label: 'My Posts', icon: 'person.fill' as const },
  ];





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
        {/* Top Banner */}
        <View style={styles.headerBannerWrap}>
          <View style={[styles.headerBanner, { backgroundColor: isDark ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.13)' }]}>
            <Text style={[styles.headerBannerText, { color: isDark ? '#ffffff' : '#065f46' }]}>
              ✨ You are not alone in this journey
            </Text>
          </View>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: textColor }]}>
            Community
          </Text>
          <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
            A place to share, receive, and be held
          </Text>
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
                    isSelected && styles.tabSelected
                  ]}
                  onPress={() => {
                    console.log('[Community] User selected tab:', tab.id);
                    setSelectedTab(tab.id);
                  }}
                >
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

        {/* Guiding line */}
        <View style={styles.guidingLineRow}>
          <Text style={[styles.guidingLine, { color: textSecondaryColor }]}>
            Receive what feels right.
          </Text>
        </View>

        {/* Section description */}
        <View style={styles.sectionDescriptionRow}>
          <Text style={[styles.sectionDescription, { color: textSecondaryColor }]}>
            Shared reflections and care from this space
          </Text>
        </View>

        {/* Care Messages Section (only in Care tab) */}
        {selectedTab === 'care' && (
          <View style={styles.careMessagesSection}>
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
            ) : careMessages.length === 0 && posts.length === 0 ? (
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
                This space will fill with shared hearts
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: textSecondaryColor }]}>
                You're welcome to simply be here
              </Text>
            </View>
          ) : (
            posts.map(post => {
              const authorDisplay = post.isAnonymous ? 'Anonymous' : (post.authorName || 'You');

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
                        size={18}
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
                        style={styles.moreButton}
                        onPress={() => {
                          console.log('[Moderation] menu rendered for post:', post.id);
                          setShowPostMenu(post.id);
                        }}
                      >
                        <Text style={{ fontSize: 20, color: textSecondaryColor, lineHeight: 20 }}>⋯</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {post.scriptureReference && (
                    <Text style={[styles.scriptureReference, { color: textSecondaryColor }]}>
                      {post.scriptureReference}
                    </Text>
                  )}

                  {!!post.artworkUrl && typeof post.artworkUrl === 'string' && post.artworkUrl.trim().length > 0 && (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        console.log('[Community] User tapped artwork image for post:', post.id, 'URL:', post.artworkUrl);
                        setFullscreenArtworkUrl(post.artworkUrl ?? null);
                      }}
                    >
                      <View style={styles.artworkImageContainer}>
                        <Image
                          source={{ uri: String(post.artworkUrl) }}
                          style={styles.artworkImage}
                          resizeMode="cover"
                          onError={(error) => {
                            console.error('[Community] ❌ Failed to load artwork image for post:', post.id, 'URL:', post.artworkUrl, 'Error:', error.nativeEvent.error);
                          }}
                          onLoad={() => {
                            console.log('[Community] ✅ Artwork image loaded successfully for post:', post.id, 'URL:', post.artworkUrl);
                          }}
                        />
                      </View>
                    </TouchableOpacity>
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
                      <Text style={[styles.prayLabel, { color: textSecondaryColor }]}>
                        Held in prayer
                      </Text>

                    </TouchableOpacity>
                  </View>

                  {/* Reaction Section */}
                  <View style={styles.reactionSection}>
                    <View style={styles.reactionBadgesRow}>
                      {activeReactionBadges.map(reactionKey => {
                        const isUserReaction = userReactions.includes(reactionKey);
                        const reactionEmoji = getReactionEmoji(reactionKey);
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
                          </TouchableOpacity>
                        );
                      })}
                      {!hasUserReacted && (
                        <TouchableOpacity
                          style={styles.reactButton}
                          onPress={() => {
                            console.log('[Community] User tapped Send care button for post:', post.id);
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
                            🤍
                          </Text>
                          <Text style={[styles.reactButtonText, { color: textSecondaryColor }]}>
                            Send care
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
              <TouchableOpacity
                style={styles.modalBackButton}
                onPress={() => {
                  console.log('[Community] User tapped back arrow on reaction picker');
                  setShowReactionPicker(null);
                }}
                hitSlop={8}
              >
                <IconSymbol
                  ios_icon_name="chevron.left"
                  android_material_icon_name="chevron-left"
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
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

      {/* Fullscreen Artwork Modal */}
      <Modal
        visible={fullscreenArtworkUrl !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          console.log('[Community] User closed fullscreen artwork modal');
          setFullscreenArtworkUrl(null);
        }}
      >
        <Pressable
          style={styles.fullscreenArtworkOverlay}
          onPress={() => {
            console.log('[Community] User dismissed fullscreen artwork by tapping overlay');
            setFullscreenArtworkUrl(null);
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.fullscreenArtworkContainer}>
            {fullscreenArtworkUrl && (
              <Image
                source={{ uri: fullscreenArtworkUrl }}
                style={styles.fullscreenArtworkImage}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={styles.fullscreenArtworkClose}
              onPress={() => {
                console.log('[Community] User tapped close on fullscreen artwork');
                setFullscreenArtworkUrl(null);
              }}
              activeOpacity={0.8}
            >
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="chevron-left"
                size={24}
                color="rgba(255,255,255,0.9)"
              />
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

      {/* Post Action Menu Modal */}
      <Modal
        visible={showPostMenu !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPostMenu(null)}
      >
        <Pressable
          style={styles.bottomSheetOverlay}
          onPress={() => setShowPostMenu(null)}
        >
          <Pressable
            style={[styles.postMenuModal, { backgroundColor: cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.bottomSheetHandle} />
            <TouchableOpacity
              style={styles.postMenuOption}
              onPress={() => {
                console.log('[Community] User tapped Report from post menu for post:', showPostMenu);
                const menuPostId = showPostMenu;
                setShowPostMenu(null);
                setShowReportModal(menuPostId);
              }}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="flag"
                android_material_icon_name="flag"
                size={22}
                color="#EF4444"
              />
              <Text style={[styles.postMenuOptionText, { color: textColor }]}>Report</Text>
            </TouchableOpacity>
            {posts.find(p => p.id === showPostMenu)?.userId !== user?.id && (
              <>
                <View style={styles.postMenuDivider} />
                <TouchableOpacity
                  style={styles.postMenuOption}
                  onPress={() => {
                    console.log('[Community] User tapped Block User from post menu for post:', showPostMenu);
                    const menuPostId = showPostMenu;
                    const menuPost = posts.find(p => p.id === menuPostId);
                    setShowPostMenu(null);
                    setShowBlockModal({ postId: menuPostId!, userId: menuPost?.userId || '' });
                  }}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="person.fill.xmark"
                    android_material_icon_name="person-off"
                    size={22}
                    color={textColor}
                  />
                  <Text style={[styles.postMenuOptionText, { color: textColor }]}>Block User</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={styles.postMenuDivider} />
            <TouchableOpacity
              style={styles.postMenuOption}
              onPress={() => {
                console.log('[Community] User tapped Cancel on post menu');
                setShowPostMenu(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.postMenuOptionText, { color: textSecondaryColor }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={showReportModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowReportModal(null);
          setReportReason('');
          setReportNote('');
          setReportSubmitted(false);
        }}
      >
        <Pressable
          style={styles.bottomSheetOverlay}
          onPress={() => {
            setShowReportModal(null);
            setReportReason('');
            setReportNote('');
            setReportSubmitted(false);
          }}
        >
          <Pressable
            style={[styles.reportModal, { backgroundColor: cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.bottomSheetHandle} />
            {reportSubmitted ? (
              <View style={styles.reportSuccessContainer}>
                <Text style={styles.reportSuccessIcon}>✓</Text>
                <Text style={[styles.reportSuccessTitle, { color: textColor }]}>Thanks. Your report has been submitted.</Text>
                <Text style={[styles.reportSuccessSubtitle, { color: textSecondaryColor }]}>We review all reports to keep this space safe.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.reportModalHeader}>
                  <Text style={[styles.reportTitle, { color: textColor }]}>Report this post</Text>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('[Community] User closed report modal');
                      setShowReportModal(null);
                      setReportReason('');
                      setReportNote('');
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
                <Text style={[styles.reportSubtitle, { color: textSecondaryColor }]}>Why are you reporting this post?</Text>
                {[
                  { value: 'harassment_bullying', label: 'Harassment or bullying' },
                  { value: 'hate_abusive', label: 'Hate or abusive content' },
                  { value: 'sexual_inappropriate', label: 'Sexual or inappropriate content' },
                  { value: 'self_harm_dangerous', label: 'Self-harm or dangerous content' },
                  { value: 'spam', label: 'Spam' },
                  { value: 'other', label: 'Other' },
                ].map(option => {
                  const isSelected = reportReason === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.reportReasonButton,
                        { borderColor: isSelected ? colors.primary : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)') },
                        isSelected && styles.reportReasonButtonSelected,
                        isSelected && { backgroundColor: colors.primary + '12' },
                      ]}
                      onPress={() => {
                        console.log('[Community] User selected report reason:', option.value);
                        setReportReason(option.value);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.reportReasonText, { color: isSelected ? colors.primary : textColor }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {reportReason !== '' && (
                  <TextInput
                    style={[styles.reportNoteInput, { color: textColor, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                    placeholder="Add a note (optional)"
                    placeholderTextColor={textSecondaryColor}
                    value={reportNote}
                    onChangeText={setReportNote}
                    multiline
                    numberOfLines={3}
                  />
                )}
                <TouchableOpacity
                  style={[styles.reportSubmitButton, { backgroundColor: reportReason ? colors.primary : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)') }]}
                  onPress={() => {
                    console.log('[Community] User tapped Submit Report button');
                    handleSubmitReport();
                  }}
                  disabled={!reportReason || isSubmittingReport}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reportSubmitButtonText}>
                    {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                  </Text>
                </TouchableOpacity>
                <View style={{ height: 16 }} />
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Block Confirmation Modal */}
      <Modal
        visible={showBlockModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBlockModal(null)}
      >
        <Pressable
          style={styles.bottomSheetOverlay}
          onPress={() => setShowBlockModal(null)}
        >
          <Pressable
            style={[styles.blockModal, { backgroundColor: cardBg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.bottomSheetHandle} />
            <Text style={[styles.blockModalTitle, { color: textColor }]}>Block this user?</Text>
            <Text style={[styles.blockModalBody, { color: textSecondaryColor }]}>
              Their content will be removed from your feed. You can manage blocked users in settings.
            </Text>
            <TouchableOpacity
              style={styles.blockConfirmButton}
              onPress={() => {
                console.log('[Community] User confirmed block for userId:', showBlockModal?.userId);
                handleBlockUser();
              }}
              disabled={isBlocking}
              activeOpacity={0.8}
            >
              <Text style={styles.blockConfirmButtonText}>
                {isBlocking ? 'Blocking...' : 'Block User'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.blockCancelButton}
              onPress={() => {
                console.log('[Community] User cancelled block');
                setShowBlockModal(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.blockCancelButtonText, { color: textSecondaryColor }]}>Cancel</Text>
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
              <TouchableOpacity
                style={styles.modalBackButton}
                onPress={() => {
                  console.log('[Community] User tapped back arrow on care modal');
                  setShowCareModal(null);
                }}
                hitSlop={8}
              >
                <IconSymbol
                  ios_icon_name="chevron.left"
                  android_material_icon_name="chevron-left"
                  size={22}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
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
      {Platform.OS === 'android' && (
        <FloatingTabBar tabs={TABS} />
      )}
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
    paddingBottom: Platform.OS === 'android' ? 100 : spacing.xxl,
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
  headerBannerWrap: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  guidingLineRow: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerBanner: {
    backgroundColor: 'rgba(34,197,94,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    alignSelf: 'center',
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 10,
    backgroundColor: 'rgba(255,248,235,0.55)',
  },
  headerBannerText: {
    fontSize: 13,
    color: '#8B6F47',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  sectionDescriptionRow: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  sectionDescription: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 20,
  },
  headerMessage: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  guidingLine: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#999',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 24,
    opacity: 0.7,
  },
  headerMessageText: {
    fontSize: 13,
    color: '#8B7355',
    backgroundColor: 'rgba(139, 115, 85, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  _oldHeaderMessageTextUnused_FINAL: {
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
    marginBottom: spacing.sm,
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
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderRadius: 16,
    padding: 24,
    marginBottom: 28,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },

  postHeader: {
    padding: 24,
    marginBottom: 28,
    borderWidth: 0.3,
    shadowColor: borderRadius.lg,
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
    height: 240,
    aspectRatio: undefined,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 14,
  },
  _postContent_old_removed: {
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
    backgroundColor: 'rgba(232, 160, 160, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 0.5,
    borderColor: colors.border || '#E8E0D8',
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
    backgroundColor: 'rgba(232, 160, 160, 0.10)',
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
  careMessageContext: {
    fontSize: typography.caption,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  fullscreenArtworkOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenArtworkContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenArtworkImage: {
    width: '100%',
    height: '80%',
  },
  modalBackButton: {
    padding: 4,
    marginRight: 8,
  },
  fullscreenArtworkClose: {
    position: 'absolute',
    top: 56,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenArtworkCloseText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600' as const,
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
  // Moderation styles
  moreButton: {
    padding: 8,
    marginLeft: 4,
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  postMenuModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  postMenuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  postMenuOptionText: {
    fontSize: 16,
  },
  postMenuDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 4,
  },
  reportModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  reportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  reportSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    opacity: 0.6,
  },
  reportReasonButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  reportReasonButtonSelected: {
    borderWidth: 2,
  },
  reportReasonText: {
    fontSize: 15,
  },
  reportNoteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginTop: 8,
    marginBottom: 4,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  reportSubmitButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  reportSubmitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reportSuccessContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  reportSuccessIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: '#22c55e',
  },
  reportSuccessTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  reportSuccessSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.6,
  },
  blockModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  blockModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  blockModalBody: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    opacity: 0.7,
  },
  blockConfirmButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#EF4444',
    marginBottom: 12,
  },
  blockConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  blockCancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  blockCancelButtonText: {
    fontSize: 16,
  },
});
