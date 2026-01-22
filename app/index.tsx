
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function LandingScreen() {
  console.log('User viewing Landing/Orientation screen');
  const router = useRouter();

  // Always use light theme colors
  const bgColor = colors.background;
  const textColor = colors.text;
  const textSecondaryColor = colors.textSecondary;
  const cardBg = colors.card;

  const handleContinue = () => {
    console.log('User tapped Continue button on Landing screen');
    router.push('/auth');
  };

  const titleText = 'Linen';
  const taglineText = 'A gentle space for reflection, prayer, and embodied awareness';
  const beginJourneyText = 'Begin Your Journey';
  const whatIsTitle = 'What Linen Is';
  const scriptureCompanionTitle = 'Scripture-Rooted Spiritual Companion';
  const scriptureCompanionText = 'An AI companion rooted in scripture and trained in many types of therapy—mainly somatic—that helps you notice how God speaks through embodied prayer, weaving God\'s word into the conversation as it guides you through sensation, emotion, and prayer—drawing you nearer to the One who shaped you in love and calls you beloved';
  const creativeExpressionTitle = 'Creative Expression';
  const creativeExpressionText = 'Draw, collage, and voice journal your spiritual journey with 7 brush types, photo uploads, and rich artistic tools';
  const liturgicalGroundingTitle = 'Liturgical Grounding';
  const liturgicalGroundingText = 'Daily scripture reflections follow the church calendar\'s seasonal rhythms with thematic coherence and color shifts';
  const compassionateCareTitle = 'Compassionate Care Community';
  const compassionateCareText = 'Share anonymously when you need privacy, or connect with your name when you\'re ready. Request care, share wisdom and reflections, send encouragement — choose your level of visibility in a safe, gentle space';
  const dailyPracticeTitle = 'Your Daily Practice';
  const checkInTitle = 'Check-In';
  const checkInText = 'Share what\'s on your heart and mind with a specialized AI companion trained to help you navigate physical, spiritual, and emotional pain. It helps you notice what\'s happening in your body, explore how you\'re feeling, and offers gentle practices like meditation, prayer, breathing, movement, and other self-care techniques. Conversations maintain context across 24-hour threads for deeper exploration.';
  const checkInText2 = 'The AI recognizes when you\'re anxious, restless, heavy, or tense and can guide you through brief 5-30 second calming practices with step-by-step instructions.';
  const dailyGiftTitle = 'Daily Gift';
  const dailyGiftText = 'Open scripture with contemplative reflection grounded in the liturgical calendar. Each week brings a new theme with seven curated scripture passages. Create art-based reflections using drawing tools, collage capabilities, or voice journaling. Tag your mood and body sensations to track patterns over time.';
  const dailyGiftText2 = 'Ambient sounds (rain, ocean, forest, flowing stream, soft piano, wind chimes, Tibetan singing bowl) accompany your reflections.';
  const whatIsNotTitle = 'What Linen Is Not';
  const whatIsNotText = 'Linen is not medical care, mental health treatment, or therapy. It does not diagnose, treat, or provide clinical advice. It is a spiritual practice tool, not a substitute for professional help.';
  const careAndSafetyTitle = 'Care & Safety';
  const careAndSafetyText = 'If you are experiencing a mental health crisis or thoughts of self-harm, please reach out for immediate support:';
  const crisisLineText = 'U.S. 988 Suicide & Crisis Lifeline';
  const encouragementText = 'Linen encourages you to seek real-world support from trusted friends, family, spiritual directors, counselors, or healthcare providers when needed.';
  const continueButtonText = 'Begin Your Journey';
  const disclaimerText = 'By continuing, you acknowledge that Linen is a spiritual practice tool and not a substitute for professional medical or mental health care.';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>
            {titleText}
          </Text>
          <Text style={[styles.tagline, { color: textSecondaryColor }]}>
            {taglineText}
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionHeader}>
            <IconSymbol 
              ios_icon_name="sparkles"
              android_material_icon_name="auto-awesome"
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {beginJourneyText}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {whatIsTitle}
          </Text>
          
          <View style={styles.featureItem}>
            <Text style={[styles.featureTitle, { color: colors.primary }]}>
              {scriptureCompanionTitle}
            </Text>
            <Text style={[styles.featureText, { color: textSecondaryColor }]}>
              {scriptureCompanionText}
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={[styles.featureTitle, { color: colors.primary }]}>
              {creativeExpressionTitle}
            </Text>
            <Text style={[styles.featureText, { color: textSecondaryColor }]}>
              {creativeExpressionText}
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={[styles.featureTitle, { color: colors.primary }]}>
              {liturgicalGroundingTitle}
            </Text>
            <Text style={[styles.featureText, { color: textSecondaryColor }]}>
              {liturgicalGroundingText}
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={[styles.featureTitle, { color: colors.primary }]}>
              {compassionateCareTitle}
            </Text>
            <Text style={[styles.featureText, { color: textSecondaryColor }]}>
              {compassionateCareText}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {dailyPracticeTitle}
          </Text>

          <View style={styles.featureItem}>
            <Text style={[styles.featureTitle, { color: colors.primary }]}>
              {checkInTitle}
            </Text>
            <Text style={[styles.featureText, { color: textSecondaryColor }]}>
              {checkInText}
            </Text>
            <Text style={[styles.featureText, { color: textSecondaryColor }]}>
              {checkInText2}
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={[styles.featureTitle, { color: colors.primary }]}>
              {dailyGiftTitle}
            </Text>
            <Text style={[styles.featureText, { color: textSecondaryColor }]}>
              {dailyGiftText}
            </Text>
            <Text style={[styles.featureText, { color: textSecondaryColor }]}>
              {dailyGiftText2}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {whatIsNotTitle}
          </Text>
          <Text style={[styles.bodyText, { color: textSecondaryColor }]}>
            {whatIsNotText}
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            {careAndSafetyTitle}
          </Text>
          <Text style={[styles.bodyText, { color: textSecondaryColor }]}>
            {careAndSafetyText}
          </Text>
          <Text style={[styles.crisisLine, { color: colors.error }]}>
            {crisisLineText}
          </Text>
          <Text style={[styles.bodyText, { color: textSecondaryColor }]}>
            {encouragementText}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            {continueButtonText}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: textSecondaryColor }]}>
          {disclaimerText}
        </Text>
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
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.h1 + 8,
    fontWeight: typography.bold,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    marginBottom: spacing.md,
  },
  bodyText: {
    fontSize: typography.body,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  featureItem: {
    marginBottom: spacing.lg,
  },
  featureTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: typography.body,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  crisisLine: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    marginVertical: spacing.sm,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  continueButtonText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
    paddingHorizontal: spacing.md,
  },
});
