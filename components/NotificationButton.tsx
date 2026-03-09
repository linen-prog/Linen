
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Image, StyleSheet, Animated, Easing } from 'react-native';
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
  userAvatar?: string;
}

export default function NotificationButton() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isDropdownVisible, setIsDropdownVisible] = useState<boolean>(false);
  const router = useRouter();

  const pulseAnim = useRef(new Animated.Value(0)).current;

  const startPulse = useCallback(() => {
    pulseAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 500, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const fetchUnreadCount = useCallback(async () => {
    try {
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
      const response = await authenticatedGet('/api/notifications');
      const data = await response.json();
      setNotifications(data.notifications || []);
      console.log('[NotificationButton] Fetched notifications:', data.notifications?.length || 0);
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
    if (notification.type === 'reaction') {
      router.push('/(tabs)/community');
    }
  }, [markNotificationAsRead, router]);

  const badgeScale = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });

  const unreadCountDisplay = unreadCount > 9 ? '9+' : unreadCount.toString();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleButtonClick} style={styles.button}>
        <IconSymbol 
          ios_icon_name="sparkles" 
          android_material_icon_name="auto-awesome" 
          size={24} 
          color="#d97706"
        />
        {unreadCount > 0 && (
          <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
            <Text style={styles.badgeText}>{unreadCountDisplay}</Text>
          </Animated.View>
        )}
        <Text style={styles.buttonLabel}>Love Messages</Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={isDropdownVisible}
        onRequestClose={() => setIsDropdownVisible(false)}
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setIsDropdownVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
            style={styles.dropdownPanel}
          >
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Notifications</Text>
              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllAsRead}>
                    <Text style={styles.markAllReadText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setIsDropdownVisible(false)}>
                  <IconSymbol 
                    ios_icon_name="xmark" 
                    android_material_icon_name="close" 
                    size={24} 
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.dropdownBody}>
              {notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <IconSymbol 
                    ios_icon_name="sparkles" 
                    android_material_icon_name="auto-awesome" 
                    size={48} 
                    color="#9ca3af"
                  />
                  <Text style={styles.emptyStateText}>No new notifications</Text>
                </View>
              ) : (
                <FlatList
                  data={notifications}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.notificationCard, !item.read && styles.unreadCard]}
                      onPress={() => handleNotificationClick(item)}
                    >
                      {item.type === 'reaction' && item.userAvatar ? (
                        <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
                      ) : (
                        <View style={styles.feedbackIconContainer}>
                          <IconSymbol 
                            ios_icon_name="sparkles" 
                            android_material_icon_name="auto-awesome" 
                            size={20} 
                            color="#FFFFFF"
                          />
                        </View>
                      )}
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationText}>{item.message}</Text>
                        <Text style={styles.notificationTimestamp}>{item.timestamp}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  buttonLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#57534e',
    marginTop: 4,
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
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: spacing.lg,
  },
  dropdownPanel: {
    width: 320,
    maxHeight: '60%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  dropdownTitle: {
    fontSize: typography.h4,
    fontWeight: '500',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  markAllReadText: {
    fontSize: typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  dropdownBody: {
    maxHeight: 400,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: typography.body,
    color: '#9ca3af',
    marginTop: spacing.md,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
  },
  unreadCard: {
    backgroundColor: '#fef3c7',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
  },
  feedbackIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: typography.body,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  notificationTimestamp: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
  },
});
