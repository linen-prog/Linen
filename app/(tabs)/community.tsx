
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Modal, Pressable, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedDelete } from '@/utils/api';
import { GradientBackground } from '@/components/GradientBackground';

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundTop,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: spacing.lg,
    top: spacing.lg,
    zIndex: 10,
    padding: spacing.xs,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  sparkleIcon: {
    marginRight: spacing.xs,
  },
  headerText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: typography.fontFamily,
    fontWeight: '500',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.text,
    fontFamily: typography.fontFamily,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
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
  },
  statText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  statNumber: {
    fontWeight: '600',
    color: colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundTop,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: typography.fontFamily,
  },
  tabTextActive: {
    color: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  postCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  postAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    fontFamily: typography.fontFamily,
  },
  postCategory: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  postActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    padding: spacing.xs,
  },
  postContent: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.md,
    fontFamily: typography.fontFamily,
  },
  scriptureRef: {
    fontSize: 13,
    color: colors.primary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  artworkImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  prayButtonActive: {
    backgroundColor: colors.primary,
  },
  prayText: {
    fontSize: 14,
    color: colors.text,
    fontFamily: typography.fontFamily,
  },
  prayTextActive: {
    color: colors.background,
  },
  postTime: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontSize: 13,
    color: colors.text,
    fontFamily: typography.fontFamily,
  },
  reactionCountActive: {
    color: colors.background,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyIcon: {
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: typography.fontFamily,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    fontFamily: typography.fontFamily,
  },
  closeButton: {
    padding: spacing.xs,
  },
  careMessageCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  careMessageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  careMessageAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontFamily: typography.fontFamily,
  },
  careMessageTime: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
  },
  careMessageText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily,
  },
  careMessageContext: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    fontFamily: typography.fontFamily,
  },
  careOptionsContainer: {
    marginTop: spacing.md,
  },
  careOptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    fontFamily: typography.fontFamily,
  },
  careOptionButton: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  careOptionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  careOptionText: {
    fontSize: 15,
    color: colors.text,
    fontFamily: typography.fontFamily,
  },
  careOptionTextSelected: {
    color: colors.background,
  },
  sendCareButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  sendCareButtonDisabled: {
    opacity: 0.5,
  },
  sendCareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
    fontFamily: typography.fontFamily,
  },
  deleteConfirmModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  deleteConfirmContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  deleteConfirmTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    fontFamily: typography.fontFamily,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  deleteConfirmMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  deleteCancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteConfirmButtonDelete: {
    backgroundColor: '#DC2626',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  deleteCancelButtonText: {
    color: colors.text,
  },
  deleteConfirmButtonTextDelete: {
    color: colors.background,
  },
});

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'just now';
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
  const dateText = date.toLocaleDateString();
  return dateText;
}

export default function CommunityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<string>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<CommunityStats>({ sharedToday: 0, liftedInPrayer: 0 });
  const [careMessages, setCareMessages] = useState<CareMessage[]>([]);
  const [showCareModal, setShowCareModal] = useState(false);
  const [selectedCarePost, setSelectedCarePost] = useState<Post | null>(null);
  const [selectedCareMessage, setSelectedCareMessage] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);

  useEffect(() => {
    console.log('Community screen: Loading data for tab:', selectedTab);
    loadStats();
    loadPosts(selectedTab);
    if (selectedTab === 'care' && user) {
      loadCareMessages();
    }
  }, [selectedTab, user]);

  const loadStats = async () => {
    try {
      console.log('Loading community stats');
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/community/stats`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Community stats loaded:', data);
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading community stats:', error);
    }
  };

  const loadPosts = async (category: string) => {
    try {
      console.log('Loading posts for category:', category);
      const endpoint = category === 'feed' 
        ? '/api/community/posts'
        : `/api/community/posts?category=${category}`;
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Posts loaded:', data.length, 'posts');
        const postsWithDates = data.map((post: any) => ({
          ...post,
          createdAt: new Date(post.createdAt),
        }));
        setPosts(postsWithDates);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const handlePray = async (postId: string) => {
    try {
      console.log('Toggling prayer for post:', postId);
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/community/post/${postId}/pray`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        console.log('Prayer toggled successfully');
        setPosts(posts.map(post => {
          if (post.id === postId) {
            const newUserHasPrayed = !post.userHasPrayed;
            const newPrayerCount = post.userHasPrayed ? post.prayerCount - 1 : post.prayerCount + 1;
            return {
              ...post,
              userHasPrayed: newUserHasPrayed,
              prayerCount: newPrayerCount,
            };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('Error toggling prayer:', error);
    }
  };

  const handleFlagPost = async (postId: string) => {
    try {
      console.log('Flagging post:', postId);
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/community/post/${postId}/flag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        console.log('Post flagged successfully');
        setPosts(posts.map(post => {
          if (post.id === postId) {
            return { ...post, isFlagged: true };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('Error flagging post:', error);
    }
  };

  const handleReact = async (postId: string, reactionType: string) => {
    try {
      console.log('Reacting to post:', postId, 'with reaction:', reactionType);
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/community/post/${postId}/react`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reactionType }),
      });

      if (response.ok) {
        console.log('Reaction added successfully');
        loadPosts(selectedTab);
      }
    } catch (error) {
      console.error('Error reacting to post:', error);
    }
  };

  const loadCareMessages = async () => {
    try {
      console.log('Loading care messages');
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/community/care-messages`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Care messages loaded:', data.length, 'messages');
        const messagesWithDates = data.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }));
        setCareMessages(messagesWithDates);
      }
    } catch (error) {
      console.error('Error loading care messages:', error);
    }
  };

  const handleSendCare = async () => {
    if (!selectedCarePost || !selectedCareMessage) {
      return;
    }

    try {
      console.log('Sending care message to post:', selectedCarePost.id);
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/community/post/${selectedCarePost.id}/care`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: selectedCareMessage }),
      });

      if (response.ok) {
        console.log('Care message sent successfully');
        setShowCareModal(false);
        setSelectedCarePost(null);
        setSelectedCareMessage('');
      }
    } catch (error) {
      console.error('Error sending care message:', error);
    }
  };

  const confirmDeletePost = (post: Post) => {
    console.log('User initiated delete for post:', post.id);
    setPostToDelete(post);
    setShowDeleteConfirm(true);
  };

  const handleDeletePost = async () => {
    if (!postToDelete) {
      return;
    }

    setIsDeletingPost(true);
    try {
      console.log('Deleting post:', postToDelete.id);
      await authenticatedDelete(`/api/community/post/${postToDelete.id}`);
      console.log('Post deleted successfully');
      
      // Remove post from local state
      setPosts(prevPosts => prevPosts.filter(p => p.id !== postToDelete.id));
      
      // Reload stats
      await loadStats();
      
      setShowDeleteConfirm(false);
      setPostToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete post:', error);
    } finally {
      setIsDeletingPost(false);
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'wisdom':
        return colors.primary;
      case 'care':
        return '#DC2626';
      case 'prayer':
        return '#7C3AED';
      default:
        return colors.textSecondary;
    }
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'wisdom':
        return 'Wisdom Share';
      case 'care':
        return 'Care Request';
      case 'prayer':
        return 'Prayer Share';
      default:
        return 'Reflection';
    }
  };

  const getReactionEmoji = (reactionType: string): string => {
    switch (reactionType) {
      case 'praying':
        return '🙏';
      case 'holding':
        return '🤲';
      case 'light':
        return '✨';
      case 'amen':
        return '🕊️';
      case 'growing':
        return '🌱';
      case 'peace':
        return '☮️';
      default:
        return '❤️';
    }
  };

  const sharedTodayText = `${stats.sharedToday} shared today`;
  const liftedInPrayerText = `${stats.liftedInPrayer} lifted in prayer`;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            console.log('User tapped back button');
            router.back();
          }}
        >
          <IconSymbol 
            ios_icon_name="chevron.left" 
            android_material_icon_name="arrow-back" 
            size={24} 
            color={colors.text} 
          />
        </TouchableOpacity>

        <View style={styles.headerTopRow}>
          <Text style={styles.sparkleIcon}>✨</Text>
          <Text style={styles.headerText}>You are not alone in this journey</Text>
        </View>
        
        <Text style={styles.title}>Community</Text>
        <Text style={styles.subtitle}>
          A gentle space where hearts meet, prayers are lifted, and encouragement flows freely
        </Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.statText}>
              <Text style={styles.statNumber}>{stats.sharedToday}</Text>
              <Text> shared today</Text>
            </Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.statText}>
              <Text style={styles.statNumber}>{stats.liftedInPrayer}</Text>
              <Text> lifted in prayer</Text>
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'feed' && styles.tabActive]}
          onPress={() => setSelectedTab('feed')}
        >
          <Text style={[styles.tabText, selectedTab === 'feed' && styles.tabTextActive]}>
            Feed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'wisdom' && styles.tabActive]}
          onPress={() => setSelectedTab('wisdom')}
        >
          <Text style={[styles.tabText, selectedTab === 'wisdom' && styles.tabTextActive]}>
            Wisdom
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'care' && styles.tabActive]}
          onPress={() => setSelectedTab('care')}
        >
          <Text style={[styles.tabText, selectedTab === 'care' && styles.tabTextActive]}>
            Care
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'prayer' && styles.tabActive]}
          onPress={() => setSelectedTab('prayer')}
        >
          <Text style={[styles.tabText, selectedTab === 'prayer' && styles.tabTextActive]}>
            Prayers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'my-shared' && styles.tabActive]}
          onPress={() => setSelectedTab('my-shared')}
        >
          <Text style={[styles.tabText, selectedTab === 'my-shared' && styles.tabTextActive]}>
            My Shared
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {selectedTab === 'care' && careMessages.length > 0 ? (
          careMessages.map((message) => {
            const authorDisplay = message.isAnonymous ? 'Anonymous' : message.senderName || 'A friend';
            const timeAgo = formatTimeAgo(message.createdAt);
            const contextPreview = message.postContent.substring(0, 60);
            const contextText = `In response to: "${contextPreview}..."`;
            
            return (
              <View key={message.id} style={styles.careMessageCard}>
                <View style={styles.careMessageHeader}>
                  <Text style={styles.careMessageAuthor}>{authorDisplay}</Text>
                  <Text style={styles.careMessageTime}>{timeAgo}</Text>
                </View>
                <Text style={styles.careMessageText}>{message.message}</Text>
                <Text style={styles.careMessageContext}>{contextText}</Text>
              </View>
            );
          })
        ) : posts.length > 0 ? (
          posts.map((post) => {
            const authorDisplay = post.isAnonymous ? 'Anonymous' : post.authorName || 'A friend';
            const categoryColor = getCategoryColor(post.category);
            const categoryLabel = getCategoryLabel(post.category);
            const timeAgo = formatTimeAgo(post.createdAt);
            const prayIconColor = post.userHasPrayed ? colors.background : colors.text;
            const isOwnPost = user && post.userId === user.id;
            
            return (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.postAuthor}>{authorDisplay}</Text>
                    <Text style={[styles.postCategory, { color: categoryColor }]}>
                      {categoryLabel}
                    </Text>
                  </View>
                  <View style={styles.postActions}>
                    {isOwnPost && (
                      <TouchableOpacity 
                        style={styles.iconButton}
                        onPress={() => confirmDeletePost(post)}
                        disabled={isDeletingPost}
                      >
                        <IconSymbol 
                          ios_icon_name="trash" 
                          android_material_icon_name="delete" 
                          size={20} 
                          color="#DC2626" 
                        />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={styles.iconButton}
                      onPress={() => handleFlagPost(post.id)}
                    >
                      <IconSymbol 
                        ios_icon_name="flag" 
                        android_material_icon_name="flag" 
                        size={20} 
                        color={post.isFlagged ? '#DC2626' : colors.textSecondary} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {post.scriptureReference && (
                  <Text style={styles.scriptureRef}>{post.scriptureReference}</Text>
                )}

                {post.artworkUrl && (
                  <Image 
                    source={{ uri: post.artworkUrl }} 
                    style={styles.artworkImage}
                    resizeMode="cover"
                  />
                )}

                <Text style={styles.postContent}>{post.content}</Text>

                {post.reactions && (
                  <View style={styles.reactionsRow}>
                    {Object.entries(post.reactions).map(([type, count]) => {
                      if (count === 0) {
                        return null;
                      }
                      const isActive = post.userReaction === type;
                      const emoji = getReactionEmoji(type);
                      
                      return (
                        <TouchableOpacity
                          key={type}
                          style={[styles.reactionButton, isActive && styles.reactionButtonActive]}
                          onPress={() => handleReact(post.id, type)}
                        >
                          <Text style={styles.reactionEmoji}>{emoji}</Text>
                          <Text style={[styles.reactionCount, isActive && styles.reactionCountActive]}>
                            {count}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <View style={styles.postFooter}>
                  <TouchableOpacity
                    style={[styles.prayButton, post.userHasPrayed && styles.prayButtonActive]}
                    onPress={() => handlePray(post.id)}
                  >
                    <IconSymbol 
                      ios_icon_name="hands.sparkles" 
                      android_material_icon_name="favorite" 
                      size={18} 
                      color={prayIconColor} 
                    />
                    <Text style={[styles.prayText, post.userHasPrayed && styles.prayTextActive]}>
                      {post.prayerCount}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.postTime}>{timeAgo}</Text>
                </View>

                {post.category === 'care' && (
                  <TouchableOpacity
                    style={[styles.prayButton, { marginTop: spacing.sm }]}
                    onPress={() => {
                      console.log('User tapped Send Care button for post:', post.id);
                      setSelectedCarePost(post);
                      setShowCareModal(true);
                    }}
                  >
                    <IconSymbol 
                      ios_icon_name="heart" 
                      android_material_icon_name="favorite" 
                      size={18} 
                      color={colors.text} 
                    />
                    <Text style={styles.prayText}>Send Care</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol 
              ios_icon_name="leaf" 
              android_material_icon_name="eco" 
              size={48} 
              color={colors.textSecondary} 
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyText}>
              {selectedTab === 'care' 
                ? 'No care messages yet'
                : 'No posts in this category yet'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Care Modal */}
      <Modal
        visible={showCareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Care</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowCareModal(false)}
              >
                <IconSymbol 
                  ios_icon_name="xmark" 
                  android_material_icon_name="close" 
                  size={24} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.careOptionsContainer}>
              <Text style={styles.careOptionsTitle}>Choose a message:</Text>
              <CareMessageOption
                message="I'm holding you in prayer"
                onPress={() => setSelectedCareMessage("I'm holding you in prayer")}
                textColor={colors.text}
                bgColor={colors.background}
                isSelected={selectedCareMessage === "I'm holding you in prayer"}
              />
              <CareMessageOption
                message="You're not alone in this"
                onPress={() => setSelectedCareMessage("You're not alone in this")}
                textColor={colors.text}
                bgColor={colors.background}
                isSelected={selectedCareMessage === "You're not alone in this"}
              />
              <CareMessageOption
                message="Sending you peace and strength"
                onPress={() => setSelectedCareMessage("Sending you peace and strength")}
                textColor={colors.text}
                bgColor={colors.background}
                isSelected={selectedCareMessage === "Sending you peace and strength"}
              />
              <CareMessageOption
                message="May you feel held and supported"
                onPress={() => setSelectedCareMessage("May you feel held and supported")}
                textColor={colors.text}
                bgColor={colors.background}
                isSelected={selectedCareMessage === "May you feel held and supported"}
              />
            </View>

            <TouchableOpacity
              style={[styles.sendCareButton, !selectedCareMessage && styles.sendCareButtonDisabled]}
              onPress={handleSendCare}
              disabled={!selectedCareMessage}
            >
              <Text style={styles.sendCareButtonText}>Send Care Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeletingPost && setShowDeleteConfirm(false)}
      >
        <View style={styles.deleteConfirmModal}>
          <View style={styles.deleteConfirmContent}>
            <Text style={styles.deleteConfirmTitle}>Delete Post?</Text>
            <Text style={styles.deleteConfirmMessage}>
              Are you sure you want to delete this post? This action cannot be undone.
            </Text>
            
            {isDeletingPost ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <View style={styles.deleteConfirmButtons}>
                <TouchableOpacity
                  style={[styles.deleteConfirmButton, styles.deleteCancelButton]}
                  onPress={() => {
                    console.log('User cancelled post deletion');
                    setShowDeleteConfirm(false);
                    setPostToDelete(null);
                  }}
                >
                  <Text style={[styles.deleteConfirmButtonText, styles.deleteCancelButtonText]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.deleteConfirmButton, styles.deleteConfirmButtonDelete]}
                  onPress={handleDeletePost}
                >
                  <Text style={[styles.deleteConfirmButtonText, styles.deleteConfirmButtonTextDelete]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </GradientBackground>
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
        styles.careOptionButton,
        isSelected && styles.careOptionButtonSelected,
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.careOptionText,
        isSelected && styles.careOptionTextSelected,
      ]}>
        {message}
      </Text>
    </TouchableOpacity>
  );
}
