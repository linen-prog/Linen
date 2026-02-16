
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPut } from '@/utils/api';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';

interface CompanionPreferences {
  companionTone: string | null;
  companionDirectness: string | null;
  companionSpiritualIntegration: string | null;
  companionResponseLength: string | null;
  companionCustomPreferences: string | null;
}

const TONE_OPTIONS = [
  { id: 'professional_therapist', label: 'Professional Therapist', description: 'Clinical, structured, evidence-based approach', icon: '🩺' },
  { id: 'wise_elder', label: 'Wise Elder', description: 'Gentle wisdom from lived experience', icon: '🌳' },
  { id: 'peer_friend', label: 'Peer Friend', description: 'Warm, relatable, walking alongside you', icon: '🤝' },
  { id: 'gentle_friend', label: 'Gentle Friend', description: 'Soft, nurturing, deeply compassionate', icon: '🕊️' },
];

const DIRECTNESS_OPTIONS = [
  { id: 'gentle_exploratory', label: 'Gentle & Exploratory', description: 'Asks questions, invites reflection', icon: '🌱' },
  { id: 'balanced', label: 'Balanced', description: 'Mix of questions and observations', icon: '⚖️' },
  { id: 'clear_direct', label: 'Clear & Direct', description: 'Names patterns, offers insights', icon: '🎯' },
];

const SPIRITUAL_OPTIONS = [
  { id: 'frequent', label: 'Frequent', description: 'Regular scripture references and spiritual insights', icon: '✝️' },
  { id: 'balanced', label: 'Balanced', description: 'Spiritual when relevant, not forced', icon: '🕊️' },
  { id: 'minimal', label: 'Minimal', description: 'Occasional, only when deeply relevant', icon: '🌿' },
];

const LENGTH_OPTIONS = [
  { id: 'brief', label: 'Brief', description: '1-2 sentences, concise and focused', icon: '💬' },
  { id: 'balanced', label: 'Balanced', description: '2-4 sentences, thoughtful but not overwhelming', icon: '📝' },
  { id: 'detailed', label: 'Detailed', description: '4+ sentences, thorough and reflective', icon: '📖' },
];

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.h1,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  optionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  optionIcon: {
    fontSize: 24,
  },
  optionLabel: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.text,
    flex: 1,
  },
  optionDescription: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
    marginLeft: 32,
  },
  customPreferencesCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  customPreferencesLabel: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  customPreferencesDescription: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  resetButton: {
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  resetButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  previewCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  previewTitle: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  previewText: {
    fontSize: typography.bodySmall,
    color: colors.text,
    lineHeight: 18,
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  confirmModalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  confirmModalTitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  confirmModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  confirmModalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  confirmModalButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
});

export default function CompanionPreferencesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  
  const [preferences, setPreferences] = useState<CompanionPreferences>({
    companionTone: null,
    companionDirectness: null,
    companionSpiritualIntegration: null,
    companionResponseLength: null,
    companionCustomPreferences: null,
  });

  useEffect(() => {
    console.log('CompanionPreferencesScreen: Loading preferences');
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      console.log('CompanionPreferencesScreen: Fetching preferences from API');
      const response = await authenticatedGet<any>('/api/profile');
      console.log('CompanionPreferencesScreen: Preferences loaded:', response);
      
      setPreferences({
        companionTone: response.companionTone || null,
        companionDirectness: response.companionDirectness || null,
        companionSpiritualIntegration: response.companionSpiritualIntegration || null,
        companionResponseLength: response.companionResponseLength || null,
        companionCustomPreferences: response.companionCustomPreferences || null,
      });
    } catch (error) {
      console.error('CompanionPreferencesScreen: Failed to load preferences -', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('CompanionPreferencesScreen: Saving preferences -', preferences);
    setSaving(true);
    try {
      await authenticatedPut('/api/profile', {
        companionTone: preferences.companionTone,
        companionDirectness: preferences.companionDirectness,
        companionSpiritualIntegration: preferences.companionSpiritualIntegration,
        companionResponseLength: preferences.companionResponseLength,
        companionCustomPreferences: preferences.companionCustomPreferences,
      });
      console.log('CompanionPreferencesScreen: Preferences saved successfully');
      router.back();
    } catch (error) {
      console.error('CompanionPreferencesScreen: Failed to save preferences -', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    console.log('CompanionPreferencesScreen: Resetting preferences to defaults');
    setShowResetModal(false);
    setSaving(true);
    try {
      await authenticatedPut('/api/profile', {
        companionTone: null,
        companionDirectness: null,
        companionSpiritualIntegration: null,
        companionResponseLength: null,
        companionCustomPreferences: null,
      });
      console.log('CompanionPreferencesScreen: Preferences reset successfully');
      
      setPreferences({
        companionTone: null,
        companionDirectness: null,
        companionSpiritualIntegration: null,
        companionResponseLength: null,
        companionCustomPreferences: null,
      });
    } catch (error) {
      console.error('CompanionPreferencesScreen: Failed to reset preferences -', error);
    } finally {
      setSaving(false);
    }
  };

  const getPreviewText = () => {
    const toneText = preferences.companionTone 
      ? TONE_OPTIONS.find(o => o.id === preferences.companionTone)?.label 
      : 'Default';
    const directnessText = preferences.companionDirectness 
      ? DIRECTNESS_OPTIONS.find(o => o.id === preferences.companionDirectness)?.label 
      : 'Default';
    const spiritualText = preferences.companionSpiritualIntegration 
      ? SPIRITUAL_OPTIONS.find(o => o.id === preferences.companionSpiritualIntegration)?.label 
      : 'Default';
    const lengthText = preferences.companionResponseLength 
      ? LENGTH_OPTIONS.find(o => o.id === preferences.companionResponseLength)?.label 
      : 'Default';

    const previewTextValue = `Your companion will respond with a ${toneText} tone, ${directnessText} directness, ${spiritualText} spiritual integration, and ${lengthText} response length.`;
    return previewTextValue;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Companion Preferences',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          title: 'Companion Preferences',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              Customize Your Companion
            </Text>
            <Text style={styles.headerSubtitle}>
              Shape how your AI companion responds to you. These preferences help create a more personal experience.
            </Text>
          </View>

          {/* Tone Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Tone
            </Text>
            <Text style={styles.sectionDescription}>
              How would you like your companion to speak with you?
            </Text>
            {TONE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  preferences.companionTone === option.id && styles.optionCardSelected,
                ]}
                onPress={() => setPreferences({ ...preferences, companionTone: option.id })}
              >
                <View style={styles.optionHeader}>
                  <Text style={styles.optionIcon}>
                    {option.icon}
                  </Text>
                  <Text style={styles.optionLabel}>
                    {option.label}
                  </Text>
                  {preferences.companionTone === option.id && (
                    <IconSymbol 
                      ios_icon_name="checkmark" 
                      android_material_icon_name="check" 
                      size={20} 
                      color={colors.primary} 
                    />
                  )}
                </View>
                <Text style={styles.optionDescription}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Directness Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Directness
            </Text>
            <Text style={styles.sectionDescription}>
              How direct should your companion be in observations and insights?
            </Text>
            {DIRECTNESS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  preferences.companionDirectness === option.id && styles.optionCardSelected,
                ]}
                onPress={() => setPreferences({ ...preferences, companionDirectness: option.id })}
              >
                <View style={styles.optionHeader}>
                  <Text style={styles.optionIcon}>
                    {option.icon}
                  </Text>
                  <Text style={styles.optionLabel}>
                    {option.label}
                  </Text>
                  {preferences.companionDirectness === option.id && (
                    <IconSymbol 
                      ios_icon_name="checkmark" 
                      android_material_icon_name="check" 
                      size={20} 
                      color={colors.primary} 
                    />
                  )}
                </View>
                <Text style={styles.optionDescription}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Spiritual Integration Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Spiritual Integration
            </Text>
            <Text style={styles.sectionDescription}>
              How often would you like scripture references and spiritual insights?
            </Text>
            {SPIRITUAL_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  preferences.companionSpiritualIntegration === option.id && styles.optionCardSelected,
                ]}
                onPress={() => setPreferences({ ...preferences, companionSpiritualIntegration: option.id })}
              >
                <View style={styles.optionHeader}>
                  <Text style={styles.optionIcon}>
                    {option.icon}
                  </Text>
                  <Text style={styles.optionLabel}>
                    {option.label}
                  </Text>
                  {preferences.companionSpiritualIntegration === option.id && (
                    <IconSymbol 
                      ios_icon_name="checkmark" 
                      android_material_icon_name="check" 
                      size={20} 
                      color={colors.primary} 
                    />
                  )}
                </View>
                <Text style={styles.optionDescription}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Response Length Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Response Length
            </Text>
            <Text style={styles.sectionDescription}>
              How detailed should your companion&apos;s responses be?
            </Text>
            {LENGTH_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  preferences.companionResponseLength === option.id && styles.optionCardSelected,
                ]}
                onPress={() => setPreferences({ ...preferences, companionResponseLength: option.id })}
              >
                <View style={styles.optionHeader}>
                  <Text style={styles.optionIcon}>
                    {option.icon}
                  </Text>
                  <Text style={styles.optionLabel}>
                    {option.label}
                  </Text>
                  {preferences.companionResponseLength === option.id && (
                    <IconSymbol 
                      ios_icon_name="checkmark" 
                      android_material_icon_name="check" 
                      size={20} 
                      color={colors.primary} 
                    />
                  )}
                </View>
                <Text style={styles.optionDescription}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Preferences Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Custom Preferences
            </Text>
            <Text style={styles.sectionDescription}>
              Any other preferences or guidance for your companion? (Optional)
            </Text>
            <View style={styles.customPreferencesCard}>
              <TextInput
                style={styles.textInput}
                value={preferences.companionCustomPreferences || ''}
                onChangeText={(text) => setPreferences({ ...preferences, companionCustomPreferences: text })}
                placeholder="e.g., 'Please use more metaphors' or 'I prefer shorter responses when I'm anxious'"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* Preview */}
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>
              Preview
            </Text>
            <Text style={styles.previewText}>
              {getPreviewText()}
            </Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                Save Preferences
              </Text>
            )}
          </TouchableOpacity>

          {/* Reset Button */}
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={() => setShowResetModal(true)}
            disabled={saving}
          >
            <Text style={styles.resetButtonText}>
              Reset to Defaults
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Reset Confirmation Modal */}
      <Modal
        visible={showResetModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>
              Reset Preferences
            </Text>
            <Text style={styles.confirmModalMessage}>
              Are you sure you want to reset all companion preferences to their defaults? This will clear all your customizations.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity 
                style={[styles.confirmModalButton, { backgroundColor: colors.border }]}
                onPress={() => setShowResetModal(false)}
              >
                <Text style={[styles.confirmModalButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmModalButton, { backgroundColor: colors.error }]}
                onPress={handleReset}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.confirmModalButtonText, { color: '#FFFFFF' }]}>
                    Reset
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
