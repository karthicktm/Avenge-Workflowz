/**
 * Workflow Builder Chat API
 * Web-based AI chat for creating workflows
 *
 * This endpoint provides a conversational interface for building workflows.
 * Users describe what they want in plain English, and the AI guides them
 * through creating a working workflow.
 */

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { agentChatSessionsTable, agentChatMessagesTable } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';
import { resolveAIKey, updateTokenUsage } from '@/lib/ai/key-resolver';
import { ZAIClient } from '@/lib/ai/zai-client';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for long conversations

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * POST /api/workflow-builder-chat
 * Conversational workflow builder (production-ready, no filesystem dependencies)
 */
export async function POST(request: Request) {
  const encoder = new TextEncoder();

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const {
      message,
      sessionId: existingSessionId,
      provider = 'anthropic',
      model = 'claude-3-5-sonnet-20241022'
    } = body;

    if (!message || typeof message !== 'string') {
      return new Response('Message is required', { status: 400 });
    }

    const userId = session.user.id;
    const organizationId = (session.user as { organizationId?: string }).organizationId || null;

    // Get or create chat session
    let sessionId = existingSessionId;
    if (!sessionId) {
      sessionId = nanoid();
      await db.insert(agentChatSessionsTable).values({
        id: sessionId,
        userId,
        organizationId,
        title: message.substring(0, 100),
        model,
        messageCount: 0,
      });
    }

    // Save user message
    const userMessageId = nanoid();
    await db.insert(agentChatMessagesTable).values({
      id: userMessageId,
      sessionId,
      role: 'user',
      content: message,
      metadata: null,
    });

    // Update message count
    await db
      .update(agentChatSessionsTable)
      .set({
        messageCount: sql`COALESCE(${agentChatSessionsTable.messageCount}, 0) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(agentChatSessionsTable.id, sessionId));

    // Resolve API key (user key or platform key with rate limit)
    const keyResolution = await resolveAIKey(userId, provider);

    // Load conversation history
    const history = await db
      .select()
      .from(agentChatMessagesTable)
      .where(eq(agentChatMessagesTable.sessionId, sessionId))
      .orderBy(agentChatMessagesTable.createdAt);

    // Build system prompt
    const systemPrompt = buildWorkflowBuilderPrompt();

    // Build messages for API
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.role === 'assistant'
          ? (typeof m.content === 'string' ? m.content : JSON.parse(m.content)[0]?.text || '')
          : m.content,
      })),
    ];

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send session ID
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'session', sessionId })}\n\n`)
          );

          // Send rate limit warning if using platform key
          if (keyResolution.limited) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'info',
                  message: 'Using platform API key. Add your own key in Settings for unlimited usage.',
                })}\n\n`
              )
            );
          }

          let fullResponse = '';
          let tokensUsed = 0;

          // Call AI provider
          if (provider === 'zai') {
            const client = new ZAIClient(keyResolution.key);

            for await (const chunk of client.streamCompletion({
              model,
              messages: messages.map(m => ({ role: m.role, content: m.content })),
            })) {
              fullResponse += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`)
              );
            }
          } else if (provider === 'anthropic') {
            // Anthropic Messages API
            const response = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': keyResolution.key,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model,
                messages: messages.filter(m => m.role !== 'system'),
                system: systemPrompt,
                max_tokens: 4096,
                stream: true,
              }),
            });

            if (!response.ok || !response.body) {
              throw new Error(`Anthropic API error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

              for (const line of lines) {
                const data = line.replace('data: ', '');
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === 'content_block_delta') {
                    const content = parsed.delta?.text;
                    if (content) {
                      fullResponse += content;
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`)
                      );
                    }
                  }
                  if (parsed.type === 'message_stop' && parsed.usage) {
                    tokensUsed = parsed.usage.output_tokens || 0;
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          } else if (provider === 'openai') {
            // OpenAI Chat Completions API
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${keyResolution.key}`,
              },
              body: JSON.stringify({
                model,
                messages,
                stream: true,
              }),
            });

            if (!response.ok || !response.body) {
              throw new Error(`OpenAI API error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

              for (const line of lines) {
                const data = line.replace('data: ', '');
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    fullResponse += content;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`)
                    );
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }

          // Save assistant response
          const assistantMessageId = nanoid();
          await db.insert(agentChatMessagesTable).values({
            id: assistantMessageId,
            sessionId,
            role: 'assistant',
            content: fullResponse,
            metadata: null,
          });

          // Update message count
          await db
            .update(agentChatSessionsTable)
            .set({
              messageCount: sql`COALESCE(${agentChatSessionsTable.messageCount}, 0) + 1`,
              updatedAt: new Date(),
            })
            .where(eq(agentChatSessionsTable.id, sessionId));

          // Update token usage for platform keys
          if (keyResolution.source === 'platform' && tokensUsed > 0) {
            await updateTokenUsage(userId, provider, model, tokensUsed);
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          );

          controller.close();
        } catch (error) {
          logger.error({ error }, 'Workflow builder chat error');
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Workflow builder chat request error');
    return new Response('Internal server error', { status: 500 });
  }
}

/**
 * Build system prompt for workflow builder
 * Loads core templates and provides workflow building instructions
 */
function buildWorkflowBuilderPrompt(): string {
  try {
    const templatesDir = join(process.cwd(), '.claude/skills/workflow-generator-v2/references');

    const yamlFormat = readFileSync(join(templatesDir, 'yaml-format.md'), 'utf-8');
    const commonModules = readFileSync(join(templatesDir, 'common-modules.md'), 'utf-8');
    const commonMistakes = readFileSync(join(templatesDir, 'common-mistakes.md'), 'utf-8');

    return `You are a workflow builder assistant for the b0t automation platform.

Your role is to help users create workflows by:
1. Asking clarifying questions about their workflow requirements
2. Searching for the right modules using the /api/modules/search endpoint
3. Building a YAML workflow plan
4. Using the /api/workflows/build-from-plan endpoint to create the workflow

WORKFLOW SPECIFICATION:
${yamlFormat}

MODULE DISCOVERY:
${commonModules}

COMMON MISTAKES TO AVOID:
${commonMistakes}

CRITICAL RULES:
1. ALWAYS search for modules before using them: GET /api/modules/search?q=keyword
2. Use EXACT module paths from search results
3. Follow parameter names from module signatures
4. Ask for trigger type first (manual, webhook, cron, chat, etc.)
5. After building YAML, tell user you'll validate it (don't actually call API - just describe the workflow)

WORKFLOW CREATION PROCESS:
1. Ask user about workflow requirements
2. Determine trigger type
3. Search for needed modules (describe what you would search for)
4. Build YAML plan
5. Explain the workflow to the user

Be conversational, helpful, and ensure the workflow will work correctly.`;
  } catch (error) {
    logger.error({ error }, 'Failed to load templates');
    return 'You are a workflow builder assistant. Help users create automation workflows by asking questions and providing guidance.';
  }
}
