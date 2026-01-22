
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';

export default function LandingScreen() {
  console.log('User viewing Landing/Orientation screen');
  const router = useRouter();

  const handleContinue = () => {
    console.log('User tapped Continue button on Landing screen');
    router.push('/auth');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Linen</Text>
          <Text style={styles.tagline}>
            A gentle space for reflection, prayer, and embodied awareness
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Linen Is</Text>
          <Text style={styles.bodyText}>
            A space for spiritual reflection, prayer, and presence. Linen offers gentle guidance for contemplative practice and embodied awareness.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Linen Is Not</Text>
          <Text style={styles.bodyText}>
            Linen is not medical care, mental health treatment, or therapy. It does not diagnose, treat, or provide clinical advice.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Care & Safety</Text>
          <Text style={styles.bodyText}>
            If you are experiencing a mental health crisis or thoughts of self-harm, please reach out for immediate support:
          </Text>
          <Text style={styles.crisisLine}>U.S. 988 Suicide & Crisis Lifeline</Text>
          <Text style={styles.bodyText}>
            Linen encourages you to seek real-world support from trusted friends, family, spiritual directors, counselors, or healthcare providers when needed.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Who Linen Is For</Text>
          <Text style={styles.bodyText}>
            Those seeking spiritual healing, tending wounds, and slow restoration through prayer and reflection.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By continuing, you acknowledge that Linen is a spiritual practice tool and not a substitute for professional medical or mental health care.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.h1 + 8,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  section: {
    backgroundColor: colors.card,
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
    color: colors.text,
    marginBottom: spacing.md,
  },
  bodyText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  crisisLine: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: colors.error,
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
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
    paddingHorizontal: spacing.md,
  },
});
