import { Module } from '@nestjs/common';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { ScoringService } from './scoring.service';
import { IrtModule } from '../irt/irt.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [IrtModule, AiModule],
  controllers: [ExamController],
  providers: [ExamService, ScoringService],
  exports: [ExamService],
})
export class ExamModule {}
