import {
  pgTable,
  text,
  timestamp,
  date,
  boolean,
  integer,
  uuid,
  uniqueIndex,
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
