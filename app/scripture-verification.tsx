
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet } from '@/utils/api';

interface DailyGiftResponse {
  weeklyTheme: {
    id: string;
    weekStartDate: string;
    liturgicalSeason: string;
    themeTitle: string;
    themeDescription: string;
  };
  dailyContent: {
    id: string;
    dayOfWeek: number;
    dayTitle?: string;
    scriptureReference: string;
    scriptureText: string;
    reflectionQuestion: string;
    dayOfYear?: number;
  } | null;
}

export default function ScriptureVerificationScreen() {
  const router = useRouter();
  const [currentData, setCurrentData] = useState<DailyGiftResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchDayOfYear, setSearchDayOfYear] = useState('');

  useEffect(() => {
    loadCurrentData();
  }, []);

  const loadCurrentData = async () => {
    try {
      setIsLoading(true);
      const response = await authenticatedGet<DailyGiftResponse>('/api/weekly-theme/current');
      setCurrentData(response);
    } catch (error) {
      console.error('[ScriptureVerification] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDayOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getLiturgicalSeasonForDate = (date: Date): string => {
    const month = date.getMonth();
    const day = date.getDate();

    // Late January (after Epiphany on Jan 6)
    if (month === 0 && day > 19) {
      return 'Ordinary Time (Early)';
    }
    // February - Ordinary Time early
    if (month === 1) {
      return 'Ordinary Time (Early)';
    }
    // March - Lent
    if (month === 2) {
      return 'Lent';
    }
    // April - Easter
    if (month === 3) {
      return 'Easter';
    }
    // May - Ascension/Pentecost
    if (month === 4) {
      return 'Ascension/Pentecost';
    }
    // June-October - Ordinary Time
    if (month > 4 && month < 11) {
      return 'Ordinary Time (Mid)';
    }
    // November - Thanksgiving/Ordinary Time tail
    if (month === 10) {
      return 'Thanksgiving/Ordinary Time';
    }
    // December - Advent/Christmas
    if (month === 11) {
      if (day < 5) {
        return 'Thanksgiving/Ordinary Time';
      }
      if (day < 25) {
        return 'Advent';
      }
      return 'Christmas';
    }

    return 'Unknown';
  };

  const now = new Date();
  const todayDayOfYear = calculateDayOfYear(now);
  const todayLiturgicalSeason = getLiturgicalSeasonForDate(now);

  const bgColor = colors.background;
  const textColor = colors.text;
  const textSecondaryColor = colors.textSecondary;
  const cardBg = colors.card;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <Stack.Screen 
          options={{
            headerShown: false,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: textSecondaryColor }]}>
            Loading verification data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />

      <View style={[styles.header, { backgroundColor: bgColor }]}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <IconSymbol 
            ios_icon_name="arrow.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={textColor}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          Scripture Verification
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            📅 Current Date Information
          </Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
              Today's Date:
            </Text>
            <Text style={[styles.infoValue, { color: textColor }]}>
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
              Day of Year (Client):
            </Text>
            <Text style={[styles.infoValue, { color: textColor }]}>
              {todayDayOfYear} of 365
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
              Day of Year (Server):
            </Text>
            <Text style={[styles.infoValue, { color: textColor }]}>
              {currentData?.dailyContent?.dayOfYear !== undefined 
                ? `${currentData.dailyContent.dayOfYear} of 365` 
                : 'Not provided'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
              Match Status:
            </Text>
            <Text style={[
              styles.infoValue, 
              { 
                color: currentData?.dailyContent?.dayOfYear === todayDayOfYear 
                  ? colors.success 
                  : colors.error 
              }
            ]}>
              {currentData?.dailyContent?.dayOfYear === todayDayOfYear 
                ? '✓ Aligned' 
                : '✗ Mismatch'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
              Expected Liturgical Season:
            </Text>
            <Text style={[styles.infoValue, { color: textColor }]}>
              {todayLiturgicalSeason}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            📖 Current Weekly Theme
          </Text>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
              Liturgical Season:
            </Text>
            <Text style={[styles.infoValue, { color: textColor }]}>
              {currentData?.weeklyTheme.liturgicalSeason}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
              Week Start Date:
            </Text>
            <Text style={[styles.infoValue, { color: textColor }]}>
              {currentData?.weeklyTheme.weekStartDate}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
              Theme Title:
            </Text>
            <Text style={[styles.infoValue, { color: textColor }]}>
              {currentData?.weeklyTheme.themeTitle}
            </Text>
          </View>

          <View style={styles.infoColumn}>
            <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
              Theme Description:
            </Text>
            <Text style={[styles.infoValue, { color: textColor }]}>
              {currentData?.weeklyTheme.themeDescription}
            </Text>
          </View>
        </View>

        {currentData?.dailyContent && (
          <View style={[styles.section, { backgroundColor: cardBg }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              📜 Today's Scripture
            </Text>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
                Day of Week:
              </Text>
              <Text style={[styles.infoValue, { color: textColor }]}>
                {currentData.dailyContent.dayOfWeek} ({['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentData.dailyContent.dayOfWeek]})
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
                Day Title:
              </Text>
              <Text style={[styles.infoValue, { color: textColor }]}>
                {currentData.dailyContent.dayTitle || 'Not set'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
                Scripture Reference:
              </Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>
                {currentData.dailyContent.scriptureReference}
              </Text>
            </View>

            <View style={styles.infoColumn}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
                Scripture Text:
              </Text>
              <Text style={[styles.scriptureText, { color: textColor }]}>
                "{currentData.dailyContent.scriptureText}"
              </Text>
            </View>

            <View style={styles.infoColumn}>
              <Text style={[styles.infoLabel, { color: textSecondaryColor }]}>
                Reflection Question:
              </Text>
              <Text style={[styles.infoValue, { color: textColor }]}>
                {currentData.dailyContent.reflectionQuestion}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            🔍 Verification Notes
          </Text>
          
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            • The backend uses a 365-day scripture cycle (DAILY_SCRIPTURES_365 array)
          </Text>
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            • Day of Year is calculated in Pacific Time (America/Los_Angeles)
          </Text>
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            • Scriptures change daily at midnight Pacific Time
          </Text>
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            • Weekly themes follow a 52-week liturgical calendar
          </Text>
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            • Each week has 7 daily scriptures aligned with the theme
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            📊 Liturgical Calendar Mapping
          </Text>
          
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            <Text style={{ fontWeight: '600' }}>Advent (4 weeks):</Text> Late November - December
          </Text>
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            <Text style={{ fontWeight: '600' }}>Christmas (2 weeks):</Text> Late December - Early January
          </Text>
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            <Text style={{ fontWeight: '600' }}>Epiphany (2 weeks):</Text> Early January
          </Text>
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            <Text style={{ fontWeight: '600' }}>Ordinary Time Early (2 weeks):</Text> Late January - Early February
          </Text>
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            <Text style={{ fontWeight: '600' }}>Lent (6 weeks):</Text> February - March
          </Text>
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            <Text style={{ fontWeight: '600' }}>Holy Week (2 weeks):</Text> Late March - Early April
          </Text>
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            <Text style={{ fontWeight: '600' }}>Easter (6 weeks):</Text> April - May
          </Text>
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            <Text style={{ fontWeight: '600' }}>Ascension/Pentecost (2 weeks):</Text> May
          </Text>
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            <Text style={{ fontWeight: '600' }}>Ordinary Time Mid (22 weeks):</Text> June - October
          </Text>
          <Text style={[styles.noteText, { color: textSecondaryColor }]}>
            <Text style={{ fontWeight: '600' }}>Thanksgiving (7 weeks):</Text> November
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={loadCurrentData}
          activeOpacity={0.8}
        >
          <IconSymbol 
            ios_icon_name="arrow.clockwise"
            android_material_icon_name="refresh"
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.refreshButtonText}>
            Refresh Data
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerButton: {
    padding: spacing.xs,
    width: 40,
  },
  headerTitle: {
    fontSize: typography.h3,
    fontWeight: typography.semibold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.body,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: typography.h4,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoColumn: {
    gap: spacing.xs,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  scriptureText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  refreshButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
