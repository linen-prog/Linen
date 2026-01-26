import { sql } from 'drizzle-orm';
import { autoSeedThemesIfEmpty } from '../utils/seed-themes.js';
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
      ADD COLUMN IF NOT EXISTS "is_anonymous" boolean DEFAULT false
    `);

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
      ADD COLUMN IF NOT EXISTS "day_title" text,
      ADD COLUMN IF NOT EXISTS "somatic_prompt" text
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

    // Create indexes for user_profiles
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "user_profiles_user_id_unique" ON "user_profiles"("user_id")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "user_profiles_created" ON "user_profiles"("created_at")
    `);

    console.log('Database tables initialized successfully');

    // Auto-seed weekly themes if database is empty
    if (app) {
      await autoSeedThemesIfEmpty(app);
    }
  } catch (error) {
    console.error('Failed to initialize database tables:', error);
    throw error;
  }
}
