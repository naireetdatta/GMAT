import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { SectionType, QuestionType, Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  async findAll(
    @Query('section') section?: SectionType,
    @Query('type') type?: QuestionType,
    @Query('topic') topic?: string,
    @Query('difficultyMin') difficultyMin?: string,
    @Query('difficultyMax') difficultyMax?: string,
    @Query('validated') validated?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.questionsService.findAll({
      section,
      type,
      topic,
      difficultyMin: difficultyMin ? parseInt(difficultyMin, 10) : undefined,
      difficultyMax: difficultyMax ? parseInt(difficultyMax, 10) : undefined,
      validated: validated !== undefined ? validated === 'true' : undefined,
      take: take ? parseInt(take, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });
  }

  @Get('topics')
  async getTopics(@Query('section') section?: SectionType) {
    return this.questionsService.getTopics(section);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() createQuestionDto: Prisma.QuestionCreateInput) {
    return this.questionsService.create(createQuestionDto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateQuestionDto: Prisma.QuestionUpdateInput,
  ) {
    return this.questionsService.update(id, updateQuestionDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.questionsService.remove(id);
  }
}
