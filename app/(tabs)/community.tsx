
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

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert, Modal, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

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
  reactions?: {
    praying: number;
    holding: number;
    light: number;
    amen: number;
    growing: number;
    peace: number;
  };
  userReaction?: string | null;
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

  const [selectedTab, setSelectedTab] = useState('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<CommunityStats>({ sharedToday: 0, liftedInPrayer: 0 });
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [showCareModal, setShowCareModal] = useState<string | null>(null);
  const [careMessages, setCareMessages] = useState<CareMessage[]>([]);
  const [isLoadingCareMessages, setIsLoadingCareMessages] = useState(false);
  const [selectedCareMessage, setSelectedCareMessage] = useState<string>('');
  const [careAnonymous, setCareAnonymous] = useState(false);

  useEffect(() => {
    console.log('[Community] Tab changed to:', selectedTab);
    if (selectedTab === 'care') {
      loadCareMessages();
    }
    loadPosts(selectedTab);
    loadStats();
  }, [selectedTab]);

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
      
      let endpoint = '';
      if (category === 'my-shared') {
        endpoint = '/api/community/my-posts';
        console.log('[Community] 🔵 Fetching user\'s shared posts from:', endpoint);
      } else {
        // Map frontend tab names to backend categories
        // Feed shows daily-gift reflections
        // Wisdom, Care, Prayers show companion content filtered by category
        endpoint = `/api/community/posts?category=${category}`;
        console.log('[Community] 🔵 Fetching posts from:', endpoint);
      }
      
      const response = await authenticatedGet<Post[]>(endpoint);
      console.log('[Community] ✅ Posts loaded for', category, ':', response.length, 'posts');
      
      // Log details of ALL posts for debugging
      console.log('[Community] 📊 Post details:', response.map(p => ({
        id: p.id,
        category: p.category,
        contentType: p.contentType,
        authorName: p.authorName,
        isAnonymous: p.isAnonymous,
        prayerCount: p.prayerCount,
        contentPreview: p.content.substring(0, 50) + '...',
        createdAt: p.createdAt
      })));
      
      // Fetch reactions for each post
      const postsWithReactions = await Promise.all(
        response.map(async (post) => {
          try {
            const reactionsData = await authenticatedGet<{ reactions: any; userReaction: string | null }>(
              `/api/community/reactions/${post.id}`
            );
            return {
              ...post,
              createdAt: new Date(post.createdAt),
              reactions: reactionsData.reactions,
              userReaction: reactionsData.userReaction,
            };
          } catch (error) {
            console.error('[Community] Failed to load reactions for post:', post.id, error);
            return {
              ...post,
              createdAt: new Date(post.createdAt),
              reactions: { praying: 0, holding: 0, light: 0, amen: 0, growing: 0, peace: 0 },
              userReaction: null,
            };
          }
        })
      );
      
      setPosts(postsWithReactions);
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
      
      // Reload stats after praying
      loadStats();
    } catch (error) {
      console.error('[Community] Failed to toggle prayer:', error);
    }
  };

  const handleFlagPost = async (postId: string) => {
    console.log('[Community] User flagging post:', postId);
    
    Alert.alert(
      'Flag Content',
      'This will report the content to moderators for review. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Flag',
          style: 'destructive',
          onPress: async () => {
            try {
              const { authenticatedPost } = await import('@/utils/api');
              await authenticatedPost(`/api/community/flag/${postId}`, {});
              Alert.alert('Thank you', 'This content has been flagged for review.');
              loadPosts(selectedTab);
            } catch (error) {
              console.error('[Community] Failed to flag post:', error);
              Alert.alert('Error', 'Failed to flag content. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleReact = async (postId: string, reactionType: string) => {
    console.log('[Community] User reacting to post:', postId, 'with:', reactionType);
    
    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ reactions: any; userReaction: string | null }>(
        `/api/community/react/${postId}`,
        { reactionType }
      );
      
      console.log('[Community] Reaction toggled:', response);
      
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            reactions: response.reactions,
            userReaction: response.userReaction,
          };
        }
        return post;
      }));
      
      setShowReactionPicker(null);
    } catch (error) {
      console.error('[Community] Failed to toggle reaction:', error);
    }
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
      setCareMessages([]);
    } finally {
      setIsLoadingCareMessages(false);
    }
  };

  const handleSendCare = async () => {
    if (!showCareModal || !selectedCareMessage) {
      return;
    }
    
    console.log('[Community] Sending care message to post:', showCareModal);
    
    try {
      const { authenticatedPost } = await import('@/utils/api');
      await authenticatedPost(`/api/community/send-care/${showCareModal}`, {
        message: selectedCareMessage,
        isAnonymous: careAnonymous,
      });
      
      console.log('[Community] Care message sent successfully');
      setShowCareModal(null);
      setSelectedCareMessage('');
      setCareAnonymous(false);
      
      Alert.alert(
        '💚 Care Sent',
        'Your message of care has been sent gently to the recipient.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[Community] Failed to send care message:', error);
      Alert.alert('Error', 'Failed to send care message. Please try again.');
    }
  };

  const bgColor = colors.background;
  const textColor = colors.text;
  const textSecondaryColor = colors.textSecondary;
  const cardBg = colors.card;

  const tabs = [
    { id: 'feed', label: 'Feed', icon: 'favorite' as const },
    { id: 'wisdom', label: 'Wisdom', icon: 'auto-stories' as const },
    { id: 'care', label: 'Care', icon: 'chat' as const },
    { id: 'prayers', label: 'Prayers', icon: 'church' as const },
    { id: 'my-shared', label: 'My Shared', icon: 'share' as const },
  ];

  const sharedTodayText = `${stats.sharedToday}`;
  const liftedInPrayerText = `${stats.liftedInPrayer}`;

  // Helper function to get category badge color
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

  // Helper function to get category label
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
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
            {isLoadingCareMessages ? (
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
                      {selectedTab === 'my-shared' && (
                        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
                          <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
                            {categoryLabel}
                          </Text>
                        </View>
                      )}
                    </View>
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

                  {post.scriptureReference && (
                    <Text style={[styles.scriptureReference, { color: textSecondaryColor }]}>
                      {post.scriptureReference}
                    </Text>
                  )}

                  {post.artworkUrl && (
                    <View style={styles.artworkImageContainer}>
                      <Image 
                        source={{ uri: post.artworkUrl }}
                        style={styles.artworkImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  <Text style={[styles.postContent, { color: textColor }]}>
                    {post.content}
                  </Text>

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
                    <TouchableOpacity
                      style={styles.reactButton}
                      onPress={() => setShowReactionPicker(post.id)}
                    >
                      <Text style={[styles.reactButtonText, { color: textSecondaryColor }]}>
                        + React
                      </Text>
                    </TouchableOpacity>

                    {/* Show reactions if any */}
                    {post.reactions && (
                      <View style={styles.reactionsDisplay}>
                        {post.reactions.praying > 0 && (
                          <TouchableOpacity 
                            style={[
                              styles.reactionBadge,
                              post.userReaction === 'praying' && styles.reactionBadgeActive
                            ]}
                            onPress={() => handleReact(post.id, 'praying')}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.reactionEmoji}>🙏</Text>
                            <Text style={[styles.reactionCount, { color: textSecondaryColor }]}>
                              {post.reactions.praying}
                            </Text>
                          </TouchableOpacity>
                        )}
                        {post.reactions.holding > 0 && (
                          <TouchableOpacity 
                            style={[
                              styles.reactionBadge,
                              post.userReaction === 'holding' && styles.reactionBadgeActive
                            ]}
                            onPress={() => handleReact(post.id, 'holding')}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.reactionEmoji}>💙</Text>
                            <Text style={[styles.reactionCount, { color: textSecondaryColor }]}>
                              {post.reactions.holding}
                            </Text>
                          </TouchableOpacity>
                        )}
                        {post.reactions.light > 0 && (
                          <TouchableOpacity 
                            style={[
                              styles.reactionBadge,
                              post.userReaction === 'light' && styles.reactionBadgeActive
                            ]}
                            onPress={() => handleReact(post.id, 'light')}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.reactionEmoji}>🕯️</Text>
                            <Text style={[styles.reactionCount, { color: textSecondaryColor }]}>
                              {post.reactions.light}
                            </Text>
                          </TouchableOpacity>
                        )}
                        {post.reactions.amen > 0 && (
                          <TouchableOpacity 
                            style={[
                              styles.reactionBadge,
                              post.userReaction === 'amen' && styles.reactionBadgeActive
                            ]}
                            onPress={() => handleReact(post.id, 'amen')}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.reactionEmoji}>✨</Text>
                            <Text style={[styles.reactionCount, { color: textSecondaryColor }]}>
                              {post.reactions.amen}
                            </Text>
                          </TouchableOpacity>
                        )}
                        {post.reactions.growing > 0 && (
                          <TouchableOpacity 
                            style={[
                              styles.reactionBadge,
                              post.userReaction === 'growing' && styles.reactionBadgeActive
                            ]}
                            onPress={() => handleReact(post.id, 'growing')}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.reactionEmoji}>🌱</Text>
                            <Text style={[styles.reactionCount, { color: textSecondaryColor }]}>
                              {post.reactions.growing}
                            </Text>
                          </TouchableOpacity>
                        )}
                        {post.reactions.peace > 0 && (
                          <TouchableOpacity 
                            style={[
                              styles.reactionBadge,
                              post.userReaction === 'peace' && styles.reactionBadgeActive
                            ]}
                            onPress={() => handleReact(post.id, 'peace')}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.reactionEmoji}>🕊️</Text>
                            <Text style={[styles.reactionCount, { color: textSecondaryColor }]}>
                              {post.reactions.peace}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Send Care Button (only for care category posts) */}
                  {post.category === 'care' && (
                    <TouchableOpacity
                      style={[styles.sendCareButton, { backgroundColor: colors.primaryLight || '#FFF9E6' }]}
                      onPress={() => setShowCareModal(post.id)}
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
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowReactionPicker(null)}
        >
          <View style={[styles.reactionPickerModal, { backgroundColor: cardBg }]}>
            <Text style={[styles.reactionPickerTitle, { color: textColor }]}>
              Choose a reaction
            </Text>
            <View style={styles.reactionGrid}>
              <TouchableOpacity
                style={styles.reactionOption}
                onPress={() => showReactionPicker && handleReact(showReactionPicker, 'praying')}
              >
                <Text style={styles.reactionOptionEmoji}>🙏</Text>
                <Text style={[styles.reactionOptionLabel, { color: textColor }]}>
                  Praying
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reactionOption}
                onPress={() => showReactionPicker && handleReact(showReactionPicker, 'holding')}
              >
                <Text style={styles.reactionOptionEmoji}>💙</Text>
                <Text style={[styles.reactionOptionLabel, { color: textColor }]}>
                  Holding you
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reactionOption}
                onPress={() => showReactionPicker && handleReact(showReactionPicker, 'light')}
              >
                <Text style={styles.reactionOptionEmoji}>🕯️</Text>
                <Text style={[styles.reactionOptionLabel, { color: textColor }]}>
                  Light with you
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reactionOption}
                onPress={() => showReactionPicker && handleReact(showReactionPicker, 'amen')}
              >
                <Text style={styles.reactionOptionEmoji}>✨</Text>
                <Text style={[styles.reactionOptionLabel, { color: textColor }]}>
                  Amen
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reactionOption}
                onPress={() => showReactionPicker && handleReact(showReactionPicker, 'growing')}
              >
                <Text style={styles.reactionOptionEmoji}>🌱</Text>
                <Text style={[styles.reactionOptionLabel, { color: textColor }]}>
                  Growing together
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reactionOption}
                onPress={() => showReactionPicker && handleReact(showReactionPicker, 'peace')}
              >
                <Text style={styles.reactionOptionEmoji}>🕊️</Text>
                <Text style={[styles.reactionOptionLabel, { color: textColor }]}>
                  Peace
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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

            {/* Single "Send anonymously" toggle at the bottom */}
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
  );
}

// Helper component for care message options
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

// Helper function to format time ago
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
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
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
  reactionSection: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  reactButton: {
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
  reactionsDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight || '#F5F5F5',
  },
  reactionBadgeActive: {
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
  careMessageText: {
    fontSize: typography.body,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  careMessageContext: {
    fontSize: typography.caption,
    fontStyle: 'italic',
  },
});
