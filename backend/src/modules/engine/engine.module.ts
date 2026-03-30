import { Module } from '@nestjs/common';
import { EngineService } from './engine.service';
import { SlaModule } from '../sla/sla.module';

@Module({
  imports: [SlaModule],
  providers: [EngineService],
  exports: [EngineService],
})
export class EngineModule {}
