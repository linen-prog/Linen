
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
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
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

  useEffect(() => {
    console.log('[Community] Tab changed to:', selectedTab);
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
    console.log('[Community] Loading posts for category:', category);
    setIsLoading(true);
    
    try {
      const { authenticatedGet } = await import('@/utils/api');
      
      let endpoint = '';
      if (category === 'my-shared') {
        endpoint = '/api/community/my-posts';
        console.log('[Community] Fetching user\'s shared posts from:', endpoint);
      } else {
        // Map frontend tab names to backend categories
        // Feed shows daily-gift reflections
        // Wisdom, Care, Prayers show companion content filtered by category
        endpoint = `/api/community/posts?category=${category}`;
        console.log('[Community] Fetching posts from:', endpoint);
      }
      
      const response = await authenticatedGet<Post[]>(endpoint);
      console.log('[Community] Posts loaded for', category, ':', response.length, 'posts');
      
      // Log details of posts for debugging
      if (category === 'my-shared') {
        console.log('[Community] My Shared posts details:', response.map(p => ({
          id: p.id,
          category: p.category,
          contentType: p.contentType,
          prayerCount: p.prayerCount,
          createdAt: p.createdAt
        })));
      }
      
      setPosts(response.map(post => ({
        ...post,
        createdAt: new Date(post.createdAt),
      })));
    } catch (error) {
      console.error('[Community] Failed to load posts:', error);
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
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
});
