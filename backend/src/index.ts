import { createApplication } from "@specific-dev/framework";
import * as appSchema from './db/schema.js';
import * as authSchema from './db/auth-schema.js';
import { registerCheckInRoutes } from './routes/check-in.js';
import { registerDailyGiftRoutes } from './routes/daily-gift.js';
import { registerCommunityRoutes } from './routes/community.js';
import { registerStreaksRoutes } from './routes/streaks.js';

const schema = { ...appSchema, ...authSchema };

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Enable authentication
app.withAuth();

// Register routes - IMPORTANT: Always use registration functions to avoid circular dependency issues
registerCheckInRoutes(app);
registerDailyGiftRoutes(app);
registerCommunityRoutes(app);
registerStreaksRoutes(app);

await app.run();
app.logger.info('Application running');
