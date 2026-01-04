/**
 * API Key Management Endpoint
 * Handles CRUD operations for user AI API keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userAiKeysTable } from '@/lib/schema';
import { encrypt } from '@/lib/encryption';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createKeySchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'zai']),
  key: z.string().min(10),
  label: z.string().optional(),
});

/**
 * GET /api/settings/ai-keys
 * List user's AI API keys (without actual key values)
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await db
      .select({
        id: userAiKeysTable.id,
        provider: userAiKeysTable.provider,
        label: userAiKeysTable.label,
        isActive: userAiKeysTable.isActive,
        createdAt: userAiKeysTable.createdAt,
        lastUsed: userAiKeysTable.lastUsed,
        usageCount: userAiKeysTable.usageCount,
      })
      .from(userAiKeysTable)
      .where(eq(userAiKeysTable.userId, session.user.id));

    return NextResponse.json({ keys });
  } catch (error) {
    logger.error({ error }, 'Failed to list AI keys');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/settings/ai-keys
 * Add a new AI API key
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { provider, key, label } = validation.data;

    // Validate key format
    if (provider === 'openai' && !key.startsWith('sk-')) {
      return NextResponse.json({ error: 'Invalid OpenAI API key format' }, { status: 400 });
    }
    if (provider === 'anthropic' && !key.startsWith('sk-ant-')) {
      return NextResponse.json({ error: 'Invalid Anthropic API key format' }, { status: 400 });
    }

    const encryptedKey = encrypt(key);
    const id = nanoid();

    // Get organizationId from session if available
    const organizationId = (session.user as { organizationId?: string }).organizationId || null;

    await db.insert(userAiKeysTable).values({
      id,
      userId: session.user.id,
      organizationId,
      provider,
      encryptedKey,
      label: label || `${provider.charAt(0).toUpperCase() + provider.slice(1)} Key`,
      isActive: 1,
    });

    logger.info({ userId: session.user.id, provider, keyId: id }, 'AI key added');

    return NextResponse.json({ id, message: 'API key added successfully' }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to add AI key');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/ai-keys?id=xxx
 * Delete an AI API key
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID required' }, { status: 400 });
    }

    await db
      .delete(userAiKeysTable)
      .where(
        and(
          eq(userAiKeysTable.id, keyId),
          eq(userAiKeysTable.userId, session.user.id)
        )
      );

    logger.info({ userId: session.user.id, keyId }, 'AI key deleted');

    return NextResponse.json({ message: 'API key deleted' });
  } catch (error) {
    logger.error({ error }, 'Failed to delete AI key');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
