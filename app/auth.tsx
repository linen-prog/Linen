
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, useColorScheme, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiPost } from '@/utils/api';
import { storeBearerToken, storeUserData } from '@/lib/auth';

export default function AuthScreen() {
  console.log('User viewing Auth screen');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const inputBg = isDark ? colors.cardDark : colors.card;
  const inputBorder = isDark ? colors.borderDark : colors.border;

  const handleContinue = async () => {
    console.log('User tapped Continue on auth screen', { email, firstName });
    setErrorMessage('');
    
    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address');
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
        
        // Store token in secure storage
        await storeBearerToken(authToken);
        
        // Store user data for persistence across hot reloads
        await storeUserData(response.user);

        console.log('User authenticated successfully:', response.user);
        console.log('Token and user data stored securely');
        console.log('Navigating to home screen...');
        
        router.replace('/(tabs)');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Auth failed:', error);
      const errorObj = error as any;
      const errorMessage = errorObj?.message || 'Unknown error';
      console.error('Error details:', errorMessage);
      
      let userMessage = 'We are having trouble connecting right now. Please try again in a moment.';
      
      if (errorMessage.includes('500') || errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        userMessage = 'The server is being set up. Please wait 30 seconds and try again.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else if (errorMessage.includes('timeout')) {
        userMessage = 'Connection timed out. Please try again.';
      }
      
      setErrorMessage(userMessage);
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
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <IconSymbol 
                  ios_icon_name="exclamationmark.triangle.fill"
                  android_material_icon_name="warning"
                  size={20}
                  color="#E74C3C"
                />
                <Text style={styles.errorText}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: typography.bodySmall,
    color: '#C62828',
    lineHeight: 18,
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
});
