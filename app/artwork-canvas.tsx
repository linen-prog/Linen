
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function ArtworkCanvasScreen() {
  console.log('User viewing Artwork Canvas screen');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [artworkData, setArtworkData] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadExistingArtwork = async () => {
      try {
        const { authenticatedGet } = await import('@/utils/api');
        const response = await authenticatedGet<{ artworkData: string } | null>('/api/artwork/current');
        
        if (response && response.artworkData) {
          console.log('Existing artwork loaded');
          setArtworkData(response.artworkData);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load existing artwork:', error);
        setIsLoading(false);
      }
    };

    loadExistingArtwork();
  }, []);

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const inputBg = isDark ? colors.cardDark : colors.card;
  const inputBorder = isDark ? colors.borderDark : colors.border;

  const handleSave = async () => {
    if (!artworkData.trim()) {
      Alert.alert('Empty Canvas', 'Please add some content before saving.');
      return;
    }

    console.log('User saving artwork', { dataLength: artworkData.length });
    setIsSaving(true);

    try {
      const { authenticatedPost } = await import('@/utils/api');
      await authenticatedPost('/api/artwork/save', {
        artworkData: artworkData.trim(),
        photoUrls: [],
      });
      
      console.log('Artwork saved successfully');
      setIsSaving(false);
      Alert.alert('Saved', 'Your artwork has been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to save artwork:', error);
      setIsSaving(false);
      Alert.alert('Error', 'Failed to save artwork. Please try again.');
    }
  };

  const saveButtonText = isSaving ? 'Saving...' : 'Save Artwork';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Creative Expression',
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: bgColor,
          },
          headerTintColor: colors.primary,
        }}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <IconSymbol 
            ios_icon_name="paintbrush.fill"
            android_material_icon_name="brush"
            size={48}
            color={colors.accent}
          />
          
          <Text style={[styles.title, { color: textColor }]}>
            Express Yourself
          </Text>
          
          <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
            Use words, descriptions, or notes to capture your creative expression of this week&apos;s theme
          </Text>
        </View>

        <View style={[styles.canvasCard, { backgroundColor: cardBg }]}>
          <Text style={[styles.canvasLabel, { color: textColor }]}>
            Your Creative Space
          </Text>
          
          <TextInput
            style={[styles.canvasInput, { 
              backgroundColor: inputBg,
              borderColor: inputBorder,
              color: textColor 
            }]}
            placeholder="Describe your artwork, write poetry, capture colors and feelings, or simply express what this week's theme means to you..."
            placeholderTextColor={textSecondaryColor}
            value={artworkData}
            onChangeText={setArtworkData}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={[styles.noteCard, { backgroundColor: cardBg }]}>
          <IconSymbol 
            ios_icon_name="lightbulb.fill"
            android_material_icon_name="lightbulb"
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            This is a space for creative expression. There are no rules. Let your heart guide you.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, (!artworkData.trim() || isSaving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!artworkData.trim() || isSaving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {saveButtonText}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  canvasCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  canvasLabel: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    marginBottom: spacing.md,
  },
  canvasInput: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    lineHeight: 24,
    borderWidth: 1,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 1,
  },
  noteText: {
    flex: 1,
    fontSize: typography.bodySmall,
    lineHeight: 20,
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
});
