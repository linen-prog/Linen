
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
        <View style={styles.heroSection}>
          <IconSymbol 
            ios_icon_name="heart.fill"
            android_material_icon_name="favorite"
            size={64}
            color={colors.primary}
          />
          <Text style={[styles.title, { color: textColor }]}>
            Linen
          </Text>
          <Text style={[styles.tagline, { color: textSecondaryColor }]}>
            A gentle space for reflection, prayer, and embodied awareness
          </Text>
          
          <TouchableOpacity 
            style={styles.topContinueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.topContinueButtonText}>
              Begin Your Journey
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresGrid}>
          <View style={[styles.featureCard, { backgroundColor: cardBg }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
              <IconSymbol 
                ios_icon_name="heart.fill"
                android_material_icon_name="favorite"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.featureTitle, { color: textColor }]}>
              Scripture-Rooted Spiritual Companion
            </Text>
            <Text style={[styles.featureDescription, { color: textSecondaryColor }]}>
              An AI companion rooted in scripture and trained in many types of therapy—mainly somatic—that helps you notice how God speaks through embodied prayer, weaving God&apos;s word into the conversation as it guides you through sensation, emotion, and prayer—drawing you nearer to the One who shaped you in love and calls you beloved
            </Text>
          </View>

          <View style={[styles.featureCard, { backgroundColor: cardBg }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
              <IconSymbol 
                ios_icon_name="paintbrush.fill"
                android_material_icon_name="brush"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.featureTitle, { color: textColor }]}>
              Creative Expression
            </Text>
            <Text style={[styles.featureDescription, { color: textSecondaryColor }]}>
              Draw, collage, and voice journal your spiritual journey with 7 brush types, photo uploads, and rich artistic tools
            </Text>
          </View>

          <View style={[styles.featureCard, { backgroundColor: cardBg }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
              <IconSymbol 
                ios_icon_name="book.fill"
                android_material_icon_name="menu-book"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.featureTitle, { color: textColor }]}>
              Liturgical Grounding
            </Text>
            <Text style={[styles.featureDescription, { color: textSecondaryColor }]}>
              Daily scripture reflections follow the church calendar&apos;s seasonal rhythms with thematic coherence and color shifts
            </Text>
          </View>

          <View style={[styles.featureCard, { backgroundColor: cardBg }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
              <IconSymbol 
                ios_icon_name="person.2.fill"
                android_material_icon_name="group"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.featureTitle, { color: textColor }]}>
              Compassionate Care Community
            </Text>
            <Text style={[styles.featureDescription, { color: textSecondaryColor }]}>
              Share anonymously when you need privacy, or connect with your name when you&apos;re ready. Request care, share wisdom and reflections, send encouragement — choose your level of visibility in a safe, gentle space
            </Text>
          </View>
        </View>

        <View style={styles.dailyPracticeSection}>
          <View style={styles.sectionHeader}>
            <IconSymbol 
              ios_icon_name="sparkles"
              android_material_icon_name="auto-awesome"
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Your Daily Practice
            </Text>
            <IconSymbol 
              ios_icon_name="sparkles"
              android_material_icon_name="auto-awesome"
              size={24}
              color={colors.primary}
            />
          </View>

          <View style={[styles.practiceCard, { backgroundColor: cardBg }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
              <IconSymbol 
                ios_icon_name="message.fill"
                android_material_icon_name="chat"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.practiceTitle, { color: textColor }]}>
              Check-In
            </Text>
            <Text style={[styles.practiceDescription, { color: textSecondaryColor }]}>
              Share what&apos;s on your heart and mind with a specialized AI companion trained to help you navigate physical, spiritual, and emotional pain. It helps you notice what&apos;s happening in your body, explore how you&apos;re feeling, and offers gentle practices like meditation, prayer, breathing, movement, and other self-care techniques. Conversations maintain context across 24-hour threads for deeper exploration.
            </Text>
            <Text style={[styles.practiceNote, { color: textSecondaryColor }]}>
              The AI recognizes when you&apos;re anxious, restless, heavy, or tense and can guide you through brief 5-30 second calming practices with step-by-step instructions.
            </Text>
          </View>

          <View style={[styles.practiceCard, { backgroundColor: cardBg }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
              <IconSymbol 
                ios_icon_name="gift.fill"
                android_material_icon_name="card-giftcard"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.practiceTitle, { color: textColor }]}>
              Daily Gift
            </Text>
            <Text style={[styles.practiceDescription, { color: textSecondaryColor }]}>
              Open scripture with contemplative reflection grounded in the liturgical calendar. Each week brings a new theme with seven curated scripture passages. Create art-based reflections using drawing tools, collage capabilities, or voice journaling. Tag your mood and body sensations to track patterns over time.
            </Text>
            <Text style={[styles.practiceNote, { color: textSecondaryColor }]}>
              Ambient sounds (rain, ocean, forest, flowing stream, soft piano, wind chimes, Tibetan singing bowl) accompany your reflections.
            </Text>
          </View>
        </View>

        <View style={[styles.importantCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.importantTitle, { color: textColor }]}>
            What Linen Is Not
          </Text>
          <Text style={[styles.importantText, { color: textSecondaryColor }]}>
            Linen is not medical care, mental health treatment, or therapy. It does not diagnose, treat, or provide clinical advice. It is a spiritual practice tool, not a substitute for professional help.
          </Text>
        </View>

        <View style={[styles.importantCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.importantTitle, { color: textColor }]}>
            Care & Safety
          </Text>
          <Text style={[styles.importantText, { color: textSecondaryColor }]}>
            If you are experiencing a mental health crisis or thoughts of self-harm, please reach out for immediate support:
          </Text>
          <Text style={[styles.crisisText, { color: colors.primary }]}>
            U.S. 988 Suicide & Crisis Lifeline
          </Text>
          <Text style={[styles.importantText, { color: textSecondaryColor }]}>
            Linen encourages you to seek real-world support from trusted friends, family, spiritual directors, counselors, or healthcare providers when needed.
          </Text>
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
  heroSection: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 56,
    fontWeight: typography.semibold,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: typography.h4,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 28,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  topContinueButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  topContinueButtonText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  featuresGrid: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  featureCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  featureTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
  },
  featureDescription: {
    fontSize: typography.body,
    lineHeight: 24,
  },
  dailyPracticeSection: {
    marginTop: spacing.xxl,
    gap: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    textAlign: 'center',
  },
  practiceCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  practiceTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
  },
  practiceDescription: {
    fontSize: typography.body,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  practiceNote: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  importantCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  importantTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
  },
  importantText: {
    fontSize: typography.body,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  crisisText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    marginVertical: spacing.sm,
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
