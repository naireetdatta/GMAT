import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IrtService } from '../irt/irt.service';
import { ScoringService } from './scoring.service';
import { ExamStatus, SectionStatus, SectionType, ExamType } from '@prisma/client';

@Injectable()
export class ExamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly irtService: IrtService,
    private readonly scoringService: ScoringService,
  ) {}

  async createExam(userId: string, type: ExamType, sectionOrder: SectionType[]) {
    const sectionConfigs: Record<SectionType, { questionCount: number; timeSeconds: number }> = {
      QUANTITATIVE: { questionCount: 21, timeSeconds: 45 * 60 },
      VERBAL: { questionCount: 23, timeSeconds: 45 * 60 },
      DATA_INSIGHTS: { questionCount: 20, timeSeconds: 45 * 60 },
    };

    // Create exam with sections
    const exam = await this.prisma.exam.create({
      data: {
        userId,
        type,
        status: ExamStatus.IN_PROGRESS,
        sectionOrder: sectionOrder,
        startedAt: new Date(),
        sections: {
          create: sectionOrder.map((section, index) => ({
            section,
            orderIndex: index,
            timeRemaining: sectionConfigs[section].timeSeconds,
            status: index === 0 ? SectionStatus.IN_PROGRESS : SectionStatus.NOT_STARTED,
            startedAt: index === 0 ? new Date() : null,
          })),
        },
      },
      include: {
        sections: {
          include: { questions: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // Allocate questions for the first section
    await this.allocateQuestionsForSection(
      exam.sections[0].id,
      sectionOrder[0],
      sectionConfigs[sectionOrder[0]].questionCount,
      0, // initial ability estimate
    );

    return this.getExam(exam.id);
  }

  async getExam(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        sections: {
          include: {
            questions: {
              include: { question: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async submitAnswer(
    examId: string,
    sectionId: string,
    questionIndex: number,
    answer: string,
  ) {
    const section = await this.prisma.examSection.findUnique({
      where: { id: sectionId },
      include: { questions: { include: { question: true }, orderBy: { orderIndex: 'asc' } } },
    });

    if (!section) throw new NotFoundException('Section not found');
    if (section.status === SectionStatus.COMPLETED) {
      throw new BadRequestException('Section already completed');
    }

    const examQuestion = section.questions[questionIndex];
    if (!examQuestion) throw new NotFoundException('Question not found');

    const isCorrect = examQuestion.question.correctAnswer === answer;

    // Update the answer
    await this.prisma.examQuestion.update({
      where: { id: examQuestion.id },
      data: {
        userAnswer: answer,
        isCorrect,
        isSkipped: false,
        answeredAt: new Date(),
        isEdited: examQuestion.userAnswer !== null,
      },
    });

    // Update ability estimate using IRT
    const responses = section.questions
      .map((q) => ({
        correct: q.id === examQuestion.id ? isCorrect : q.isCorrect,
        difficulty: q.question.irtDifficulty,
        discrimination: q.question.irtDiscrimination,
        guessing: q.question.irtGuessing,
      }))
      .filter((r) => r.correct !== null);

    const newAbility = this.irtService.estimateAbility(
      responses as { correct: boolean; difficulty: number; discrimination: number; guessing: number }[],
    );

    await this.prisma.examSection.update({
      where: { id: sectionId },
      data: { abilityEstimate: newAbility },
    });

    return {
      isCorrect,
      abilityEstimate: newAbility,
      questionId: examQuestion.questionId,
    };
  }

  async flagQuestion(examQuestionId: string) {
    const eq = await this.prisma.examQuestion.findUnique({ where: { id: examQuestionId } });
    if (!eq) throw new NotFoundException('Question not found');

    return this.prisma.examQuestion.update({
      where: { id: examQuestionId },
      data: { isFlagged: !eq.isFlagged },
    });
  }

  async completeSection(examId: string, sectionId: string) {
    const section = await this.prisma.examSection.findUnique({
      where: { id: sectionId },
      include: { questions: true },
    });

    if (!section) throw new NotFoundException('Section not found');

    // Calculate section score
    const sectionScore = this.scoringService.calculateSectionScore(
      section.abilityEstimate,
    );

    await this.prisma.examSection.update({
      where: { id: sectionId },
      data: {
        status: SectionStatus.COMPLETED,
        completedAt: new Date(),
        sectionScore,
      },
    });

    // Check if there's a next section
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { sections: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!exam) throw new NotFoundException('Exam not found');

    const currentIndex = exam.sections.findIndex((s) => s.id === sectionId);
    const nextSection = exam.sections[currentIndex + 1];

    if (nextSection) {
      // Allocate questions for next section
      const sectionConfigs: Record<string, number> = {
        QUANTITATIVE: 21,
        VERBAL: 23,
        DATA_INSIGHTS: 20,
      };

      await this.prisma.examSection.update({
        where: { id: nextSection.id },
        data: {
          status: SectionStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
      });

      await this.allocateQuestionsForSection(
        nextSection.id,
        nextSection.section,
        sectionConfigs[nextSection.section],
        0,
      );

      return { nextSectionId: nextSection.id, isLastSection: false };
    } else {
      // Complete the exam
      return this.completeExam(examId);
    }
  }

  async completeExam(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { sections: true },
    });

    if (!exam) throw new NotFoundException('Exam not found');

    const sectionScores: Record<string, number> = {};
    for (const section of exam.sections) {
      sectionScores[section.section] = section.sectionScore || 75;
    }

    const totalScore = this.scoringService.calculateTotalScore(
      sectionScores['QUANTITATIVE'] || 75,
      sectionScores['VERBAL'] || 75,
      sectionScores['DATA_INSIGHTS'] || 75,
    );

    // Update exam
    await this.prisma.exam.update({
      where: { id: examId },
      data: {
        status: ExamStatus.COMPLETED,
        completedAt: new Date(),
        totalScore,
      },
    });

    // Create score record
    await this.prisma.score.create({
      data: {
        examId,
        userId: exam.userId,
        totalScore,
        quantScore: sectionScores['QUANTITATIVE'] || 75,
        verbalScore: sectionScores['VERBAL'] || 75,
        diScore: sectionScores['DATA_INSIGHTS'] || 75,
      },
    });

    // Auto-capture mistake book entries
    try {
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

      for (const eq of examQuestions) {
        const exists = await this.prisma.mistakeEntry.findFirst({
          where: { userId: exam.userId, questionId: eq.questionId, examId },
        });

        if (!exists) {
          await this.prisma.mistakeEntry.create({
            data: {
              userId: exam.userId,
              questionId: eq.questionId,
              examId,
              errorType: eq.isSkipped ? 'TIME_PRESSURE' : 'CONCEPTUAL',
              notes: eq.isSkipped ? 'Skipped during exam' : 'Answered incorrectly during exam',
              tags: ['auto-captured'],
              section: eq.question.section,
              topic: eq.question.topic,
              subtopic: eq.question.subtopic,
              difficulty: eq.question.difficulty,
            },
          });
        }
      }
    } catch (e) {
      // Gracefully handle error to avoid breaking completion return
      console.error('Failed to auto-capture mistake entries:', e);
    }

    return {
      totalScore,
      sections: sectionScores,
      isLastSection: true,
    };
  }

  async updateTimeRemaining(sectionId: string, timeRemaining: number) {
    return this.prisma.examSection.update({
      where: { id: sectionId },
      data: { timeRemaining },
    });
  }

  private async allocateQuestionsForSection(
    sectionId: string,
    sectionType: SectionType,
    count: number,
    initialAbility: number,
  ) {
    // Select questions using IRT-based adaptive selection
    const availableQuestions = await this.prisma.question.findMany({
      where: {
        section: sectionType,
        validated: true,
      },
      orderBy: { irtDifficulty: 'asc' },
    });

    let selectedQuestions: typeof availableQuestions;

    if (availableQuestions.length >= count) {
      // Use IRT to select optimal questions
      selectedQuestions = this.irtService.selectQuestions(
        availableQuestions.map((q) => ({
          id: q.id,
          difficulty: q.irtDifficulty,
          discrimination: q.irtDiscrimination,
          guessing: q.irtGuessing,
          topic: q.topic,
        })),
        initialAbility,
        count,
      ).map((selected) => availableQuestions.find((q) => q.id === selected.id)!);
    } else {
      // Not enough validated questions — use whatever we have
      selectedQuestions = availableQuestions.slice(0, count);
    }

    // Create exam question entries
    if (selectedQuestions.length > 0) {
      await this.prisma.examQuestion.createMany({
        data: selectedQuestions.map((q, index) => ({
          sectionId,
          questionId: q.id,
          orderIndex: index,
        })),
      });
    }
  }

  async getExamsByUser(userId: string, limit = 20) {
    return this.prisma.exam.findMany({
      where: { userId },
      include: {
        scores: true,
        sections: {
          select: { section: true, sectionScore: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
