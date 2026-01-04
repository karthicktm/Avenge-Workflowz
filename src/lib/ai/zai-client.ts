/**
 * Z.AI (GLM) Client
 * API Documentation: https://docs.z.ai/guides/overview/quick-start
 * Compatible with OpenAI format for easy integration
 */

import { logger } from '@/lib/logger';

export interface ZAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ZAICompletionRequest {
  model: string;
  messages: ZAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  thinking_mode?: 'fast' | 'deep'; // Z.AI specific
  web_search?: boolean; // Z.AI specific
}

export interface ZAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class ZAIClient {
  private apiKey: string;
  private baseURL = 'https://api.z.ai/api/paas/v4';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Create a completion (non-streaming)
   */
  async createCompletion(request: ZAICompletionRequest): Promise<ZAICompletionResponse> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept-Language': 'en-US,en',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error({ status: response.status, error }, 'Z.AI API error');
        throw new Error(`Z.AI API error: ${response.status} ${error}`);
      }

      return response.json();
    } catch (error) {
      logger.error({ error }, 'Z.AI client error');
      throw error;
    }
  }

  /**
   * Stream completion (SSE streaming)
   */
  async *streamCompletion(request: ZAICompletionRequest): AsyncGenerator<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept-Language': 'en-US,en',
        },
        body: JSON.stringify({ ...request, stream: true }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error({ status: response.status, error }, 'Z.AI stream error');
        throw new Error(`Z.AI stream error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Z.AI response body is empty');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6); // Remove 'data: ' prefix
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (parseError) {
            // Ignore JSON parse errors for incomplete chunks
            logger.debug({ line: trimmed }, 'Failed to parse Z.AI stream chunk');
          }
        }
      }
    } catch (error) {
      logger.error({ error }, 'Z.AI stream error');
      throw error;
    }
  }
}
