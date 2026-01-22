
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { Stack, useRouter } from 'expo-router';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';

interface RecapPreferences {
  id: string;
  deliveryDay: 'sunday' | 'monday' | 'disabled';
  deliveryTime: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  optionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  optionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  optionDescription: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
  },
  infoText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default function RecapSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<RecapPreferences | null>(null);
  const [selectedDay, setSelectedDay] = useState<'sunday' | 'monday' | 'disabled'>('sunday');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    console.log('Loading recap preferences');
    try {
      setLoading(true);
      const data = await authenticatedGet<{ preferences: RecapPreferences }>('/api/weekly-recap/preferences');
      
      console.log('Preferences loaded:', data);
      setPreferences(data.preferences);
      setSelectedDay(data.preferences.deliveryDay);
    } catch (error) {
      console.error('Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('Saving recap preferences:', selectedDay);
    try {
      setSaving(true);
      const data = await authenticatedPost<{ preferences: RecapPreferences }>('/api/weekly-recap/preferences', {
        deliveryDay: selectedDay,
      });
      
      console.log('Preferences saved:', data);
      setPreferences(data.preferences);
      Alert.alert('Success', 'Your recap preferences have been saved!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = preferences && selectedDay !== preferences.deliveryDay;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Recap Settings',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const sundaySelected = selectedDay === 'sunday';
  const mondaySelected = selectedDay === 'monday';
  const disabledSelected = selectedDay === 'disabled';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Recap Settings',
          headerShown: true,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Preferences</Text>
          <Text style={styles.sectionDescription}>
            Choose when you&apos;d like to receive your weekly recap. Recaps review the past week&apos;s engagement and prepare your heart for the coming week&apos;s rhythm.
          </Text>

          <TouchableOpacity
            style={[styles.optionCard, sundaySelected && styles.optionCardSelected]}
            onPress={() => setSelectedDay('sunday')}
          >
            <View style={styles.optionHeader}>
              <Text style={styles.optionTitle}>Sunday Evening</Text>
              {sundaySelected && (
                <View style={styles.checkIcon}>
                  <IconSymbol
                    ios_icon_name="checkmark"
                    android_material_icon_name="check"
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
              )}
            </View>
            <Text style={styles.optionDescription}>
              Receive your recap Sunday evening at 6:00 PM, as the new week begins. This timing allows you to reflect on the past week and set intentions for the week ahead.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, mondaySelected && styles.optionCardSelected]}
            onPress={() => setSelectedDay('monday')}
          >
            <View style={styles.optionHeader}>
              <Text style={styles.optionTitle}>Monday Morning</Text>
              {mondaySelected && (
                <View style={styles.checkIcon}>
                  <IconSymbol
                    ios_icon_name="checkmark"
                    android_material_icon_name="check"
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
              )}
            </View>
            <Text style={styles.optionDescription}>
              Receive your recap Monday morning at 8:00 AM to launch the new week. This timing helps you start fresh with insights from the previous week.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, disabledSelected && styles.optionCardSelected]}
            onPress={() => setSelectedDay('disabled')}
          >
            <View style={styles.optionHeader}>
              <Text style={styles.optionTitle}>Disabled</Text>
              {disabledSelected && (
                <View style={styles.checkIcon}>
                  <IconSymbol
                    ios_icon_name="checkmark"
                    android_material_icon_name="check"
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
              )}
            </View>
            <Text style={styles.optionDescription}>
              Don&apos;t receive automated recaps. You can still view recaps on demand through your profile history.
            </Text>
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              Archived recaps remain accessible through profile history, allowing you to review your journey across months or years.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (!hasChanges || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
