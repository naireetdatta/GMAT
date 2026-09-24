import { Module } from '@nestjs/common';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { QuestionGeneratorService } from './question-generator.service';
import { ValidationAgentService } from './validation-agent.service';
import { ExplanationGeneratorService } from './explanation-generator.service';

@Module({
  providers: [
    AiOrchestratorService,
    QuestionGeneratorService,
    ValidationAgentService,
    ExplanationGeneratorService,
  ],
  exports: [
    AiOrchestratorService,
    QuestionGeneratorService,
    ValidationAgentService,
    ExplanationGeneratorService,
  ],
})
export class AiModule {}
