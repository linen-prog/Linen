
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, useColorScheme, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function DailyGiftScreen() {
  console.log('User viewing Daily Gift screen');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [scriptureText, setScriptureText] = useState('');
  const [scriptureReference, setScriptureReference] = useState('');
  const [reflectionPrompt, setReflectionPrompt] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  const [shareToComm, setShareToComm] = useState(false);
  const [hasReflected, setHasReflected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dailyGiftId, setDailyGiftId] = useState<string | null>(null);

  useEffect(() => {
    const loadDailyGift = async () => {
      try {
        const { authenticatedGet } = await import('@/utils/api');
        const response = await authenticatedGet<{
          id: string;
          date: string;
          scriptureText: string;
          scriptureReference: string;
          reflectionPrompt: string;
          hasReflected: boolean;
        }>('/api/daily-gift/today');
        
        console.log('Daily gift loaded:', response);
        setDailyGiftId(response.id);
        setScriptureText(response.scriptureText);
        setScriptureReference(response.scriptureReference);
        setReflectionPrompt(response.reflectionPrompt);
        setHasReflected(response.hasReflected);
      } catch (error) {
        console.error('Failed to load daily gift:', error);
        // Use defaults on error
        setScriptureText('Be still, and know that I am God.');
        setScriptureReference('Psalm 46:10');
        setReflectionPrompt('Where in your body do you feel stillness today? What does it feel like to simply be, without doing?');
        setHasReflected(false);
      }
    };

    loadDailyGift();
  }, []);

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const inputBg = isDark ? colors.cardDark : colors.card;
  const inputBorder = isDark ? colors.borderDark : colors.border;

  const handleSaveReflection = async () => {
    if (!reflectionText.trim()) {
      return;
    }

    console.log('User saving reflection', { reflectionText, shareToComm });
    setIsLoading(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      const response = await authenticatedPost<{ reflectionId: string }>('/api/daily-gift/reflect', {
        dailyGiftId,
        reflectionText: reflectionText.trim(),
        shareToComm,
      });
      
      console.log('Reflection saved successfully:', response);
      setIsLoading(false);
      setHasReflected(true);
    } catch (error) {
      console.error('Failed to save reflection:', error);
      setIsLoading(false);
      // Optionally show an error message to the user
    }
  };

  const scriptureDisplay = scriptureText;
  const referenceDisplay = scriptureReference;
  const promptDisplay = reflectionPrompt;
  const saveButtonText = isLoading ? 'Saving...' : 'Save Reflection';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Today\'s Gift',
          headerBackTitle: 'Home',
          headerStyle: {
            backgroundColor: bgColor,
          },
          headerTintColor: colors.primary,
        }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.giftCard, { backgroundColor: cardBg }]}>
          <View style={styles.giftIcon}>
            <IconSymbol 
              ios_icon_name="gift.fill"
              android_material_icon_name="card-giftcard"
              size={48}
              color={colors.accent}
            />
          </View>
          
          <Text style={[styles.scriptureText, { color: textColor }]}>
            {scriptureDisplay}
          </Text>
          
          <Text style={[styles.scriptureReference, { color: colors.primary }]}>
            {referenceDisplay}
          </Text>
        </View>

        <View style={[styles.promptCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.promptTitle, { color: textColor }]}>
            Reflection Prompt
          </Text>
          <Text style={[styles.promptText, { color: textSecondaryColor }]}>
            {promptDisplay}
          </Text>
        </View>

        {!hasReflected ? (
          <View style={[styles.reflectionCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.reflectionTitle, { color: textColor }]}>
              Your Reflection
            </Text>
            <Text style={[styles.reflectionSubtitle, { color: textSecondaryColor }]}>
              Take your time. There&apos;s no rush.
            </Text>
            
            <TextInput
              style={[styles.reflectionInput, { 
                backgroundColor: inputBg,
                borderColor: inputBorder,
                color: textColor 
              }]}
              placeholder="Write, draw with words, or simply notice what arises..."
              placeholderTextColor={textSecondaryColor}
              value={reflectionText}
              onChangeText={setReflectionText}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />

            <View style={styles.shareToggle}>
              <View style={styles.shareToggleText}>
                <Text style={[styles.shareToggleLabel, { color: textColor }]}>
                  Share to Community
                </Text>
                <Text style={[styles.shareToggleDescription, { color: textSecondaryColor }]}>
                  Others can hold your reflection in prayer
                </Text>
              </View>
              <Switch
                value={shareToComm}
                onValueChange={setShareToComm}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={shareToComm ? colors.primary : colors.card}
              />
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, (!reflectionText.trim() || isLoading) && styles.saveButtonDisabled]}
              onPress={handleSaveReflection}
              disabled={!reflectionText.trim() || isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>
                {saveButtonText}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.completedCard, { backgroundColor: cardBg }]}>
            <IconSymbol 
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check-circle"
              size={48}
              color={colors.success}
            />
            <Text style={[styles.completedTitle, { color: textColor }]}>
              Reflection Saved
            </Text>
            <Text style={[styles.completedText, { color: textSecondaryColor }]}>
              Your reflection has been saved. Return tomorrow for a new gift.
            </Text>
          </View>
        )}
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
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  giftCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  giftIcon: {
    marginBottom: spacing.lg,
  },
  scriptureText: {
    fontSize: typography.h3,
    fontWeight: typography.medium,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: spacing.md,
  },
  scriptureReference: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    fontStyle: 'italic',
  },
  promptCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  promptTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
  },
  promptText: {
    fontSize: typography.body,
    lineHeight: 24,
  },
  reflectionCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  reflectionTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
  },
  reflectionSubtitle: {
    fontSize: typography.bodySmall,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  reflectionInput: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    lineHeight: 22,
    minHeight: 150,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  shareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  shareToggleText: {
    flex: 1,
    marginRight: spacing.md,
  },
  shareToggleLabel: {
    fontSize: typography.body,
    fontWeight: typography.medium,
    marginBottom: spacing.xs,
  },
  shareToggleDescription: {
    fontSize: typography.bodySmall,
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  completedCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  completedTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  completedText: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
});
