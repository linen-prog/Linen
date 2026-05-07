
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as StoreReview from 'expo-store-review';
import { useTheme } from '@/contexts/ThemeContext';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { markReviewPromptDeclined } from '@/utils/reviewPrompt';

export interface ReviewPromptModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ReviewPromptModal({ visible, onClose }: ReviewPromptModalProps) {
  const { isDark } = useTheme();

  const cardBg = isDark ? colors.cardDark : '#FFFFFF';
  const textColor = isDark ? colors.textDark : colors.text;
  const textMuted = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const borderColor = isDark ? colors.borderDark : colors.border;

  const handleYes = async () => {
    console.log('[ReviewPrompt] User tapped "Yes, I\'d like to" — requesting store review');
    try {
      const available = await StoreReview.isAvailableAsync();
      console.log('[ReviewPrompt] StoreReview.isAvailableAsync:', available);
      if (available) {
        await StoreReview.requestReview();
        console.log('[ReviewPrompt] StoreReview.requestReview() called successfully');
      } else {
        console.log('[ReviewPrompt] Store review not available on this device — skipping native call');
      }
    } catch (err) {
      console.warn('[ReviewPrompt] StoreReview error:', err);
    }
    onClose();
  };

  const handleMaybeLater = async () => {
    console.log('[ReviewPrompt] User tapped "Maybe later" — setting 60-day cooldown');
    await markReviewPromptDeclined();
    onClose();
  };

  const handleNoThanks = async () => {
    console.log('[ReviewPrompt] User tapped "No thanks" — setting 60-day cooldown');
    await markReviewPromptDeclined();
    onClose();
  };

  const glyphText = '✦';
  const headingText = 'A small moment';
  const bodyText =
    'Linen is still growing. If it has supported you, would you be willing to leave a quick rating?';
  const yesLabel = "Yes, I'd like to";
  const laterLabel = 'Maybe later';
  const noLabel = 'No thanks';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleMaybeLater}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          {/* Icon glyph */}
          <Text style={[styles.glyph, { color: colors.primary }]}>
            {glyphText}
          </Text>

          {/* Heading */}
          <Text style={[styles.heading, { color: textColor }]}>
            {headingText}
          </Text>

          {/* Body */}
          <Text style={[styles.body, { color: textMuted }]}>
            {bodyText}
          </Text>

          {/* Primary button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleYes}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {yesLabel}
            </Text>
          </TouchableOpacity>

          {/* Ghost button */}
          <TouchableOpacity
            style={[styles.ghostButton, { borderColor: colors.primary }]}
            onPress={handleMaybeLater}
            activeOpacity={0.7}
          >
            <Text style={[styles.ghostButtonText, { color: colors.primary }]}>
              {laterLabel}
            </Text>
          </TouchableOpacity>

          {/* Plain text link */}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleNoThanks}
            activeOpacity={0.6}
          >
            <Text style={[styles.linkButtonText, { color: textMuted }]}>
              {noLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  glyph: {
    fontSize: 28,
    marginBottom: spacing.md,
    lineHeight: 36,
  },
  heading: {
    fontSize: 18,
    fontWeight: typography.medium,
    fontFamily: 'Georgia',
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  ghostButton: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  ghostButtonText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
    letterSpacing: 0.2,
  },
  linkButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: typography.regular,
    textAlign: 'center',
  },
});
