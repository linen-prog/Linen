import { sql } from 'drizzle-orm';
import { autoSeedThemesIfEmpty } from '../utils/seed-themes.js';
import { autoSeedPostReactionsIfEmpty } from '../utils/seed-reactions.js';
import type { App } from '../index.js';

/**
 * Initialize database tables by running raw SQL
 * This ensures all required tables exist before the application starts
 */
export async function initializeDatabase(db: any, app?: App) {
  try {
    console.log('Initializing database tables...');

    // Check if tables exist and create them if they don't
    // We use raw SQL to ensure table creation with proper constraints

    // Better Auth tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" text PRIMARY KEY,
        "name" text NOT NULL,
        "email" text NOT NULL UNIQUE,
        "email_verified" boolean NOT NULL DEFAULT false,
        "image" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" text PRIMARY KEY,
        "expires_at" timestamp NOT NULL,
        "token" text NOT NULL UNIQUE,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        "ip_address" text,
        "user_agent" text,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "account" (
        "id" text PRIMARY KEY,
        "account_id" text NOT NULL,
        "provider_id" text NOT NULL,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "access_token" text,
        "refresh_token" text,
        "id_token" text,
        "access_token_expires_at" timestamp,
        "refresh_token_expires_at" timestamp,
        "scope" text,
        "password" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "verification" (
        "id" text PRIMARY KEY,
        "identifier" text NOT NULL,
        "value" text NOT NULL,
        "expires_at" timestamp NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // App tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "check_in_conversations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "check_in_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversation_id" uuid NOT NULL REFERENCES "check_in_conversations"("id") ON DELETE CASCADE,
        "role" text NOT NULL,
        "content" text NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "conversation_prayers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversation_id" uuid NOT NULL REFERENCES "check_in_conversations"("id") ON DELETE CASCADE,
        "content" text NOT NULL,
        "is_said" boolean NOT NULL DEFAULT false,
        "is_shared" boolean NOT NULL DEFAULT false,
        "category" text,
        "shared_to_community" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Add new columns to conversation_prayers if they don't exist
    await db.execute(sql`
      ALTER TABLE IF EXISTS "conversation_prayers"
      ADD COLUMN IF NOT EXISTS "category" text,
      ADD COLUMN IF NOT EXISTS "shared_to_community" boolean DEFAULT false
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "daily_gifts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "date" date NOT NULL UNIQUE,
        "scripture_text" text NOT NULL,
        "scripture_reference" text NOT NULL,
        "reflection_prompt" text NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_reflections" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "daily_gift_id" uuid NOT NULL REFERENCES "daily_gifts"("id") ON DELETE CASCADE,
        "reflection_text" text NOT NULL,
        "share_to_comm" boolean NOT NULL DEFAULT false,
        "category" text,
        "is_anonymous" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Add new columns to user_reflections if they don't exist
    await db.execute(sql`
      ALTER TABLE IF EXISTS "user_reflections"
      ADD COLUMN IF NOT EXISTS "category" text,
      ADD COLUMN IF NOT EXISTS "is_anonymous" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "moods" jsonb,
      ADD COLUMN IF NOT EXISTS "sensations" jsonb
    `);

    // Fix foreign key constraint to reference daily_content instead of daily_gifts
    try {
      await db.execute(sql`
        ALTER TABLE IF EXISTS "user_reflections"
        DROP CONSTRAINT IF EXISTS "user_reflections_daily_gift_id_fkey"
      `);
      console.log('Dropped old daily_gift_id foreign key constraint from user_reflections');
    } catch (error) {
      // Constraint might not exist, this is safe to ignore
      console.log('Could not drop daily_gift_id foreign key (may not exist):', error);
    }

    // Add new foreign key constraint to daily_content
    try {
      await db.execute(sql`
        ALTER TABLE IF EXISTS "user_reflections"
        ADD CONSTRAINT "user_reflections_daily_gift_id_fkey"
        FOREIGN KEY ("daily_gift_id") REFERENCES "daily_content"("id") ON DELETE CASCADE
      `);
      console.log('Added new daily_gift_id foreign key constraint referencing daily_content');
    } catch (error) {
      // Constraint might already exist, this is safe to ignore
      console.log('Could not add daily_gift_id foreign key (may already exist):', error);
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "community_posts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "author_name" text,
        "is_anonymous" boolean NOT NULL DEFAULT false,
        "category" text NOT NULL,
        "content" text NOT NULL,
        "prayer_count" integer NOT NULL DEFAULT 0,
        "content_type" text NOT NULL DEFAULT 'manual',
        "scripture_reference" text,
        "is_flagged" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Add columns to community_posts if they don't exist
    await db.execute(sql`
      ALTER TABLE IF EXISTS "community_posts"
      ADD COLUMN IF NOT EXISTS "content_type" text DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS "scripture_reference" text,
      ADD COLUMN IF NOT EXISTS "artwork_url" text,
      ADD COLUMN IF NOT EXISTS "is_flagged" boolean DEFAULT false
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "community_prayers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "post_id" uuid NOT NULL REFERENCES "community_posts"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "created_at" timestamp NOT NULL DEFAULT now(),
        UNIQUE("post_id", "user_id")
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "somatic_exercises" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" text NOT NULL,
        "description" text NOT NULL,
        "category" text NOT NULL,
        "duration" text NOT NULL,
        "instructions" text NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "somatic_completions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "exercise_id" uuid NOT NULL REFERENCES "somatic_exercises"("id") ON DELETE CASCADE,
        "completed_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "weekly_themes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "week_start_date" date NOT NULL UNIQUE,
        "liturgical_season" text NOT NULL,
        "theme_title" text NOT NULL,
        "theme_description" text NOT NULL,
        "somatic_exercise_id" uuid REFERENCES "somatic_exercises"("id") ON DELETE SET NULL,
        "featured_exercise_id" uuid REFERENCES "somatic_exercises"("id") ON DELETE SET NULL,
        "reflection_prompt" text,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "weekly_practice_completions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "exercise_id" uuid NOT NULL REFERENCES "somatic_exercises"("id") ON DELETE CASCADE,
        "weekly_theme_id" uuid NOT NULL REFERENCES "weekly_themes"("id") ON DELETE CASCADE,
        "reflection_notes" text,
        "completed_at" timestamp NOT NULL DEFAULT now(),
        UNIQUE("user_id", "weekly_theme_id")
      )
    `);

    // Add new columns to weekly_themes if they don't exist
    await db.execute(sql`
      ALTER TABLE IF EXISTS "weekly_themes"
      ADD COLUMN IF NOT EXISTS "featured_exercise_id" uuid REFERENCES "somatic_exercises"("id") ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS "reflection_prompt" text
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "daily_content" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "weekly_theme_id" uuid NOT NULL REFERENCES "weekly_themes"("id") ON DELETE CASCADE,
        "day_of_week" integer NOT NULL,
        "day_title" text NOT NULL,
        "scripture_text" text NOT NULL,
        "scripture_reference" text NOT NULL,
        "reflection_prompt" text NOT NULL,
        "somatic_prompt" text,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Add new columns to daily_content if they don't exist
    await db.execute(sql`
      ALTER TABLE IF EXISTS "daily_content"
      ADD COLUMN IF NOT EXISTS "day_of_year" integer,
      ADD COLUMN IF NOT EXISTS "day_title" text,
      ADD COLUMN IF NOT EXISTS "somatic_prompt" text
    `);

    // Add unique constraint on day_of_year if it doesn't exist
    try {
      await db.execute(sql`
        ALTER TABLE "daily_content"
        ADD CONSTRAINT "daily_content_day_of_year_unique" UNIQUE ("day_of_year")
      `);
    } catch (error) {
      // Constraint might already exist, this is safe to ignore
    }

    // Create index on day_of_year for faster queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "daily_content_day_of_year" ON "daily_content"("day_of_year")
    `);

    // Alter user_artworks table to ensure weekly_theme_id is nullable
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_artworks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "weekly_theme_id" uuid REFERENCES "weekly_themes"("id") ON DELETE SET NULL,
        "artwork_data" text NOT NULL,
        "photo_urls" text[],
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Ensure weekly_theme_id column is nullable (fix for existing tables)
    try {
      await db.execute(sql`
        ALTER TABLE "user_artworks"
        ALTER COLUMN "weekly_theme_id" DROP NOT NULL
      `);
    } catch (error) {
      // Column might already be nullable, this is safe to ignore
    }

    // Update foreign key constraint to use SET NULL instead of CASCADE
    try {
      await db.execute(sql`
        ALTER TABLE "user_artworks"
        DROP CONSTRAINT IF EXISTS "user_artworks_weekly_theme_id_weekly_themes_id_fk",
        ADD CONSTRAINT "user_artworks_weekly_theme_id_weekly_themes_id_fk"
        FOREIGN KEY ("weekly_theme_id") REFERENCES "weekly_themes"("id") ON DELETE SET NULL
      `);
    } catch (error) {
      // Constraint might not exist or already be correct, this is safe to ignore
    }

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "flagged_posts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "post_id" uuid NOT NULL REFERENCES "community_posts"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "created_at" timestamp NOT NULL DEFAULT now(),
        UNIQUE("post_id", "user_id")
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "weekly_recaps" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "week_start_date" date NOT NULL,
        "week_end_date" date NOT NULL,
        "is_premium" boolean NOT NULL DEFAULT false,
        "scripture_section" jsonb,
        "body_section" jsonb,
        "community_section" jsonb,
        "prompting_section" jsonb,
        "personal_synthesis" text,
        "practice_visualization" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        UNIQUE("user_id", "week_start_date")
      )
    `);

    // Create index for weekly_recaps queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "weekly_recaps_user_created" ON "weekly_recaps"("user_id", "created_at")
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "recap_preferences" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
        "delivery_day" text NOT NULL DEFAULT 'sunday',
        "delivery_time" text NOT NULL DEFAULT '18:00',
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Create index for recap_preferences delivery queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "recap_preferences_delivery" ON "recap_preferences"("delivery_day", "delivery_time")
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
        "display_name" text,
        "avatar_type" text NOT NULL DEFAULT 'default',
        "avatar_url" text,
        "avatar_icon" text,
        "presence_mode" text NOT NULL DEFAULT 'open',
        "comfort_receiving_replies" boolean NOT NULL DEFAULT true,
        "comfort_reading_more" boolean NOT NULL DEFAULT true,
        "comfort_support_messages" boolean NOT NULL DEFAULT true,
        "comfort_no_tags" boolean NOT NULL DEFAULT false,
        "notifications_enabled" boolean NOT NULL DEFAULT true,
        "reminder_notifications" boolean NOT NULL DEFAULT true,
        "check_in_streak" integer NOT NULL DEFAULT 0,
        "reflection_streak" integer NOT NULL DEFAULT 0,
        "total_reflections" integer NOT NULL DEFAULT 0,
        "days_in_community" integer NOT NULL DEFAULT 0,
        "member_since" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    // Add columns to user_profiles if they don't exist
    await db.execute(sql`
      ALTER TABLE IF EXISTS "user_profiles"
      ADD COLUMN IF NOT EXISTS "companion_name" text
    `);

    await db.execute(sql`
      ALTER TABLE IF EXISTS "user_profiles"
      ADD COLUMN IF NOT EXISTS "companion_tone" text DEFAULT 'warm' NOT NULL
    `);

    await db.execute(sql`
      ALTER TABLE IF EXISTS "user_profiles"
      ADD COLUMN IF NOT EXISTS "companion_directness" text DEFAULT 'gentle' NOT NULL
    `);

    await db.execute(sql`
      ALTER TABLE IF EXISTS "user_profiles"
      ADD COLUMN IF NOT EXISTS "companion_spiritual_integration" text DEFAULT 'moderate' NOT NULL
    `);

    await db.execute(sql`
      ALTER TABLE IF EXISTS "user_profiles"
      ADD COLUMN IF NOT EXISTS "companion_response_length" text DEFAULT 'medium' NOT NULL
    `);

    await db.execute(sql`
      ALTER TABLE IF EXISTS "user_profiles"
      ADD COLUMN IF NOT EXISTS "companion_custom_preferences" text DEFAULT '' NOT NULL
    `);

    await db.execute(sql`
      ALTER TABLE IF EXISTS "user_profiles"
      ADD COLUMN IF NOT EXISTS "preferences_set" boolean DEFAULT false NOT NULL
    `);

    // Create indexes for user_profiles
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "user_profiles_user_id_unique" ON "user_profiles"("user_id")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "user_profiles_created" ON "user_profiles"("created_at")
    `);

    // Post reactions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "post_reactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "post_id" uuid NOT NULL REFERENCES "community_posts"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "reaction_type" text NOT NULL CHECK ("reaction_type" IN ('praying', 'holding', 'light', 'amen', 'growing', 'peace')),
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "post_reactions_post_user_type_unique" ON "post_reactions"("post_id", "user_id", "reaction_type")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "post_reactions_post" ON "post_reactions"("post_id")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "post_reactions_user" ON "post_reactions"("user_id")
    `);

    // Care messages table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "care_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "post_id" uuid NOT NULL REFERENCES "community_posts"("id") ON DELETE CASCADE,
        "sender_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "recipient_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "message" text NOT NULL,
        "is_anonymous" boolean NOT NULL DEFAULT false,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "care_messages_post" ON "care_messages"("post_id")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "care_messages_sender" ON "care_messages"("sender_id")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "care_messages_recipient" ON "care_messages"("recipient_id")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "care_messages_created" ON "care_messages"("created_at")
    `);

    // Player notifications table (for encouragement messages)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "player_notifications" (
        "id" SERIAL PRIMARY KEY,
        "journal_entry_id" TEXT DEFAULT NULL,
        "recipient_user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "is_read" BOOLEAN DEFAULT FALSE,
        "encouragement_message" TEXT DEFAULT NULL,
        "sender_user_id" TEXT DEFAULT NULL REFERENCES "user"("id") ON DELETE SET NULL,
        "sender_name" TEXT DEFAULT NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add sender_name column if it doesn't exist (migration for existing databases)
    await db.execute(sql`
      ALTER TABLE "player_notifications" ADD COLUMN IF NOT EXISTS "sender_name" TEXT DEFAULT NULL
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "player_notifications_recipient" ON "player_notifications"("recipient_user_id")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "player_notifications_entry" ON "player_notifications"("journal_entry_id")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "player_notifications_created" ON "player_notifications"("created_at")
    `);

    // Monthly recap cache table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "monthly_recap_cache" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "year" integer NOT NULL,
        "month" integer NOT NULL,
        "conversation_summary" text,
        "suggestions" jsonb,
        "growth_highlight" text,
        "created_at" timestamp DEFAULT NOW(),
        UNIQUE("user_id", "year", "month")
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "monthly_recap_cache_user" ON "monthly_recap_cache"("user_id")
    `);

    // Notifications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "type" text NOT NULL CHECK ("type" IN ('reaction', 'feedback', 'care_message', 'encouragement')),
        "message" text NOT NULL,
        "read" boolean NOT NULL DEFAULT false,
        "post_id" text,
        "created_at" timestamp NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "notifications_user" ON "notifications"("user_id")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "notifications_user_read" ON "notifications"("user_id", "read")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "notifications_created" ON "notifications"("created_at")
    `);

    console.log('Database tables initialized successfully');

    // Data migrations: Update reflection prompts with softer, gentler language
    try {
      app?.logger.info({}, 'Starting reflection prompt data migrations');

      // 1. Update daily_content table by day_of_week
      await db.execute(sql`
        UPDATE daily_content SET reflection_prompt = 'What feels alive in you as this new week begins?' WHERE day_of_week = 0
      `);
      await db.execute(sql`
        UPDATE daily_content SET reflection_prompt = 'What are you noticing in yourself today?' WHERE day_of_week = 1
      `);
      await db.execute(sql`
        UPDATE daily_content SET reflection_prompt = 'Where does this scripture land in your heart right now?' WHERE day_of_week = 2
      `);
      await db.execute(sql`
        UPDATE daily_content SET reflection_prompt = 'What resonates with you about these words?' WHERE day_of_week = 3
      `);
      await db.execute(sql`
        UPDATE daily_content SET reflection_prompt = 'What might you be gently releasing today?' WHERE day_of_week = 4
      `);
      await db.execute(sql`
        UPDATE daily_content SET reflection_prompt = 'What stirs in you as you sit with this?' WHERE day_of_week = 5
      `);
      await db.execute(sql`
        UPDATE daily_content SET reflection_prompt = 'Where do you find yourself in this passage?' WHERE day_of_week = 6
      `);

      app?.logger.info({}, 'Updated daily_content reflection prompts');

      // 2. Update daily_gifts table using day of week from date
      await db.execute(sql`
        UPDATE daily_gifts SET reflection_prompt = CASE
          WHEN EXTRACT(DOW FROM date::date) = 0 THEN 'What feels alive in you as this new week begins?'
          WHEN EXTRACT(DOW FROM date::date) = 1 THEN 'What are you noticing in yourself today?'
          WHEN EXTRACT(DOW FROM date::date) = 2 THEN 'Where does this scripture land in your heart right now?'
          WHEN EXTRACT(DOW FROM date::date) = 3 THEN 'What resonates with you about these words?'
          WHEN EXTRACT(DOW FROM date::date) = 4 THEN 'What might you be gently releasing today?'
          WHEN EXTRACT(DOW FROM date::date) = 5 THEN 'What stirs in you as you sit with this?'
          WHEN EXTRACT(DOW FROM date::date) = 6 THEN 'Where do you find yourself in this passage?'
          ELSE 'What are you noticing in yourself today?'
        END
      `);

      app?.logger.info({}, 'Updated daily_gifts reflection prompts');

      // 3. Update weekly_themes table using rotating cycle
      await db.execute(sql`
        UPDATE weekly_themes wt
        SET reflection_prompt = sub.new_prompt
        FROM (
          SELECT id,
            CASE MOD(ROW_NUMBER() OVER (ORDER BY week_start_date)::integer, 3)
              WHEN 1 THEN 'What theme feels most present in your life this week?'
              WHEN 2 THEN 'Where are you being invited to rest or release?'
              ELSE 'What is quietly asking for your attention this week?'
            END AS new_prompt
          FROM weekly_themes
        ) sub
        WHERE wt.id = sub.id
      `);

      app?.logger.info({}, 'Updated weekly_themes reflection prompts');
      app?.logger.info({}, 'Reflection prompt data migrations completed successfully');
    } catch (error) {
      app?.logger.warn({ err: error }, 'Data migrations failed or not applicable');
      // Don't throw - migrations may fail if tables are empty
    }

    // Auto-seed weekly themes if database is empty
    if (app) {
      await autoSeedThemesIfEmpty(app);
      // Auto-seed reactions for existing posts
      await autoSeedPostReactionsIfEmpty(db, app);
    }

    // Seed test community post with artwork_url
    try {
      const seedUserId = 'seed-user-001';
      const seedTimestamp = new Date().toISOString();

      // Use raw SQL to insert with ON CONFLICT DO NOTHING
      await db.execute(sql`
        INSERT INTO "community_posts" (
          "id",
          "user_id",
          "author_name",
          "is_anonymous",
          "category",
          "content",
          "prayer_count",
          "content_type",
          "scripture_reference",
          "is_flagged",
          "created_at",
          "artwork_url"
        ) VALUES (
          gen_random_uuid(),
          ${seedUserId},
          'Seed User',
          false,
          'reflection',
          'This is a seed post to verify artwork_url storage.',
          0,
          'artwork',
          NULL,
          false,
          ${seedTimestamp},
          'https://picsum.photos/seed/linen-artwork/800/600'
        )
        ON CONFLICT DO NOTHING
      `);

      app?.logger.info({}, 'Seed community post inserted');

      // Query and log results to confirm
      const results = await db.execute(sql`
        SELECT id, user_id, artwork_url FROM community_posts WHERE artwork_url IS NOT NULL LIMIT 5
      `);

      app?.logger.info({ results }, 'Community posts with artwork_url');
    } catch (error) {
      app?.logger.warn({ err: error }, 'Failed to seed community post data');
      // Don't throw - this is optional seed data
    }

    // Seed test notifications if table is empty
    try {
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM "notifications"
      `);

      const notificationCount = (countResult as any).rows?.[0]?.count || 0;

      if (notificationCount === 0) {
        // Get the first user
        const userResult = await db.execute(sql`
          SELECT id FROM "user" LIMIT 1
        `);

        const userId = (userResult as any).rows?.[0]?.id;

        if (userId) {
          const now = new Date();
          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
          const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

          await db.execute(sql`
            INSERT INTO "notifications" (id, user_id, type, message, read, post_id, created_at)
            VALUES
              (gen_random_uuid(), ${userId}, 'encouragement', 'Someone is praying for you today 🙏', false, NULL, ${oneHourAgo}),
              (gen_random_uuid(), ${userId}, 'reaction', 'Your reflection received a ❤️ reaction', false, NULL, ${threeHoursAgo}),
              (gen_random_uuid(), ${userId}, 'care_message', 'A community member sent you a care message', true, NULL, ${oneDayAgo}),
              (gen_random_uuid(), ${userId}, 'feedback', 'Your shared prayer touched someone deeply', true, NULL, ${twoDaysAgo})
          `);

          app?.logger.info({ userId }, 'Seed notifications inserted');
        }
      }
    } catch (error) {
      app?.logger.warn({ err: error }, 'Failed to seed notifications');
      // Don't throw - this is optional seed data
    }
  } catch (error) {
    console.error('Failed to initialize database tables:', error);
    throw error;
  }
}
