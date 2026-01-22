
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, useColorScheme, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiPost } from '@/utils/api';
import * as SecureStore from 'expo-secure-store';

export default function AuthScreen() {
  console.log('User viewing Auth screen');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const inputBg = isDark ? colors.cardDark : colors.card;
  const inputBorder = isDark ? colors.borderDark : colors.border;

  const handleContinue = async () => {
    console.log('User tapped Continue on auth screen', { email, firstName });
    
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Attempting to register/login user...');
      const response = await apiPost<{ 
        success: boolean;
        user: { id: string; email: string; name?: string };
        token?: string;
        isNewUser: boolean;
      }>(
        '/api/auth/register',
        { email: email.trim(), firstName: firstName.trim() || undefined }
      );

      console.log('Auth response received:', response);

      if (response.success && response.user) {
        const authToken = response.token || response.user.id;
        
        if (Platform.OS === 'web') {
          localStorage.setItem('linen_bearer_token', authToken);
        } else {
          await SecureStore.setItemAsync('linen_bearer_token', authToken);
        }

        console.log('User authenticated successfully:', response.user);
        console.log('Navigating to home screen...');
        
        router.replace('/(tabs)');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Auth failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      
      let userMessage = 'We&apos;re having trouble connecting right now. Please try again in a moment.';
      
      if (errorMessage.includes('500')) {
        userMessage = 'The server is being set up. Please wait a moment and try again.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userMessage = 'Unable to connect to the server. Please check your internet connection.';
      }
      
      Alert.alert(
        'Connection Issue', 
        userMessage
      );
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <IconSymbol 
              ios_icon_name="heart.fill"
              android_material_icon_name="favorite"
              size={56}
              color={colors.primary}
            />
            <Text style={[styles.title, { color: textColor }]}>
              Welcome to Linen
            </Text>
            <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
              Enter your email to begin your journey
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textColor }]}>
                Email
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: inputBg, 
                  borderColor: inputBorder,
                  color: textColor 
                }]}
                placeholder="your@email.com"
                placeholderTextColor={textSecondaryColor}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: textColor }]}>
                First Name
              </Text>
              <Text style={[styles.optional, { color: textSecondaryColor }]}>
                (optional)
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: inputBg, 
                  borderColor: inputBorder,
                  color: textColor 
                }]}
                placeholder="How should we greet you?"
                placeholderTextColor={textSecondaryColor}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity 
              style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.continueButtonText}>
                    Connecting...
                  </Text>
                </View>
              ) : (
                <Text style={styles.continueButtonText}>
                  Continue
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: textSecondaryColor }]}>
              No aggressive onboarding. No pressure. Just a gentle space for you to explore at your own pace.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: typography.semibold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body,
    textAlign: 'center',
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.body,
    fontWeight: typography.medium,
    marginBottom: spacing.xs,
  },
  optional: {
    fontSize: typography.bodySmall,
    marginBottom: spacing.xs,
  },
  input: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    borderWidth: 1,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  footerText: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
