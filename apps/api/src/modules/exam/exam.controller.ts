import { Controller, Post, Get, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ExamService } from './exam.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SectionType, ExamType } from '@prisma/client';

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post()
  async createExam(
    @Request() req: any,
    @Body() body: { type: ExamType; sectionOrder: SectionType[] },
  ) {
    return this.examService.createExam(req.user.sub, body.type, body.sectionOrder);
  }

  @Get()
  async getExams(@Request() req: any) {
    return this.examService.getExamsByUser(req.user.sub);
  }

  @Get(':id')
  async getExam(@Param('id') id: string) {
    return this.examService.getExam(id);
  }

  @Get(':id/sync')
  async syncExam(@Param('id') id: string) {
    return this.examService.syncTime(id);
  }

  @Get(':id/sections/:sectionId/sync')
  async syncSectionTime(
    @Param('id') examId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.examService.syncTime(examId, sectionId);
  }

  @Patch(':id/sections/:sectionId/answer')
  async submitAnswer(
    @Param('id') examId: string,
    @Param('sectionId') sectionId: string,
    @Body() body: { questionIndex: number; answer: string; idempotencyKey?: string },
  ) {
    return this.examService.submitAnswer(
      examId,
      sectionId,
      body.questionIndex,
      body.answer,
      body.idempotencyKey,
    );
  }

  @Patch(':id/questions/:questionId/flag')
  async flagQuestion(@Param('questionId') questionId: string) {
    return this.examService.flagQuestion(questionId);
  }

  @Post(':id/break/start')
  async startBreak(@Param('id') examId: string) {
    return this.examService.startBreak(examId);
  }

  @Post(':id/break/end')
  async endBreak(@Param('id') examId: string) {
    return this.examService.endBreak(examId);
  }

  @Post(':id/events')
  async recordEvent(
    @Param('id') examId: string,
    @Body() body: { type: string; sectionId?: string; sequenceNumber?: number; idempotencyKey?: string; payload?: any },
  ) {
    return this.examService.recordEvent(examId, body);
  }

  @Post(':id/sections/:sectionId/complete')
  async completeSection(
    @Param('id') examId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.examService.completeSection(examId, sectionId);
  }

  @Patch(':id/sections/:sectionId/time')
  async updateTime(
    @Param('sectionId') sectionId: string,
    @Body() body: { timeRemaining: number },
  ) {
    return this.examService.updateTimeRemaining(sectionId, body.timeRemaining);
  }
}
