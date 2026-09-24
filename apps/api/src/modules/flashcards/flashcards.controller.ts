import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FlashcardService } from './flashcards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FlashcardType, SectionType } from '@prisma/client';

@Controller('flashcards')
@UseGuards(JwtAuthGuard)
export class FlashcardsController {
  constructor(private readonly flashcardService: FlashcardService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('section') section?: SectionType,
    @Query('type') type?: FlashcardType,
  ) {
    return this.flashcardService.findAll(req.user.sub, { section, type });
  }

  @Get('due')
  async getDue(@Request() req: any) {
    return this.flashcardService.getDue(req.user.sub);
  }

  @Post()
  async create(
    @Request() req: any,
    @Body() body: {
      front: string;
      back: string;
      type?: FlashcardType;
      section?: SectionType;
      topic?: string;
      difficulty?: number;
    },
  ) {
    return this.flashcardService.create(req.user.sub, body);
  }

  @Post(':id/review')
  async review(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { quality: number },
  ) {
    return this.flashcardService.processReview(id, req.user.sub, body.quality);
  }

  @Post('generate-from-mistake/:mistakeId')
  async generateFromMistake(
    @Request() req: any,
    @Param('mistakeId') mistakeId: string,
  ) {
    return this.flashcardService.generateFromMistake(req.user.sub, mistakeId);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.flashcardService.remove(id, req.user.sub);
  }
}
