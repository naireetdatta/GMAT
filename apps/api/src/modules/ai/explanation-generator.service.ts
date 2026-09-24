import { Injectable, Logger } from '@nestjs/common';
import { AiOrchestratorService } from './ai-orchestrator.service';

@Injectable()
export class ExplanationGeneratorService {
  private readonly logger = new Logger(ExplanationGeneratorService.name);

  constructor(private readonly ai: AiOrchestratorService) {}

  /**
   * Generate detailed explanation for a question
   */
  async generateExplanation(question: {
    stem: string;
    options: { id: string; text: string }[];
    correctAnswer: string;
    type: string;
    topic: string;
  }) {
    const prompt = `Provide a detailed explanation for this GMAT question.

QUESTION: ${question.stem}
OPTIONS:
${question.options.map((o) => `${o.id}. ${o.text}`).join('\n')}
CORRECT ANSWER: ${question.correctAnswer}
TYPE: ${question.type}
TOPIC: ${question.topic}

Provide:
1. Step-by-step solution (clear and thorough)
2. A faster method (if one exists)
3. An alternative approach
4. Why each wrong option is incorrect
5. Common mistakes students make on this type
6. Related concepts to review

Return JSON:
{
  "stepByStep": "detailed step-by-step solution",
  "fasterMethod": "quicker approach or null",
  "alternativeMethod": "different approach or null",
  "wrongOptionExplanations": { "A": "why wrong", "B": "...", ... },
  "commonMistakes": ["mistake 1", "mistake 2"],
  "relatedConcepts": ["concept 1", "concept 2"]
}`;

    try {
      const response = await this.ai.chat(
        'explanation',
        [
          { role: 'system', content: 'You are an expert GMAT tutor providing clear, detailed explanations. Output valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.5, responseFormat: 'json' },
      );

      return JSON.parse(response.content);
    } catch (error) {
      this.logger.error(`Explanation generation failed: ${error}`);
      return null;
    }
  }
}
