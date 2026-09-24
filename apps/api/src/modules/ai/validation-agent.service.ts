import { Injectable, Logger } from '@nestjs/common';
import { AiOrchestratorService } from './ai-orchestrator.service';

@Injectable()
export class ValidationAgentService {
  private readonly logger = new Logger(ValidationAgentService.name);

  constructor(private readonly ai: AiOrchestratorService) {}

  /**
   * Validate a generated question using the validation model
   */
  async validate(question: {
    stem: string;
    options: { id: string; text: string }[];
    correctAnswer: string;
    explanation: { stepByStep: string };
    difficulty: number;
    type: string;
    topic: string;
  }): Promise<{ passed: boolean; score: number; issues: string[]; feedback: string }> {
    const prompt = `You are a GMAT psychometrician and quality assurance expert. Validate this GMAT question.

QUESTION:
${question.stem}

OPTIONS:
${question.options.map((o) => `${o.id}. ${o.text}`).join('\n')}

CORRECT ANSWER: ${question.correctAnswer}
EXPLANATION: ${question.explanation.stepByStep}
STATED DIFFICULTY: ${question.difficulty}
TYPE: ${question.type}
TOPIC: ${question.topic}

Evaluate on these criteria (score each 0-10):
1. CORRECTNESS: Is the stated answer definitively correct? Are all other options definitively wrong?
2. CLARITY: Is the question unambiguous and clearly worded?
3. DIFFICULTY: Does the actual difficulty match the stated difficulty level?
4. GRAMMAR: Is the question grammatically perfect and professionally written?
5. LOGIC: Is the reasoning chain sound with no logical flaws?
6. DISTRACTOR_QUALITY: Are wrong answers plausible but clearly incorrect?
7. PSYCHOMETRIC_QUALITY: Is this question fair and would it discriminate well between ability levels?

Return JSON:
{
  "scores": {
    "correctness": 0-10,
    "clarity": 0-10,
    "difficulty": 0-10,
    "grammar": 0-10,
    "logic": 0-10,
    "distractorQuality": 0-10,
    "psychometricQuality": 0-10
  },
  "overallScore": 0-100,
  "passed": true/false,
  "issues": ["list of issues found"],
  "feedback": "overall assessment"
}

A question PASSES only if overallScore >= 70 AND correctness >= 8.`;

    try {
      const response = await this.ai.chat(
        'validation',
        [
          { role: 'system', content: 'You are a strict GMAT question quality validator. Output valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.3, responseFormat: 'json' },
      );

      const result = JSON.parse(response.content);

      return {
        passed: result.passed ?? false,
        score: result.overallScore ?? 0,
        issues: result.issues ?? [],
        feedback: result.feedback ?? '',
      };
    } catch (error) {
      this.logger.error(`Validation failed: ${error}`);
      return {
        passed: false,
        score: 0,
        issues: ['Validation agent encountered an error'],
        feedback: 'Unable to validate question',
      };
    }
  }
}
