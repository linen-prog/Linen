
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function LandingScreen() {
  console.log('User viewing Landing/Orientation screen');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleContinue = () => {
    console.log('User tapped Continue button - navigating to auth');
    router.push('/auth');
  };

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <IconSymbol 
            ios_icon_name="heart.fill"
            android_material_icon_name="favorite"
            size={48}
            color={colors.primary}
          />
          <Text style={[styles.title, { color: textColor }]}>
            Linen
          </Text>
          <Text style={[styles.tagline, { color: textSecondaryColor }]}>
            A gentle space for reflection, prayer, and embodied awareness
          </Text>
        </View>

        <View style={styles.section}>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              What Linen Is
            </Text>
            <Text style={[styles.sectionText, { color: textSecondaryColor }]}>
              Linen is a companion for spiritual reflection, contemplative prayer, and embodied presence. Rooted in Christian scripture and tradition, it invites you to notice how God speaks through your body, emotions, and daily experiences.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              What Linen Is Not
            </Text>
            <Text style={[styles.sectionText, { color: textSecondaryColor }]}>
              Linen is not medical care, mental health treatment, or therapy. It does not diagnose, treat, or provide clinical advice. It is a spiritual practice tool, not a substitute for professional help.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Care & Safety
            </Text>
            <Text style={[styles.sectionText, { color: textSecondaryColor }]}>
              If you are experiencing a mental health crisis or thoughts of self-harm, please reach out for immediate support:
            </Text>
            <Text style={[styles.crisisText, { color: colors.primary }]}>
              U.S. 988 Suicide & Crisis Lifeline
            </Text>
            <Text style={[styles.sectionText, { color: textSecondaryColor }]}>
              Linen encourages you to seek real-world support from trusted friends, family, spiritual directors, counselors, or healthcare providers when needed.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Who Linen Is For
            </Text>
            <Text style={[styles.sectionText, { color: textSecondaryColor }]}>
              Linen is for those who:
            </Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bullet, { color: textSecondaryColor }]}>
                • Want to be more in touch with your body&apos;s communication and wisdom
              </Text>
              <Text style={[styles.bullet, { color: textSecondaryColor }]}>
                • Are ready to gently tend to old wounds and memories held in your body
              </Text>
              <Text style={[styles.bullet, { color: textSecondaryColor }]}>
                • Want contemplative prayer alongside faithful study
              </Text>
              <Text style={[styles.bullet, { color: textSecondaryColor }]}>
                • Are drawn to creative expression as spiritual practice
              </Text>
              <Text style={[styles.bullet, { color: textSecondaryColor }]}>
                • Long for embodied faith that honors your whole self
              </Text>
              <Text style={[styles.bullet, { color: textSecondaryColor }]}>
                • Need community care that feels safe and intimate
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.quoteText, { color: colors.primary }]}>
              &quot;While other faith apps focus on your mind, Linen invites your whole body into the conversation with God. Through gentle somatic awareness, creative reflection, and contemplative practice, discover a faith that breathes, moves, and feels.&quot;
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            Begin Your Journey
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: textSecondaryColor }]}>
            By continuing, you acknowledge that Linen is a spiritual practice tool and not a substitute for professional medical or mental health care.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 48,
    fontWeight: typography.semibold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: typography.body,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: spacing.lg,
  },
  section: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
  },
  sectionText: {
    fontSize: typography.body,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  crisisText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    marginVertical: spacing.sm,
  },
  bulletList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  bullet: {
    fontSize: typography.body,
    lineHeight: 24,
  },
  quoteText: {
    fontSize: typography.body,
    lineHeight: 26,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  footer: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  footerText: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
  },
});
