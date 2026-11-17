import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './controllers/health.controller';
import { LeadsController } from './controllers/leads.controller';
import { ChatController } from './controllers/chat.controller';
import { PlatformController } from './controllers/platform.controller';
import { AdminController } from './controllers/admin.controller';
import { PrismaModule } from './prisma/prisma.module';
import { PlatformService } from './services/platform.service';
import { MessagingService } from './services/messaging.service';
import { BillingService } from './services/billing.service';
import { JobsModule } from './jobs/jobs.module';
import { TenantMiddleware } from './common/tenant.middleware';
import { envSchema } from './config/env';
import { RolesGuard } from './common/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env),
      envFilePath: ['.env', '.env.local'],
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    PrismaModule,
    JobsModule,
    AuthModule,
  ],
  controllers: [
    HealthController,
    LeadsController,
    ChatController,
    PlatformController,
    AdminController,
  ],
  providers: [PlatformService, MessagingService, BillingService, TenantMiddleware, RolesGuard],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
