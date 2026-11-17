import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TenantRequest } from './tenant.middleware';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided.');
    }

    const token = header.slice(7);
    try {
      const payload = this.jwtService.verify(token);
      request.user = payload;
      if (request.tenant && !request.tenant.isGlobal && request.tenant.id !== payload.tenantId) {
        throw new UnauthorizedException('Tenant mismatch.');
      }
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }
}
