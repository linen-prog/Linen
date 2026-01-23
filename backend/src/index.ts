import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerCheckInRoutes } from './routes/check-in.js';
import { registerDailyGiftRoutes } from './routes/daily-gift.js';
import { registerCommunityRoutes } from './routes/community.js';
import { registerStreaksRoutes } from './routes/streaks.js';
import { registerSomaticRoutes } from './routes/somatic.js';
import { registerWeeklyThemeRoutes } from './routes/weekly-theme.js';
import { registerArtworkRoutes } from './routes/artwork.js';
import { registerWeeklyPracticeRoutes } from './routes/weekly-practice.js';
import { registerWeeklyRecapRoutes } from './routes/weekly-recap.js';
import { initializeDatabase } from './db/initDatabase.js';

const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Initialize database tables on startup
try {
  await initializeDatabase(app.db);
} catch (error) {
  app.logger.error({ err: error }, 'Failed to initialize database');
  process.exit(1);
}

// Export App type for use in route files
export type App = typeof app;

// Enable authentication
app.withAuth();

// Enable storage for file uploads
app.withStorage();

// Register routes - IMPORTANT: Always use registration functions to avoid circular dependency issues
registerAuthRoutes(app);
registerCheckInRoutes(app);
registerDailyGiftRoutes(app);
registerCommunityRoutes(app);
registerStreaksRoutes(app);
registerSomaticRoutes(app);
registerWeeklyThemeRoutes(app);
registerArtworkRoutes(app);
registerWeeklyPracticeRoutes(app);
registerWeeklyRecapRoutes(app);

await app.run();
app.logger.info('Application running');
