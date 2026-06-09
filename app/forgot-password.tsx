
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useTheme } from '@/contexts/ThemeContext';
import { BACKEND_URL } from '@/utils/api';

export default function ForgotPasswordScreen() {
  console.log('User viewing Forgot Password / magic-link screen');
  const router = useRouter();
  const { isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [didSucceed, setDidSucceed] = useState(false);

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const textSecondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const inputBg = isDark ? colors.cardDark : colors.card;
  const inputBorder = isDark ? colors.borderDark : colors.border;

  const handleBackToSignIn = () => {
    console.log('User tapped "Back to sign in" on forgot-password screen');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/auth');
    }
  };

  const handleSendLink = async () => {
    console.log('User tapped "Send Sign-In Link"', { email });
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
      console.log('[ForgotPassword] Requesting magic link for:', email.trim());
      const response = await fetch(`${BACKEND_URL}/api/auth/request-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      // Per spec: always show success regardless of status — never leak whether email exists
      console.log('[ForgotPassword] Magic link request response status:', response.status);
      setDidSucceed(true);
    } catch (err) {
      console.error('[ForgotPassword] Network error requesting magic link:', err);
      setErrorMessage('Something went wrong. Please check your email address and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendButtonText = isLoading ? 'Sending...' : 'Send Sign-In Link';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <IconSymbol
              ios_icon_name="envelope.fill"
              android_material_icon_name="mail"
              size={56}
              color={colors.primary}
            />
            <Text style={[styles.title, { color: textColor }]}>
              Reset Your Sign-In
            </Text>
            <Text style={[styles.subtitle, { color: textSecondaryColor }]}>
              Enter the email connected to your Linen account, and we'll send you a one-tap sign-in link.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg }]}>
            {didSucceed ? (
              <View style={styles.successCard}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check_circle"
                  size={40}
                  color={colors.success}
                />
                <Text style={[styles.successText, { color: textColor }]}>
                  If an account exists for that email, a sign-in link has been sent. Check your inbox — it expires in 15 minutes.
                </Text>
                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={handleBackToSignIn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.continueButtonText}>
                    Back to sign in
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
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
                      color: textColor,
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

                <TouchableOpacity
                  style={[styles.continueButton, (isLoading || didSucceed) && styles.continueButtonDisabled]}
                  onPress={handleSendLink}
                  disabled={isLoading || didSucceed}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.continueButtonText}>
                        {sendButtonText}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.continueButtonText}>
                      {sendButtonText}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backLink}
                  onPress={handleBackToSignIn}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.backLinkText, { color: textSecondaryColor }]}>
                    Back to sign in
                  </Text>
                </TouchableOpacity>
              </>
            )}
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
    fontFamily: 'Georgia',
  },
  subtitle: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 24,
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
  backLink: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: typography.bodySmall,
    fontWeight: typography.medium,
  },
  successCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  successText: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
});
