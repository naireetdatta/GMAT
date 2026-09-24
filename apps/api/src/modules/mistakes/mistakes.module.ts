import { Module } from '@nestjs/common';
import { MistakesService } from './mistakes.service';
import { MistakesController } from './mistakes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MistakesController],
  providers: [MistakesService],
  exports: [MistakesService],
})
export class MistakesModule {}
