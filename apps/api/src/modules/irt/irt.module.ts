import { Module } from '@nestjs/common';
import { IrtService } from './irt.service';

@Module({
  providers: [IrtService],
  exports: [IrtService],
})
export class IrtModule {}
