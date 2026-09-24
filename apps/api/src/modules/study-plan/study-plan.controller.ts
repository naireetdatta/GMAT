import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StudyPlanService } from './study-plan.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('study-plan')
@UseGuards(JwtAuthGuard)
export class StudyPlanController {
  constructor(private readonly studyPlanService: StudyPlanService) {}

  @Post()
  async create(
    @Request() req: any,
    @Body() body: {
      currentScore: number;
      targetScore: number;
      examDate: string;
      hoursPerDay: number;
    },
  ) {
    return this.studyPlanService.createPlan(req.user.sub, body);
  }

  @Get('active')
  async getActive(@Request() req: any) {
    return this.studyPlanService.getActivePlan(req.user.sub);
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.studyPlanService.getPlans(req.user.sub);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { plan: any },
  ) {
    return this.studyPlanService.updatePlan(id, req.user.sub, body.plan);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.studyPlanService.deletePlan(id, req.user.sub);
  }
}
