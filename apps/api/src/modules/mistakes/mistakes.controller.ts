import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MistakesService } from './mistakes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SectionType, ErrorType } from '@prisma/client';

@Controller('mistakes')
@UseGuards(JwtAuthGuard)
export class MistakesController {
  constructor(private readonly mistakesService: MistakesService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('section') section?: SectionType,
    @Query('errorType') errorType?: ErrorType,
  ) {
    return this.mistakesService.findAll(req.user.sub, { section, errorType });
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.mistakesService.findOne(id, req.user.sub);
  }

  @Post()
  async create(
    @Request() req: any,
    @Body() body: {
      questionId: string;
      examId?: string;
      errorType?: ErrorType;
      notes?: string;
      tags?: string[];
    },
  ) {
    return this.mistakesService.create(req.user.sub, body);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      errorType?: ErrorType;
      notes?: string;
      tags?: string[];
    },
  ) {
    return this.mistakesService.update(id, req.user.sub, body);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.mistakesService.remove(id, req.user.sub);
  }

  @Post('auto-capture/:examId')
  async autoCapture(@Request() req: any, @Param('examId') examId: string) {
    return this.mistakesService.autoCaptureFromExam(req.user.sub, examId);
  }
}
