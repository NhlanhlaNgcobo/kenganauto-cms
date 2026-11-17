import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

export type RequestTenant = {
  id: number;
  name: string;
  subdomain: string;
  plan?: string;
  isGlobal?: boolean;
};

export type TenantRequest = Request & {
  tenant?: RequestTenant;
  subdomain?: string;
  user?: {
    sub: number;
    tenantId: number;
    role: string;
    email: string;
    firstName: string;
    lastName: string;
  };
};

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: TenantRequest, _res: Response, next: NextFunction) {
    const host = req.headers.host || '';
    const headerSubdomain = (req.headers['x-tenant-subdomain'] as string) || '';
    const headerTenantId = req.headers['x-tenant-id'];
    const rawSubdomain = headerSubdomain || host.split(':')[0].split('.')[0] || 'app';
    const subdomain = ['localhost', '127', 'www', 'platform'].includes(rawSubdomain) ? 'app' : rawSubdomain;

    req.subdomain = subdomain;

    if (headerTenantId && !Number.isNaN(Number(headerTenantId))) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: Number(headerTenantId) },
      });
      if (tenant) {
        req.tenant = {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          plan: tenant.plan,
        };
        next();
        return;
      }
    }

    if (subdomain === 'app') {
      req.tenant = { id: 1, name: 'KenganAuto', subdomain: 'app', isGlobal: true };
      next();
      return;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
    });

    if (tenant) {
      req.tenant = {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        plan: tenant.plan,
      };
    }

    next();
  }
}
