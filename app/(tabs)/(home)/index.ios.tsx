
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '@/components/GradientBackground';
import { IconSymbol } from '@/components/IconSymbol';
import NotificationButton, { NotificationButtonHandle } from '@/components/NotificationButton';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet } from '@/utils/api';

const MIDNIGHT = {
  bg: '#0a0612',
  purple: '#7c3aed',
  purpleLight: '#a78bfa',
  purpleDim: 'rgba(124,58,237,0.3)',
  purpleGlow: 'rgba(167,139,250,0.15)',
  cream: '#FFF8EA',
  creamDim: 'rgba(255,248,234,0.7)',
  creamFaint: 'rgba(255,248,234,0.4)',
  lavender: '#c4b5fd',
  lavenderDim: 'rgba(196,181,253,0.5)',
  cardBg: 'rgba(255,255,255,0.05)',
  cardBorder: 'rgba(255,255,255,0.1)',
  cardBorderActive: 'rgba(167,139,250,0.4)',
};

interface UserStats {
  displayName?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [lastCheckInMessage, setLastCheckInMessage] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const notificationRef = useRef<NotificationButtonHandle>(null);

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(-12)).current;
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingTranslateY = useRef(new Animated.Value(14)).current;
  const checkInCardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    const greetingTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(greetingOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(greetingTranslateY, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2000);

    const checkInTimer = setTimeout(() => {
      Animated.timing(checkInCardOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 300);

    return () => {
      clearTimeout(greetingTimer);
      clearTimeout(checkInTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserStats = useCallback(async () => {
    try {
      console.log('[Home iOS] Loading user stats...');
      const data = await authenticatedGet<UserStats>('/api/profile/stats');
      setStats(data);
      console.log('[Home iOS] Loaded user stats:', data);
    } catch (error: any) {
      console.log('[Home iOS] Error loading stats:', error?.message || error);
      setStats({
        displayName: user?.name || 'friend',
      });
    }
  }, [user?.name]);

  const loadLastCheckIn = async () => {
    try {
      console.log('[Home iOS] Loading last check-in message...');
      const data = await authenticatedGet<{ lastMessage?: string }>('/api/check-in/last-message');
      if (data.lastMessage) {
        setLastCheckInMessage(data.lastMessage);
        console.log('[Home iOS] Loaded last check-in message');
      }
    } catch (error: any) {
      console.log('[Home iOS] Error loading last check-in:', error?.message || error);
    }
  };

  useEffect(() => {
    console.log('🏠 [Home iOS] Component mounted');
    loadUserStats();
    loadLastCheckIn();
  }, [loadUserStats]);

  const handleUnreadCountChange = (count: number) => {
    console.log('🏠 [Home iOS] Love messages count changed:', count);
    setUnreadCount(count);
  };

  const handleLoveMessagesPress = () => {
    console.log('[Home iOS] User tapped Love Messages card');
    notificationRef.current?.open();
  };

  const displayName = stats?.displayName || user?.name || 'Friend';
  const greetingText = `Peace to you, ${displayName}`;
  const unreadCountDisplay = unreadCount > 9 ? '9+' : String(unreadCount);
  const hasUnread = unreadCount > 0;

  const handleCheckInPress = () => {
    console.log('[Home iOS] User tapped Check-In button');
    router.push('/check-in');
  };

  const handleOpenGiftPress = () => {
    console.log('[Home iOS] User tapped Open Your Gift button');
    router.push('/daily-gift');
  };

  const handleCommunityPress = () => {
    console.log('[Home iOS] User tapped Community button');
    router.navigate('/(tabs)/community');
  };

  const handleWeeklyRecapPress = () => {
    console.log('[Home iOS] User tapped Weekly Recap button');
    router.push('/weekly-recap');
  };

  const headerPaddingTop = insets.top + 32;

  return (
    <GradientBackground variant="midnight">
      <View style={styles.container}>
        {/* Hidden NotificationButton — provides modal + polling logic */}
        <View style={styles.hiddenNotificationButton}>
          <NotificationButton
            ref={notificationRef}
            onUnreadCountChange={handleUnreadCountChange}
          />
        </View>

        {/* Header */}
        <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
          {/* Glow behind title */}
          <View style={styles.titleGlow} pointerEvents="none" />
          <Animated.Text
            style={[
              styles.appTitle,
              { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] },
            ]}
          >
            Linen
          </Animated.Text>
          <Text style={styles.appSubtitle}>a sacred space</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Greeting */}
          <View style={styles.greetingContainer}>
            <Animated.Text
              style={[
                styles.greeting,
                { opacity: greetingOpacity, transform: [{ translateY: greetingTranslateY }] },
              ]}
            >
              {greetingText}
            </Animated.Text>
            <Animated.Text
              style={[
                styles.greetingSubtitle,
                { opacity: greetingOpacity, transform: [{ translateY: greetingTranslateY }] },
              ]}
            >
              {"I'm glad you're here."}
            </Animated.Text>
          </View>

          <Text style={styles.presenceCue}>{"Take a breath before you begin"}</Text>

          {/* Hero Check-In Card */}
          <Animated.View style={[styles.checkInCardWrapper, { opacity: checkInCardOpacity }]}>
            <TouchableOpacity
              onPress={handleCheckInPress}
              activeOpacity={0.8}
              style={styles.checkInCardOuter}
            >
              <LinearGradient
                colors={['#4c1d95', '#6d28d9', '#7c3aed', '#5b21b6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.checkInCard}
              >
                {/* Top shimmer edge */}
                <View style={styles.checkInShimmer} pointerEvents="none" />

                {/* Moon icon with glow */}
                <View style={styles.checkInIconGlow}>
                  <IconSymbol
                    ios_icon_name="moon.fill"
                    android_material_icon_name="nightlight_round"
                    size={44}
                    color="#e9d5ff"
                  />
                </View>

                <Text style={styles.checkInCardTitle}>Check-In</Text>
                <Text style={styles.checkInCardSubtitle}>{"What's on your heart?"}</Text>
                {lastCheckInMessage ? (
                  <Text style={styles.checkInLastMessage}>{lastCheckInMessage}</Text>
                ) : null}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Gift Card */}
          <TouchableOpacity
            style={styles.secondaryCard}
            onPress={handleOpenGiftPress}
            activeOpacity={0.75}
          >
            <View style={styles.secondaryIconContainer}>
              <IconSymbol
                ios_icon_name="gift.fill"
                android_material_icon_name="card-giftcard"
                size={26}
                color={MIDNIGHT.lavender}
              />
            </View>
            <View style={styles.secondaryTextBlock}>
              <Text style={styles.secondaryCardTitle}>Open Your Gift</Text>
              <Text style={styles.secondaryCardSubtitle}>A quiet moment with scripture</Text>
            </View>
          </TouchableOpacity>

          {/* Weekly Recap Card */}
          <TouchableOpacity
            style={styles.secondaryCard}
            onPress={handleWeeklyRecapPress}
            activeOpacity={0.75}
          >
            <View style={styles.secondaryIconContainer}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="calendar-today"
                size={26}
                color={MIDNIGHT.lavender}
              />
            </View>
            <View style={styles.secondaryTextBlock}>
              <Text style={styles.secondaryCardTitle}>Weekly Recap</Text>
              <Text style={styles.secondaryCardSubtitle}>Reflect on your journey</Text>
            </View>
          </TouchableOpacity>

          {/* Community Card */}
          <TouchableOpacity
            style={styles.secondaryCard}
            onPress={handleCommunityPress}
            activeOpacity={0.75}
          >
            <View style={styles.secondaryIconContainer}>
              <IconSymbol
                ios_icon_name="person.2.fill"
                android_material_icon_name="group"
                size={26}
                color={MIDNIGHT.lavender}
              />
            </View>
            <View style={styles.secondaryTextBlock}>
              <Text style={styles.secondaryCardTitle}>Community</Text>
              <Text style={styles.secondaryCardSubtitle}>You are not alone</Text>
            </View>
          </TouchableOpacity>

          {/* Love Messages Card */}
          <TouchableOpacity
            style={[styles.secondaryCard, hasUnread && styles.secondaryCardActive]}
            onPress={handleLoveMessagesPress}
            activeOpacity={0.75}
          >
            <View style={styles.secondaryIconContainer}>
              <IconSymbol
                ios_icon_name="heart.fill"
                android_material_icon_name="favorite"
                size={26}
                color={MIDNIGHT.lavender}
              />
            </View>
            <View style={styles.secondaryTextBlock}>
              <Text style={styles.secondaryCardTitle}>{"You've received care"}</Text>
              <Text style={styles.secondaryCardSubtitle}>Love messages from others</Text>
            </View>
            {hasUnread && (
              <View style={styles.loveMessagesBadge}>
                <Text style={styles.loveMessagesBadgeText}>{unreadCountDisplay}</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hiddenNotificationButton: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
    opacity: 0,
    display: 'none',
  },
  header: {
    alignItems: 'center',
    paddingBottom: 24,
    zIndex: 100,
  },
  titleGlow: {
    position: 'absolute',
    width: 200,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139,92,246,0.12)',
    shadowColor: '#7c3aed',
    shadowRadius: 30,
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    alignSelf: 'center',
  },
  appTitle: {
    fontSize: 52,
    fontWeight: '400',
    color: '#FFF8EA',
    fontFamily: 'Georgia',
    letterSpacing: 3,
  },
  appSubtitle: {
    fontSize: 13,
    fontStyle: 'italic',
    color: 'rgba(196,181,253,0.5)',
    letterSpacing: 2,
    marginTop: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  greetingContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 32,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '400',
    color: '#FFF8EA',
    fontFamily: 'Georgia',
    textAlign: 'center',
  },
  greetingSubtitle: {
    fontSize: 16,
    fontStyle: 'italic',
    color: 'rgba(255,248,234,0.7)',
    marginTop: 6,
    textAlign: 'center',
  },
  presenceCue: {
    fontSize: 12,
    fontStyle: 'italic',
    color: 'rgba(196,181,253,0.5)',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 28,
    letterSpacing: 0.5,
  },
  // Hero Check-In Card
  checkInCardWrapper: {
    marginBottom: 20,
  },
  checkInCardOuter: {
    borderRadius: 28,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 20,
  },
  checkInCard: {
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  checkInShimmer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 1,
  },
  checkInIconGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139,92,246,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a78bfa',
    shadowRadius: 20,
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
  },
  checkInCardTitle: {
    fontSize: 26,
    fontFamily: 'Georgia',
    color: '#FFF8EA',
    fontWeight: '400',
    marginTop: 16,
    textAlign: 'center',
  },
  checkInCardSubtitle: {
    fontSize: 14,
    color: 'rgba(233,213,255,0.8)',
    marginTop: 6,
    textAlign: 'center',
  },
  checkInLastMessage: {
    fontSize: 13,
    fontStyle: 'italic',
    color: 'rgba(233,213,255,0.6)',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  // Secondary cards
  secondaryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 22,
    paddingHorizontal: 22,
    marginBottom: 14,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryCardActive: {
    borderColor: 'rgba(167,139,250,0.4)',
  },
  secondaryIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  secondaryTextBlock: {
    flex: 1,
  },
  secondaryCardTitle: {
    fontSize: 17,
    fontFamily: 'Georgia',
    color: '#FFF8EA',
    fontWeight: '400',
  },
  secondaryCardSubtitle: {
    fontSize: 13,
    color: 'rgba(196,181,253,0.5)',
    marginTop: 3,
  },
  loveMessagesBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 12,
  },
  loveMessagesBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
