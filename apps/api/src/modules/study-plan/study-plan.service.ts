import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SectionType } from '@prisma/client';

@Injectable()
export class StudyPlanService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlan(
    userId: string,
    data: {
      currentScore: number;
      targetScore: number;
      examDate: string;
      hoursPerDay: number;
    },
  ) {
    // Deactivate previous plans
    await this.prisma.studyPlan.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    const parsedDate = new Date(data.examDate);
    const today = new Date();
    const diffTime = Math.abs(parsedDate.getTime() - today.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 30; // fallback to 30 days

    // Generate GMAT Study Recommendation list
    const planSchedule = this.generateSchedule(totalDays, data.hoursPerDay, data.currentScore, data.targetScore);

    return this.prisma.studyPlan.create({
      data: {
        userId,
        currentScore: data.currentScore,
        targetScore: data.targetScore,
        examDate: parsedDate,
        hoursPerDay: data.hoursPerDay,
        plan: planSchedule as any,
        isActive: true,
      },
    });
  }

  async getActivePlan(userId: string) {
    const plan = await this.prisma.studyPlan.findFirst({
      where: { userId, isActive: true },
    });
    return plan;
  }

  async getPlans(userId: string) {
    return this.prisma.studyPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePlan(id: string, userId: string, data: any) {
    const plan = await this.prisma.studyPlan.findFirst({
      where: { id, userId },
    });
    if (!plan) throw new NotFoundException(`Study plan not found`);

    return this.prisma.studyPlan.update({
      where: { id },
      data: { plan: data },
    });
  }

  async deletePlan(id: string, userId: string) {
    const plan = await this.prisma.studyPlan.findFirst({
      where: { id, userId },
    });
    if (!plan) throw new NotFoundException(`Study plan not found`);

    return this.prisma.studyPlan.delete({
      where: { id },
    });
  }

  private generateSchedule(days: number, hours: number, current: number, target: number) {
    const schedule = [];
    const topicsList = {
      QUANT: ['Arithmetic', 'Algebra', 'Number Properties', 'Ratios & Percentages', 'Word Problems', 'Statistics'],
      VERBAL: ['Critical Reasoning - Assumption', 'Critical Reasoning - Strengthen/Weaken', 'Reading Comprehension - Details', 'Reading Comprehension - Inference'],
      DI: ['Data Sufficiency', 'Table Analysis', 'Graphics Interpretation', 'Multi-Source Reasoning', 'Two-Part Analysis']
    };

    // Calculate intensity levels
    const scoreDiff = target - current;

    for (let day = 1; day <= days; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day - 1);
      const dateString = date.toISOString().split('T')[0];

      // Standard split: 40% quant, 40% verbal, 20% DI/mocks
      let section = SectionType.QUANTITATIVE;
      let topic = '';
      let type: 'practice' | 'review' | 'flashcards' | 'tutor' | 'mock' = 'practice';
      let desc = '';

      if (day % 7 === 0) {
        // Mock day
        section = day % 14 === 0 ? SectionType.DATA_INSIGHTS : SectionType.VERBAL;
        type = 'mock';
        topic = 'Full Simulation';
        desc = 'Take a realistic, timed adaptive GMAT Focus practice test to measure pacing and score trajectory.';
      } else if (day % 2 === 0) {
        section = SectionType.VERBAL;
        const index = Math.floor((day / 2) % topicsList.VERBAL.length);
        topic = topicsList.VERBAL[index];
        type = day % 4 === 0 ? 'review' : 'practice';
        desc = type === 'review' 
          ? `Read concepts and complete verbal diagnostics on ${topic}.`
          : `Do verbal focus sets of 15 questions on ${topic}.`;
      } else if (day % 3 === 0) {
        section = SectionType.DATA_INSIGHTS;
        const index = Math.floor((day / 3) % topicsList.DI.length);
        topic = topicsList.DI[index];
        type = 'practice';
        desc = `Practice DI questions focusing on ${topic} and pace optimization.`;
      } else {
        section = SectionType.QUANTITATIVE;
        const index = Math.floor(day % topicsList.QUANT.length);
        topic = topicsList.QUANT[index];
        type = day % 5 === 0 ? 'flashcards' : 'practice';
        desc = type === 'flashcards'
          ? `Review formula cards and rules for ${topic}.`
          : `Solve 20 Quant questions on ${topic} with a target time of 2 mins per question.`;
      }

      schedule.push({
        day,
        date: dateString,
        estimatedHours: hours,
        tasks: [
          {
            type,
            topic,
            section,
            description: desc,
            durationMinutes: Math.round(hours * 60),
            priority: scoreDiff > 150 ? 'high' : 'medium',
          }
        ]
      });
    }

    return schedule;
  }
}
