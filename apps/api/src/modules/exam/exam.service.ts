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

    const now = new Date();
    const firstDurationSeconds = sectionConfigs[sectionOrder[0]].timeSeconds;
    const firstDeadline = new Date(now.getTime() + firstDurationSeconds * 1000);

    // Create exam with sections
    const exam = await this.prisma.exam.create({
      data: {
        userId,
        type,
        status: ExamStatus.IN_PROGRESS,
        sectionOrder: sectionOrder,
        startedAt: now,
        sections: {
          create: sectionOrder.map((section, index) => ({
            section,
            orderIndex: index,
            timeRemaining: sectionConfigs[section].timeSeconds,
            status: index === 0 ? SectionStatus.IN_PROGRESS : SectionStatus.NOT_STARTED,
            startedAt: index === 0 ? now : null,
            sectionDeadlineAt: index === 0 ? firstDeadline : null,
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

    // Record initial EXAM_STARTED event
    await this.recordEvent(exam.id, {
      type: 'EXAM_STARTED',
      payload: { userId, type, sectionOrder, startedAt: now },
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
    idempotencyKey?: string,
  ) {
    const section = await this.prisma.examSection.findUnique({
      where: { id: sectionId },
      include: { questions: { include: { question: true }, orderBy: { orderIndex: 'asc' } } },
    });

    if (!section) throw new NotFoundException('Section not found');
    if (section.status === SectionStatus.COMPLETED) {
      throw new BadRequestException('Section already completed');
    }

    const now = new Date();
    // Server-authoritative timer deadline check
    if (section.sectionDeadlineAt && now > section.sectionDeadlineAt) {
      // Auto-expire section
      await this.completeSection(examId, sectionId);
      throw new BadRequestException('Section time has expired');
    }

    const examQuestion = section.questions[questionIndex];
    if (!examQuestion) throw new NotFoundException('Question not found');

    const wasAlreadyAnswered = examQuestion.userAnswer !== null;
    const isChangingAnswer = wasAlreadyAnswered && examQuestion.userAnswer !== answer;

    // Server-enforced 3-edit rule
    if (isChangingAnswer) {
      if (section.editsRemaining <= 0) {
        throw new BadRequestException('Maximum 3 answer edits reached for this section');
      }
      await this.prisma.examSection.update({
        where: { id: sectionId },
        data: { editsRemaining: section.editsRemaining - 1 },
      });
    }

    const isCorrect = examQuestion.question.correctAnswer === answer;

    // Update the answer
    await this.prisma.examQuestion.update({
      where: { id: examQuestion.id },
      data: {
        userAnswer: answer,
        isCorrect,
        isSkipped: false,
        answeredAt: now,
        isEdited: isChangingAnswer ? true : examQuestion.isEdited,
      },
    });

    // Record audit event
    await this.recordEvent(examId, {
      type: isChangingAnswer ? 'ANSWER_EDITED' : 'ANSWER_SELECTED',
      sectionId,
      idempotencyKey,
      payload: {
        questionId: examQuestion.questionId,
        questionIndex,
        isEdited: isChangingAnswer,
        timestamp: now,
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
      editsRemaining: isChangingAnswer ? section.editsRemaining - 1 : section.editsRemaining,
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

    const now = new Date();
    // Calculate section score
    const sectionScore = this.scoringService.calculateSectionScore(
      section.abilityEstimate,
    );

    await this.prisma.examSection.update({
      where: { id: sectionId },
      data: {
        status: SectionStatus.COMPLETED,
        completedAt: now,
        sectionScore,
      },
    });

    await this.recordEvent(examId, {
      type: 'SECTION_SUBMITTED',
      sectionId,
      payload: { sectionScore, abilityEstimate: section.abilityEstimate, timestamp: now },
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

      const nextDuration = 45 * 60;
      const nextDeadline = new Date(now.getTime() + nextDuration * 1000);

      await this.prisma.examSection.update({
        where: { id: nextSection.id },
        data: {
          status: SectionStatus.IN_PROGRESS,
          startedAt: now,
          sectionDeadlineAt: nextDeadline,
        },
      });

      await this.allocateQuestionsForSection(
        nextSection.id,
        nextSection.section,
        sectionConfigs[nextSection.section] || 20,
        0,
      );

      await this.recordEvent(examId, {
        type: 'SECTION_STARTED',
        sectionId: nextSection.id,
        payload: { section: nextSection.section, startedAt: now, deadlineAt: nextDeadline },
      });

      return {
        nextSectionId: nextSection.id,
        isLastSection: false,
        breakEligible: !exam.breakTaken && (currentIndex === 0 || currentIndex === 1),
      };
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

  async startBreak(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { sections: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!exam) throw new NotFoundException('Exam not found');
    if (exam.status !== ExamStatus.IN_PROGRESS) {
      throw new BadRequestException('Exam is not in progress');
    }
    if (exam.breakTaken) {
      throw new BadRequestException('Break has already been used for this exam');
    }

    const completedSections = exam.sections.filter((s) => s.status === SectionStatus.COMPLETED);
    if (completedSections.length !== 1 && completedSections.length !== 2) {
      throw new BadRequestException('Break can only be taken after Section 1 or Section 2');
    }

    const now = new Date();
    const breakDeadline = new Date(now.getTime() + 600 * 1000); // 10 minutes

    await this.prisma.exam.update({
      where: { id: examId },
      data: {
        status: ExamStatus.ON_BREAK,
        breakTaken: true,
        breakStartedAt: now,
        breakDeadlineAt: breakDeadline,
      },
    });

    await this.recordEvent(examId, {
      type: 'BREAK_STARTED',
      payload: { startedAt: now, deadlineAt: breakDeadline },
    });

    return {
      status: ExamStatus.ON_BREAK,
      breakStartedAt: now,
      breakDeadlineAt: breakDeadline,
      durationSeconds: 600,
    };
  }

  async endBreak(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { sections: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!exam) throw new NotFoundException('Exam not found');
    if (exam.status !== ExamStatus.ON_BREAK) {
      throw new BadRequestException('Exam is not currently on break');
    }

    const nextSection = exam.sections.find((s) => s.status === SectionStatus.NOT_STARTED);
    const now = new Date();

    if (nextSection) {
      const durationSeconds = 45 * 60;
      const nextDeadline = new Date(now.getTime() + durationSeconds * 1000);

      await this.prisma.examSection.update({
        where: { id: nextSection.id },
        data: {
          status: SectionStatus.IN_PROGRESS,
          startedAt: now,
          sectionDeadlineAt: nextDeadline,
        },
      });

      await this.prisma.exam.update({
        where: { id: examId },
        data: { status: ExamStatus.IN_PROGRESS },
      });

      await this.recordEvent(examId, {
        type: 'BREAK_ENDED',
        payload: { endedAt: now, nextSectionId: nextSection.id },
      });

      return {
        examStatus: ExamStatus.IN_PROGRESS,
        activeSectionId: nextSection.id,
        sectionDeadlineAt: nextDeadline,
      };
    } else {
      return this.completeExam(examId);
    }
  }

  async syncTime(examId: string, sectionId?: string) {
    const now = new Date();
    if (!sectionId) {
      const exam = await this.prisma.exam.findUnique({
        where: { id: examId },
        include: { sections: { where: { status: SectionStatus.IN_PROGRESS } } },
      });
      if (!exam) throw new NotFoundException('Exam not found');
      const activeSection = exam.sections[0];
      return {
        serverTimestamp: now,
        examStatus: exam.status,
        activeSectionId: activeSection?.id,
        sectionDeadlineAt: activeSection?.sectionDeadlineAt,
        timeRemainingSeconds: activeSection?.sectionDeadlineAt
          ? Math.max(0, Math.floor((activeSection.sectionDeadlineAt.getTime() - now.getTime()) / 1000))
          : 0,
        isExpired: activeSection?.sectionDeadlineAt ? now > activeSection.sectionDeadlineAt : false,
      };
    }

    const section = await this.prisma.examSection.findUnique({
      where: { id: sectionId },
    });
    if (!section) throw new NotFoundException('Section not found');

    const isExpired = section.sectionDeadlineAt ? now > section.sectionDeadlineAt : false;
    const timeRemainingSeconds = section.sectionDeadlineAt
      ? Math.max(0, Math.floor((section.sectionDeadlineAt.getTime() - now.getTime()) / 1000))
      : 0;

    return {
      serverTimestamp: now,
      sectionStatus: section.status,
      sectionDeadlineAt: section.sectionDeadlineAt,
      timeRemainingSeconds,
      isExpired,
      editsRemaining: section.editsRemaining,
    };
  }

  async recordEvent(examId: string, eventData: {
    type: string;
    sectionId?: string;
    sequenceNumber?: number;
    idempotencyKey?: string;
    payload?: any;
  }) {
    if (eventData.idempotencyKey) {
      const existing = await this.prisma.examEvent.findUnique({
        where: { idempotencyKey: eventData.idempotencyKey },
      });
      if (existing) return existing;
    }

    return this.prisma.examEvent.create({
      data: {
        examId,
        sectionId: eventData.sectionId,
        sequenceNumber: eventData.sequenceNumber ?? 0,
        type: eventData.type,
        idempotencyKey: eventData.idempotencyKey,
        payload: eventData.payload ?? {},
      },
    });
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
