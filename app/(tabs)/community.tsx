
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

export default function CommunityScreen() {
  console.log('User viewing Community screen');

  const [selectedTab, setSelectedTab] = useState('feed');
  const [selectedContentFilter, setSelectedContentFilter] = useState<'all' | 'companion' | 'daily-gift' | 'somatic'>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPosts(selectedTab);
  }, [selectedTab, selectedContentFilter]);

  const loadPosts = async (category: string) => {
    console.log('Loading posts for category:', category, 'with filter:', selectedContentFilter);
    setIsLoading(true);
    
    try {
      const { authenticatedGet } = await import('@/utils/api');
      
      let endpoint = '';
      if (category === 'my-shared') {
        endpoint = '/api/community/my-posts';
      } else {
        endpoint = `/api/community/posts?category=${category}`;
        if (selectedContentFilter !== 'all') {
          endpoint += `&contentType=${selectedContentFilter}`;
        }
      }
      
      const response = await authenticatedGet<Post[]>(endpoint);
      console.log('Posts loaded:', response);
      setPosts(response.map(post => ({
        ...post,
        createdAt: new Date(post.createdAt),
      })));
    } catch (error) {
      console.error('Failed to load posts:', error);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePray = async (postId: string) => {
    console.log('User holding post in prayer:', postId);
    
    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ prayerCount: number; userHasPrayed: boolean }>(`/api/community/pray/${postId}`, {});
      
      console.log('Prayer toggled:', response);
      
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
    } catch (error) {
      console.error('Failed to toggle prayer:', error);
    }
  };

  const handleFlagPost = async (postId: string) => {
    console.log('User flagging post:', postId);
    
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
              console.error('Failed to flag post:', error);
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
    { id: 'feed', label: 'All', icon: 'home' as const },
    { id: 'wisdom', label: 'Wisdom', icon: 'menu-book' as const },
    { id: 'care', label: 'Care', icon: 'favorite' as const },
    { id: 'prayers', label: 'Prayers', icon: 'church' as const },
    { id: 'my-shared', label: 'Mine', icon: 'person' as const },
  ];

  const contentFilters = [
    { id: 'all' as const, label: 'All', icon: 'apps' as const },
    { id: 'companion' as const, label: 'AI', icon: 'chat' as const },
    { id: 'daily-gift' as const, label: 'Gift', icon: 'auto-stories' as const },
    { id: 'somatic' as const, label: 'Exp', icon: 'self-improvement' as const },
  ];

  const getContentTypeIcon = (contentType?: string) => {
    switch (contentType) {
      case 'companion':
        return 'chat';
      case 'daily-gift':
        return 'auto-stories';
      case 'somatic':
        return 'self-improvement';
      default:
        return 'edit';
    }
  };

  const getContentTypeLabel = (contentType?: string) => {
    switch (contentType) {
      case 'companion':
        return 'AI Companion';
      case 'daily-gift':
        return 'Daily Gift';
      case 'somatic':
        return 'Somatic Practice';
      default:
        return 'Reflection';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <View style={[styles.header, Platform.OS === 'android' && { paddingTop: 48 }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          Community
        </Text>
      </View>

      <View style={styles.filtersSection}>
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contentFiltersContainer}
        >
          {contentFilters.map(filter => {
            const isSelected = selectedContentFilter === filter.id;
            const filterLabel = filter.label;
            
            return (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.contentFilter,
                  isSelected && [styles.contentFilterSelected, { backgroundColor: colors.primary }]
                ]}
                onPress={() => setSelectedContentFilter(filter.id)}
              >
                <IconSymbol 
                  ios_icon_name={filter.icon}
                  android_material_icon_name={filter.icon}
                  size={16}
                  color={isSelected ? '#FFFFFF' : textSecondaryColor}
                />
                <Text style={[
                  styles.contentFilterText,
                  isSelected ? styles.contentFilterTextSelected : { color: textSecondaryColor }
                ]}>
                  {filterLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.tabsWrapper}>
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
                onPress={() => setSelectedTab(tab.id)}
              >
                <IconSymbol 
                  ios_icon_name={tab.icon}
                  android_material_icon_name={tab.icon}
                  size={18}
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

      <ScrollView 
        contentContainerStyle={styles.postsContainer}
        showsVerticalScrollIndicator={false}
      >
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
              No posts yet in this category
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: textSecondaryColor }]}>
              Share from your check-ins, daily gifts, or practices
            </Text>
          </View>
        ) : (
          posts.map(post => {
            const authorDisplay = post.isAnonymous ? 'Anonymous' : post.authorName;
            const prayerCountText = `${post.prayerCount}`;
            const contentTypeLabel = getContentTypeLabel(post.contentType);
            const contentTypeIcon = getContentTypeIcon(post.contentType);
            
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

                {post.contentType && (
                  <View style={styles.contentTypeBadge}>
                    <IconSymbol 
                      ios_icon_name={contentTypeIcon}
                      android_material_icon_name={contentTypeIcon}
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={[styles.contentTypeText, { color: colors.primary }]}>
                      {contentTypeLabel}
                    </Text>
                  </View>
                )}

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
      </ScrollView>
    </SafeAreaView>
  );
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
  },
  filtersSection: {
    marginBottom: spacing.xs,
  },
  contentFiltersContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  contentFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  contentFilterSelected: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  contentFilterText: {
    fontSize: 11,
    fontWeight: typography.medium,
  },
  contentFilterTextSelected: {
    color: '#FFFFFF',
  },
  tabsWrapper: {
    marginBottom: spacing.md,
  },
  tabsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  tabSelected: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: typography.medium,
  },
  tabTextSelected: {
    color: '#FFFFFF',
  },
  postsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
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
  },
  postAuthorName: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
  },
  flagButton: {
    padding: spacing.xs,
  },
  contentTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  contentTypeText: {
    fontSize: typography.caption,
    fontWeight: typography.medium,
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
