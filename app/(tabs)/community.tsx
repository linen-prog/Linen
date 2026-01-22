
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, TextInput, Modal } from 'react-native';
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
}

export default function CommunityScreen() {
  console.log('User viewing Community screen');

  const [selectedTab, setSelectedTab] = useState('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostAnonymous, setNewPostAnonymous] = useState(false);

  useEffect(() => {
    loadPosts(selectedTab);
  }, [selectedTab]);

  const loadPosts = async (category: string) => {
    console.log('Loading posts for category:', category);
    
    try {
      const { authenticatedGet } = await import('@/utils/api');
      
      let endpoint = '';
      if (category === 'my-shared') {
        endpoint = '/api/community/my-posts';
      } else {
        endpoint = `/api/community/posts?category=${category}`;
      }
      
      const response = await authenticatedGet<Post[]>(endpoint);
      console.log('Posts loaded:', response);
      setPosts(response.map(post => ({
        ...post,
        createdAt: new Date(post.createdAt),
      })));
    } catch (error) {
      console.error('Failed to load posts:', error);
      // Use empty array on error
      setPosts([]);
    }
  };

  const handlePray = async (postId: string) => {
    console.log('User toggling prayer for post:', postId);
    
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

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      return;
    }

    console.log('User creating post', { content: newPostContent, anonymous: newPostAnonymous, category: selectedTab });
    
    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ postId: string }>('/api/community/post', {
        category: selectedTab,
        content: newPostContent.trim(),
        isAnonymous: newPostAnonymous,
      });
      
      console.log('Post created:', response);
      
      setShowCreateModal(false);
      setNewPostContent('');
      setNewPostAnonymous(false);
      loadPosts(selectedTab);
    } catch (error) {
      console.error('Failed to create post:', error);
      // Optionally show an error message to the user
    }
  };

  // Always use light theme colors
  const bgColor = colors.background;
  const textColor = colors.text;
  const textSecondaryColor = colors.textSecondary;
  const cardBg = colors.card;
  const inputBg = colors.card;
  const inputBorder = colors.border;

  const tabs = [
    { id: 'feed', label: 'Feed', icon: 'home' as const },
    { id: 'wisdom', label: 'Wisdom', icon: 'menu-book' as const },
    { id: 'care', label: 'Care', icon: 'favorite' as const },
    { id: 'prayers', label: 'Prayers', icon: 'church' as const },
    { id: 'my-shared', label: 'My Shared', icon: 'person' as const },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <View style={[styles.header, Platform.OS === 'android' && { paddingTop: 48 }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          Community
        </Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <IconSymbol 
            ios_icon_name="plus"
            android_material_icon_name="add"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

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
                size={20}
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

      <ScrollView 
        contentContainerStyle={styles.postsContainer}
        showsVerticalScrollIndicator={false}
      >
        {posts.map(post => {
          const authorDisplay = post.isAnonymous ? 'Anonymous' : post.authorName;
          const prayerCountText = `${post.prayerCount}`;
          const prayerLabel = post.prayerCount === 1 ? 'prayer' : 'prayers';
          
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
              </View>

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
                    size={20}
                    color={post.userHasPrayed ? colors.prayer : textSecondaryColor}
                  />
                  <Text style={[styles.prayCount, { color: textSecondaryColor }]}>
                    {prayerCountText}
                  </Text>
                  <Text style={[styles.prayLabel, { color: textSecondaryColor }]}>
                    {prayerLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bgColor }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: textColor }]}>
              Share with Community
            </Text>
            <TouchableOpacity 
              onPress={handleCreatePost}
              disabled={!newPostContent.trim()}
            >
              <Text style={[
                styles.modalPost,
                { color: colors.primary },
                !newPostContent.trim() && styles.modalPostDisabled
              ]}>
                Post
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <TextInput
              style={[styles.modalInput, { 
                backgroundColor: inputBg,
                borderColor: inputBorder,
                color: textColor 
              }]}
              placeholder="Share your reflection, wisdom, or prayer request..."
              placeholderTextColor={textSecondaryColor}
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
              autoFocus
            />

            <TouchableOpacity 
              style={styles.anonymousToggle}
              onPress={() => setNewPostAnonymous(!newPostAnonymous)}
            >
              <IconSymbol 
                ios_icon_name={newPostAnonymous ? 'checkmark.square.fill' : 'square'}
                android_material_icon_name={newPostAnonymous ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.anonymousLabel, { color: textColor }]}>
                Post anonymously
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  createButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  tabSelected: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
  },
  tabTextSelected: {
    color: '#FFFFFF',
  },
  postsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
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
  postContent: {
    fontSize: typography.body,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  prayCount: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
  },
  prayLabel: {
    fontSize: typography.bodySmall,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCancel: {
    fontSize: typography.body,
  },
  modalTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
  },
  modalPost: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  modalPostDisabled: {
    opacity: 0.4,
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalInput: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    lineHeight: 22,
    minHeight: 200,
    borderWidth: 1,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  anonymousLabel: {
    fontSize: typography.body,
  },
});
