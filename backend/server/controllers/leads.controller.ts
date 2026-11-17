import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentTenant, CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt.guard';
import { PlatformService } from '../services/platform.service';
import { RequestTenant } from '../common/tenant.middleware';

@UseGuards(JwtAuthGuard)
@Controller(['api/leads', 'api/v1/leads'])
export class LeadsController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  list(@CurrentTenant() tenant: RequestTenant, @Query() query: Record<string, string | undefined>) {
    return this.platform.listLeads(tenant.id, query);
  }

  @Get('stats')
  stats(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.getLeadStats(tenant.id);
  }

  @Get('team')
  team(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.getTeam(tenant.id);
  }

  @Get(':id')
  one(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.platform.getLead(tenant.id, Number(id));
  }

  @Post()
  create(@CurrentTenant() tenant: RequestTenant, @Body() body: Record<string, any>) {
    return this.platform.createLead(tenant.id, body);
  }

  @Patch(':id/stage')
  stage(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string, @Body('status') status: any) {
    return this.platform.updateLeadStage(tenant.id, Number(id), status);
  }

  @Patch(':id/assign')
  assign(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string, @Body('assigned_to') assignedTo: string) {
    return this.platform.assignLead(tenant.id, Number(id), Number(assignedTo));
  }

  @Post(':id/notes')
  note(
    @CurrentTenant() tenant: RequestTenant,
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('note') note: string,
  ) {
    return this.platform.addLeadNote(tenant.id, Number(id), note, user?.sub);
  }

  @Post(':id/ai-summary')
  aiSummary(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.platform.getLeadSummary(tenant.id, Number(id));
  }

  @Post(':id/score')
  async scoreRefresh(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    await this.platform.refreshLeadSummary(tenant.id, Number(id));
    return { status: 'rescoring', leadId: Number(id), message: 'AI rescoring started.' };
  }

  @Get(':id/score')
  score(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.platform.getLeadScore(tenant.id, Number(id));
  }

  @Post('bulk')
  bulk(@CurrentTenant() tenant: RequestTenant, @Body() body: { ids: number[]; action: string; value?: string }) {
    return this.platform.bulkLeadAction(tenant.id, body.ids || [], body.action, body.value);
  }
}
