import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { hashToken } from '../common/crypto';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
} from './auth.dto';
import { PlatformService } from '../services/platform.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly platform: PlatformService,
  ) {}

  private signAccessToken(user: {
    id: number;
    tenantId: number;
    role: UserRole;
    email: string;
    firstName: string;
    lastName: string;
  }) {
    return this.jwt.sign({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  }

  private async issueSession(user: {
    id: number;
    tenantId: number;
    role: UserRole;
    email: string;
    firstName: string;
    lastName: string;
  }) {
    const refreshToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshSession.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });

    return {
      accessToken: this.signAccessToken(user),
      refreshToken,
    };
  }

  async login(dto: LoginDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain: dto.subdomain },
    });

    if (!tenant) {
      throw new UnauthorizedException('Invalid dealership or subdomain.');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: dto.email.toLowerCase().trim(),
        },
      },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const valid = await compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const session = await this.issueSession(user);
    return {
      token: session.accessToken,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: {
        id: user.id,
        tenant_id: user.tenantId,
        role: user.role,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
      },
    };
  }

  async register(dto: RegisterDto) {
    const subdomain = dto.dealership_name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 63);

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
    });

    if (existingTenant) {
      throw new ConflictException(`Subdomain "${subdomain}" is already taken.`);
    }

    const email = dto.admin_email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const passwordHash = await hash(dto.admin_password, 12);

    const result = await this.prisma.$transaction(async (trx) => {
      const tenant = await trx.tenant.create({
        data: {
          name: dto.dealership_name,
          subdomain,
          plan: dto.plan as any,
          address: dto.address,
          province: dto.province,
          whatsappNumber: dto.whatsapp_number,
          currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
          trialEndsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
        },
      });

      const user = await trx.user.create({
        data: {
          tenantId: tenant.id,
          firstName: dto.admin_first_name,
          lastName: dto.admin_last_name,
          email,
          passwordHash,
          role: 'admin',
        },
      });

      return { tenant, user };
    });

    await this.platform.bootstrapTenantDefaults(result.tenant.id, result.tenant.name, dto.whatsapp_number);
    const session = await this.issueSession(result.user);

    return {
      message: 'Dealership registered successfully.',
      subdomain,
      portal_url: `https://${subdomain}.kenganauto.co.za`,
      token: session.accessToken,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: {
        id: result.user.id,
        tenant_id: result.user.tenantId,
        role: result.user.role,
        email: result.user.email,
        first_name: result.user.firstName,
        last_name: result.user.lastName,
      },
    };
  }

  async refresh(dto: RefreshDto) {
    const tokenHash = hashToken(dto.refreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const newRefreshToken = randomBytes(32).toString('hex');
    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: {
        tokenHash: hashToken(newRefreshToken),
        updatedAt: new Date(),
      },
    });

    return {
      token: this.signAccessToken(session.user),
      accessToken: this.signAccessToken(session.user),
      refreshToken: newRefreshToken,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) {
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    const rawToken = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 1000 * 60 * 15),
      },
    });

    return {
      message: 'If that email is registered, a reset link has been sent.',
      debug_reset_token: process.env.NODE_ENV === 'development' ? rawToken : undefined,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(dto.token) },
      include: { user: true },
    });

    if (!token || token.usedAt || token.expiresAt < new Date()) {
      throw new NotFoundException('Invalid or expired reset token.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: { passwordHash: await hash(dto.new_password, 12) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Password reset successfully. You can now log in.' };
  }
}
