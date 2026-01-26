
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    console.log('ProfileScreen (iOS): Loading user data');
    if (user) {
      const displayName = user.name || user.email?.split('@')[0] || 'Friend';
      setUserName(displayName);
      setUserEmail(user.email || '');
      console.log('ProfileScreen (iOS): User loaded -', displayName);
    }
  }, [user]);

  const handleSignOut = () => {
    console.log('ProfileScreen (iOS): Sign out button pressed');
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            console.log('ProfileScreen (iOS): Signing out user');
            try {
              await signOut();
              console.log('ProfileScreen (iOS): Sign out successful');
            } catch (error) {
              console.error('ProfileScreen (iOS): Sign out failed -', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleRecapSettings = () => {
    console.log('ProfileScreen (iOS): Navigating to recap settings');
    router.push('/recap-settings');
  };

  const handleRecapHistory = () => {
    console.log('ProfileScreen (iOS): Navigating to recap history');
    router.push('/weekly-recap-history');
  };

  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor: colors.background }]} 
      edges={['top']}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Profile
          </Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
              <IconSymbol 
                ios_icon_name="person.fill" 
                android_material_icon_name="person" 
                size={40} 
                color={colors.primary} 
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {userName}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                {userEmail}
              </Text>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Settings
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleRecapSettings}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <IconSymbol 
                  ios_icon_name="calendar" 
                  android_material_icon_name="calendar-today" 
                  size={20} 
                  color={colors.primary} 
                />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Weekly Recap Settings
              </Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron-right" 
              size={20} 
              color={colors.textLight} 
            />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleRecapHistory}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <IconSymbol 
                  ios_icon_name="clock" 
                  android_material_icon_name="history" 
                  size={20} 
                  color={colors.primary} 
                />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Recap History
              </Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron-right" 
              size={20} 
              color={colors.textLight} 
            />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Account
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleSignOut}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                <IconSymbol 
                  ios_icon_name="arrow.right.square" 
                  android_material_icon_name="logout" 
                  size={20} 
                  color={colors.error} 
                />
              </View>
              <Text style={[styles.menuItemText, { color: colors.error }]}>
                Sign Out
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.textLight }]}>
            Linen
          </Text>
          <Text style={[styles.appInfoText, { color: colors.textLight }]}>
            A gentle space for reflection, prayer, and embodied awareness
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.h1,
    fontWeight: typography.semibold,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  profileName: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
  },
  profileEmail: {
    fontSize: typography.body,
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  appInfo: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  appInfoText: {
    fontSize: typography.caption,
    textAlign: 'center',
  },
});
