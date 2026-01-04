/**
 * AI API Key Resolution
 * Priority: User keys > Platform keys (with rate limiting)
 *
 * This module handles resolving which API key to use for AI requests.
 * Users can provide their own keys for unlimited usage, or use platform keys with rate limits.
 */

import { db } from '@/lib/db';
import { userAiKeysTable, platformAiUsageTable } from '@/lib/schema';
import { eq, and, gte } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';

export type AIProvider = 'openai' | 'anthropic' | 'zai';

// Platform key rate limits (per user per hour)
const PLATFORM_LIMITS: Record<AIProvider, number> = {
  openai: 50,      // 50 requests per hour with platform key
  anthropic: 50,
  zai: 50,
};

export interface KeyResolution {
  key: string;
  source: 'user' | 'platform';
  limited: boolean;
}

/**
 * Get AI API key for a user
 * 1. Check if user has their own key for this provider
 * 2. If not, use platform key (with rate limiting)
 */
export async function resolveAIKey(
  userId: string,
  provider: AIProvider
): Promise<KeyResolution> {
  // Try to get user's own key first
  const userKeys = await db
    .select()
    .from(userAiKeysTable)
    .where(
      and(
        eq(userAiKeysTable.userId, userId),
        eq(userAiKeysTable.provider, provider),
        eq(userAiKeysTable.isActive, 1)
      )
    )
    .limit(1);

  if (userKeys.length > 0) {
    const decryptedKey = decrypt(userKeys[0].encryptedKey);

    // Update usage stats
    await db
      .update(userAiKeysTable)
      .set({
        lastUsed: new Date(),
        usageCount: userKeys[0].usageCount + 1,
      })
      .where(eq(userAiKeysTable.id, userKeys[0].id));

    logger.info({ userId, provider, source: 'user' }, 'Using user AI key');

    return {
      key: decryptedKey,
      source: 'user',
      limited: false, // No limits on user's own keys
    };
  }

  // Fall back to platform key with rate limiting
  const platformKey = getPlatformKey(provider);
  if (!platformKey) {
    throw new Error(`No ${provider} API key available. Please add your own key in Settings.`);
  }

  // Check rate limit
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const usage = await db
    .select()
    .from(platformAiUsageTable)
    .where(
      and(
        eq(platformAiUsageTable.userId, userId),
        eq(platformAiUsageTable.provider, provider),
        gte(platformAiUsageTable.createdAt, hourAgo)
      )
    );

  const totalRequests = usage.reduce((sum, u) => sum + u.requestCount, 0);
  const limit = PLATFORM_LIMITS[provider];

  if (totalRequests >= limit) {
    throw new Error(
      `Platform ${provider} rate limit exceeded (${limit} requests/hour). Add your own API key in Settings for unlimited usage.`
    );
  }

  // Track usage
  await db.insert(platformAiUsageTable).values({
    userId,
    provider,
    model: 'unknown', // Will be updated by caller
    tokensUsed: 0,    // Will be updated by caller
    requestCount: 1,
  });

  logger.info(
    { userId, provider, source: 'platform', usage: totalRequests + 1, limit },
    'Using platform AI key'
  );

  return {
    key: platformKey,
    source: 'platform',
    limited: true,
  };
}

/**
 * Get platform API key from environment variables
 */
function getPlatformKey(provider: AIProvider): string | null {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || null;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || null;
    case 'zai':
      return process.env.ZAI_API_KEY || null;
    default:
      return null;
  }
}

/**
 * Update token usage for a platform key request
 * Should be called after AI completion to track actual usage
 */
export async function updateTokenUsage(
  userId: string,
  provider: AIProvider,
  model: string,
  tokensUsed: number
): Promise<void> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Update the most recent usage record
    const recentUsage = await db
      .select()
      .from(platformAiUsageTable)
      .where(
        and(
          eq(platformAiUsageTable.userId, userId),
          eq(platformAiUsageTable.provider, provider),
          gte(platformAiUsageTable.createdAt, fiveMinutesAgo)
        )
      )
      .limit(1);

    if (recentUsage.length > 0) {
      await db
        .update(platformAiUsageTable)
        .set({
          model,
          tokensUsed,
        })
        .where(eq(platformAiUsageTable.id, recentUsage[0].id));

      logger.debug({ userId, provider, model, tokensUsed }, 'Updated platform key usage');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to update token usage');
    // Non-critical error, don't throw
  }
}
