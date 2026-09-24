import { Module } from '@nestjs/common';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { ScoringService } from './scoring.service';
import { IrtModule } from '../irt/irt.module';

@Module({
  imports: [IrtModule],
  controllers: [ExamController],
  providers: [ExamService, ScoringService],
  exports: [ExamService],
})
export class ExamModule {}
