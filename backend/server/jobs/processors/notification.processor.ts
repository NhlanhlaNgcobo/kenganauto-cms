import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JOB_QUEUES } from '../job.constants';
import { MessagingService } from '../../services/messaging.service';

@Processor(JOB_QUEUES.notifications)
export class NotificationProcessor extends WorkerHost {
  constructor(private readonly messaging: MessagingService) {
    super();
  }

  async process(job: Job<any, any, string>) {
    return this.messaging.dispatch(job.data);
  }
}
