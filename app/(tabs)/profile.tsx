
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Alert, Image, Modal, TextInput, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';

// Helper to resolve image sources
function resolveImageSource(source: string | number | undefined): { uri: string } | number {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as number;
}

interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  avatarType: 'photo' | 'icon' | 'default';
  avatarUrl: string | null;
  avatarIcon: string | null;
  presenceMode: 'quiet' | 'open' | 'observer' | 'sharing' | 'private';
  comfortReceivingReplies: boolean;
  comfortReadingMore: boolean;
  comfortSupportMessages: boolean;
  comfortNoTags: boolean;
  notificationsEnabled: boolean;
  reminderNotifications: boolean;
  checkInStreak: number;
  reflectionStreak: number;
  totalReflections: number;
  daysInCommunity: number;
  memberSince: string;
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  checkInStreak: number;
  reflectionStreak: number;
  totalReflections: number;
  daysInCommunity: number;
  memberSince: string;
  totalSharedPosts: number;
}

const AVATAR_ICONS = [
  { id: 'dove', label: 'Dove', description: 'Peace & Spirit' },
  { id: 'candle', label: 'Candle', description: 'Light & Hope' },
  { id: 'heart', label: 'Heart', description: 'Love & Compassion' },
  { id: 'cross', label: 'Cross', description: 'Faith & Grace' },
  { id: 'leaf', label: 'Leaf', description: 'Growth & Renewal' },
  { id: 'star', label: 'Star', description: 'Guidance & Wonder' },
];

const PRESENCE_MODES = [
  { id: 'quiet', icon: '🌱', label: 'Quiet presence', description: 'Observing gently' },
  { id: 'open', icon: '🤍', label: 'Ready to connect', description: 'Open to engage' },
  { id: 'observer', icon: '🕊️', label: 'Observer', description: 'Reading & reflecting' },
  { id: 'sharing', icon: '✨', label: 'Sharing gently', description: 'Offering reflections' },
  { id: 'private', icon: '🔒', label: 'Private', description: 'Personal practice' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Modal states
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showPresenceModal, setShowPresenceModal] = useState(false);
  const [showBoundariesModal, setShowBoundariesModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);
  
  // Form states
  const [tempDisplayName, setTempDisplayName] = useState('');
  const [tempPresenceMode, setTempPresenceMode] = useState<string>('open');
  const [tempBoundaries, setTempBoundaries] = useState({
    comfortReceivingReplies: true,
    comfortReadingMore: true,
    comfortSupportMessages: true,
    comfortNoTags: false,
  });
  const [tempNotifications, setTempNotifications] = useState({
    notificationsEnabled: true,
    reminderNotifications: true,
  });

  useEffect(() => {
    console.log('ProfileScreen: Loading profile data');
    loadProfile();
    loadStats();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      console.log('ProfileScreen: Fetching profile from API');
      // TODO: Backend Integration - GET /api/profile
      // const response = await authenticatedGet('/api/profile');
      // setProfile(response);
      
      // Mock data for now
      const mockProfile: UserProfile = {
        id: '1',
        userId: user?.id || 'guest-user',
        displayName: user?.name || null,
        avatarType: 'default',
        avatarUrl: null,
        avatarIcon: null,
        presenceMode: 'open',
        comfortReceivingReplies: true,
        comfortReadingMore: true,
        comfortSupportMessages: true,
        comfortNoTags: false,
        notificationsEnabled: true,
        reminderNotifications: true,
        checkInStreak: 0,
        reflectionStreak: 0,
        totalReflections: 0,
        daysInCommunity: 0,
        memberSince: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProfile(mockProfile);
    } catch (error) {
      console.error('ProfileScreen: Failed to load profile -', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      console.log('ProfileScreen: Fetching stats from API');
      // TODO: Backend Integration - GET /api/profile/stats
      // const response = await authenticatedGet('/api/profile/stats');
      // setStats(response);
      
      // Mock data for now
      const mockStats: UserStats = {
        checkInStreak: 3,
        reflectionStreak: 5,
        totalReflections: 12,
        daysInCommunity: 14,
        memberSince: new Date().toISOString(),
        totalSharedPosts: 4,
      };
      setStats(mockStats);
    } catch (error) {
      console.error('ProfileScreen: Failed to load stats -', error);
    }
  };

  const handleSignOut = () => {
    console.log('ProfileScreen: Sign out button pressed');
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            console.log('ProfileScreen: Signing out user');
            try {
              await signOut();
              console.log('ProfileScreen: Sign out successful');
            } catch (error) {
              console.error('ProfileScreen: Sign out failed -', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleUploadPhoto = async () => {
    console.log('ProfileScreen: Upload photo button pressed');
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos to upload a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSaving(true);
        console.log('ProfileScreen: Uploading photo to server');
        // TODO: Backend Integration - POST /api/profile/upload-avatar
        // const formData = new FormData();
        // formData.append('avatar', { uri: result.assets[0].uri, type: 'image/jpeg', name: 'avatar.jpg' });
        // const response = await authenticatedPost('/api/profile/upload-avatar', formData);
        // await updateProfile({ avatarType: 'photo', avatarUrl: response.url });
        
        // Mock update
        if (profile) {
          setProfile({
            ...profile,
            avatarType: 'photo',
            avatarUrl: result.assets[0].uri,
          });
        }
        setShowAvatarModal(false);
        setSaving(false);
      }
    } catch (error) {
      console.error('ProfileScreen: Photo upload failed -', error);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
      setSaving(false);
    }
  };

  const handleSelectIcon = async (iconId: string) => {
    console.log('ProfileScreen: Icon selected -', iconId);
    setSaving(true);
    try {
      // TODO: Backend Integration - PUT /api/profile
      // await authenticatedPut('/api/profile', { avatarType: 'icon', avatarIcon: iconId });
      
      if (profile) {
        setProfile({
          ...profile,
          avatarType: 'icon',
          avatarIcon: iconId,
        });
      }
      setShowAvatarModal(false);
    } catch (error) {
      console.error('ProfileScreen: Icon selection failed -', error);
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAvatar = async () => {
    console.log('ProfileScreen: Clear avatar button pressed');
    Alert.alert(
      'Clear Avatar',
      'Reset to default avatar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              // TODO: Backend Integration - DELETE /api/profile/avatar
              // await authenticatedDelete('/api/profile/avatar');
              
              if (profile) {
                setProfile({
                  ...profile,
                  avatarType: 'default',
                  avatarUrl: null,
                  avatarIcon: null,
                });
              }
              setShowAvatarModal(false);
            } catch (error) {
              console.error('ProfileScreen: Clear avatar failed -', error);
              Alert.alert('Error', 'Failed to clear avatar. Please try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveDisplayName = async () => {
    console.log('ProfileScreen: Saving display name -', tempDisplayName);
    setSaving(true);
    try {
      // TODO: Backend Integration - PUT /api/profile
      // await authenticatedPut('/api/profile', { displayName: tempDisplayName });
      
      if (profile) {
        setProfile({
          ...profile,
          displayName: tempDisplayName,
        });
      }
      setShowDisplayNameModal(false);
    } catch (error) {
      console.error('ProfileScreen: Save display name failed -', error);
      Alert.alert('Error', 'Failed to update display name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePresenceMode = async () => {
    console.log('ProfileScreen: Saving presence mode -', tempPresenceMode);
    setSaving(true);
    try {
      // TODO: Backend Integration - PUT /api/profile
      // await authenticatedPut('/api/profile', { presenceMode: tempPresenceMode });
      
      if (profile) {
        setProfile({
          ...profile,
          presenceMode: tempPresenceMode as any,
        });
      }
      setShowPresenceModal(false);
    } catch (error) {
      console.error('ProfileScreen: Save presence mode failed -', error);
      Alert.alert('Error', 'Failed to update presence mode. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBoundaries = async () => {
    console.log('ProfileScreen: Saving boundaries -', tempBoundaries);
    setSaving(true);
    try {
      // TODO: Backend Integration - PUT /api/profile
      // await authenticatedPut('/api/profile', tempBoundaries);
      
      if (profile) {
        setProfile({
          ...profile,
          ...tempBoundaries,
        });
      }
      setShowBoundariesModal(false);
    } catch (error) {
      console.error('ProfileScreen: Save boundaries failed -', error);
      Alert.alert('Error', 'Failed to update boundaries. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    console.log('ProfileScreen: Saving notifications -', tempNotifications);
    setSaving(true);
    try {
      // TODO: Backend Integration - PUT /api/profile
      // await authenticatedPut('/api/profile', tempNotifications);
      
      if (profile) {
        setProfile({
          ...profile,
          ...tempNotifications,
        });
      }
      setShowNotificationsModal(false);
    } catch (error) {
      console.error('ProfileScreen: Save notifications failed -', error);
      Alert.alert('Error', 'Failed to update notifications. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewSharedReflections = () => {
    console.log('ProfileScreen: Navigating to shared reflections');
    // TODO: Create a screen to show user's shared posts
    Alert.alert('Coming Soon', 'View your shared reflections in the community.');
  };

  const handleDeleteAccount = () => {
    console.log('ProfileScreen: Delete account button pressed');
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Coming Soon', 'Account deletion will be available soon.');
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${year}`;
  };

  const getAvatarDisplay = () => {
    if (!profile) return null;
    
    if (profile.avatarType === 'photo' && profile.avatarUrl) {
      return (
        <Image 
          source={resolveImageSource(profile.avatarUrl)} 
          style={styles.avatarImage}
        />
      );
    }
    
    if (profile.avatarType === 'icon' && profile.avatarIcon) {
      const iconData = AVATAR_ICONS.find(i => i.id === profile.avatarIcon);
      const iconLabel = iconData?.label || profile.avatarIcon;
      return (
        <Text style={[styles.avatarIconText, { color: colors.primary }]}>
          {iconLabel}
        </Text>
      );
    }
    
    return (
      <IconSymbol 
        ios_icon_name="person.fill" 
        android_material_icon_name="person" 
        size={40} 
        color={colors.primary} 
      />
    );
  };

  const getPresenceModeDisplay = () => {
    if (!profile) return null;
    const mode = PRESENCE_MODES.find(m => m.id === profile.presenceMode);
    return mode || PRESENCE_MODES[1];
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile?.displayName || user?.name || user?.email?.split('@')[0] || 'Friend';
  const userEmail = user?.email || '';
  const presenceMode = getPresenceModeDisplay();
  const memberSinceText = stats?.memberSince ? formatDate(stats.memberSince) : 'Recently';

  return (
    <SafeAreaView 
      style={[styles.safeArea, { backgroundColor: colors.background }]} 
      edges={['top']}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Profile
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textLight }]}>
            Everything is optional. Nothing is required to belong. The profile exists for care, not classification.
          </Text>
        </View>

        {/* Gentle Introduction */}
        <View style={[styles.introCard, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.introText, { color: colors.primary }]}>
            Everything here is optional. Nothing is required to belong.
          </Text>
          <Text style={[styles.introSubtext, { color: colors.primary }]}>
            This space exists for care, not classification. Share what feels right, when it feels right.
          </Text>
        </View>

        {/* Profile Card with Avatar */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={styles.profileHeader}
            onPress={() => {
              console.log('ProfileScreen: Avatar pressed');
              setShowAvatarModal(true);
            }}
          >
            <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
              {getAvatarDisplay()}
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {displayName}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                {userEmail}
              </Text>
              <TouchableOpacity onPress={() => {
                setTempDisplayName(profile?.displayName || '');
                setShowDisplayNameModal(true);
              }}>
                <Text style={[styles.editLink, { color: colors.primary }]}>
                  Edit display name (optional)
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        {/* Journey Stats */}
        {stats && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Your Journey
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              A gentle record of your time here
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {stats.checkInStreak}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Check-in Streak
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {stats.reflectionStreak}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Reflection Streak
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {stats.totalReflections}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Total Reflections
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {stats.daysInCommunity}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Days in Community
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Profile Preview */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Community Preview
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            How you might appear to others (if you choose to share)
          </Text>
          <View style={styles.previewContainer}>
            <View style={[styles.previewAvatar, { backgroundColor: colors.primaryLight }]}>
              {getAvatarDisplay()}
            </View>
            <View style={styles.previewInfo}>
              <Text style={[styles.previewName, { color: colors.text }]}>
                {displayName}
              </Text>
              <View style={styles.previewPresence}>
                <Text style={styles.previewPresenceIcon}>
                  {presenceMode?.icon}
                </Text>
                <Text style={[styles.previewPresenceText, { color: colors.textSecondary }]}>
                  {presenceMode?.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Presence Mode */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Presence & Boundaries (Optional)
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              setTempPresenceMode(profile?.presenceMode || 'open');
              setShowPresenceModal(true);
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.iconEmoji}>
                  {presenceMode?.icon}
                </Text>
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Presence Mode
                </Text>
                <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>
                  {presenceMode?.label}
                </Text>
              </View>
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
            onPress={() => {
              setTempBoundaries({
                comfortReceivingReplies: profile?.comfortReceivingReplies || true,
                comfortReadingMore: profile?.comfortReadingMore || true,
                comfortSupportMessages: profile?.comfortSupportMessages || true,
                comfortNoTags: profile?.comfortNoTags || false,
              });
              setShowBoundariesModal(true);
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <IconSymbol 
                  ios_icon_name="shield" 
                  android_material_icon_name="security" 
                  size={20} 
                  color={colors.primary} 
                />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Emotional Safety
                </Text>
                <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>
                  Set boundaries that honor your needs
                </Text>
              </View>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron-right" 
              size={20} 
              color={colors.textLight} 
            />
          </TouchableOpacity>
        </View>

        {/* Community */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Community
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleViewSharedReflections}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <IconSymbol 
                  ios_icon_name="doc.text" 
                  android_material_icon_name="description" 
                  size={20} 
                  color={colors.primary} 
                />
              </View>
              <View style={styles.menuItemTextContainer}>
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  My Shared Reflections
                </Text>
                <Text style={[styles.menuItemSubtext, { color: colors.textSecondary }]}>
                  {stats?.totalSharedPosts || 0} posts shared
                </Text>
              </View>
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
            onPress={() => {
              setTempNotifications({
                notificationsEnabled: profile?.notificationsEnabled || true,
                reminderNotifications: profile?.reminderNotifications || true,
              });
              setShowNotificationsModal(true);
            }}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
                <IconSymbol 
                  ios_icon_name="bell" 
                  android_material_icon_name="notifications" 
                  size={20} 
                  color={colors.primary} 
                />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>
                Notifications
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

        {/* Account */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Account
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.accountInfo}>
            <Text style={[styles.accountInfoLabel, { color: colors.textSecondary }]}>
              Email
            </Text>
            <Text style={[styles.accountInfoValue, { color: colors.text }]}>
              {userEmail}
            </Text>
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={styles.accountInfo}>
            <Text style={[styles.accountInfoLabel, { color: colors.textSecondary }]}>
              Member Since
            </Text>
            <Text style={[styles.accountInfoValue, { color: colors.text }]}>
              {memberSinceText}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

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

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleDeleteAccount}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                <IconSymbol 
                  ios_icon_name="trash" 
                  android_material_icon_name="delete" 
                  size={20} 
                  color={colors.error} 
                />
              </View>
              <Text style={[styles.menuItemText, { color: colors.error }]}>
                Delete Account
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

      {/* Avatar Selection Modal */}
      <Modal
        visible={showAvatarModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Choose Avatar (Optional)
              </Text>
              <TouchableOpacity onPress={() => setShowAvatarModal(false)}>
                <IconSymbol 
                  ios_icon_name="xmark" 
                  android_material_icon_name="close" 
                  size={24} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              Choose what feels right for you, or leave it as is
            </Text>

            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleUploadPhoto}
                disabled={saving}
              >
                <IconSymbol 
                  ios_icon_name="photo" 
                  android_material_icon_name="photo" 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.modalButtonText}>
                  Upload Photo
                </Text>
              </TouchableOpacity>

              <Text style={[styles.modalSectionTitle, { color: colors.textSecondary }]}>
                Or choose a symbol
              </Text>

              {AVATAR_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon.id}
                  style={styles.iconOption}
                  onPress={() => handleSelectIcon(icon.id)}
                  disabled={saving}
                >
                  <View style={styles.iconOptionLeft}>
                    <Text style={styles.iconOptionLabel}>
                      {icon.label}
                    </Text>
                    <Text style={[styles.iconOptionDescription, { color: colors.textSecondary }]}>
                      {icon.description}
                    </Text>
                  </View>
                  {profile?.avatarIcon === icon.id && (
                    <IconSymbol 
                      ios_icon_name="checkmark" 
                      android_material_icon_name="check" 
                      size={20} 
                      color={colors.primary} 
                    />
                  )}
                </TouchableOpacity>
              ))}

              {(profile?.avatarType === 'photo' || profile?.avatarType === 'icon') && (
                <TouchableOpacity 
                  style={[styles.modalButton, { backgroundColor: colors.error, marginTop: spacing.lg }]}
                  onPress={handleClearAvatar}
                  disabled={saving}
                >
                  <IconSymbol 
                    ios_icon_name="trash" 
                    android_material_icon_name="delete" 
                    size={20} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.modalButtonText}>
                    Clear Avatar
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Display Name Modal */}
      <Modal
        visible={showDisplayNameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDisplayNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Display Name
              </Text>
              <TouchableOpacity onPress={() => setShowDisplayNameModal(false)}>
                <IconSymbol 
                  ios_icon_name="xmark" 
                  android_material_icon_name="close" 
                  size={24} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              How would you like to be known? You can always change this or leave it blank.
            </Text>

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={tempDisplayName}
              onChangeText={setTempDisplayName}
              placeholder="Enter display name (optional)"
              placeholderTextColor={colors.textLight}
            />

            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveDisplayName}
              disabled={saving}
            >
              <Text style={styles.modalButtonText}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Presence Mode Modal */}
      <Modal
        visible={showPresenceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPresenceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Presence Mode
              </Text>
              <TouchableOpacity onPress={() => setShowPresenceModal(false)}>
                <IconSymbol 
                  ios_icon_name="xmark" 
                  android_material_icon_name="close" 
                  size={24} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              This is just for you. Choose what feels true today, or skip it entirely.
            </Text>

            <ScrollView style={styles.modalScroll}>
              {PRESENCE_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode.id}
                  style={styles.presenceOption}
                  onPress={() => setTempPresenceMode(mode.id)}
                >
                  <View style={styles.presenceOptionLeft}>
                    <Text style={styles.presenceOptionIcon}>
                      {mode.icon}
                    </Text>
                    <View style={styles.presenceOptionText}>
                      <Text style={[styles.presenceOptionLabel, { color: colors.text }]}>
                        {mode.label}
                      </Text>
                      <Text style={[styles.presenceOptionDescription, { color: colors.textSecondary }]}>
                        {mode.description}
                      </Text>
                    </View>
                  </View>
                  {tempPresenceMode === mode.id && (
                    <IconSymbol 
                      ios_icon_name="checkmark" 
                      android_material_icon_name="check" 
                      size={20} 
                      color={colors.primary} 
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleSavePresenceMode}
              disabled={saving}
            >
              <Text style={styles.modalButtonText}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Boundaries Modal */}
      <Modal
        visible={showBoundariesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBoundariesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Emotional Safety
              </Text>
              <TouchableOpacity onPress={() => setShowBoundariesModal(false)}>
                <IconSymbol 
                  ios_icon_name="xmark" 
                  android_material_icon_name="close" 
                  size={24} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              These are invitations, not requirements. Set what honors your needs.
            </Text>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.toggleItem}>
                <View style={styles.toggleItemLeft}>
                  <Text style={[styles.toggleItemLabel, { color: colors.text }]}>
                    I&apos;m okay receiving replies
                  </Text>
                </View>
                <Switch
                  value={tempBoundaries.comfortReceivingReplies}
                  onValueChange={(value) => setTempBoundaries({ ...tempBoundaries, comfortReceivingReplies: value })}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={tempBoundaries.comfortReceivingReplies ? colors.primary : colors.textLight}
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleItemLeft}>
                  <Text style={[styles.toggleItemLabel, { color: colors.text }]}>
                    I prefer reading more than posting
                  </Text>
                </View>
                <Switch
                  value={tempBoundaries.comfortReadingMore}
                  onValueChange={(value) => setTempBoundaries({ ...tempBoundaries, comfortReadingMore: value })}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={tempBoundaries.comfortReadingMore ? colors.primary : colors.textLight}
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleItemLeft}>
                  <Text style={[styles.toggleItemLabel, { color: colors.text }]}>
                    I&apos;m open to support messages
                  </Text>
                </View>
                <Switch
                  value={tempBoundaries.comfortSupportMessages}
                  onValueChange={(value) => setTempBoundaries({ ...tempBoundaries, comfortSupportMessages: value })}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={tempBoundaries.comfortSupportMessages ? colors.primary : colors.textLight}
                />
              </View>

              <View style={styles.toggleItem}>
                <View style={styles.toggleItemLeft}>
                  <Text style={[styles.toggleItemLabel, { color: colors.text }]}>
                    Please don&apos;t tag me in discussions
                  </Text>
                </View>
                <Switch
                  value={tempBoundaries.comfortNoTags}
                  onValueChange={(value) => setTempBoundaries({ ...tempBoundaries, comfortNoTags: value })}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={tempBoundaries.comfortNoTags ? colors.primary : colors.textLight}
                />
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveBoundaries}
              disabled={saving}
            >
              <Text style={styles.modalButtonText}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={showNotificationsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Notifications
              </Text>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                <IconSymbol 
                  ios_icon_name="xmark" 
                  android_material_icon_name="close" 
                  size={24} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              Choose what serves you. You can change these anytime.
            </Text>

            <View style={styles.toggleItem}>
              <View style={styles.toggleItemLeft}>
                <Text style={[styles.toggleItemLabel, { color: colors.text }]}>
                  Community Notifications
                </Text>
                <Text style={[styles.toggleItemDescription, { color: colors.textSecondary }]}>
                  Prayers and replies to your posts
                </Text>
              </View>
              <Switch
                value={tempNotifications.notificationsEnabled}
                onValueChange={(value) => setTempNotifications({ ...tempNotifications, notificationsEnabled: value })}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={tempNotifications.notificationsEnabled ? colors.primary : colors.textLight}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.toggleItem}>
              <View style={styles.toggleItemLeft}>
                <Text style={[styles.toggleItemLabel, { color: colors.text }]}>
                  Gentle Reminders
                </Text>
                <Text style={[styles.toggleItemDescription, { color: colors.textSecondary }]}>
                  Daily gift and check-in reminders
                </Text>
              </View>
              <Switch
                value={tempNotifications.reminderNotifications}
                onValueChange={(value) => setTempNotifications({ ...tempNotifications, reminderNotifications: value })}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={tempNotifications.reminderNotifications ? colors.primary : colors.textLight}
              />
            </View>

            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: colors.primary, marginTop: spacing.lg }]}
              onPress={handleSaveNotifications}
              disabled={saving}
            >
              <Text style={styles.modalButtonText}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.h1,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.caption,
    fontStyle: 'italic',
    lineHeight: 16,
    opacity: 0.6,
  },
  introCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  introText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
    lineHeight: 24,
  },
  introSubtext: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
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
  cardTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: typography.bodySmall,
    marginBottom: spacing.md,
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarIconText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
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
  editLink: {
    fontSize: typography.bodySmall,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
  },
  statValue: {
    fontSize: typography.h2,
    fontWeight: typography.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  previewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  previewName: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  previewPresence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  previewPresenceIcon: {
    fontSize: 14,
  },
  previewPresenceText: {
    fontSize: typography.bodySmall,
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
  iconEmoji: {
    fontSize: 20,
  },
  menuItemTextContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  menuItemText: {
    fontSize: typography.body,
    fontWeight: typography.regular,
  },
  menuItemSubtext: {
    fontSize: typography.bodySmall,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  accountInfo: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  accountInfoLabel: {
    fontSize: typography.bodySmall,
  },
  accountInfoValue: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  appInfo: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  appInfoText: {
    fontSize: typography.caption,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.h2,
    fontWeight: typography.semibold,
  },
  modalDescription: {
    fontSize: typography.body,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: typography.semibold,
  },
  modalSectionTitle: {
    fontSize: typography.bodySmall,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  iconOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  iconOptionLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  iconOptionLabel: {
    fontSize: typography.body,
    fontWeight: typography.medium,
    color: colors.text,
  },
  iconOptionDescription: {
    fontSize: typography.bodySmall,
  },
  presenceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  presenceOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  presenceOptionIcon: {
    fontSize: 24,
  },
  presenceOptionText: {
    flex: 1,
    gap: spacing.xs,
  },
  presenceOptionLabel: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  presenceOptionDescription: {
    fontSize: typography.bodySmall,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body,
    marginBottom: spacing.md,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  toggleItemLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  toggleItemLabel: {
    fontSize: typography.body,
    fontWeight: typography.medium,
  },
  toggleItemDescription: {
    fontSize: typography.bodySmall,
  },
});
