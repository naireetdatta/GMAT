import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  responseFormat?: 'json' | 'text';
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * AI Orchestrator — Config-driven model abstraction layer
 * 
 * Routes requests to the appropriate AI provider based on task type.
 * Supports: DeepSeek, Nemotron, GLM, Kimi, OpenAI, Gemini, Claude, Ollama
 * Models are replaceable via environment configuration only.
 */
@Injectable()
export class AiOrchestratorService {
  private readonly logger = new Logger(AiOrchestratorService.name);

  // Task-to-provider mapping from config
  private readonly taskProviders: Record<string, string>;

  // Provider configurations
  private readonly providers: Record<string, ProviderConfig>;

  constructor(private readonly config: ConfigService) {
    this.taskProviders = {
      questionGeneration: config.get('AI_QUESTION_GENERATION_PROVIDER', 'deepseek'),
      validation: config.get('AI_VALIDATION_PROVIDER', 'nemotron'),
      explanation: config.get('AI_EXPLANATION_PROVIDER', 'glm'),
      tutor: config.get('AI_TUTOR_PROVIDER', 'kimi'),
      embedding: config.get('AI_EMBEDDING_PROVIDER', 'bge'),
    };

    this.providers = {
      deepseek: {
        apiKey: config.get('AI_DEEPSEEK_API_KEY', ''),
        baseUrl: config.get('AI_DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1'),
        model: config.get('AI_DEEPSEEK_MODEL', 'deepseek-chat'),
      },
      nemotron: {
        apiKey: config.get('AI_NEMOTRON_API_KEY', ''),
        baseUrl: config.get('AI_NEMOTRON_BASE_URL', 'https://integrate.api.nvidia.com/v1'),
        model: config.get('AI_NEMOTRON_MODEL', 'nvidia/nemotron-ultra'),
      },
      glm: {
        apiKey: config.get('AI_GLM_API_KEY', ''),
        baseUrl: config.get('AI_GLM_BASE_URL', 'https://open.bigmodel.cn/api/paas/v4'),
        model: config.get('AI_GLM_MODEL', 'glm-4-plus'),
      },
      kimi: {
        apiKey: config.get('AI_KIMI_API_KEY', ''),
        baseUrl: config.get('AI_KIMI_BASE_URL', 'https://api.moonshot.cn/v1'),
        model: config.get('AI_KIMI_MODEL', 'moonshot-v1-128k'),
      },
      openai: {
        apiKey: config.get('AI_OPENAI_API_KEY', ''),
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
      },
      gemini: {
        apiKey: config.get('AI_GEMINI_API_KEY', ''),
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-2.5-pro',
      },
      claude: {
        apiKey: config.get('AI_CLAUDE_API_KEY', ''),
        baseUrl: 'https://api.anthropic.com/v1',
        model: 'claude-sonnet-4-20250514',
      },
      ollama: {
        apiKey: '',
        baseUrl: config.get('AI_OLLAMA_BASE_URL', 'http://localhost:11434'),
        model: 'llama3.1',
      },
    };
  }

  /**
   * Send a chat request to the provider assigned to the given task
   */
  async chat(
    task: 'questionGeneration' | 'validation' | 'explanation' | 'tutor',
    messages: AIMessage[],
    options?: ChatOptions,
  ): Promise<ChatResponse> {
    const providerName = this.taskProviders[task];
    const providerConfig = this.providers[providerName];

    if (!providerConfig) {
      throw new Error(`No provider configured for task: ${task}`);
    }

    this.logger.debug(`[${task}] Using provider: ${providerName} (${providerConfig.model})`);

    // All providers use OpenAI-compatible API format (except Gemini and Claude)
    if (providerName === 'ollama') {
      return this.chatOllama(providerConfig, messages, options);
    }

    return this.chatOpenAICompatible(providerConfig, messages, options);
  }

  /**
   * OpenAI-compatible chat completion
   * Works with: DeepSeek, Nemotron (NIM), GLM, Kimi, OpenAI
   */
  private async chatOpenAICompatible(
    config: ProviderConfig,
    messages: AIMessage[],
    options?: ChatOptions,
  ): Promise<ChatResponse> {
    const body: Record<string, unknown> = {
      model: config.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    };

    if (options?.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`AI API error (${response.status}): ${error}`);
      }

      const data = await response.json();

      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model || config.model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      this.logger.error(`AI chat failed: ${error}`);
      throw error;
    }
  }

  /**
   * Ollama local model
   */
  private async chatOllama(
    config: ProviderConfig,
    messages: AIMessage[],
    options?: ChatOptions,
  ): Promise<ChatResponse> {
    try {
      const response = await fetch(`${config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens ?? 4096,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error (${response.status}): ${await response.text()}`);
      }

      const data = await response.json();

      return {
        content: data.message?.content || '',
        model: config.model,
      };
    } catch (error) {
      this.logger.error(`Ollama chat failed: ${error}`);
      throw error;
    }
  }

  /**
   * Generate embeddings
   */
  async embed(texts: string[]): Promise<number[][]> {
    const providerName = this.taskProviders.embedding;
    const providerConfig = this.providers[providerName];

    if (!providerConfig?.apiKey && providerName !== 'ollama') {
      // Return dummy embeddings for development
      this.logger.warn('No embedding API key configured, returning zero vectors');
      return texts.map(() => new Array(1024).fill(0));
    }

    if (providerName === 'ollama') {
      return this.embedOllama(providerConfig, texts);
    }

    return this.embedOpenAICompatible(providerConfig, texts);
  }

  private async embedOpenAICompatible(config: ProviderConfig, texts: string[]): Promise<number[][]> {
    const response = await fetch(`${config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${await response.text()}`);
    }

    const data = await response.json();
    return data.data.map((d: { embedding: number[] }) => d.embedding);
  }

  private async embedOllama(config: ProviderConfig, texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      const response = await fetch(`${config.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: config.model, prompt: text }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding error: ${await response.text()}`);
      }

      const data = await response.json();
      embeddings.push(data.embedding);
    }

    return embeddings;
  }

  /**
   * Get the provider name for a task (for logging/debugging)
   */
  getProviderForTask(task: string): string {
    return this.taskProviders[task] || 'unknown';
  }
}
