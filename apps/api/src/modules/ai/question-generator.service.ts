import { Injectable, Logger } from '@nestjs/common';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionGeneratorService {
  private readonly logger = new Logger(QuestionGeneratorService.name);

  constructor(
    private readonly ai: AiOrchestratorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate a GMAT question using AI
   */
  async generateQuestion(params: {
    section: string;
    topic: string;
    subtopic?: string;
    difficulty: number;
    type: string;
  }) {
    const prompt = this.buildGenerationPrompt(params);

    const response = await this.ai.chat(
      'questionGeneration',
      [
        {
          role: 'system',
          content: `You are an expert GMAT question writer. Generate original, high-quality GMAT Focus Edition questions. Never reproduce copyrighted material. Each question must have exactly one correct answer with a clear, unambiguous solution. Output valid JSON only.`,
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.8, responseFormat: 'json', maxTokens: 4096 },
    );

    try {
      const question = JSON.parse(response.content);
      return {
        ...question,
        section: params.section,
        type: params.type,
        topic: params.topic,
        subtopic: params.subtopic,
        difficulty: params.difficulty,
        sourceModel: response.model,
      };
    } catch (error) {
      this.logger.error(`Failed to parse AI response: ${error}`);
      throw new Error('Failed to generate valid question');
    }
  }

  /**
   * Generate a batch of questions
   */
  async generateBatch(params: {
    section: string;
    topic: string;
    difficulty: number;
    type: string;
    count: number;
  }) {
    const questions = [];
    for (let i = 0; i < params.count; i++) {
      try {
        const q = await this.generateQuestion(params);
        questions.push(q);
      } catch (error) {
        this.logger.warn(`Failed to generate question ${i + 1}/${params.count}: ${error}`);
      }
    }
    return questions;
  }

  private buildGenerationPrompt(params: {
    section: string;
    topic: string;
    subtopic?: string;
    difficulty: number;
    type: string;
  }): string {
    const difficultyLabel =
      params.difficulty <= 305 ? 'basic' :
      params.difficulty <= 505 ? 'intermediate' :
      params.difficulty <= 705 ? 'advanced' : 'expert';

    return `Generate a GMAT Focus Edition ${params.section} question.

Topic: ${params.topic}${params.subtopic ? ` > ${params.subtopic}` : ''}
Type: ${params.type}
Difficulty: ${params.difficulty} (${difficultyLabel})

Requirements:
- The question must be ORIGINAL and not copied from any source
- Exactly ONE correct answer
- 5 answer choices (A through E)
- Difficulty-appropriate for a ${difficultyLabel}-level test taker
- Clear, unambiguous wording
- Professional GMAT-style language

${params.type === 'READING_COMPREHENSION' ? 'Include a passage of 150-250 words on an academic topic.' : ''}
${params.type === 'DATA_SUFFICIENCY' ? 'Include a question stem and two numbered statements. Use standard DS answer choices.' : ''}
${params.type === 'CRITICAL_REASONING' ? 'Include an argument of 2-4 sentences. The question should test one of: assumption, strengthen, weaken, inference, evaluate.' : ''}

Return JSON with this exact structure:
{
  "stem": "question text",
  "passage": "passage text if applicable, null otherwise",
  "options": [
    {"id": "A", "label": "A", "text": "option text"},
    {"id": "B", "label": "B", "text": "option text"},
    {"id": "C", "label": "C", "text": "option text"},
    {"id": "D", "label": "D", "text": "option text"},
    {"id": "E", "label": "E", "text": "option text"}
  ],
  "correctAnswer": "A",
  "explanation": {
    "stepByStep": "detailed solution",
    "fasterMethod": "quicker approach if any",
    "alternativeMethod": "another way to solve",
    "wrongOptionExplanations": {
      "B": "why B is wrong",
      "C": "why C is wrong",
      "D": "why D is wrong",
      "E": "why E is wrong"
    },
    "commonMistakes": ["mistake 1", "mistake 2"],
    "relatedConcepts": ["concept 1", "concept 2"]
  },
  "timeEstimate": 120,
  "psychometricWeight": 1.0
}`;
  }
}
