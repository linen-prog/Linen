
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Image, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { useRouter } from 'expo-router';

interface Notification {
  id: string;
  type: 'reaction' | 'feedback';
  message: string;
  timestamp: string;
  read: boolean;
  communityPostId?: string;
  userAvatarUrl?: string;
  feedbackIcon?: string;
}

export default function NotificationButton() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const router = useRouter();

  const pulseAnim = useRef(new Animated.Value(0)).current;

  const startPulse = useCallback(() => {
    pulseAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { 
          toValue: 1, 
          duration: 800, 
          easing: Easing.inOut(Easing.ease), 
          useNativeDriver: true 
        }),
        Animated.timing(pulseAnim, { 
          toValue: 0, 
          duration: 800, 
          easing: Easing.inOut(Easing.ease), 
          useNativeDriver: true 
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await authenticatedGet<{ count: number }>('/api/notifications/unread-count');
      const count = data.count || 0;
      setUnreadCount(count);
      console.log('[NotificationButton] Unread count:', count);
      if (count > 0) {
        startPulse();
      } else {
        pulseAnim.stopAnimation();
      }
    } catch (error) {
      console.log('[NotificationButton] Failed to fetch unread count:', error);
    }
  }, [startPulse, pulseAnim]);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await authenticatedGet<Notification[]>('/api/notifications');
      setNotifications(data || []);
      console.log('[NotificationButton] Fetched notifications:', data?.length || 0);
    } catch (error) {
      console.log('[NotificationButton] Failed to fetch notifications:', error);
    }
  }, []);

  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      await authenticatedPost(`/api/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      console.log('[NotificationButton] Marked notification as read:', id);
    } catch (error) {
      console.log('[NotificationButton] Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await authenticatedPost('/api/notifications/mark-all-read', {});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      pulseAnim.stopAnimation();
      console.log('[NotificationButton] Marked all notifications as read');
    } catch (error) {
      console.log('[NotificationButton] Failed to mark all as read:', error);
    }
  }, [pulseAnim]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleButtonClick = useCallback(() => {
    console.log('[NotificationButton] User tapped notification button');
    setIsDropdownVisible(prev => !prev);
    if (!isDropdownVisible) {
      fetchNotifications();
    }
  }, [isDropdownVisible, fetchNotifications]);

  const handleNotificationClick = useCallback((notification: Notification) => {
    console.log('[NotificationButton] User tapped notification:', notification.id);
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }
    setIsDropdownVisible(false);
    
    if (notification.type === 'reaction' && notification.communityPostId) {
      router.push('/(tabs)/community');
    }
  }, [markNotificationAsRead, router]);

  const badgeScale = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });

  const unreadCountDisplay = unreadCount > 9 ? '9+' : unreadCount.toString();
  const iconColor = isHovered ? '#b45309' : '#d97706';
  const textColor = isHovered ? '#b45309' : '#57534e';

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={handleButtonClick} 
        style={styles.button}
        onPressIn={() => setIsHovered(true)}
        onPressOut={() => setIsHovered(false)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <IconSymbol 
            ios_icon_name="sparkles" 
            android_material_icon_name="auto-awesome" 
            size={24} 
            color={iconColor}
          />
          {unreadCount > 0 && (
            <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
              <Text style={styles.badgeText}>{unreadCountDisplay}</Text>
            </Animated.View>
          )}
        </View>
        <Text style={[styles.buttonLabel, { color: textColor }]}>Love Messages</Text>
      </TouchableOpacity>

      {isDropdownVisible && (
        <Modal
          transparent={true}
          visible={isDropdownVisible}
          onRequestClose={() => setIsDropdownVisible(false)}
          animationType="fade"
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setIsDropdownVisible(false)}
          >
            <Pressable 
              onPress={(e) => e.stopPropagation()}
              style={styles.dropdownPanel}
            >
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Notifications</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity onPress={markAllAsRead}>
                    <Text style={styles.markAllReadText}>Mark all read</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsDropdownVisible(false)} style={styles.closeButton}>
                    <IconSymbol 
                      ios_icon_name="xmark" 
                      android_material_icon_name="close" 
                      size={24} 
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={styles.dropdownBody} showsVerticalScrollIndicator={false}>
                {notifications.length === 0 ? (
                  <View style={styles.emptyState}>
                    <IconSymbol 
                      ios_icon_name="sparkles" 
                      android_material_icon_name="auto-awesome" 
                      size={48} 
                      color="#d97706"
                    />
                    <Text style={styles.emptyStateText}>No new notifications</Text>
                  </View>
                ) : (
                  <React.Fragment>
                    {notifications.map((notification) => {
                      const cardBgColor = notification.read ? '#FFFFFF' : '#fffbeb';
                      
                      return (
                        <TouchableOpacity
                          key={notification.id}
                          style={[styles.notificationCard, { backgroundColor: cardBgColor }]}
                          onPress={() => handleNotificationClick(notification)}
                          activeOpacity={0.7}
                        >
                          {notification.type === 'reaction' && notification.userAvatarUrl ? (
                            <Image 
                              source={{ uri: notification.userAvatarUrl }} 
                              style={styles.avatar} 
                            />
                          ) : (
                            <View style={styles.feedbackIconContainer}>
                              <IconSymbol 
                                ios_icon_name="sparkles" 
                                android_material_icon_name="auto-awesome" 
                                size={18} 
                                color="#FFFFFF"
                              />
                            </View>
                          )}
                          
                          <View style={styles.notificationContent}>
                            <Text style={styles.notificationText}>{notification.message}</Text>
                            <Text style={styles.notificationTimestamp}>{notification.timestamp}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </React.Fragment>
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  iconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f43f5e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  dropdownPanel: {
    width: 300,
    maxHeight: '60%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllReadText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '400',
  },
  closeButton: {
    padding: 4,
  },
  dropdownBody: {
    maxHeight: 400,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#78716c',
    marginTop: 10,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  feedbackIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  notificationTimestamp: {
    fontSize: 12,
    color: '#78716c',
  },
});
</write file>

Now I need to integrate the NotificationButton into both home page files (base and iOS):

<write file="app/(tabs)/(home)/index.tsx">
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GradientBackground } from '@/components/GradientBackground';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/utils/api';
import NotificationButton from '@/components/NotificationButton';

interface UserStats {
  checkInStreak: number;
  reflectionStreak: number;
  displayName?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [lastCheckInMessage, setLastCheckInMessage] = useState<string>('');

  useEffect(() => {
    loadUserStats();
    loadLastCheckIn();
  }, []);

  const loadUserStats = async () => {
    try {
      const response = await authenticatedGet('/api/profile/stats');
      const data = await response.json();
      setStats(data);
      console.log('[Home] Loaded user stats:', data);
    } catch (error) {
      console.log('[Home] Error loading stats:', error);
    }
  };

  const loadLastCheckIn = async () => {
    try {
      const response = await authenticatedGet('/api/check-in/last-message');
      const data = await response.json();
      if (data.lastMessage) {
        setLastCheckInMessage(data.lastMessage);
      }
      console.log('[Home] Loaded last check-in message');
    } catch (error) {
      console.log('[Home] Error loading last check-in:', error);
    }
  };

  const displayName = stats?.displayName || user?.name || 'friend';
  const greetingText = `Peace to you, ${displayName}`;

  const handleCheckInPress = () => {
    console.log('[Home] User tapped Check-In button');
    router.push('/check-in');
  };

  const handleOpenGiftPress = () => {
    console.log('[Home] User tapped Open Your Gift button');
    router.push('/daily-gift');
  };

  const handleCommunityPress = () => {
    console.log('[Home] User tapped Community button');
    router.push('/(tabs)/community');
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Top Bar with Notification Button */}
        <View style={styles.topBar}>
          <View style={styles.topBarSpacer} />
          <NotificationButton />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appTitle}>Linen</Text>
            <Text style={styles.greeting}>{greetingText}</Text>
          </View>

          {/* Streak Cards */}
          <View style={styles.streakContainer}>
            <View style={styles.streakCard}>
              <Text style={styles.streakLabel}>Check-In Streak</Text>
              <View style={styles.streakValueContainer}>
                <Text style={styles.streakValue}>{stats?.checkInStreak || 0}</Text>
                <Text style={styles.streakBest}>best: 2</Text>
              </View>
            </View>
            <View style={styles.streakCard}>
              <Text style={styles.streakLabel}>Reflection Streak</Text>
              <View style={styles.streakValueContainer}>
                <Text style={styles.streakValue}>{stats?.reflectionStreak || 0}</Text>
                <Text style={styles.streakBest}>best: 4</Text>
              </View>
            </View>
          </View>

          {/* Check-In Card */}
          <TouchableOpacity 
            style={styles.checkInCard}
            onPress={handleCheckInPress}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <IconSymbol 
                ios_icon_name="message.fill" 
                android_material_icon_name="chat" 
                size={40} 
                color={colors.primary}
              />
            </View>
            
            <Text style={styles.cardTitle}>Check-In</Text>
            
            <Text style={styles.cardSubtitle}>Dove is here for you</Text>
            
            {lastCheckInMessage ? (
              <View style={styles.promptContainer}>
                <Text style={styles.promptText}>
                  {lastCheckInMessage.length > 80 
                    ? `${lastCheckInMessage.substring(0, 80)}...` 
                    : lastCheckInMessage}
                </Text>
              </View>
            ) : (
              <View style={styles.promptContainer}>
                <Text style={styles.promptText}>
                  My lower avoid en is so sore and my low back hurts. With th...
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Open Your Gift Card */}
          <TouchableOpacity 
            style={styles.giftCard}
            onPress={handleOpenGiftPress}
            activeOpacity={0.7}
          >
            <View style={styles.giftIconCircle}>
              <IconSymbol 
                ios_icon_name="gift.fill" 
                android_material_icon_name="card-giftcard" 
                size={40} 
                color={colors.accent}
              />
            </View>
            
            <Text style={styles.giftCardTitle}>Open Your Gift</Text>
            
            <Text style={styles.giftCardSubtitle}>Daily scripture reflection</Text>
          </TouchableOpacity>

          {/* Community Card */}
          <TouchableOpacity 
            style={styles.communityCard}
            onPress={handleCommunityPress}
            activeOpacity={0.7}
          >
            <View style={styles.communityIconCircle}>
              <IconSymbol 
                ios_icon_name="person.3.fill" 
                android_material_icon_name="group" 
                size={28} 
                color={colors.primary}
              />
            </View>
            
            <View style={styles.communityTextContainer}>
              <Text style={styles.communityCardTitle}>Community</Text>
              <Text style={styles.communityCardSubtitle}>Share your reflections</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    zIndex: 100,
  },
  topBarSpacer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  appTitle: {
    fontSize: 48,
    fontWeight: typography.regular,
    color: colors.text,
    fontFamily: typography.fontFamilySerif,
    marginBottom: spacing.sm,
  },
  greeting: {
    fontSize: typography.h4,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    fontFamily: typography.fontFamilySerif,
  },
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  streakCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  streakLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  streakValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  streakValue: {
    fontSize: 36,
    fontWeight: typography.bold,
    color: colors.primary,
  },
  streakBest: {
    fontSize: typography.bodySmall,
    fontWeight: typography.regular,
    color: colors.textLight,
  },
  checkInCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(76, 110, 78, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  promptContainer: {
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  promptText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textLight,
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
  },
  giftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
    alignItems: 'center',
    shadowColor: colors.accentDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  giftIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(218, 165, 32, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  giftCardTitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  giftCardSubtitle: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
  },
  communityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  communityIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(218, 165, 32, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  communityTextContainer: {
    flex: 1,
  },
  communityCardTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  communityCardSubtitle: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    color: colors.textSecondary,
  },
});
