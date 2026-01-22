import { createApplication, runMigrations } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerCheckInRoutes } from './routes/check-in.js';
import { registerDailyGiftRoutes } from './routes/daily-gift.js';
import { registerCommunityRoutes } from './routes/community.js';
import { registerStreaksRoutes } from './routes/streaks.js';
import { registerSomaticRoutes } from './routes/somatic.js';

const schema = { ...appSchema, ...authSchema };

// Run migrations first to ensure all tables exist
try {
  await runMigrations();
} catch (error) {
  console.error('Failed to run migrations:', error);
  process.exit(1);
}

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication
app.withAuth();

// Register routes - IMPORTANT: Always use registration functions to avoid circular dependency issues
registerAuthRoutes(app);
registerCheckInRoutes(app);
registerDailyGiftRoutes(app);
registerCommunityRoutes(app);
registerStreaksRoutes(app);
registerSomaticRoutes(app);

await app.run();
app.logger.info('Application running');
