import pino from 'pino';

/**
 * Structured logging with Pino + File Logging
 *
 * Logs are written to:
 * - logs/app.log (all logs)
 * - logs/error.log (errors only)
 * - Console (development)
 *
 * Note: File rotation can be handled externally (e.g., logrotate, Docker, or Railway's built-in log retention)
 *
 * Usage:
 * logger.info('Tweet generated', { tweetId: '123', content: 'Hello world' });
 * logger.error('Failed to post', { error: err.message });
 * logger.debug('Debug info', { data: someData });
 */

// IMPORTANT: Check browser environment BEFORE accessing any Node.js APIs
// Using typeof window check that webpack can't eliminate, so we get a runtime check
const isBrowser = typeof window !== 'undefined';

// Create a simple browser-safe logger that doesn't use Node.js APIs
const createBrowserLogger = (): pino.Logger => {
  return pino({
    level: 'info',
    browser: {
      asObject: true,
      write: {
        // Send logs to console in browser
        info: (o: unknown) => console.info(o),
        error: (o: unknown) => console.error(o),
        warn: (o: unknown) => console.warn(o),
        debug: (o: unknown) => console.debug(o),
      },
    },
  });
};

// Create logger - use simple browser logger for all client-side code
// This ensures no Node.js APIs are bundled in client code
let pinoLogger: pino.Logger;

if (isBrowser) {
  pinoLogger = createBrowserLogger();
} else {
  // Server-side only: Load Node.js logger dynamically
  // Wrapped in try-catch because webpack aliases this to false in client builds
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createNodeLogger } = require('./logger.node');
    pinoLogger = createNodeLogger();
  } catch {
    // Fallback to browser logger if Node.js logger isn't available
    // This should only happen if something goes wrong with the build
    pinoLogger = createBrowserLogger();
  }
}

// Export the logger
export const logger = pinoLogger;

// Helper functions for common logging patterns
export const logJobStart = (jobName: string) => {
  logger.info({ job: jobName }, `🔄 Starting job: ${jobName}`);
};

export const logJobComplete = (jobName: string, duration?: number) => {
  logger.info({ job: jobName, duration }, `✅ Completed job: ${jobName}`);
};

export const logJobError = (jobName: string, error: unknown) => {
  logger.error(
    { job: jobName, error: error instanceof Error ? error.message : String(error) },
    `❌ Job failed: ${jobName}`
  );
};

export const logApiRequest = (method: string, path: string, statusCode: number) => {
  logger.info({ method, path, statusCode }, `${method} ${path} - ${statusCode}`);
};

export const logApiError = (method: string, path: string, error: unknown) => {
  logger.error(
    { method, path, error: error instanceof Error ? error.message : String(error) },
    `API error: ${method} ${path}`
  );
};
