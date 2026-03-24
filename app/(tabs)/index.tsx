
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/GradientBackground';
import NotificationButton, { NotificationButtonHandle } from '@/components/NotificationButton';
import { authenticatedGet } from '@/utils/api';
import { useTheme } from '@/contexts/ThemeContext';

interface PersonalizationData {
  companionTagline: string | null;
  recentActivity: string | null;
  streakMessage: string | null;
  conversationContext: string | null;
}

export default function HomeScreen() {
  console.log('🏠 [Home] Screen rendering');
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [personalization, setPersonalization] = useState<PersonalizationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompanionBanner, setShowCompanionBanner] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<NotificationButtonHandle>(null);

  const welcomeOpacity = useRef(new Animated.Value(0)).current;
  const welcomeTranslateY = useRef(new Animated.Value(10)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(welcomeOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(welcomeTranslateY, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadUserData = async () => {
      try {
        console.log('🏠 [Home] Loading user data...');

        const { getUserData } = await import('@/lib/auth');
        const userData = await getUserData();
        console.log('🏠 [Home] User data loaded from storage:', userData);

        if (!isMounted) {
          console.log('🏠 [Home] Component unmounted, skipping state updates');
          return;
        }

        const userName = userData?.name || '';
        const extractedFirstName = userName.split(' ')[0] || 'Friend';
        setFirstName(extractedFirstName);

        try {
          const personalizationResponse = await authenticatedGet<PersonalizationData>('/api/check-in/personalization');
          console.log('🏠 [Home] Personalization data loaded:', personalizationResponse);
          if (isMounted) {
            setPersonalization(personalizationResponse);
          }
        } catch (error) {
          console.error('🏠 [Home] Failed to load personalization data:', error);
        }

        try {
          const prefsResponse = await authenticatedGet<{ preferencesSet: boolean }>('/api/companion/preferences');
          console.log('🏠 [Home] Companion preferences check:', prefsResponse);
          if (isMounted && prefsResponse.preferencesSet === false) {
            setShowCompanionBanner(true);
          }
        } catch (error) {
          console.error('🏠 [Home] Failed to check companion preferences:', error);
        }
      } catch (error) {
        console.error('🏠 [Home] Failed to load user data:', error);
        if (isMounted) {
          setFirstName('Friend');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, []);

  const { isDark } = useTheme();
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;

  const handleLoveMessagesPress = () => {
    console.log('🏠 [Home] User tapped Messages card');
    notificationRef.current?.open();
  };

  const handleCheckIn = () => {
    console.log('🏠 [Home] User tapped Check-In card');
    console.log('🏠 [Home] Navigating to: /check-in');
    router.push('/check-in');
  };

  const handleDailyGift = () => {
    console.log('🏠 [Home] User tapped Daily Gift card');
    console.log('🏠 [Home] Navigating directly to: /daily-gift');
    router.push('/daily-gift');
    console.log('🏠 [Home] router.push() called for /daily-gift');
  };

  const handleCommunity = () => {
    console.log('🏠 [Home] User tapped Community card');
    console.log('🏠 [Home] Navigating to: /community');
    router.navigate('/(tabs)/community');
  };

  const handleWeeklyRecap = () => {
    console.log('🏠 [Home] User tapped Weekly Recap card');
    console.log('🏠 [Home] Navigating to: /weekly-recap');
    router.push('/weekly-recap');
  };

  const isValidText = (val: string | null | undefined, minLen = 5) =>
    typeof val === 'string' && val.trim().length > minLen;

  const checkInTagline = isValidText(personalization?.companionTagline, 3)
    ? personalization!.companionTagline!
    : "What's on your heart?";
  const personalizationContext = isValidText(personalization?.conversationContext)
    ? personalization!.conversationContext!
    : null;

  return (
    <React.Fragment>
      <Stack.Screen
        options={{
          title: '',
          headerShown: true,
          headerRight: () => <NotificationButton />,
        }}
      />
      <GradientBackground>
        <View style={styles.container}>
          {/* Hidden NotificationButton — provides modal + polling logic */}
          <View style={styles.hiddenNotificationButton}>
            <NotificationButton
              ref={notificationRef}
              onUnreadCountChange={(count) => {
                console.log('🏠 [Home] Love messages count changed:', count);
                setUnreadCount(count);
              }}
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Welcome block ── */}
            <Animated.View
              style={[
                styles.welcomeBlock,
                { opacity: welcomeOpacity, transform: [{ translateY: welcomeTranslateY }] },
              ]}
            >
              <Text style={[styles.welcomeLine1, { color: colors.primary }]}>
                Peace to you, friend.
              </Text>
              <Text style={[styles.welcomeLine2, { color: textSecondaryColor }]}>
                I'm glad you're here.
              </Text>
              <Text style={[styles.welcomeLine3, { color: textSecondaryColor }]}>
                Take a breath before you begin
              </Text>
            </Animated.View>

            <Animated.View style={{ opacity: contentOpacity }}>

              {/* ── Companion personalisation banner ── */}
              {showCompanionBanner && (
                <TouchableOpacity
                  style={styles.companionBanner}
                  onPress={() => {
                    console.log('🏠 [Home] Companion banner tapped — navigating to companion-preferences');
                    router.push('/companion-preferences');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.companionBannerLeft}>
                    <Text style={styles.companionBannerIcon}>✨</Text>
                    <View style={styles.companionBannerText}>
                      <Text style={styles.companionBannerTitle}>Shape your companion</Text>
                      <Text style={styles.companionBannerSubtitle}>Adjust how it meets you →</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('🏠 [Home] Companion banner dismissed');
                      setShowCompanionBanner(false);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.companionBannerDismiss}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              )}

              {/* ── Check-In — emotional centrepiece ── */}
              <TouchableOpacity
                style={[styles.checkInCard, { backgroundColor: cardBg }]}
                onPress={handleCheckIn}
                activeOpacity={0.75}
              >
                <View style={[styles.checkInIconCircle, { backgroundColor: colors.primary + '12' }]}>
                  <IconSymbol
                    ios_icon_name="message.fill"
                    android_material_icon_name="chat"
                    size={36}
                    color={colors.primary}
                  />
                </View>
                <Text style={[styles.checkInTitle, { color: textColor }]}>
                  Check-In
                </Text>
                <Text style={[styles.checkInTagline, { color: textSecondaryColor }]}>
                  {checkInTagline}
                </Text>
                <Text style={[styles.checkInPresenceCue, { color: colors.textLight }]}>
                  Take your time
                </Text>
                {personalizationContext && (
                  <Text style={[styles.checkInContext, { color: textSecondaryColor }]}>
                    {personalizationContext}
                  </Text>
                )}
              </TouchableOpacity>

              {/* ── Daily Gift ── */}
              <TouchableOpacity
                style={[styles.giftCard, { backgroundColor: cardBg }]}
                onPress={handleDailyGift}
                activeOpacity={0.75}
              >
                <View style={[styles.giftIconCircle, { backgroundColor: colors.accent + '18' }]}>
                  <IconSymbol
                    ios_icon_name="gift.fill"
                    android_material_icon_name="card-giftcard"
                    size={32}
                    color={colors.accentDark}
                  />
                </View>
                <View style={styles.giftTextBlock}>
                  <Text style={[styles.giftTitle, { color: textColor }]}>
                    Open Your Gift
                  </Text>
                  <Text style={[styles.giftSubtitle, { color: textSecondaryColor }]}>
                    A quiet moment with scripture
                  </Text>
                </View>
              </TouchableOpacity>

              {/* ── Messages ── */}
              <TouchableOpacity
                style={[styles.messagesCard, { backgroundColor: cardBg }]}
                onPress={handleLoveMessagesPress}
                activeOpacity={0.75}
              >
                <View style={styles.messagesIconCircle}>
                  <Ionicons name="sparkles" size={20} color="#d97706" />
                </View>
                <View style={styles.messagesTextBlock}>
                  <Text style={[styles.messagesTitle, { color: textColor }]}>
                    Messages
                  </Text>
                  <Text style={[styles.messagesSubtitle, { color: textSecondaryColor }]}>
                    You've received care
                  </Text>
                </View>
                {unreadCount > 0 && (
                  <View style={styles.messagesBadge}>
                    <Text style={styles.messagesBadgeText}>
                      {unreadCount > 9 ? '9+' : String(unreadCount)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* ── Community & Heart Threads ── */}
              <View style={styles.quietRow}>
                <TouchableOpacity
                  style={[styles.quietCard, { backgroundColor: cardBg }]}
                  onPress={handleCommunity}
                  activeOpacity={0.75}
                >
                  <View style={[styles.quietIconCircle, { backgroundColor: colors.prayer + '12' }]}>
                    <IconSymbol
                      ios_icon_name="person.3.fill"
                      android_material_icon_name="group"
                      size={22}
                      color={colors.prayer}
                    />
                  </View>
                  <Text style={[styles.quietCardTitle, { color: textColor }]}>
                    Community
                  </Text>
                  <Text style={[styles.quietCardSubtitle, { color: textSecondaryColor }]}>
                    Care from your community
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quietCard, { backgroundColor: cardBg }]}
                  onPress={handleWeeklyRecap}
                  activeOpacity={0.75}
                >
                  <View style={[styles.quietIconCircle, { backgroundColor: colors.primary + '12' }]}>
                    <IconSymbol
                      ios_icon_name="calendar"
                      android_material_icon_name="calendar-today"
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={[styles.quietCardTitle, { color: textColor }]}>
                    Heart Threads
                  </Text>
                  <Text style={[styles.quietCardSubtitle, { color: textSecondaryColor }]}>
                    See your journey this week
                  </Text>
                </TouchableOpacity>
              </View>

            </Animated.View>
          </ScrollView>
        </View>
      </GradientBackground>
    </React.Fragment>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  hiddenNotificationButton: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },

  // ── Welcome block ──────────────────────────────────────────
  welcomeBlock: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.xs,
    marginBottom: 20,
  },
  welcomeLine1: {
    fontSize: 28,
    fontWeight: typography.semibold,
    letterSpacing: -0.3,
    lineHeight: 36,
    marginBottom: spacing.sm,
  },
  welcomeLine2: {
    fontSize: 17,
    fontWeight: typography.regular,
    lineHeight: 26,
  },
  welcomeLine3: {
    fontSize: 13,
    fontWeight: typography.regular,
    lineHeight: 20,
    marginTop: 4,
    opacity: 0.5,
  },

  // ── Check-In card ──────────────────────────────────────────
  checkInCard: {
    borderRadius: 16,
    paddingVertical: spacing.xl + 6,
    paddingHorizontal: spacing.xl + 4,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  checkInIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  checkInTitle: {
    fontSize: 22,
    fontWeight: typography.semibold,
    letterSpacing: -0.2,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  checkInTagline: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  checkInPresenceCue: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.75,
  },
  checkInContext: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.sm,
    opacity: 0.8,
  },

  // ── Daily Gift card ────────────────────────────────────────
  giftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  giftIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  giftTextBlock: {
    flex: 1,
  },
  giftTitle: {
    fontSize: 17,
    fontWeight: typography.semibold,
    marginBottom: 3,
  },
  giftSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },

  // ── Messages card ──────────────────────────────────────────
  messagesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  messagesIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  messagesTextBlock: {
    flex: 1,
  },
  messagesTitle: {
    fontSize: 17,
    fontWeight: typography.semibold,
    marginBottom: 3,
  },
  messagesSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  messagesBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: spacing.sm,
  },
  messagesBadgeText: {
    fontSize: 11,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },

  // ── Quiet row (Community + Heart Threads) ─────────────────
  quietRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: 16,
  },
  quietCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-start',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  quietIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quietCardTitle: {
    fontSize: 15,
    fontWeight: typography.semibold,
    marginBottom: 3,
  },
  quietCardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },

  // ── Companion banner ───────────────────────────────────────
  companionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
  },
  companionBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  companionBannerIcon: {
    fontSize: 20,
  },
  companionBannerText: {
    flex: 1,
  },
  companionBannerTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.primaryDark,
    marginBottom: 2,
  },
  companionBannerSubtitle: {
    fontSize: 12,
    color: colors.primary,
  },
  companionBannerDismiss: {
    fontSize: 14,
    color: colors.textLight,
    paddingLeft: spacing.sm,
  },
});
