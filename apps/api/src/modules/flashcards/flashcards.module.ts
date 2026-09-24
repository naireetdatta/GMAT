import { Module } from '@nestjs/common';
import { FlashcardService } from './flashcards.service';
import { FlashcardsController } from './flashcards.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [FlashcardsController],
  providers: [FlashcardService],
  exports: [FlashcardService],
})
export class FlashcardsModule {}
