import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CurrentTenant, CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { RequestTenant } from '../common/tenant.middleware';
import { PlatformService } from '../services/platform.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller(['api/superadmin', 'api/v1/admin'])
export class AdminController {
  constructor(
    private readonly platform: PlatformService,
    private readonly jwtService: JwtService,
  ) {}

  @Roles('admin')
  @Get('tenants')
  async tenants(@CurrentUser() user: any) {
    if (user.tenantId !== 1) {
      return [];
    }
    const tenants = await this.platform.listTenants();
    return tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      plan: tenant.plan,
      user_count: tenant.users.length,
    }));
  }

  @Roles('admin')
  @Post('impersonate')
  impersonate(@CurrentUser() user: any, @Body('tenant_id') tenantId: number) {
    if (user.tenantId !== 1) {
      return { error: 'Forbidden' };
    }
    const token = this.jwtService.sign({
      sub: user.sub,
      tenantId,
      role: 'admin',
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    return { token };
  }

  @Roles('admin')
  @Get('api-settings')
  apiSettings(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.getApiSettings(tenant.id);
  }

  @Roles('admin')
  @Post('api-settings/test')
  apiSettingsTest(@Body('service_name') serviceName: string) {
    return this.platform.testApiSetting(serviceName);
  }

  @Roles('admin')
  @Post('api-settings/save')
  apiSettingsSave(
    @CurrentTenant() tenant: RequestTenant,
    @Body('service_name') serviceName: string,
    @Body('api_key') apiKey: string,
  ) {
    return this.platform.saveApiSetting(tenant.id, serviceName, apiKey);
  }
}
