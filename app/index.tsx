
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

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome to a space where faith meets presence, where ancient wisdom guides modern practice, and where you can tend to your soul with gentleness and care.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Linen Is</Text>
          <Text style={styles.bodyText}>
            Linen is a contemplative companion for your spiritual journey. It offers a gentle space for prayer, reflection, and embodied awareness rooted in Christian tradition. Through daily scripture, creative expression, and compassionate community, Linen invites you into a slower, more intentional way of being.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Linen Is Not</Text>
          <Text style={styles.bodyText}>
            Linen is not medical care, mental health treatment, or therapy. It does not diagnose, treat, or provide clinical advice. It is not a productivity tool or a self-improvement program. Linen does not offer urgent crisis support or emergency services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Care & Safety</Text>
          <Text style={styles.bodyText}>
            If you are experiencing a mental health crisis, thoughts of self-harm, or need immediate support, please reach out for professional help:
          </Text>
          <Text style={styles.crisisLine}>U.S. 988 Suicide & Crisis Lifeline</Text>
          <Text style={styles.crisisLine}>Text "HELLO" to 741741 (Crisis Text Line)</Text>
          <Text style={styles.bodyText}>
            Linen encourages you to seek real-world support from trusted friends, family, spiritual directors, counselors, therapists, or healthcare providers when needed. Your wellbeing matters, and professional care is a gift.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Who Linen Is For</Text>
          <Text style={styles.bodyText}>
            Linen is for those seeking spiritual healing, tending wounds, and slow restoration through prayer and reflection. It is for anyone who longs for a gentler pace, a deeper connection with the sacred, and a community that holds space for both joy and sorrow. Whether you are new to contemplative practice or have walked this path for years, you are welcome here.
          </Text>
        </View>

        <View style={styles.journeySection}>
          <View style={styles.journeyHeader}>
            <IconSymbol 
              ios_icon_name="sparkles" 
              android_material_icon_name="auto-awesome" 
              size={32} 
              color={colors.primary} 
            />
            <Text style={styles.journeyTitle}>Begin Your Journey</Text>
          </View>
          <Text style={styles.journeyIntro}>
            Linen offers four core practices to support your spiritual life:
          </Text>

          <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <IconSymbol 
                ios_icon_name="book.fill" 
                android_material_icon_name="menu-book" 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.featureTitle}>Scripture Companion</Text>
            </View>
            <Text style={styles.featureDescription}>
              Each day, receive a carefully selected scripture passage paired with a gentle reflection prompt. These readings follow the liturgical calendar, connecting you to the rhythm of the Church year and the wisdom of ancient tradition. Take time to sit with the Word, allowing it to speak into your life without pressure or expectation.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <IconSymbol 
                ios_icon_name="paintbrush.fill" 
                android_material_icon_name="brush" 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.featureTitle}>Creative Expression</Text>
            </View>
            <Text style={styles.featureDescription}>
              Prayer takes many forms. Through writing, drawing, and other creative practices, you can express what words alone cannot capture. Your reflections are private by default, but you may choose to share them with the community when you feel called to do so. There is no right or wrong way to create—only your honest response to the sacred.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <IconSymbol 
                ios_icon_name="calendar" 
                android_material_icon_name="calendar-today" 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.featureTitle}>Liturgical Grounding</Text>
            </View>
            <Text style={styles.featureDescription}>
              Linen's content flows with the liturgical seasons—Advent, Christmas, Epiphany, Lent, Easter, and Ordinary Time. Each week brings a new theme rooted in the Church calendar, offering structure and meaning to your daily practice. You are invited to move through the year with intention, marking time in a way that honors both celebration and lament.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <IconSymbol 
                ios_icon_name="heart.fill" 
                android_material_icon_name="favorite" 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.featureTitle}>Compassionate Care Community</Text>
            </View>
            <Text style={styles.featureDescription}>
              You are not alone on this journey. The Linen community is a space for sharing reflections, offering prayers, and holding one another in compassion. Here, there is no advice-giving or fixing—only presence, witness, and the simple act of saying "you are held in prayer." This is a place where vulnerability is honored and silence is sacred.
            </Text>
          </View>
        </View>

        <View style={styles.practiceSection}>
          <Text style={styles.practiceSectionTitle}>Your Daily Practice</Text>
          <Text style={styles.practiceSectionIntro}>
            Linen invites you into two gentle rhythms each day:
          </Text>

          <View style={styles.practiceCard}>
            <View style={styles.practiceHeader}>
              <IconSymbol 
                ios_icon_name="message.fill" 
                android_material_icon_name="chat" 
                size={28} 
                color={colors.primary} 
              />
              <Text style={styles.practiceTitle}>Check-In</Text>
            </View>
            <Text style={styles.practiceDescription}>
              A conversational space for reflection and prayer. Share what is on your heart, explore your thoughts and feelings, and receive gentle, non-directive responses that honor your experience. The Check-In is not about fixing or solving—it is about being present to yourself and to the sacred. Come as you are, with whatever you carry.
            </Text>
            <View style={styles.practiceDetails}>
              <Text style={styles.practiceDetailLabel}>What to expect:</Text>
              <Text style={styles.practiceDetailText}>
                • A safe, private space for honest reflection{'\n'}
                • Gentle prompts that invite deeper awareness{'\n'}
                • No judgment, no advice, no pressure{'\n'}
                • The freedom to share as much or as little as you wish{'\n'}
                • Responses rooted in compassion and spiritual wisdom
              </Text>
            </View>
          </View>

          <View style={styles.practiceCard}>
            <View style={styles.practiceHeader}>
              <IconSymbol 
                ios_icon_name="gift.fill" 
                android_material_icon_name="card-giftcard" 
                size={28} 
                color={colors.primary} 
              />
              <Text style={styles.practiceTitle}>Daily Gift</Text>
            </View>
            <Text style={styles.practiceDescription}>
              Each day, a new gift awaits you: a scripture passage, a reflection prompt, and an invitation to creative expression. This is not a task to complete or a box to check. It is an offering—something to receive, to sit with, to let settle into your soul. You may engage deeply or simply read and move on. There is no right way to receive a gift.
            </Text>
            <View style={styles.practiceDetails}>
              <Text style={styles.practiceDetailLabel}>What you'll find:</Text>
              <Text style={styles.practiceDetailText}>
                • A scripture passage chosen for the liturgical season{'\n'}
                • A gentle reflection prompt to guide your contemplation{'\n'}
                • Space for written reflection or creative response{'\n'}
                • Optional somatic practices for embodied prayer{'\n'}
                • The choice to keep your reflections private or share with the community
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.additionalSection}>
          <Text style={styles.additionalTitle}>A Few More Things</Text>
          
          <View style={styles.additionalCard}>
            <Text style={styles.additionalCardTitle}>Go at Your Own Pace</Text>
            <Text style={styles.additionalCardText}>
              There are no streaks to maintain, no goals to achieve, no pressure to show up every day. Linen is here when you need it, and it will wait patiently when you don't. Your spiritual life is not a performance—it is a relationship, and relationships thrive on grace, not obligation.
            </Text>
          </View>

          <View style={styles.additionalCard}>
            <Text style={styles.additionalCardTitle}>Privacy & Safety</Text>
            <Text style={styles.additionalCardText}>
              Your reflections are private by default. You choose what to share and when. The community is moderated to ensure it remains a safe, compassionate space. If you ever feel unsafe or encounter content that concerns you, please reach out for support.
            </Text>
          </View>

          <View style={styles.additionalCard}>
            <Text style={styles.additionalCardTitle}>Embodied Awareness</Text>
            <Text style={styles.additionalCardText}>
              Linen occasionally offers gentle somatic practices—simple movements, breathing exercises, and body-based prayers. These are invitations, not requirements. You are always free to skip them or adapt them to what feels right for your body and your needs.
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By continuing, you acknowledge that Linen is a spiritual practice tool and not a substitute for professional medical or mental health care. You understand that Linen does not provide therapy, diagnosis, or clinical treatment.
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
    marginBottom: spacing.lg,
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
  welcomeSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: spacing.md,
  },
  welcomeText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
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
  journeySection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  journeyTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
  },
  journeyIntro: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  featureCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  featureTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  featureDescription: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  practiceSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  practiceSectionTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  practiceSectionIntro: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  practiceCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  practiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  practiceTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  practiceDescription: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  practiceDetails: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  practiceDetailLabel: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  practiceDetailText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  additionalSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  additionalTitle: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  additionalCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  additionalCardTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  additionalCardText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
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
