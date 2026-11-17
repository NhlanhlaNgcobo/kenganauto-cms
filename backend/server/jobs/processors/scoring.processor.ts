import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JOB_QUEUES } from '../job.constants';
import { PlatformService } from '../../services/platform.service';

@Processor(JOB_QUEUES.scoring)
export class ScoringProcessor extends WorkerHost {
  constructor(private readonly platform: PlatformService) {
    super();
  }

  async process(job: Job<any, any, string>) {
    return this.platform.refreshLeadSummary(job.data.tenantId, job.data.leadId);
  }
}
