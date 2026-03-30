import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsService } from './workflows.service';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';

@Module({
  controllers: [WorkflowsController, VersionsController],
  providers: [WorkflowsService, VersionsService],
  exports: [WorkflowsService, VersionsService],
})
export class WorkflowsModule {}
