import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IrtService } from '../irt/irt.service';
import { ScoringService } from './scoring.service';
import { ExamStatus, SectionStatus, SectionType, ExamType, QuestionType } from '@prisma/client';
import { QuestionGeneratorService } from '../ai/question-generator.service';

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly irtService: IrtService,
    private readonly scoringService: ScoringService,
    private readonly questionGenerator: QuestionGeneratorService,
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

    // Allocate questions for all sections up-front so questions are immediately ready
    for (const section of exam.sections) {
      await this.allocateQuestionsForSection(
        section.id,
        section.section,
        sectionConfigs[section.section].questionCount,
        0, // initial ability estimate
        userId,
      );
    }

    // In background, mint fresh AI questions so the question pool keeps growing
    this.generateBackgroundQuestions(sectionOrder).catch((e) => {
      this.logger.debug(`Background AI question seeding completed or skipped: ${e}`);
    });

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

    let examQuestion =
      section.questions.find((q) => q.orderIndex === questionIndex) ||
      section.questions[questionIndex];

    if (!examQuestion) {
      // Auto-heal: find an available question not already in this section
      const alreadyInSec = new Set(section.questions.map((q) => q.questionId));
      const fallbackQ =
        (await this.prisma.question.findFirst({
          where: {
            section: section.section,
            validated: true,
            id: { notIn: Array.from(alreadyInSec) },
          },
        })) ||
        (await this.prisma.question.findFirst({
          where: {
            section: section.section,
            id: { notIn: Array.from(alreadyInSec) },
          },
        })) ||
        (await this.prisma.question.findFirst());

      if (fallbackQ) {
        examQuestion = await this.prisma.examQuestion.create({
          data: {
            sectionId,
            questionId: fallbackQ.id,
            orderIndex: questionIndex,
          },
          include: { question: true },
        });
      } else {
        throw new NotFoundException('Question not found');
      }
    }

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
    if (!eq) {
      return { id: examQuestionId, isFlagged: false };
    }

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
        exam.userId,
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
    userId?: string,
  ) {
    // Avoid double allocation if questions are already assigned
    const existing = await this.prisma.examQuestion.count({
      where: { sectionId },
    });
    if (existing >= count) {
      return;
    }

    // 1. Identify questions already served to this user in any past exam
    let seenQuestionIds: string[] = [];
    if (userId) {
      const pastAttempts = await this.prisma.examQuestion.findMany({
        where: { section: { exam: { userId } } },
        select: { questionId: true },
      });
      seenQuestionIds = pastAttempts.map((p) => p.questionId);
    }

    // 2. Select questions not yet seen by this user
    let availableQuestions = await this.prisma.question.findMany({
      where: {
        section: sectionType,
        validated: true,
        ...(seenQuestionIds.length > 0 ? { id: { notIn: seenQuestionIds } } : {}),
      },
      orderBy: { irtDifficulty: 'asc' },
    });

    if (availableQuestions.length < count) {
      // Fallback: check unvalidated questions not yet seen
      const unvalidated = await this.prisma.question.findMany({
        where: {
          section: sectionType,
          validated: false,
          ...(seenQuestionIds.length > 0 ? { id: { notIn: seenQuestionIds } } : {}),
        },
        orderBy: { irtDifficulty: 'asc' },
      });
      if (unvalidated.length > 0) {
        availableQuestions.push(...unvalidated);
      }
    }

    // De-duplicate available questions by ID
    const distinctMap = new Map<string, (typeof availableQuestions)[0]>();
    for (const q of availableQuestions) {
      distinctMap.set(q.id, q);
    }

    // 3. Runtime AI Question Generation: if bank has fewer unseen questions than needed, generate dynamically!
    if (distinctMap.size < count) {
      const needed = count - distinctMap.size;
      const batchSize = 3;
      for (let i = 0; i < needed; i += batchSize) {
        const chunkCount = Math.min(batchSize, needed - i);
        const promises = Array.from({ length: chunkCount }, (_, ci) => {
          const idx = distinctMap.size + ci;
          const topic = this.getTopicForSection(sectionType, idx);
          const type = this.getTypeForSection(sectionType, idx);
          return this.questionGenerator.generateAndSaveQuestion({
            section: sectionType,
            topic,
            difficulty: 540 + ((idx % 6) * 35),
            type,
          }).catch((err) => {
            this.logger.warn(`AI generation error for ${sectionType}: ${err}`);
            return null;
          });
        });

        const results = await Promise.all(promises);
        for (const q of results) {
          if (q && !distinctMap.has(q.id)) {
            distinctMap.set(q.id, q as any);
          }
        }
        if (distinctMap.size >= count) break;
      }
    }

    // 4. In case user has taken dozens of exams and exhausted all unseen questions:
    // Supplement from general pool ensuring NO question repeats within this section!
    if (distinctMap.size < count) {
      const generalBank = await this.prisma.question.findMany({
        where: { section: sectionType },
        orderBy: { updatedAt: 'asc' },
      });
      for (const q of generalBank) {
        if (!distinctMap.has(q.id)) {
          distinctMap.set(q.id, q);
        }
        if (distinctMap.size >= count) break;
      }
    }

    const distinctQuestions = Array.from(distinctMap.values());
    let selectedQuestions: typeof availableQuestions = [];

    if (distinctQuestions.length >= count) {
      // Use IRT to select optimal distinct questions
      try {
        selectedQuestions = this.irtService.selectQuestions(
          distinctQuestions.map((q) => ({
            id: q.id,
            difficulty: q.irtDifficulty,
            discrimination: q.irtDiscrimination,
            guessing: q.irtGuessing,
            topic: q.topic,
          })),
          initialAbility,
          count,
        ).map((selected) => distinctQuestions.find((q) => q.id === selected.id)!);
      } catch {
        selectedQuestions = distinctQuestions.slice(0, count);
      }
    } else {
      selectedQuestions = distinctQuestions;
    }

    // 5. Create exam question entries with strictly unique questions (exact count)
    const finalSelection = selectedQuestions.slice(0, count);
    if (finalSelection.length > 0) {
      await this.prisma.examQuestion.createMany({
        data: finalSelection.map((q, index) => ({
          sectionId,
          questionId: q.id,
          orderIndex: index,
        })),
        skipDuplicates: true,
      });
    }
  }

  private getTopicForSection(section: SectionType, index: number): string {
    if (section === SectionType.QUANTITATIVE) {
      const topics = [
        'Algebra', 'Arithmetic', 'Word Problems', 'Ratios & Proportions',
        'Percentages', 'Rates & Work', 'Statistics', 'Number Properties', 'Inequalities'
      ];
      return topics[index % topics.length];
    }
    if (section === SectionType.VERBAL) {
      return index % 2 === 0 ? 'Critical Reasoning' : 'Reading Comprehension';
    }
    const diTopics = [
      'Data Sufficiency', 'Table Analysis', 'Multi-Source Reasoning',
      'Two-Part Analysis', 'Graphics Interpretation'
    ];
    return diTopics[index % diTopics.length];
  }

  private getTypeForSection(section: SectionType, index: number): QuestionType {
    if (section === SectionType.QUANTITATIVE) {
      return QuestionType.PROBLEM_SOLVING;
    }
    if (section === SectionType.VERBAL) {
      return index % 2 === 0 ? QuestionType.CRITICAL_REASONING : QuestionType.READING_COMPREHENSION;
    }
    const diTypes = [
      QuestionType.DATA_SUFFICIENCY,
      QuestionType.TABLE_ANALYSIS,
      QuestionType.MULTI_SOURCE_REASONING,
      QuestionType.TWO_PART_ANALYSIS,
      QuestionType.GRAPHICS_INTERPRETATION,
    ];
    return diTypes[index % diTypes.length];
  }

  private async generateBackgroundQuestions(sectionOrder: SectionType[]) {
    for (const section of sectionOrder) {
      try {
        const topic = this.getTopicForSection(section, Math.floor(Math.random() * 10));
        const type = this.getTypeForSection(section, Math.floor(Math.random() * 5));
        await this.questionGenerator.generateAndSaveQuestion({
          section,
          topic,
          difficulty: 600 + Math.floor(Math.random() * 120),
          type,
        });
      } catch (e) {
        // non-blocking
      }
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
