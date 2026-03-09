
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Modal, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';

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
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    fontFamily: typography.fontFamily,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: typography.fontFamily,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily,
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

  useEffect(() => {
    loadStats();
    loadPosts(selectedTab);
    if (selectedTab === 'care' && user) {
      loadCareMessages();
    }
  }, [selectedTab, user]);

  const loadStats = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/community/stats`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading community stats:', error);
    }
  };

  const loadPosts = async (category: string) => {
    try {
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
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/community/post/${postId}/pray`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        setPosts(posts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              userHasPrayed: !post.userHasPrayed,
              prayerCount: post.userHasPrayed ? post.prayerCount - 1 : post.prayerCount + 1,
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
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/community/post/${postId}/flag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
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
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/community/post/${postId}/react`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reactionType }),
      });

      if (response.ok) {
        loadPosts(selectedTab);
      }
    } catch (error) {
      console.error('Error reacting to post:', error);
    }
  };

  const loadCareMessages = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/community/care-messages`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
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
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/community/post/${selectedCarePost.id}/care`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: selectedCareMessage }),
      });

      if (response.ok) {
        setShowCareModal(false);
        setSelectedCarePost(null);
        setSelectedCareMessage('');
      }
    } catch (error) {
      console.error('Error sending care message:', error);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <Text style={styles.subtitle}>A gentle space for shared reflection</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.sharedToday}</Text>
            <Text style={styles.statLabel}>Shared Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.liftedInPrayer}</Text>
            <Text style={styles.statLabel}>Lifted in Prayer</Text>
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
          careMessages.map((message) => (
            <View key={message.id} style={styles.careMessageCard}>
              <View style={styles.careMessageHeader}>
                <Text style={styles.careMessageAuthor}>
                  {message.isAnonymous ? 'Anonymous' : message.senderName || 'A friend'}
                </Text>
                <Text style={styles.careMessageTime}>{formatTimeAgo(message.createdAt)}</Text>
              </View>
              <Text style={styles.careMessageText}>{message.message}</Text>
              <Text style={styles.careMessageContext}>
                In response to: "{message.postContent.substring(0, 60)}..."
              </Text>
            </View>
          ))
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.postAuthor}>
                    {post.isAnonymous ? 'Anonymous' : post.authorName || 'A friend'}
                  </Text>
                  <Text style={[styles.postCategory, { color: getCategoryColor(post.category) }]}>
                    {getCategoryLabel(post.category)}
                  </Text>
                </View>
                <View style={styles.postActions}>
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
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[styles.reactionButton, isActive && styles.reactionButtonActive]}
                        onPress={() => handleReact(post.id, type)}
                      >
                        <Text style={styles.reactionEmoji}>{getReactionEmoji(type)}</Text>
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
                    color={post.userHasPrayed ? colors.background : colors.text} 
                  />
                  <Text style={[styles.prayText, post.userHasPrayed && styles.prayTextActive]}>
                    {post.prayerCount}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.postTime}>{formatTimeAgo(post.createdAt)}</Text>
              </View>

              {post.category === 'care' && (
                <TouchableOpacity
                  style={[styles.prayButton, { marginTop: spacing.sm }]}
                  onPress={() => {
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
          ))
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
    </SafeAreaView>
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
