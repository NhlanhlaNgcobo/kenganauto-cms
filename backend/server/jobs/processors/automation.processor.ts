import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JOB_QUEUES } from '../job.constants';
import { PrismaService } from '../../prisma/prisma.service';

@Processor(JOB_QUEUES.automation)
export class AutomationProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>) {
    const execution = await this.prisma.automationExecution.create({
      data: {
        tenantId: job.data.tenantId,
        sequenceId: job.data.sequenceId || null,
        jobName: job.name,
        status: 'processing',
        payload: job.data,
      },
    });

    await this.prisma.automationExecution.update({
      where: { id: execution.id },
      data: {
        status: 'completed',
        result: {
          processedAt: new Date().toISOString(),
        },
      },
    });

    return { ok: true };
  }
}
