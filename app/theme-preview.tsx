
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { spacing, borderRadius, typography } from '@/styles/commonStyles';

interface ColorPalette {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    accent: string;
    accentLight: string;
    border: string;
    prayer: string;
  };
}

const LINEN_PALETTES: ColorPalette[] = [
  {
    id: 'classic-linen',
    name: 'Classic Linen',
    description: 'Warm creams with deep olive green - gentle and grounded',
    colors: {
      primary: '#6B7C59',
      primaryLight: '#D4E3C8',
      primaryDark: '#4A5A3A',
      background: '#F8F4E8',
      card: '#FFFEF9',
      text: '#3A3A32',
      textSecondary: '#6B6B5F',
      accent: '#D4A574',
      accentLight: '#E8C9A3',
      border: '#E8E4D8',
      prayer: '#8B7355',
    },
  },
  {
    id: 'warm-sand',
    name: 'Warm Sand',
    description: 'Soft beige tones with muted sage - peaceful and inviting',
    colors: {
      primary: '#7A8B6F',
      primaryLight: '#D9E3D0',
      primaryDark: '#5A6B4F',
      background: '#F5F0E8',
      card: '#FFFCF5',
      text: '#3A3530',
      textSecondary: '#6B6660',
      accent: '#C9A66B',
      accentLight: '#E0C89A',
      border: '#E8E0D5',
      prayer: '#9B8570',
    },
  },
  {
    id: 'natural-earth',
    name: 'Natural Earth',
    description: 'Rich earth tones with forest green - rooted and nurturing',
    colors: {
      primary: '#5A6B4F',
      primaryLight: '#CED9C3',
      primaryDark: '#3A4A2F',
      background: '#F2EDE3',
      card: '#FAF7F0',
      text: '#2C2A25',
      textSecondary: '#5A5850',
      accent: '#B89968',
      accentLight: '#D4B88F',
      border: '#E0D8CC',
      prayer: '#7A6B58',
    },
  },
  {
    id: 'soft-wheat',
    name: 'Soft Wheat',
    description: 'Golden wheat with pale olive - warm and comforting',
    colors: {
      primary: '#8B9B7A',
      primaryLight: '#E3EAD9',
      primaryDark: '#6B7B5A',
      background: '#FAF6ED',
      card: '#FFFEF8',
      text: '#3A3A30',
      textSecondary: '#6B6B60',
      accent: '#D9B574',
      accentLight: '#EDD0A0',
      border: '#EDE8DD',
      prayer: '#9B8B70',
    },
  },
  {
    id: 'gentle-moss',
    name: 'Gentle Moss',
    description: 'Soft moss green with cream - serene and restorative',
    colors: {
      primary: '#7A8F6F',
      primaryLight: '#D9E6D0',
      primaryDark: '#5A6F4F',
      background: '#F5F2E8',
      card: '#FDFBF5',
      text: '#353530',
      textSecondary: '#65655A',
      accent: '#C4A870',
      accentLight: '#DCC49A',
      border: '#E8E3D8',
      prayer: '#8B7B65',
    },
  },
  {
    id: 'honey-sage',
    name: 'Honey Sage',
    description: 'Honey gold with dusty sage - gentle and faith-rooted',
    colors: {
      primary: '#7B8B70',
      primaryLight: '#DCE6D5',
      primaryDark: '#5B6B50',
      background: '#F8F5EB',
      card: '#FFFDF7',
      text: '#3A3832',
      textSecondary: '#6A6860',
      accent: '#D4AD6B',
      accentLight: '#E8C895',
      border: '#EBE6DB',
      prayer: '#9B8868',
    },
  },
];

export default function ThemePreviewScreen() {
  const router = useRouter();
  const [selectedPalette, setSelectedPalette] = useState<string>('classic-linen');

  const currentPalette = LINEN_PALETTES.find(p => p.id === selectedPalette) || LINEN_PALETTES[0];

  const handleSelectPalette = (paletteId: string) => {
    console.log('User selected palette:', paletteId);
    setSelectedPalette(paletteId);
  };

  const handleApplyTheme = () => {
    console.log('Applying theme:', selectedPalette);
    // TODO: Implement theme application logic
    // This would update the app's color scheme globally
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentPalette.colors.background }]} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Choose Your Linen Theme',
          headerStyle: { backgroundColor: currentPalette.colors.background },
          headerTintColor: currentPalette.colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Current Preview */}
        <View style={[styles.previewSection, { backgroundColor: currentPalette.colors.card, borderColor: currentPalette.colors.border }]}>
          <Text style={[styles.previewTitle, { color: currentPalette.colors.text }]}>
            {currentPalette.name}
          </Text>
          <Text style={[styles.previewDescription, { color: currentPalette.colors.textSecondary }]}>
            {currentPalette.description}
          </Text>

          {/* Sample UI Elements */}
          <View style={styles.sampleElements}>
            {/* Sample Card */}
            <View style={[styles.sampleCard, { backgroundColor: currentPalette.colors.card, borderColor: currentPalette.colors.border }]}>
              <Text style={[styles.sampleCardTitle, { color: currentPalette.colors.text }]}>
                Daily Gift
              </Text>
              <Text style={[styles.sampleCardText, { color: currentPalette.colors.textSecondary }]}>
                A gentle space for reflection and prayer
              </Text>
            </View>

            {/* Sample Button */}
            <TouchableOpacity style={[styles.sampleButton, { backgroundColor: currentPalette.colors.primary }]}>
              <Text style={styles.sampleButtonText}>
                Continue
              </Text>
            </TouchableOpacity>

            {/* Sample Accent */}
            <View style={[styles.sampleAccent, { backgroundColor: currentPalette.colors.accent }]}>
              <Text style={[styles.sampleAccentText, { color: '#FFFFFF' }]}>
                Prayer Count: 12
              </Text>
            </View>
          </View>

          {/* Color Swatches */}
          <View style={styles.swatchContainer}>
            <View style={styles.swatchRow}>
              <View style={[styles.swatch, { backgroundColor: currentPalette.colors.primary }]} />
              <View style={[styles.swatch, { backgroundColor: currentPalette.colors.accent }]} />
              <View style={[styles.swatch, { backgroundColor: currentPalette.colors.background }]} />
              <View style={[styles.swatch, { backgroundColor: currentPalette.colors.card }]} />
            </View>
          </View>
        </View>

        {/* Palette Options */}
        <View style={styles.optionsSection}>
          <Text style={[styles.optionsTitle, { color: currentPalette.colors.text }]}>
            Choose Your Palette
          </Text>

          {LINEN_PALETTES.map((palette) => {
            const isSelected = palette.id === selectedPalette;
            
            return (
              <TouchableOpacity
                key={palette.id}
                style={[
                  styles.paletteOption,
                  { 
                    backgroundColor: palette.colors.card,
                    borderColor: isSelected ? palette.colors.primary : palette.colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  }
                ]}
                onPress={() => handleSelectPalette(palette.id)}
              >
                <View style={styles.paletteHeader}>
                  <View style={styles.paletteInfo}>
                    <Text style={[styles.paletteName, { color: palette.colors.text }]}>
                      {palette.name}
                    </Text>
                    <Text style={[styles.paletteDescription, { color: palette.colors.textSecondary }]}>
                      {palette.description}
                    </Text>
                  </View>
                  {isSelected && (
                    <IconSymbol
                      ios_icon_name="checkmark.circle.fill"
                      android_material_icon_name="check-circle"
                      size={24}
                      color={palette.colors.primary}
                    />
                  )}
                </View>

                {/* Mini Color Swatches */}
                <View style={styles.miniSwatchRow}>
                  <View style={[styles.miniSwatch, { backgroundColor: palette.colors.primary }]} />
                  <View style={[styles.miniSwatch, { backgroundColor: palette.colors.accent }]} />
                  <View style={[styles.miniSwatch, { backgroundColor: palette.colors.background }]} />
                  <View style={[styles.miniSwatch, { backgroundColor: palette.colors.prayer }]} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Apply Button */}
        <View style={styles.applySection}>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: currentPalette.colors.primary }]}
            onPress={handleApplyTheme}
          >
            <Text style={styles.applyButtonText}>
              Apply This Theme
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  previewSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
  },
  previewTitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
    marginBottom: spacing.sm,
  },
  previewDescription: {
    fontSize: typography.body,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  sampleElements: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  sampleCard: {
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
  },
  sampleCardTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
  },
  sampleCardText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  sampleButton: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  sampleButtonText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  sampleAccent: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  sampleAccentText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
  },
  swatchContainer: {
    marginTop: spacing.md,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  swatch: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
  },
  optionsSection: {
    marginBottom: spacing.xl,
  },
  optionsTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    marginBottom: spacing.lg,
  },
  paletteOption: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  paletteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  paletteInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  paletteName: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
  },
  paletteDescription: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
  },
  miniSwatchRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  miniSwatch: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
  },
  applySection: {
    marginTop: spacing.lg,
  },
  applyButton: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
});
