
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
        {/* Hero Section */}
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
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.featuresGrid}>
          {/* Scripture-Rooted Spiritual Companion */}
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
              An AI companion rooted in scripture that helps you notice how God speaks through embodied prayer, weaving God&apos;s word into the conversation as it guides you through sensation, emotion, and prayer—drawing you nearer to the One who shaped you in love and calls you beloved
            </Text>
          </View>

          {/* Creative Expression */}
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

          {/* Somatic Practices */}
          <View style={[styles.featureCard, { backgroundColor: cardBg }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
              <IconSymbol 
                ios_icon_name="wind"
                android_material_icon_name="air"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.featureTitle, { color: textColor }]}>
              Somatic Practices
            </Text>
            <Text style={[styles.featureDescription, { color: textSecondaryColor }]}>
              From breath work to grounding exercises, come home to your body and trust its wisdom through guided practices, reflections, and achievement badges
            </Text>
          </View>

          {/* Liturgical Grounding */}
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

          {/* Compassionate Care Community */}
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

          {/* Crisis-Aware Care */}
          <View style={[styles.featureCard, { backgroundColor: cardBg }]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
              <IconSymbol 
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={28}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.featureTitle, { color: textColor }]}>
              Crisis-Aware Care
            </Text>
            <Text style={[styles.featureDescription, { color: textSecondaryColor }]}>
              Clear mental health boundaries with 988 Suicide & Crisis Lifeline integration when serious support is needed
            </Text>
          </View>
        </View>

        {/* What Linen Is Not */}
        <View style={[styles.importantCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.importantTitle, { color: textColor }]}>
            What Linen Is Not
          </Text>
          <Text style={[styles.importantText, { color: textSecondaryColor }]}>
            Linen is not medical care, mental health treatment, or therapy. It does not diagnose, treat, or provide clinical advice. It is a spiritual practice tool, not a substitute for professional help.
          </Text>
        </View>

        {/* Care & Safety */}
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

        {/* Continue Button */}
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            Begin Your Journey
          </Text>
        </TouchableOpacity>

        {/* Footer */}
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
