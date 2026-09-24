import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SectionType, ErrorType, Prisma } from '@prisma/client';

@Injectable()
export class MistakesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, filters?: { section?: SectionType; errorType?: ErrorType }) {
    const where: Prisma.MistakeEntryWhereInput = { userId };
    if (filters?.section) where.section = filters.section;
    if (filters?.errorType) where.errorType = filters.errorType;

    return this.prisma.mistakeEntry.findMany({
      where,
      include: {
        question: {
          select: {
            stem: true,
            options: true,
            correctAnswer: true,
            explanation: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const entry = await this.prisma.mistakeEntry.findFirst({
      where: { id, userId },
      include: { question: true },
    });

    if (!entry) {
      throw new NotFoundException(`Mistake entry with ID ${id} not found`);
    }

    return entry;
  }

  async create(userId: string, data: {
    questionId: string;
    examId?: string;
    errorType?: ErrorType;
    notes?: string;
    tags?: string[];
  }) {
    const question = await this.prisma.question.findUnique({
      where: { id: data.questionId },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${data.questionId} not found`);
    }

    // Check if duplicate entry already exists for this exam
    if (data.examId) {
      const existing = await this.prisma.mistakeEntry.findFirst({
        where: { userId, questionId: data.questionId, examId: data.examId },
      });
      if (existing) return existing;
    }

    return this.prisma.mistakeEntry.create({
      data: {
        userId,
        questionId: data.questionId,
        examId: data.examId,
        errorType: data.errorType || ErrorType.CONCEPTUAL,
        notes: data.notes,
        tags: data.tags || [],
        section: question.section,
        topic: question.topic,
        subtopic: question.subtopic,
        difficulty: question.difficulty,
      },
    });
  }

  async update(id: string, userId: string, data: {
    errorType?: ErrorType;
    notes?: string;
    tags?: string[];
  }) {
    await this.findOne(id, userId); // Ensure it exists

    return this.prisma.mistakeEntry.update({
      where: { id },
      data: {
        errorType: data.errorType,
        notes: data.notes,
        tags: data.tags,
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Ensure it exists
    return this.prisma.mistakeEntry.delete({
      where: { id },
    });
  }

  async autoCaptureFromExam(userId: string, examId: string) {
    // Fetch all incorrect/skipped questions for the exam
    const examQuestions = await this.prisma.examQuestion.findMany({
      where: {
        section: { examId },
        OR: [
          { isCorrect: false },
          { isSkipped: true },
        ],
      },
      include: { question: true },
    });

    const createdEntries = [];

    for (const eq of examQuestions) {
      const entry = await this.create(userId, {
        questionId: eq.questionId,
        examId,
        errorType: eq.isSkipped ? ErrorType.TIME_PRESSURE : ErrorType.CONCEPTUAL,
        notes: eq.isSkipped ? 'Skipped during exam' : 'Answered incorrectly during exam',
        tags: ['auto-captured'],
      });
      createdEntries.push(entry);
    }

    return createdEntries;
  }
}
