
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

type DrawingTool = 'write' | 'create';

const TOOL_OPTIONS = [
  { id: 'write' as DrawingTool, label: 'Write', icon: 'edit', materialIcon: 'edit' },
  { id: 'create' as DrawingTool, label: 'Create', icon: 'paintbrush.fill', materialIcon: 'brush' },
];

export default function ArtworkCanvasScreen() {
  console.log('User viewing Artwork Canvas screen');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [selectedTool, setSelectedTool] = useState<DrawingTool>('write');
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
  const inputBg = isDark ? '#F5F5F0' : '#F5F5F0';
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
  const headerTitle = 'Your Reflection';
  const writeLabel = 'Write';
  const createLabel = 'Create';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <IconSymbol 
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow-back"
              size={24}
              color={textColor}
            />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: textColor }]}>
            {headerTitle}
          </Text>
          
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.canvasContainer, { backgroundColor: inputBg }]}>
          <TextInput
            style={[styles.canvasInput, { color: '#2C3E2C' }]}
            placeholder="Express yourself through words, poetry, or creative writing..."
            placeholderTextColor="#8B9D8B"
            value={artworkData}
            onChangeText={setArtworkData}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={[styles.toolBar, { backgroundColor: cardBg }]}>
          <TouchableOpacity 
            style={[
              styles.toolButton,
              selectedTool === 'write' && styles.toolButtonActive
            ]}
            onPress={() => setSelectedTool('write')}
            activeOpacity={0.7}
          >
            <View style={styles.toolButtonContent}>
              <IconSymbol 
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={20}
                color={selectedTool === 'write' ? '#FFFFFF' : textColor}
              />
              <Text style={[
                styles.toolButtonText,
                { color: selectedTool === 'write' ? '#FFFFFF' : textColor }
              ]}>
                {writeLabel}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.toolButton,
              selectedTool === 'create' && styles.toolButtonActive
            ]}
            onPress={() => setSelectedTool('create')}
            activeOpacity={0.7}
          >
            <View style={styles.toolButtonContent}>
              <IconSymbol 
                ios_icon_name="paintbrush.fill"
                android_material_icon_name="brush"
                size={20}
                color={selectedTool === 'create' ? '#FFFFFF' : textColor}
              />
              <Text style={[
                styles.toolButtonText,
                { color: selectedTool === 'create' ? '#FFFFFF' : textColor }
              ]}>
                {createLabel}
              </Text>
            </View>
          </TouchableOpacity>
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
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
  },
  headerSpacer: {
    width: 40,
  },
  canvasContainer: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  canvasInput: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 24,
    fontFamily: 'System',
  },
  toolBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.full,
    padding: spacing.xs,
    gap: spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  toolButton: {
    flex: 1,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  toolButtonActive: {
    backgroundColor: colors.primary,
  },
  toolButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  toolButtonText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
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
