import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { JOB_QUEUES } from './job.constants';
import { AutomationProcessor } from './processors/automation.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { ScoringProcessor } from './processors/scoring.processor';
import { MessagingService } from '../services/messaging.service';
import { BillingService } from '../services/billing.service';
import { PlatformService } from '../services/platform.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: JOB_QUEUES.automation },
      { name: JOB_QUEUES.notifications },
      { name: JOB_QUEUES.scoring },
    ),
  ],
  providers: [
    AutomationProcessor,
    NotificationProcessor,
    ScoringProcessor,
    MessagingService,
    BillingService,
    PlatformService,
  ],
  exports: [BullModule],
})
export class JobsModule {}
