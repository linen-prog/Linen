
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function LandingScreen() {
  console.log('User viewing Landing/Orientation screen');
  const router = useRouter();

  const handleContinue = () => {
    console.log('User tapped Begin Your Journey button on Landing screen');
    router.push('/auth');
  };

  const titleText = 'Linen';
  const taglineText = 'Faith that lives in your body';
  const introText = 'Embodied Christian spirituality rooted in Scripture and Christian tradition through gentle somatic practice, creative expression, and contemplative care';
  const buttonText = 'Begin Your Journey';
  const whatMakesLinenDifferentTitle = 'What Makes Linen Different';
  
  const scriptureCompanionTitle = 'Scripture-Rooted Spiritual Companion';
  const scriptureCompanionText = 'An AI companion rooted in scripture that helps you notice how God speaks through embodied prayer, weaving God\'s word into the conversation as it guides you through sensation, emotion, and prayer—drawing you nearer to the One who shaped you in love and calls you beloved';
  
  const creativeExpressionTitle = 'Creative Expression';
  const creativeExpressionText = 'Draw, collage, and voice journal your spiritual journey with 7 brush types, photo uploads, and rich artistic tools';
  
  const somaticPracticesTitle = 'Somatic Practices';
  const somaticPracticesText = 'From breath work to grounding exercises, come home to your body and trust its wisdom through guided practices, reflections, and achievement badges';
  
  const liturgicalGroundingTitle = 'Liturgical Grounding';
  const liturgicalGroundingText = 'Daily scripture reflections follow the church calendar\'s seasonal rhythms with thematic coherence and color shifts';
  
  const compassionateCareTitle = 'Compassionate Care Community';
  const compassionateCareText = 'Share anonymously when you need privacy, or connect with your name when you\'re ready. Request care, share wisdom and reflections, send encouragement — choose your level of visibility in a safe, gentle space';
  
  const crisisAwareCareTitle = 'Crisis-Aware Care';
  const crisisAwareCareText = 'Clear mental health boundaries with 988 Suicide & Crisis Lifeline integration when serious support is needed';
  
  const yourDailyPracticeTitle = 'Your Daily Practice';
  
  const checkInTitle = 'Check-In';
  const checkInText = 'Share what\'s on your heart and mind with a specialized AI companion trained to help you navigate physical, spiritual, and emotional pain. It helps you notice what\'s happening in your body, explore how you\'re feeling, and offers gentle practices like meditation, prayer, breathing, movement, and other self-care techniques. Conversations maintain context across 24-hour threads for deeper exploration.';
  const checkInItalicText = 'The AI recognizes when you\'re anxious, restless, heavy, or tense and can guide you through brief 5-30 second calming practices with step-by-step instructions.';
  
  const dailyGiftTitle = 'Daily Gift';
  const dailyGiftText = 'Open scripture with contemplative reflection grounded in the liturgical calendar. Each week brings a new theme with seven curated scripture passages. Create art-based reflections using drawing tools, collage capabilities, or voice journaling. Tag your mood and body sensations to track patterns over time.';
  
  const whoLinenIsForTitle = 'Who Linen Is For';
  const whoLinenIsForBullet1 = 'Are ready to gently tend to old wounds and memories held in your body';
  const whoLinenIsForBullet2 = 'Want contemplative prayer alongside faithful study';
  const whoLinenIsForBullet3 = 'Are drawn to creative expression as spiritual practice';
  const whoLinenIsForBullet4 = 'Long for embodied faith that honors your whole self';
  const whoLinenIsForBullet5 = 'Need community care that feels safe and intimate';
  
  const closingText = 'Linen complements your faith journey. If you\'re seeking primary theological teaching, systematic Bible study, or academic faith formation, those remain vital and beautiful—Linen offers a different gift: space to notice how your body holds your faith story, where God meets you in the everyday sensations of being human.';
  
  const quoteText = '"While other faith apps focus on your mind, Linen invites your whole body into the conversation with God. Through gentle somatic awareness, creative reflection, and contemplative practice, discover a faith that breathes, moves, and feels."';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{titleText}</Text>
          <Text style={styles.tagline}>{taglineText}</Text>
        </View>

        <View style={styles.introSection}>
          <Text style={styles.introText}>{introText}</Text>
        </View>

        <TouchableOpacity 
          style={styles.beginButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.beginButtonText}>{buttonText}</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <IconSymbol 
            ios_icon_name="sparkles" 
            android_material_icon_name="auto-awesome" 
            size={24} 
            color={colors.primary} 
          />
          <Text style={styles.sectionTitle}>{whatMakesLinenDifferentTitle}</Text>
          <IconSymbol 
            ios_icon_name="sparkles" 
            android_material_icon_name="auto-awesome" 
            size={24} 
            color={colors.primary} 
          />
        </View>

        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <IconSymbol 
                ios_icon_name="heart.fill" 
                android_material_icon_name="favorite" 
                size={28} 
                color="#FFFFFF" 
              />
            </View>
            <Text style={styles.featureTitle}>{scriptureCompanionTitle}</Text>
            <Text style={styles.featureText}>{scriptureCompanionText}</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <IconSymbol 
                ios_icon_name="paintbrush.fill" 
                android_material_icon_name="palette" 
                size={28} 
                color="#FFFFFF" 
              />
            </View>
            <Text style={styles.featureTitle}>{creativeExpressionTitle}</Text>
            <Text style={styles.featureText}>{creativeExpressionText}</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <IconSymbol 
                ios_icon_name="wind" 
                android_material_icon_name="air" 
                size={28} 
                color="#FFFFFF" 
              />
            </View>
            <Text style={styles.featureTitle}>{somaticPracticesTitle}</Text>
            <Text style={styles.featureText}>{somaticPracticesText}</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <IconSymbol 
                ios_icon_name="book.fill" 
                android_material_icon_name="menu-book" 
                size={28} 
                color="#FFFFFF" 
              />
            </View>
            <Text style={styles.featureTitle}>{liturgicalGroundingTitle}</Text>
            <Text style={styles.featureText}>{liturgicalGroundingText}</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <IconSymbol 
                ios_icon_name="person.2.fill" 
                android_material_icon_name="group" 
                size={28} 
                color="#FFFFFF" 
              />
            </View>
            <Text style={styles.featureTitle}>{compassionateCareTitle}</Text>
            <Text style={styles.featureText}>{compassionateCareText}</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <IconSymbol 
                ios_icon_name="star.fill" 
                android_material_icon_name="star" 
                size={28} 
                color="#FFFFFF" 
              />
            </View>
            <Text style={styles.featureTitle}>{crisisAwareCareTitle}</Text>
            <Text style={styles.featureText}>{crisisAwareCareText}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <IconSymbol 
            ios_icon_name="sparkles" 
            android_material_icon_name="auto-awesome" 
            size={24} 
            color={colors.primary} 
          />
          <Text style={styles.sectionTitle}>{yourDailyPracticeTitle}</Text>
          <IconSymbol 
            ios_icon_name="sparkles" 
            android_material_icon_name="auto-awesome" 
            size={24} 
            color={colors.primary} 
          />
        </View>

        <View style={styles.practiceCard}>
          <View style={styles.practiceHeader}>
            <View style={styles.practiceIconContainer}>
              <IconSymbol 
                ios_icon_name="message.fill" 
                android_material_icon_name="chat" 
                size={32} 
                color={colors.primary} 
              />
            </View>
            <Text style={styles.practiceTitle}>{checkInTitle}</Text>
          </View>
          <Text style={styles.practiceText}>{checkInText}</Text>
          <Text style={styles.practiceItalicText}>{checkInItalicText}</Text>
        </View>

        <View style={styles.practiceCard}>
          <View style={styles.practiceHeader}>
            <View style={styles.practiceIconContainer}>
              <IconSymbol 
                ios_icon_name="gift.fill" 
                android_material_icon_name="card-giftcard" 
                size={32} 
                color={colors.primary} 
              />
            </View>
            <Text style={styles.practiceTitle}>{dailyGiftTitle}</Text>
          </View>
          <Text style={styles.practiceText}>{dailyGiftText}</Text>
        </View>

        <View style={styles.whoIsForSection}>
          <Text style={styles.whoIsForTitle}>{whoLinenIsForTitle}</Text>
          <View style={styles.bulletContainer}>
            <View style={styles.bulletPoint} />
            <Text style={styles.bulletText}>{whoLinenIsForBullet1}</Text>
          </View>
          <View style={styles.bulletContainer}>
            <View style={styles.bulletPoint} />
            <Text style={styles.bulletText}>{whoLinenIsForBullet2}</Text>
          </View>
          <View style={styles.bulletContainer}>
            <View style={styles.bulletPoint} />
            <Text style={styles.bulletText}>{whoLinenIsForBullet3}</Text>
          </View>
          <View style={styles.bulletContainer}>
            <View style={styles.bulletPoint} />
            <Text style={styles.bulletText}>{whoLinenIsForBullet4}</Text>
          </View>
          <View style={styles.bulletContainer}>
            <View style={styles.bulletPoint} />
            <Text style={styles.bulletText}>{whoLinenIsForBullet5}</Text>
          </View>
          <Text style={styles.closingText}>{closingText}</Text>
        </View>

        <View style={styles.quoteSection}>
          <Text style={styles.quoteText}>{quoteText}</Text>
        </View>

        <TouchableOpacity 
          style={styles.beginButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.beginButtonText}>{buttonText}</Text>
        </TouchableOpacity>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl + spacing.lg,
  },
  title: {
    fontSize: 48,
    fontWeight: typography.bold,
    color: colors.primary,
    marginBottom: spacing.xl,
  },
  tagline: {
    fontSize: typography.h3,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: typography.medium,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  introText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  beginButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.xl + spacing.lg,
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl + spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  beginButtonText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
  },
  featuresGrid: {
    gap: spacing.lg,
    marginBottom: spacing.xl + spacing.lg,
  },
  featureCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  featureTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  practiceCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: spacing.lg,
  },
  practiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  practiceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  practiceText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  practiceItalicText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  whoIsForSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: spacing.lg,
  },
  whoIsForTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  bulletContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    paddingLeft: spacing.sm,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 8,
    marginRight: spacing.sm,
  },
  bulletText: {
    flex: 1,
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  closingText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quoteSection: {
    backgroundColor: '#E8F4F8',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  quoteText: {
    fontSize: typography.body,
    color: colors.text,
    lineHeight: 26,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
