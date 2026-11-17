import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantRequest } from './tenant.middleware';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<TenantRequest>();
  return request.user;
});

export const CurrentTenant = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<TenantRequest>();
  return request.tenant;
});
