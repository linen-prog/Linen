import { sql } from 'drizzle-orm';
import type { App } from '../index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';

const REACTION_TYPES = ['praying', 'holding', 'light', 'amen', 'growing', 'peace'];

export async function autoSeedPostReactionsIfEmpty(db: any, app: App) {
  try {
    // Check if reactions table is already populated
    const existingReactions = await db.select().from(schema.postReactions).limit(1);

    if (existingReactions.length > 0) {
      console.log('Post reactions already seeded, skipping');
      return;
    }

    // Get first few existing posts
    const existingPosts = await db
      .select()
      .from(schema.communityPosts)
      .limit(5);

    if (existingPosts.length === 0) {
      console.log('No posts to seed reactions for');
      return;
    }

    console.log(`Seeding reactions for ${existingPosts.length} posts...`);

    // Seed reactions for existing posts
    for (let postIndex = 0; postIndex < existingPosts.length; postIndex++) {
      const post = existingPosts[postIndex];
      const reactionTypesToAdd = REACTION_TYPES.slice(0, (postIndex % 3) + 2); // Vary number of reaction types per post

      for (let i = 0; i < reactionTypesToAdd.length; i++) {
        const reactionType = reactionTypesToAdd[i];
        const seedUserId1 = `seed-user-${postIndex + 1}`;
        const seedUserId2 = `seed-user-${postIndex + 2}`;

        // Add reaction from first seed user
        await db.insert(schema.postReactions).values({
          postId: post.id,
          userId: seedUserId1,
          reactionType: reactionType as any,
        }).catch(() => {
          // Reaction might already exist due to unique constraint
        });

        // Add reaction from second seed user (only for some reactions)
        if (i % 2 === 0) {
          await db.insert(schema.postReactions).values({
            postId: post.id,
            userId: seedUserId2,
            reactionType: reactionType as any,
          }).catch(() => {
            // Reaction might already exist due to unique constraint
          });
        }
      }
    }

    console.log('Post reactions seeded successfully');
  } catch (error) {
    console.error('Failed to seed post reactions:', error);
    // Don't throw, let the app continue even if seeding fails
  }
}
