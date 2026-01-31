
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, useColorScheme, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { storeUserData, storeBearerToken } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { BACKEND_URL } from '@/utils/api';

/**
 * AuthScreen - Simplified email-only authentication
 * 
 * This screen provides a gentle, non-intrusive sign-in/sign-up flow:
 * - Users enter their email address
 * - Optionally provide a first name (defaults to email prefix)
 * - Backend automatically creates account or signs in existing users
 * - No password required - uses email as identifier
 * 
 * Test Credentials:
 * - Email: test@linen.app (or any email)
 * - First Name: (optional)
 * 
 * The backend will auto-create the user on first sign-in.
 */
export default function AuthScreen() {
  console.log('User viewing Auth screen');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { setUserDirectly } = useAuth();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const inputBg = isDark ? colors.cardDark : colors.card;
  const inputBorder = isDark ? colors.borderDark : colors.border;

  const handleContinue = async () => {
    console.log('User tapped Continue on auth screen', { email, firstName });
    setErrorMessage('');
    setStatusMessage('');
    
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
    setStatusMessage('Connecting to Linen...');
    
    try {
      console.log('[Auth] Registering/signing in user with custom backend endpoint...');
      
      const trimmedEmail = email.trim();
      const displayName = firstName.trim() || email.split('@')[0];
      
      // Call the custom /api/auth/register endpoint
      // This endpoint auto-creates users or returns existing users with session
      setStatusMessage('Setting up your account...');
      
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          firstName: displayName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Auth] Registration failed:', errorData);
        throw new Error(errorData.error || `Registration failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Auth] Registration response:', data);

      if (!data.success || !data.user || !data.session?.token) {
        throw new Error('Invalid response from server - missing user or session data');
      }

      // Store the session token
      const sessionToken = data.session.token;
      await storeBearerToken(sessionToken);
      console.log('[Auth] Session token stored successfully');

      // Store user data for persistence
      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
      };
      await storeUserData(userData);
      console.log('[Auth] User data stored:', userData);

      // Update auth context directly
      setUserDirectly(userData);

      setStatusMessage('Welcome to Linen!');
      console.log('[Auth] Navigating to home screen...');
      
      // Small delay to ensure storage completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      router.replace('/(tabs)');
    } catch (error) {
      console.error('[Auth] Authentication failed:', error);
      const errorObj = error as any;
      const errorMessage = errorObj?.message || 'Unknown error';
      console.error('[Auth] Error details:', { errorMessage, fullError: errorObj });
      
      let userMessage = 'We are having trouble connecting right now. Please try again in a moment.';
      
      if (errorMessage.includes('500') || errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        userMessage = 'The server is being set up. Please wait 30 seconds and try again.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        userMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if (errorMessage.includes('timeout')) {
        userMessage = 'Connection timed out. Please try again.';
      } else if (errorMessage.includes('Invalid email')) {
        userMessage = 'Please enter a valid email address.';
      }
      
      setErrorMessage(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const continueButtonText = isLoading ? 'Connecting...' : 'Continue';

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
            {statusMessage && !errorMessage ? (
              <View style={styles.statusContainer}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={[styles.statusText, { color: textColor }]}>
                  {statusMessage}
                </Text>
              </View>
            ) : null}
            
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
                    {continueButtonText}
                  </Text>
                </View>
              ) : (
                <Text style={styles.continueButtonText}>
                  {continueButtonText}
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statusText: {
    flex: 1,
    fontSize: typography.bodySmall,
    lineHeight: 18,
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
