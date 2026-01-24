import {
  pgTable,
  text,
  timestamp,
  date,
  boolean,
  integer,
  uuid,
  uniqueIndex,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// Check-in conversations table
export const checkInConversations = pgTable('check_in_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => {
    // Reference to user from auth-schema (imported at runtime)
    return { id: true } as any;
  }, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Check-in messages table
export const checkInMessages = pgTable('check_in_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => checkInConversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Conversation prayers table
export const conversationPrayers = pgTable('conversation_prayers', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => checkInConversations.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isSaid: boolean('is_said').default(false).notNull(),
  isShared: boolean('is_shared').default(false).notNull(),
  category: text('category', {
    enum: ['feed', 'wisdom', 'care', 'prayers'],
  }),
  sharedToCommunity: boolean('shared_to_community').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Daily gifts table
export const dailyGifts = pgTable(
  'daily_gifts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    date: date('date', { mode: 'string' }).notNull(),
    scriptureText: text('scripture_text').notNull(),
    scriptureReference: text('scripture_reference').notNull(),
    reflectionPrompt: text('reflection_prompt').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('daily_gifts_date_unique').on(table.date)]
);

// User reflections table
export const userReflections = pgTable('user_reflections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => {
    return { id: true } as any;
  }, { onDelete: 'cascade' }),
  dailyGiftId: uuid('daily_gift_id')
    .notNull()
    .references(() => dailyGifts.id, { onDelete: 'cascade' }),
  reflectionText: text('reflection_text').notNull(),
  shareToComm: boolean('share_to_comm').default(false).notNull(),
  category: text('category', {
    enum: ['feed', 'wisdom', 'care', 'prayers'],
  }),
  isAnonymous: boolean('is_anonymous').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Community posts table
export const communityPosts = pgTable('community_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => {
    return { id: true } as any;
  }, { onDelete: 'cascade' }),
  authorName: text('author_name'),
  isAnonymous: boolean('is_anonymous').default(false).notNull(),
  category: text('category', {
    enum: ['feed', 'wisdom', 'care', 'prayers'],
  }).notNull(),
  content: text('content').notNull(),
  prayerCount: integer('prayer_count').default(0).notNull(),
  contentType: text('content_type', {
    enum: ['companion', 'daily-gift', 'somatic', 'manual'],
  }).default('manual').notNull(),
  scriptureReference: text('scripture_reference'),
  isFlagged: boolean('is_flagged').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Community prayers table
export const communityPrayers = pgTable(
  'community_prayers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => communityPosts.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => {
      return { id: true } as any;
    }, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('community_prayers_post_user_unique').on(table.postId, table.userId),
  ]
);

// Somatic exercises table
export const somaticExercises = pgTable('somatic_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category', {
    enum: ['grounding', 'breath', 'movement', 'release'],
  }).notNull(),
  duration: text('duration').notNull(),
  instructions: text('instructions').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Somatic completions table
export const somaticCompletions = pgTable('somatic_completions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => {
    return { id: true } as any;
  }, { onDelete: 'cascade' }),
  exerciseId: uuid('exercise_id')
    .notNull()
    .references(() => somaticExercises.id, { onDelete: 'cascade' }),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
});

// Weekly themes table
export const weeklyThemes = pgTable(
  'weekly_themes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    weekStartDate: date('week_start_date', { mode: 'string' }).notNull(),
    liturgicalSeason: text('liturgical_season').notNull(),
    themeTitle: text('theme_title').notNull(),
    themeDescription: text('theme_description').notNull(),
    somaticExerciseId: uuid('somatic_exercise_id').references(() => somaticExercises.id, {
      onDelete: 'set null',
    }),
    featuredExerciseId: uuid('featured_exercise_id').references(() => somaticExercises.id, {
      onDelete: 'set null',
    }),
    reflectionPrompt: text('reflection_prompt'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('weekly_themes_date_unique').on(table.weekStartDate)]
);

// Daily content table
export const dailyContent = pgTable('daily_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  weeklyThemeId: uuid('weekly_theme_id')
    .notNull()
    .references(() => weeklyThemes.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(),
  dayTitle: text('day_title').notNull(),
  scriptureText: text('scripture_text').notNull(),
  scriptureReference: text('scripture_reference').notNull(),
  reflectionPrompt: text('reflection_prompt').notNull(),
  somaticPrompt: text('somatic_prompt'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User artworks table
export const userArtworks = pgTable('user_artworks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => {
    return { id: true } as any;
  }, { onDelete: 'cascade' }),
  weeklyThemeId: uuid('weekly_theme_id').references(() => weeklyThemes.id, { onDelete: 'cascade' }),
  artworkData: text('artwork_data').notNull(),
  photoUrls: text('photo_urls').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Flagged posts table (tracks which users have flagged which posts)
export const flaggedPosts = pgTable(
  'flagged_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => communityPosts.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => {
      return { id: true } as any;
    }, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('flagged_posts_user_post_unique').on(table.postId, table.userId)]
);

// Weekly recaps table
export const weeklyRecaps = pgTable(
  'weekly_recaps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().references(() => {
      return { id: true } as any;
    }, { onDelete: 'cascade' }),
    weekStartDate: date('week_start_date', { mode: 'string' }).notNull(),
    weekEndDate: date('week_end_date', { mode: 'string' }).notNull(),
    isPremium: boolean('is_premium').default(false).notNull(),
    scriptureSection: jsonb('scripture_section').$type<{
      reflections: string[];
      sharedReflections: string[];
    }>(),
    bodySection: jsonb('body_section').$type<{
      practices: string[];
      notes: string[];
    }>(),
    communitySection: jsonb('community_section').$type<{
      checkInSummary: string;
      sharedPosts: string[];
    }>(),
    promptingSection: jsonb('prompting_section').$type<{
      suggestions: string[];
    }>(),
    personalSynthesis: text('personal_synthesis'),
    practiceVisualization: jsonb('practice_visualization').$type<{
      weeklyData: Array<{ date: string; count: number }>;
    }>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    uniqueIndex('weekly_recaps_user_week_unique').on(table.userId, table.weekStartDate),
    index('weekly_recaps_user_created').on(table.userId, table.createdAt),
  ]
);

// Recap preferences table
export const recapPreferences = pgTable(
  'recap_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull().unique().references(() => {
      return { id: true } as any;
    }, { onDelete: 'cascade' }),
    deliveryDay: text('delivery_day', {
      enum: ['sunday', 'monday', 'disabled'],
    })
      .default('sunday')
      .notNull(),
    deliveryTime: text('delivery_time').default('18:00').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index('recap_preferences_delivery').on(table.deliveryDay, table.deliveryTime)]
);
