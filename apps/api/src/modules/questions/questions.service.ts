import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SectionType, QuestionType, Prisma } from '@prisma/client';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: {
    section?: SectionType;
    type?: QuestionType;
    topic?: string;
    difficultyMin?: number;
    difficultyMax?: number;
    validated?: boolean;
    take?: number;
    skip?: number;
  }) {
    const where: Prisma.QuestionWhereInput = {};

    if (filters.section) where.section = filters.section;
    if (filters.type) where.type = filters.type;
    if (filters.topic) where.topic = filters.topic;
    if (filters.validated !== undefined) where.validated = filters.validated;

    if (filters.difficultyMin !== undefined || filters.difficultyMax !== undefined) {
      where.difficulty = {
        gte: filters.difficultyMin,
        lte: filters.difficultyMax,
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({
        where,
        take: filters.take || 50,
        skip: filters.skip || 0,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, items };
  }

  async findOne(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { stats: true, tags: true },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return question;
  }

  async create(data: Prisma.QuestionCreateInput) {
    return this.prisma.question.create({
      data,
    });
  }

  async update(id: string, data: Prisma.QuestionUpdateInput) {
    await this.findOne(id); // ensure it exists
    return this.prisma.question.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // ensure it exists
    return this.prisma.question.delete({
      where: { id },
    });
  }

  async getTopics(section?: SectionType) {
    const where = section ? { section } : {};
    const questions = await this.prisma.question.findMany({
      where,
      select: { topic: true },
      distinct: ['topic'],
    });
    return questions.map((q) => q.topic);
  }
}
