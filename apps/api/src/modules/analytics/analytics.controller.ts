import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    return this.analyticsService.getDashboardData(req.user.sub);
  }

  @Get('reports')
  async getReports(@Request() req: any) {
    return this.analyticsService.getCoachReports(req.user.sub);
  }

  @Get('reports/:id')
  async getReport(@Request() req: any, @Param('id') id: string) {
    return this.analyticsService.getCoachReport(id, req.user.sub);
  }

  @Post('reports')
  async generateReport(
    @Request() req: any,
    @Body() body: { examId?: string },
  ) {
    return this.analyticsService.generateCoachReport(req.user.sub, body.examId);
  }
}
