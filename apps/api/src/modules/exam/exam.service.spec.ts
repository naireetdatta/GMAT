import { Test, TestingModule } from '@nestjs/testing';
import { ExamService } from './exam.service';
import { ScoringService } from './scoring.service';
import { IrtService } from '../irt/irt.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExamStatus, SectionStatus, SectionType, ExamType } from '@prisma/client';

describe('ExamService (High-Fidelity GMAT Simulation Tests)', () => {
  let examService: ExamService;
  let scoringService: ScoringService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      exam: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      examSection: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      examQuestion: {
        findUnique: jest.fn(),
        update: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      question: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      score: {
        create: jest.fn(),
      },
      mistakeEntry: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      examEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'evt-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        ScoringService,
        IrtService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    examService = module.get<ExamService>(ExamService);
    scoringService = module.get<ScoringService>(ScoringService);
  });

  describe('1. Exam Creation & Initialization', () => {
    it('should initialize an exam with the requested section order and server-authoritative deadline', async () => {
      const userId = 'user-1';
      const type = ExamType.ADAPTIVE;
      const sectionOrder = [SectionType.VERBAL, SectionType.QUANTITATIVE, SectionType.DATA_INSIGHTS];

      const createdExamMock = {
        id: 'exam-123',
        userId,
        type,
        status: ExamStatus.IN_PROGRESS,
        sectionOrder,
        sections: [
          { id: 'sec-1', section: SectionType.VERBAL, status: SectionStatus.IN_PROGRESS, timeRemaining: 2700 },
          { id: 'sec-2', section: SectionType.QUANTITATIVE, status: SectionStatus.NOT_STARTED, timeRemaining: 2700 },
          { id: 'sec-3', section: SectionType.DATA_INSIGHTS, status: SectionStatus.NOT_STARTED, timeRemaining: 2700 },
        ],
      };

      prisma.exam.create.mockResolvedValue(createdExamMock);
      prisma.exam.findUnique.mockResolvedValue(createdExamMock);

      const result = await examService.createExam(userId, type, sectionOrder);

      expect(prisma.exam.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            type,
            status: ExamStatus.IN_PROGRESS,
            sectionOrder,
            sections: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  section: SectionType.VERBAL,
                  orderIndex: 0,
                  status: SectionStatus.IN_PROGRESS,
                  sectionDeadlineAt: expect.any(Date),
                }),
              ]),
            }),
          }),
        }),
      );

      expect(prisma.examEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            examId: 'exam-123',
            type: 'EXAM_STARTED',
          }),
        }),
      );

      expect(result).toBeDefined();
    });
  });

  describe('2. Server-Authoritative Timer & Deadline Enforcement', () => {
    it('should reject answer submission if the server deadline has expired', async () => {
      const pastDeadline = new Date(Date.now() - 5000); // Expired 5 seconds ago

      prisma.examSection.findUnique.mockResolvedValue({
        id: 'sec-1',
        examId: 'exam-1',
        status: SectionStatus.IN_PROGRESS,
        sectionDeadlineAt: pastDeadline,
        editsRemaining: 3,
        abilityEstimate: 0,
        questions: [{ id: 'eq-1', userAnswer: null, question: { correctAnswer: 'A' } }],
      });

      // completeSection internal mock
      prisma.examSection.update.mockResolvedValue({ id: 'sec-1', status: SectionStatus.COMPLETED });
      prisma.exam.findUnique.mockResolvedValue({
        id: 'exam-1',
        sections: [{ id: 'sec-1', status: SectionStatus.COMPLETED, sectionScore: 70 }],
      });

      await expect(
        examService.submitAnswer('exam-1', 'sec-1', 0, 'A'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Server-Enforced 3-Edit Limit Rule', () => {
    it('should decrement editsRemaining when user changes an existing answer', async () => {
      const futureDeadline = new Date(Date.now() + 1000 * 60);

      prisma.examSection.findUnique.mockResolvedValue({
        id: 'sec-1',
        examId: 'exam-1',
        status: SectionStatus.IN_PROGRESS,
        sectionDeadlineAt: futureDeadline,
        editsRemaining: 3,
        abilityEstimate: 0,
        questions: [
          {
            id: 'eq-1',
            questionId: 'q-1',
            userAnswer: 'A', // Already answered 'A'
            isCorrect: false,
            question: { correctAnswer: 'B', irtDifficulty: 0, irtDiscrimination: 1, irtGuessing: 0.2 },
          },
        ],
      });

      prisma.examQuestion.update.mockResolvedValue({});
      prisma.examSection.update.mockResolvedValue({});

      const result = await examService.submitAnswer('exam-1', 'sec-1', 0, 'B');

      // Must decrement editsRemaining
      expect(prisma.examSection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sec-1' },
          data: { editsRemaining: 2 },
        }),
      );

      // Must log ANSWER_EDITED
      expect(prisma.examEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'ANSWER_EDITED',
          }),
        }),
      );

      expect(result.editsRemaining).toBe(2);
      expect(result.isCorrect).toBe(true);
    });

    it('should strictly reject answer modification if editsRemaining is 0', async () => {
      const futureDeadline = new Date(Date.now() + 1000 * 60);

      prisma.examSection.findUnique.mockResolvedValue({
        id: 'sec-1',
        examId: 'exam-1',
        status: SectionStatus.IN_PROGRESS,
        sectionDeadlineAt: futureDeadline,
        editsRemaining: 0, // Exhausted edits
        questions: [
          {
            id: 'eq-1',
            userAnswer: 'A',
            question: { correctAnswer: 'B' },
          },
        ],
      });

      await expect(
        examService.submitAnswer('exam-1', 'sec-1', 0, 'C'),
      ).rejects.toThrow('Maximum 3 answer edits reached for this section');
    });
  });

  describe('4. Break Engine & Single Break Enforcement', () => {
    it('should allow taking a break after section 1 or section 2 and set a 10-minute deadline', async () => {
      prisma.exam.findUnique.mockResolvedValue({
        id: 'exam-1',
        status: ExamStatus.IN_PROGRESS,
        breakTaken: false,
        sections: [
          { id: 'sec-1', status: SectionStatus.COMPLETED },
          { id: 'sec-2', status: SectionStatus.NOT_STARTED },
        ],
      });

      prisma.exam.update.mockResolvedValue({});

      const result = await examService.startBreak('exam-1');

      expect(result.status).toBe(ExamStatus.ON_BREAK);
      expect(result.durationSeconds).toBe(600);
      expect(prisma.exam.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'exam-1' },
          data: expect.objectContaining({
            status: ExamStatus.ON_BREAK,
            breakTaken: true,
            breakDeadlineAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should strictly reject attempting a second break', async () => {
      prisma.exam.findUnique.mockResolvedValue({
        id: 'exam-1',
        status: ExamStatus.IN_PROGRESS,
        breakTaken: true, // Already taken
        sections: [
          { id: 'sec-1', status: SectionStatus.COMPLETED },
          { id: 'sec-2', status: SectionStatus.COMPLETED },
          { id: 'sec-3', status: SectionStatus.NOT_STARTED },
        ],
      });

      await expect(examService.startBreak('exam-1')).rejects.toThrow(
        'Break has already been used for this exam',
      );
    });
  });

  describe('5. Scoring Service Rigor', () => {
    it('should map theta in [-3, 3] to section scaled score in [60, 90]', () => {
      expect(scoringService.calculateSectionScore(-3.0)).toBe(60);
      expect(scoringService.calculateSectionScore(0.0)).toBe(75);
      expect(scoringService.calculateSectionScore(3.0)).toBe(90);
      expect(scoringService.calculateSectionScore(1.0)).toBe(80);
    });

    it('should map section scores to total score in [205, 805] in 10-point steps', () => {
      expect(scoringService.calculateTotalScore(60, 60, 60)).toBe(205);
      expect(scoringService.calculateTotalScore(90, 90, 90)).toBe(805);
      expect(scoringService.calculateTotalScore(75, 75, 75)).toBe(505);
      // Equal weighting test
      const score = scoringService.calculateTotalScore(80, 80, 80);
      expect(score % 10).toBe(5); // GMAT scores end in 5 (e.g. 605, 705)
    });

    it('should accurately calculate percentiles', () => {
      expect(scoringService.calculatePercentile(805)).toBe(99);
      expect(scoringService.calculatePercentile(705)).toBe(90);
      expect(scoringService.calculatePercentile(505)).toBe(21);
      expect(scoringService.calculatePercentile(205)).toBe(0);
    });
  });
});
