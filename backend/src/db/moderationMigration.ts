import { sql } from 'drizzle-orm';

export async function runModerationMigration(db: any) {
  console.log('[Migration] Creating moderation tables...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "content_reports" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "post_id" text NOT NULL,
      "reporter_user_id" text NOT NULL,
      "reported_user_id" text NOT NULL,
      "reason" text NOT NULL,
      "note" text,
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "content_reports_post" ON "content_reports"("post_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "content_reports_reporter" ON "content_reports"("reporter_user_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "content_reports_reported" ON "content_reports"("reported_user_id")`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "user_blocks" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "blocker_user_id" text NOT NULL,
      "blocked_user_id" text NOT NULL,
      "post_id" text,
      "created_at" timestamp NOT NULL DEFAULT now(),
      UNIQUE("blocker_user_id", "blocked_user_id")
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "user_blocks_blocker" ON "user_blocks"("blocker_user_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "user_blocks_blocked" ON "user_blocks"("blocked_user_id")`);
  console.log('[Migration] Moderation tables ready');
}
