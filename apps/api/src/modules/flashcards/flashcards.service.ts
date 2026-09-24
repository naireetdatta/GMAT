import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiOrchestratorService } from '../ai/ai-orchestrator.service';
import { FlashcardType, SectionType, Prisma } from '@prisma/client';

@Injectable()
export class FlashcardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiOrchestrator: AiOrchestratorService,
  ) {}

  async create(userId: string, data: {
    front: string;
    back: string;
    type?: FlashcardType;
    section?: SectionType;
    topic?: string;
    difficulty?: number;
  }) {
    return this.prisma.flashcard.create({
      data: {
        userId,
        front: data.front,
        back: data.back,
        type: data.type || FlashcardType.CONCEPT,
        section: data.section,
        topic: data.topic,
        difficulty: data.difficulty,
        box: 1,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReview: new Date(),
      },
    });
  }

  async findAll(userId: string, filters?: { section?: SectionType; type?: FlashcardType }) {
    const where: Prisma.FlashcardWhereInput = { userId };
    if (filters?.section) where.section = filters.section;
    if (filters?.type) where.type = filters.type;

    return this.prisma.flashcard.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDue(userId: string) {
    return this.prisma.flashcard.findMany({
      where: {
        userId,
        nextReview: {
          lte: new Date(),
        },
      },
      orderBy: { nextReview: 'asc' },
    });
  }

  async processReview(id: string, userId: string, quality: number) {
    const flashcard = await this.prisma.flashcard.findFirst({
      where: { id, userId },
    });

    if (!flashcard) {
      throw new NotFoundException(`Flashcard with ID ${id} not found`);
    }

    // Hybrid SM-2 & Leitner Box calculation
    let box = flashcard.box;
    let easeFactor = flashcard.easeFactor;
    let interval = flashcard.interval;
    let repetitions = flashcard.repetitions;

    // Quality is 0-5
    // 0: "Total blackout", 1: "Incorrect; response seemed familiar", 2: "Incorrect; easily remembered",
    // 3: "Correct; difficult to recall", 4: "Correct; after hesitation", 5: "Perfect response"
    if (quality >= 3) {
      // Correct response
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions++;
      // Increment Leitner box up to 5
      box = Math.min(box + 1, 5);
    } else {
      // Incorrect response
      repetitions = 0;
      interval = 1;
      // Reset Leitner box back to 1
      box = 1;
    }

    // Ease factor update formula from SM-2
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) {
      easeFactor = 1.3;
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return this.prisma.flashcard.update({
      where: { id },
      data: {
        box,
        easeFactor,
        interval,
        repetitions,
        nextReview,
        lastReview: new Date(),
      },
    });
  }

  async generateFromMistake(userId: string, mistakeId: string) {
    const mistake = await this.prisma.mistakeEntry.findFirst({
      where: { id: mistakeId, userId },
      include: { question: true },
    });

    if (!mistake) {
      throw new NotFoundException(`Mistake entry ${mistakeId} not found`);
    }

    const question = mistake.question;

    // Call AI Tutor provider to create a conceptual flashcard
    const prompt = `Convert the following GMAT question and the mistake context into a clean, concise, conceptual GMAT Focus flashcard (front and back). The flashcard should focus on the underlying concept, formula, logic pattern, or trap rather than the specific numbers in the question.

Question:
${question.stem}
Options:
${JSON.stringify(question.options)}
Correct Answer: ${question.correctAnswer}
Explanation:
${JSON.stringify(question.explanation)}

Student's notes/mistake:
Error type: ${mistake.errorType}
Notes: ${mistake.notes || 'None'}

Please return a valid JSON object matching this TypeScript structure:
{
  "front": "Markdown/LaTeX content for the front of the card (the prompt/question)",
  "back": "Markdown/LaTeX content for the back of the card (the answer/concept explanation)",
  "type": "CONCEPT" | "FORMULA" | "STRATEGY" | "TRAP" | "VOCABULARY"
}
Do not return any extra text, only the raw JSON.`;

    const aiResponse = await this.aiOrchestrator.chat('tutor', [
      { role: 'system', content: 'You are an AI GMAT flashcard generator. You must return only JSON matching the exact requested format.' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.5,
      responseFormat: 'json',
    });

    try {
      const result = JSON.parse(aiResponse.content);
      return this.create(userId, {
        front: result.front,
        back: result.back,
        type: result.type,
        section: question.section,
        topic: question.topic,
        difficulty: question.difficulty,
      });
    } catch (err) {
      // Fallback in case JSON parsing fails
      return this.create(userId, {
        front: `How to avoid: ${question.topic} - ${mistake.errorType} trap`,
        back: `In question:\n"${question.stem.substring(0, 100)}..."\n\nRule: Check for logic traps and verify assumptions.`,
        type: FlashcardType.TRAP,
        section: question.section,
        topic: question.topic,
        difficulty: question.difficulty,
      });
    }
  }

  async remove(id: string, userId: string) {
    const flashcard = await this.prisma.flashcard.findFirst({
      where: { id, userId },
    });
    if (!flashcard) {
      throw new NotFoundException(`Flashcard ${id} not found`);
    }
    return this.prisma.flashcard.delete({
      where: { id },
    });
  }
}
