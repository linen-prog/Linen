import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerDailyGiftRoutes } from './routes/daily-gift.js';
import { registerCheckInRoutes } from './routes/check-in.js';
import { registerCommunityRoutes } from './routes/community.js';
import { registerStreaksRoutes } from './routes/streaks.js';
import { registerSomaticRoutes } from './routes/somatic.js';
import { registerWeeklyThemeRoutes } from './routes/weekly-theme.js';
import { registerArtworkRoutes } from './routes/artwork.js';
import { registerWeeklyPracticeRoutes } from './routes/weekly-practice.js';
import { registerWeeklyRecapRoutes } from './routes/weekly-recap.js';
import { registerProfileRoutes } from './routes/profile.js';
import { registerAuthHealthRoutes } from './routes/auth-health.js';
import { initializeDatabase } from './db/initDatabase.js';

const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Initialize database tables on startup
try {
  await initializeDatabase(app.db, app);
} catch (error) {
  app.logger.error({ err: error }, 'Failed to initialize database');
  process.exit(1);
}

// Enable authentication
app.withAuth();

// Enable storage for file uploads
app.withStorage();

// Register routes - IMPORTANT: Always use registration functions to avoid circular dependency issues
// Register auth routes first since other routes may depend on authentication
registerAuthRoutes(app);
registerAuthHealthRoutes(app);
registerDailyGiftRoutes(app);
registerCheckInRoutes(app);
registerCommunityRoutes(app);
registerStreaksRoutes(app);
registerSomaticRoutes(app);
registerWeeklyThemeRoutes(app);
registerArtworkRoutes(app);
registerWeeklyPracticeRoutes(app);
registerWeeklyRecapRoutes(app);
registerProfileRoutes(app);

await app.run();
app.logger.info('Application running');
