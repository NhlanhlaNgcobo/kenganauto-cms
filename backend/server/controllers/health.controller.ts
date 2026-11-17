import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(['health', 'ready'])
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'active',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }
}
