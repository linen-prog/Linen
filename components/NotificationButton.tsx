
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Image, StyleSheet, Animated, Easing, Pressable, ImageSourcePropType } from 'react-native';
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
      // TODO: Backend Integration - GET /api/notifications/unread-count → { count: number }
      const response = await authenticatedGet('/api/notifications/unread-count');
      const data = await response.json();
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
      // TODO: Backend Integration - GET /api/notifications → [{ id, type, message, postId, senderName, senderAvatarUrl, read, createdAt }]
      const response = await authenticatedGet('/api/notifications');
      const data = await response.json();
      setNotifications(data || []);
      console.log('[NotificationButton] Fetched notifications:', data?.length || 0);
    } catch (error) {
      console.log('[NotificationButton] Failed to fetch notifications:', error);
    }
  }, []);

  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      // TODO: Backend Integration - POST /api/notifications/:id/read with {} → { success: true }
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
      // TODO: Backend Integration - POST /api/notifications/mark-all-read with {} → { success: true, count: number }
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
                      color={colors.accent}
                    />
                    <Text style={styles.emptyStateText}>No new notifications</Text>
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
                          {notification.type === 'reaction' && notification.userAvatarUrl ? (
                            <Image 
                              source={resolveImageSource(notification.userAvatarUrl)} 
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
  },
  emptyStateText: {
    fontSize: typography.bodySmall,
    color: colors.textLight,
    marginTop: 10,
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
