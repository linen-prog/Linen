
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Image, StyleSheet, Animated, Easing, Pressable, ImageSourcePropType } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { useRouter } from 'expo-router';

interface Notification {
  id: string;
  type: 'reaction' | 'feedback' | 'care_message';
  message: string;
  createdAt: string;
  read: boolean;
  communityPostId?: string;
  senderAvatarUrl?: string;
  senderName?: string;
}

// Helper to resolve image sources (handles both local require() and remote URLs)
function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function NotificationButton() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
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
      console.log('[NotificationButton] Fetching unread count...');
      const data = await authenticatedGet<{ count: number }>('/api/notifications/unread-count');
      const count = data.count || 0;
      setUnreadCount(count);
      setHasError(false);
      console.log('[NotificationButton] Unread count:', count);
      
      if (count > 0) {
        startPulse();
      } else {
        pulseAnim.stopAnimation();
      }
    } catch (error: any) {
      console.log('[NotificationButton] Failed to fetch unread count:', error?.message || error);
      setHasError(true);
      // Don't show error to user - just fail silently for better UX
      // The button will still be visible and functional
    }
  }, [startPulse, pulseAnim]);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('[NotificationButton] Fetching notifications...');
      const data = await authenticatedGet<Notification[]>('/api/notifications');
      setNotifications(data || []);
      setHasError(false);
      console.log('[NotificationButton] Fetched notifications:', data?.length || 0);
    } catch (error: any) {
      console.log('[NotificationButton] Failed to fetch notifications:', error?.message || error);
      setHasError(true);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      console.log('[NotificationButton] Marking notification as read:', id);
      await authenticatedPost(`/api/notifications/${id}/read`, {});
      
      // Optimistically update UI
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      console.log('[NotificationButton] Marked notification as read');
    } catch (error: any) {
      console.log('[NotificationButton] Failed to mark notification as read:', error?.message || error);
      // Revert optimistic update on error
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      console.log('[NotificationButton] Marking all notifications as read...');
      await authenticatedPost('/api/notifications/mark-all-read', {});
      
      // Optimistically update UI
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      pulseAnim.stopAnimation();
      
      console.log('[NotificationButton] Marked all notifications as read');
    } catch (error: any) {
      console.log('[NotificationButton] Failed to mark all as read:', error?.message || error);
      // Revert optimistic update on error
      fetchNotifications();
    }
  }, [pulseAnim, fetchNotifications]);

  useEffect(() => {
    console.log('[NotificationButton] Component mounted');
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => {
      console.log('[NotificationButton] Component unmounting, clearing interval');
      clearInterval(interval);
    };
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
    
    // Navigate to community if it's a reaction or care message
    if ((notification.type === 'reaction' || notification.type === 'care_message') && notification.communityPostId) {
      console.log('[NotificationButton] Navigating to community for post:', notification.communityPostId);
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
                  {notifications.length > 0 && (
                    <TouchableOpacity onPress={markAllAsRead}>
                      <Text style={styles.markAllReadText}>Mark all read</Text>
                    </TouchableOpacity>
                  )}
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
                {isLoading ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Loading...</Text>
                  </View>
                ) : hasError ? (
                  <View style={styles.emptyState}>
                    <IconSymbol 
                      ios_icon_name="exclamationmark.triangle" 
                      android_material_icon_name="warning" 
                      size={48} 
                      color={colors.warning}
                    />
                    <Text style={styles.emptyStateText}>Unable to load notifications</Text>
                    <Text style={styles.errorSubtext}>Please check your connection and try again</Text>
                    <TouchableOpacity 
                      style={styles.retryButton}
                      onPress={fetchNotifications}
                    >
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : notifications.length === 0 ? (
                  <View style={styles.emptyState}>
                    <IconSymbol 
                      ios_icon_name="sparkles" 
                      android_material_icon_name="auto-awesome" 
                      size={48} 
                      color={colors.accent}
                    />
                    <Text style={styles.emptyStateText}>No new notifications</Text>
                    <Text style={styles.emptyStateSubtext}>
                      You&apos;ll see love messages here when someone reacts to your posts
                    </Text>
                  </View>
                ) : (
                  <>
                    {notifications.map((notification, index) => {
                      const cardBgColor = notification.read ? '#FFFFFF' : colors.accentVeryLight;
                      
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[styles.notificationCard, { backgroundColor: cardBgColor }]}
                          onPress={() => handleNotificationClick(notification)}
                          activeOpacity={0.7}
                        >
                          {notification.senderAvatarUrl ? (
                            <Image 
                              source={resolveImageSource(notification.senderAvatarUrl)} 
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
                            <Text style={styles.notificationTimestamp}>{notification.createdAt}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </>
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
    borderRadius: borderRadius.md,
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
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownTitle: {
    fontSize: typography.body,
    fontWeight: typography.medium,
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllReadText: {
    fontSize: typography.bodySmall,
    color: colors.primaryMedium,
    fontWeight: typography.regular,
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
    paddingHorizontal: spacing.lg,
  },
  emptyStateText: {
    fontSize: typography.body,
    color: colors.textLight,
    marginTop: 10,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: typography.bodySmall,
    color: colors.textLight,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorSubtext: {
    fontSize: typography.bodySmall,
    color: colors.textLight,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: typography.medium,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.md,
  },
  feedbackIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryMedium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: typography.bodySmall,
    color: colors.text,
    marginBottom: 4,
  },
  notificationTimestamp: {
    fontSize: typography.caption,
    color: colors.textLight,
  },
});
