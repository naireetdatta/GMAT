import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

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
    const defaultCloudProvider = config.get('AI_NVIDIA_API_KEY') ? 'nvidia' : 'deepseek';
    this.taskProviders = {
      questionGeneration: config.get('AI_QUESTION_GENERATION_PROVIDER', defaultCloudProvider),
      validation: config.get('AI_VALIDATION_PROVIDER', 'nemotron'),
      explanation: config.get('AI_EXPLANATION_PROVIDER', defaultCloudProvider),
      tutor: config.get('AI_TUTOR_PROVIDER', defaultCloudProvider),
      embedding: config.get('AI_EMBEDDING_PROVIDER', 'bge'),
    };

    this.providers = {
      deepseek: {
        apiKey: config.get('AI_DEEPSEEK_API_KEY', ''),
        baseUrl: config.get('AI_DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1'),
        model: config.get('AI_DEEPSEEK_MODEL', 'deepseek-chat'),
      },
      nemotron: {
        apiKey: config.get('AI_NEMOTRON_API_KEY', config.get('AI_NVIDIA_API_KEY', '')),
        baseUrl: config.get('AI_NEMOTRON_BASE_URL', 'https://integrate.api.nvidia.com/v1'),
        model: config.get('AI_NEMOTRON_MODEL', 'nvidia/llama-3.1-nemotron-70b-instruct'),
      },
      nvidia: {
        apiKey: config.get('AI_NVIDIA_API_KEY', config.get('AI_NEMOTRON_API_KEY', '')),
        baseUrl: config.get('AI_NVIDIA_BASE_URL', 'https://integrate.api.nvidia.com/v1'),
        model: config.get('AI_NVIDIA_MODEL', 'meta/llama-3.2-11b-vision-instruct'),
      },
      bge: {
        apiKey: config.get('AI_BGE_API_KEY', config.get('AI_NVIDIA_API_KEY', config.get('AI_NEMOTRON_API_KEY', ''))),
        baseUrl: config.get('AI_BGE_BASE_URL', 'https://integrate.api.nvidia.com/v1'),
        model: config.get('AI_BGE_MODEL', 'baai/bge-m3'),
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
        baseUrl: config.get('AI_OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        model: config.get('AI_OPENAI_MODEL', 'gpt-4o-mini'),
      },
      gemini: {
        apiKey: config.get('AI_GEMINI_API_KEY', ''),
        baseUrl: config.get('AI_GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai'),
        model: config.get('AI_GEMINI_MODEL', 'gemini-2.0-flash'),
      },
      claude: {
        apiKey: config.get('AI_CLAUDE_API_KEY', ''),
        baseUrl: 'https://api.anthropic.com/v1',
        model: 'claude-sonnet-4-20250514',
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
    let providerName = this.taskProviders[task];
    let providerConfig = this.providers[providerName];

    // If configured provider has no API key, fallback to a provider that has an API key (e.g. nvidia)
    if (!providerConfig?.apiKey) {
      const fallbackKey = Object.keys(this.providers).find(
        (k) => this.providers[k].apiKey && k !== 'ollama',
      );
      if (fallbackKey) {
        providerName = fallbackKey;
        providerConfig = this.providers[fallbackKey];
      }
    }

    if (!providerConfig || !providerConfig.apiKey) {
      throw new Error(`No provider with valid API key configured for task: ${task}`);
    }

    if (providerName === 'ollama') {
      throw new Error(
        'Local Ollama is disabled to prevent Windows system crashes. Please configure a cloud AI provider (e.g. nvidia, deepseek, gemini, or openai).'
      );
    }

    this.logger.debug(`[${task}] Using provider: ${providerName} (${providerConfig.model})`);

    // All cloud providers use OpenAI-compatible API format
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

    if (options?.responseFormat === 'json' && !config.baseUrl.includes('nvidia.com')) {
      body.response_format = { type: 'json_object' };
    }

    try {
      let response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45000),
      });

      // If response_format was rejected by the provider, retry without it
      if (!response.ok && body.response_format) {
        this.logger.debug(`Provider returned ${response.status} with response_format, retrying without response_format...`);
        delete body.response_format;
        response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(45000),
        });
      }

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
   * Generate embeddings via Cloud API
   * Compatible with: NVIDIA NIM (bge-m3, nv-embedqa), OpenAI (text-embedding-3-small), Gemini
   */
  async embed(texts: string[]): Promise<number[][]> {
    const providerName = this.taskProviders.embedding;
    const providerConfig = this.providers[providerName];

    if (!providerConfig?.apiKey) {
      // Return zero vectors if no embedding key configured yet
      this.logger.warn(`No embedding API key configured for [${providerName}], returning fallback zero vectors`);
      return texts.map(() => new Array(1536).fill(0));
    }

    if (providerName === 'ollama') {
      throw new Error('Local Ollama embeddings are disabled. Please use an external cloud provider (e.g. nvidia or bge).');
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

  /**
   * Get the provider name for a task (for logging/debugging)
   */
  getProviderForTask(task: string): string {
    return this.taskProviders[task] || 'unknown';
  }
}
