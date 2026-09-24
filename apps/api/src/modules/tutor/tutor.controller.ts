import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TutorService } from './tutor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TutorMode } from '@prisma/client';

@Controller('tutor')
@UseGuards(JwtAuthGuard)
export class TutorController {
  constructor(private readonly tutorService: TutorService) {}

  @Post('sessions')
  async createSession(
    @Request() req: any,
    @Body() body: { mode: TutorMode; title?: string },
  ) {
    return this.tutorService.createSession(req.user.sub, body.mode, body.title);
  }

  @Get('sessions')
  async getSessions(@Request() req: any) {
    return this.tutorService.getSessions(req.user.sub);
  }

  @Get('sessions/:id')
  async getSession(@Request() req: any, @Param('id') id: string) {
    return this.tutorService.getSession(req.user.sub, id);
  }

  @Post('sessions/:id/message')
  async sendMessage(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { content: string },
  ) {
    return this.tutorService.sendMessage(req.user.sub, id, body.content);
  }
}
