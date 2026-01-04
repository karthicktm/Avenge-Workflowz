/**
 * Specific Workflow Template API
 * Returns a specific template file by name
 * Example: /api/workflow-templates/yaml-format.md
 * Example: /api/workflow-templates/modules%2Fai-modules.md
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TEMPLATES_DIR = join(process.cwd(), '.claude/skills/workflow-generator-v2/references');

/**
 * GET /api/workflow-templates/[name]
 * Returns a specific template file
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Security: prevent directory traversal
    if (name.includes('..') || name.includes('/..') || name.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid template name' }, { status: 400 });
    }

    // URL decode the name (handles modules/ai-modules.md)
    const decodedName = decodeURIComponent(name);

    const templatePath = join(TEMPLATES_DIR, decodedName);

    if (!existsSync(templatePath)) {
      logger.warn({ name: decodedName }, 'Template not found');
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const content = readFileSync(templatePath, 'utf-8');

    return NextResponse.json({
      name: decodedName,
      content,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to load template');
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }
}
