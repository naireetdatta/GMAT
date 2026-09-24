import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ExamModule } from './modules/exam/exam.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { IrtModule } from './modules/irt/irt.module';
import { AiModule } from './modules/ai/ai.module';
import { TutorModule } from './modules/tutor/tutor.module';
import { FlashcardsModule } from './modules/flashcards/flashcards.module';
import { MistakesModule } from './modules/mistakes/mistakes.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { StudyPlanModule } from './modules/study-plan/study-plan.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '../.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100,  // 100 requests per minute for authenticated
    }]),

    // Core
    PrismaModule,
    AuthModule,

    // Exam Engine
    ExamModule,
    QuestionsModule,
    IrtModule,

    // AI
    AiModule,
    TutorModule,

    // Learning
    FlashcardsModule,
    MistakesModule,
    StudyPlanModule,

    // Analytics
    AnalyticsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
