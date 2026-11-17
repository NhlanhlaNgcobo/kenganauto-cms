import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt.guard';
import { PlatformService } from '../services/platform.service';
import { RequestTenant } from '../common/tenant.middleware';

@Controller()
export class ChatController {
  constructor(private readonly platform: PlatformService) {}

  @Post('chat/message')
  async message(@Body() body: Record<string, any>, @CurrentTenant() tenant?: RequestTenant) {
    const tenantContext = tenant || { id: Number(body.tenant_id || 1), name: 'KenganAuto', subdomain: 'app' };
    return this.platform.upsertConversationMessage({
      tenantId: tenantContext.id,
      tenantName: tenantContext.name,
      message: body.message,
      channel: body.channel || 'website',
      externalUserId: body.external_user_id,
      conversationId: body.conversation_id,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('chat/conversations')
  conversations(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.listConversations(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('chat/conversation/:id')
  conversation(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string) {
    return this.platform.getConversation(tenant.id, Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('chat/notifications')
  notifications() {
    return { notifications: [] };
  }

  @UseGuards(JwtAuthGuard)
  @Post('chat/notifications/:id/read')
  markRead() {
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('chat/settings')
  updateChatSettings() {
    return { message: 'Chat settings updated successfully.' };
  }
}
