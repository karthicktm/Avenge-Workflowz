/**
 * Workflow Templates API
 * Serves template files for web-based workflow builder
 * Templates are sourced from .claude/skills/workflow-generator-v2/references/
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TEMPLATES_DIR = join(process.cwd(), '.claude/skills/workflow-generator-v2/references');

/**
 * GET /api/workflow-templates
 * Returns all available template files
 * Query params:
 *   - type: 'core' | 'trigger' | 'module' (filter by template type)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const coreTemplates = [
      'yaml-format.md',
      'common-modules.md',
      'common-mistakes.md',
    ];

    const triggerTemplates = [
      'manual-trigger.md',
      'webhook-trigger.md',
      'cron-trigger.md',
      'chat-trigger.md',
      'chat-input-trigger.md',
      'gmail-trigger.md',
      'outlook-trigger.md',
    ];

    // Get module templates from the modules subdirectory
    let moduleTemplates: string[] = [];
    const modulesDir = join(TEMPLATES_DIR, 'modules');
    if (existsSync(modulesDir)) {
      moduleTemplates = readdirSync(modulesDir)
        .filter(f => f.endsWith('.md'))
        .map(f => `modules/${f}`);
    }

    // Load template contents based on type
    let templatesToLoad: string[] = [];

    if (!type || type === 'core') {
      templatesToLoad = [...templatesToLoad, ...coreTemplates];
    }
    if (!type || type === 'trigger') {
      templatesToLoad = [...templatesToLoad, ...triggerTemplates];
    }
    if (!type || type === 'module') {
      templatesToLoad = [...templatesToLoad, ...moduleTemplates];
    }

    const templates: Record<string, string> = {};

    for (const templateFile of templatesToLoad) {
      try {
        const templatePath = join(TEMPLATES_DIR, templateFile);
        if (existsSync(templatePath)) {
          const content = readFileSync(templatePath, 'utf-8');
          templates[templateFile] = content;
        } else {
          logger.warn({ templateFile }, 'Template file not found');
        }
      } catch (error) {
        logger.error({ templateFile, error }, 'Failed to load template');
      }
    }

    return NextResponse.json({
      templates,
      categories: {
        core: coreTemplates,
        trigger: triggerTemplates,
        module: moduleTemplates,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Template API error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
