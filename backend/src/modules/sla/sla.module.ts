import { Module } from '@nestjs/common';
import { SlaService } from './sla.service';
import { SlaWorker } from './sla.worker';

@Module({
  providers: [SlaService, SlaWorker],
  exports: [SlaService],
})
export class SlaModule {}
