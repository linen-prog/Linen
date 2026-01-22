
import { IconSymbol } from '@/components/IconSymbol';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet } from '@/utils/api';
import { Stack, useRouter } from 'expo-router';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';

interface WeeklyRecap {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  isPremium: boolean;
  createdAt: string;
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  recapCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recapInfo: {
    flex: 1,
  },
  recapDate: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  recapMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  premiumBadgeText: {
    ...typography.caption,
    color: colors.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  recapTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chevron: {
    marginLeft: spacing.sm,
  },
});

export default function WeeklyRecapHistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recaps, setRecaps] = useState<WeeklyRecap[]>([]);

  useEffect(() => {
    loadRecapHistory();
  }, []);

  const loadRecapHistory = async () => {
    console.log('Loading recap history');
    try {
      setLoading(true);
      const response = await authenticatedGet('/api/weekly-recap/history');
      const data = await response.json();
      
      console.log('Recap history loaded:', data);
      setRecaps(data.recaps || []);
    } catch (error) {
      console.error('Error loading recap history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}–${endDay}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  };

  const handleRecapPress = (weekStartDate: string) => {
    console.log('Viewing recap for week:', weekStartDate);
    router.push(`/weekly-recap-detail?weekStartDate=${weekStartDate}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Recap History',
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (recaps.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Recap History',
            headerShown: true,
          }}
        />
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="clock"
            android_material_icon_name="history"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyText}>
            No past recaps yet. Your weekly recaps will appear here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Recap History',
          headerShown: true,
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {recaps.map((recap) => {
          const dateRangeDisplay = formatDateRange(recap.weekStartDate, recap.weekEndDate);
          const relativeTimeDisplay = formatRelativeTime(recap.createdAt);
          
          return (
            <TouchableOpacity
              key={recap.id}
              style={styles.recapCard}
              onPress={() => handleRecapPress(recap.weekStartDate)}
            >
              <View style={styles.recapInfo}>
                <Text style={styles.recapDate}>{dateRangeDisplay}</Text>
                <View style={styles.recapMeta}>
                  {recap.isPremium && (
                    <View style={styles.premiumBadge}>
                      <IconSymbol
                        ios_icon_name="star.fill"
                        android_material_icon_name="star"
                        size={12}
                        color={colors.primary}
                      />
                      <Text style={styles.premiumBadgeText}>Enhanced</Text>
                    </View>
                  )}
                  <Text style={styles.recapTime}>{relativeTimeDisplay}</Text>
                </View>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron-right"
                size={24}
                color={colors.textSecondary}
                style={styles.chevron}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
