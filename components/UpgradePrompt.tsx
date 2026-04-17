/**
 * UpgradePrompt
 *
 * A soft, non-blocking bottom-sheet style upgrade prompt shown to base_access
 * subscribers after meaningful engagement milestones in the AI chat.
 *
 * - Shown BETWEEN messages only (after AI responds, before user types again)
 * - 1.5 second delay after AI response before appearing
 * - Never shown mid-conversation or to premium/unsubscribed users
 * - Dismissed state persists for the session via module-level flag
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';

interface UpgradePromptProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function UpgradePrompt({ visible, onDismiss }: UpgradePromptProps) {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      console.log('[UpgradePrompt] Showing upgrade prompt');
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropOpacity]);

  const handleUpgrade = () => {
    console.log('[UpgradePrompt] User tapped "Upgrade to Premium"');
    onDismiss();
    router.push('/paywall');
  };

  const handleDismiss = () => {
    console.log('[UpgradePrompt] User tapped "Maybe Later"');
    onDismiss();
  };

  const headingText = 'You\'re going deeper 🌿';
  const bodyText =
    "You've been showing up consistently. Unlock unlimited AI conversations and the full Linen experience.";
  const upgradeLabel = 'Upgrade to Premium — $8.99/mo';
  const dismissLabel = 'Maybe Later';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.outerContainer}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={styles.backdropTouchable} onPress={handleDismiss} activeOpacity={1} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Leaf accent */}
          <Text style={styles.leafAccent}>🌿</Text>

          {/* Heading */}
          <Text style={styles.heading}>{headingText}</Text>

          {/* Body */}
          <Text style={styles.body}>{bodyText}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Upgrade button */}
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgrade}
            activeOpacity={0.82}
          >
            <Text style={styles.upgradeButtonText}>{upgradeLabel}</Text>
          </TouchableOpacity>

          {/* Dismiss button */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            activeOpacity={0.6}
          >
            <Text style={styles.dismissButtonText}>{dismissLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 25, 23, 0.45)',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFBF5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 40,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d6c9b8',
    marginBottom: spacing.lg,
  },
  leafAccent: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  heading: {
    fontFamily: 'Georgia',
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 30,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e7e5e4',
    marginBottom: spacing.lg,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  dismissButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '400',
  },
});
