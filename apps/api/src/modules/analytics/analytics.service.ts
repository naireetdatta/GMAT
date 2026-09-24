import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SectionType } from '@prisma/client';
import { TopicAnalysis } from '@gmat/shared';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData(userId: string) {
    // 0. User metadata & preferences
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, preferences: true },
    });
    const prefs = (user?.preferences as any) || {};
    const targetScore = prefs.targetScore || 705;

    // 1. Total exams and average score
    const scores = await this.prisma.score.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const totalExams = scores.length;
    const avgScore = totalExams > 0 
      ? Math.round(scores.reduce((sum, s) => sum + s.totalScore, 0) / totalExams)
      : 0;

    // 2. Score history
    const scoreHistory = scores.map((s) => ({
      date: s.createdAt.toISOString().split('T')[0],
      score: s.totalScore,
    }));

    // 3. Recent exams
    const recentExams = await this.prisma.exam.findMany({
      where: { userId, status: 'COMPLETED' },
      include: { scores: true },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    const formattedRecent = recentExams.map((e) => ({
      id: e.id,
      type: e.type,
      totalScore: e.scores[0]?.totalScore || 205,
      completedAt: e.completedAt || e.createdAt,
      duration: Math.round(
        e.completedAt && e.startedAt 
          ? (e.completedAt.getTime() - e.startedAt.getTime()) / 1000 
          : 0
      ),
    }));

    // 4. Questions Attempted today and accuracy
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const questionsToday = await this.prisma.examQuestion.findMany({
      where: {
        section: { exam: { userId } },
        answeredAt: { gte: startOfToday },
        isSkipped: false,
      },
    });

    const totalToday = questionsToday.length;
    const correctToday = questionsToday.filter((q) => q.isCorrect).length;
    const accuracyToday = totalToday > 0 ? Math.round((correctToday / totalToday) * 100) : 0;

    // 5. Streaks calculation
    const activeDays = await this.prisma.examQuestion.findMany({
      where: {
        section: { exam: { userId } },
        answeredAt: { not: null },
      },
      select: { answeredAt: true },
      distinct: ['answeredAt'],
    });

    const dateStrings = activeDays
      .map((d) => d.answeredAt!.toISOString().split('T')[0])
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // descending (newest first)

    const uniqueDates = Array.from(new Set(dateStrings));
    let streakDays = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // If student did something today or yesterday, streak could be active
    if (uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)) {
      let currentCheck = uniqueDates.includes(todayStr) 
        ? new Date(todayStr) 
        : new Date(yesterdayStr);

      for (const dateStr of uniqueDates) {
        const checkStr = currentCheck.toISOString().split('T')[0];
        if (dateStr === checkStr) {
          streakDays++;
          currentCheck.setDate(currentCheck.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // 6. Topic Performance Analysis
    const allAttempted = await this.prisma.examQuestion.findMany({
      where: {
        section: { exam: { userId } },
        isSkipped: false,
        userAnswer: { not: null },
      },
      include: { question: true },
    });

    const topicPerformance = this.aggregateTopicPerformance(allAttempted);

    return {
      user: {
        name: user?.name,
        email: user?.email,
      },
      targetScore,
      totalExams,
      avgScore,
      scoreHistory,
      topicPerformance,
      recentExams: formattedRecent,
      streakDays,
      questionsToday: totalToday,
      accuracyToday,
    };
  }

  private aggregateTopicPerformance(attempts: any[]): TopicAnalysis[] {
    const topicGroups: Record<string, {
      topic: string;
      section: SectionType;
      attempts: number;
      correct: number;
      totalTime: number;
    }> = {};

    for (const att of attempts) {
      const key = `${att.question.section}-${att.question.topic}`;
      if (!topicGroups[key]) {
        topicGroups[key] = {
          topic: att.question.topic,
          section: att.question.section,
          attempts: 0,
          correct: 0,
          totalTime: 0,
        };
      }
      topicGroups[key].attempts++;
      if (att.isCorrect) topicGroups[key].correct++;
      topicGroups[key].totalTime += att.timeTaken;
    }

    return Object.values(topicGroups).map((g) => ({
      topic: g.topic,
      section: g.section as any,
      accuracy: Math.round((g.correct / g.attempts) * 100),
      questionsAttempted: g.attempts,
      avgTime: Math.round(g.totalTime / g.attempts),
      trend: 'stable' as const, // can compute dynamically in production
    }));
  }

  async generateCoachReport(userId: string, examId?: string) {
    const dashboard = await this.getDashboardData(userId);
    const scores = await this.prisma.score.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const currentScore = scores[0]?.totalScore || 205;
    const targetScore = 705; // Mock/default target GMAT Focus Score
    const predictedScore = dashboard.avgScore > 0 ? Math.min(dashboard.avgScore + 30, 805) : 455;

    // Filter topic accuracy into strong vs weak areas
    const sortedTopics = [...dashboard.topicPerformance].sort((a, b) => b.accuracy - a.accuracy);
    const strongAreas = sortedTopics.filter((t) => t.accuracy >= 70).slice(0, 3);
    const weakAreas = sortedTopics.filter((t) => t.accuracy < 70).slice(0, 3);

    // Mock milestone/study recommended schedule for Coach Report
    const studyPlan = [
      {
        day: 1,
        date: new Date().toISOString().split('T')[0],
        estimatedHours: 2.5,
        tasks: [
          {
            type: 'practice' as const,
            topic: weakAreas[0]?.topic || 'Algebra',
            section: weakAreas[0]?.section || SectionType.QUANTITATIVE,
            description: 'Focus on variables and formulas. Eliminate wrong options.',
            durationMinutes: 60,
            priority: 'high' as const,
          },
          {
            type: 'flashcards' as const,
            topic: 'Core Traps',
            section: SectionType.VERBAL,
            description: 'Review CR Spaced Repetition flashcards.',
            durationMinutes: 20,
            priority: 'medium' as const,
          }
        ]
      }
    ];

    const reportData = {
      currentScore,
      predictedScore,
      targetScore,
      weakAreas,
      strongAreas,
      studyPlan,
      timeManagement: {
        avgTimePerQuestion: {
          QUANTITATIVE: 125,
          VERBAL: 110,
          DATA_INSIGHTS: 135,
        },
        timeVsAccuracy: [
          { time: 60, accuracy: 40 },
          { time: 120, accuracy: 75 },
          { time: 180, accuracy: 65 },
        ],
        rushingThreshold: 60,
        overthinkingThreshold: 180,
      },
      difficultyAnalysis: [
        { level: 400, attempted: 20, correct: 18, accuracy: 90 },
        { level: 600, attempted: 30, correct: 20, accuracy: 66 },
        { level: 700, attempted: 15, correct: 6, accuracy: 40 },
      ],
      improvementTimeline: [
        { weekNumber: 1, expectedScore: currentScore, focus: 'Foundation review' },
        { weekNumber: 4, expectedScore: Math.round((currentScore + predictedScore) / 2), focus: 'Speed drills & DI pacing' },
        { weekNumber: 8, expectedScore: targetScore, focus: 'Trap recognition & full mocks' },
      ],
    };

    return this.prisma.coachReport.create({
      data: {
        userId,
        examId,
        reportData: reportData as any,
      },
    });
  }

  async getCoachReports(userId: string) {
    return this.prisma.coachReport.findMany({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async getCoachReport(id: string, userId: string) {
    const report = await this.prisma.coachReport.findFirst({
      where: { id, userId },
    });
    if (!report) {
      throw new NotFoundException(`Coach report ${id} not found`);
    }
    return report;
  }
}
