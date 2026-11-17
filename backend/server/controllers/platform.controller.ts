import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentTenant } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RequestTenant, TenantRequest } from '../common/tenant.middleware';
import { BillingService } from '../services/billing.service';
import { PlatformService } from '../services/platform.service';

@Controller()
export class PlatformController {
  constructor(
    private readonly platform: PlatformService,
    private readonly billing: BillingService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get(['api/customers', 'api/v1/customers'])
  customers(@CurrentTenant() tenant: RequestTenant, @Query('q') q?: string) {
    return this.platform.listCustomers(tenant.id, q);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(['api/customers/:id/tags', 'api/v1/customers/:id/tags'])
  customerTags(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string, @Body('tags') tags: string[]) {
    return this.platform.updateCustomerTags(tenant.id, Number(id), tags || []);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/stock', 'api/v1/stock'])
  stock(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.listStock(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(['api/stock', 'api/v1/stock'])
  createStock(@CurrentTenant() tenant: RequestTenant, @Body() body: Record<string, any>) {
    return this.platform.createStock(tenant.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(['api/stock/:id', 'api/v1/stock/:id'])
  updateStock(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string, @Body() body: Record<string, any>) {
    return this.platform.updateStock(tenant.id, Number(id), body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(['api/stock/bulk', 'api/v1/stock/bulk'])
  bulkStock(@CurrentTenant() tenant: RequestTenant, @Body('vehicles') vehicles: Record<string, any>[]) {
    return this.platform.bulkStockImport(tenant.id, vehicles || []);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/service/bookings', 'api/v1/service/bookings'])
  serviceBookings(@CurrentTenant() tenant: RequestTenant, @Query() query: Record<string, string | undefined>) {
    return this.platform.listServiceBookings(tenant.id, query.start_date, query.end_date);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(['api/service/bookings/:id', 'api/v1/service/bookings/:id'])
  updateService(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string, @Body() body: Record<string, any>) {
    return this.platform.updateServiceBooking(tenant.id, Number(id), body);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/service/analytics', 'api/v1/service/analytics'])
  serviceAnalytics(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.getServiceAnalytics(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/parts/enquiries', 'api/v1/parts/enquiries'])
  partEnquiries(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.listPartsEnquiries(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(['api/parts/enquiries', 'api/v1/parts/enquiries'])
  createPartEnquiry(@CurrentTenant() tenant: RequestTenant, @Body() body: Record<string, any>) {
    return this.platform.createPartsEnquiry(tenant.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(['api/parts/enquiries/:id', 'api/v1/parts/enquiries/:id'])
  updatePartEnquiry(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string, @Body() body: Record<string, any>) {
    return this.platform.updatePartsEnquiry(tenant.id, Number(id), body);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/parts/catalog', 'api/v1/parts/catalog'])
  partCatalog(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.listPartCatalog(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(['api/parts/catalog/bulk', 'api/v1/parts/catalog/bulk'])
  partCatalogBulk(@CurrentTenant() tenant: RequestTenant, @Body('parts') parts: Record<string, any>[]) {
    return this.platform.bulkPartCatalogImport(tenant.id, parts || []);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/parts/analytics', 'api/v1/parts/analytics'])
  partsAnalytics(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.getPartsAnalytics(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/trade-ins', 'api/v1/trade-ins'])
  tradeIns(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.listTradeIns(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(['api/trade-ins/:id', 'api/v1/trade-ins/:id'])
  updateTradeIn(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string, @Body() body: Record<string, any>) {
    return this.platform.updateTradeIn(tenant.id, Number(id), body);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/retention/sequences', 'api/v1/retention/sequences'])
  retentionSequences(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.getRetentionSequences(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(['api/retention/sequences/:id/toggle', 'api/v1/retention/sequences/:id/toggle'])
  retentionToggle(@CurrentTenant() tenant: RequestTenant, @Param('id') id: string, @Body('active') active: boolean) {
    return this.platform.toggleRetentionSequence(tenant.id, Number(id), Boolean(active));
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/retention/loyalty-nps', 'api/v1/retention/loyalty-nps'])
  retentionNps(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.getLoyaltyAndNps(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/support/manuals', 'api/v1/support/manuals'])
  supportManuals(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.listSupportManuals(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(['api/support/manuals', 'api/v1/support/manuals'])
  createSupportManual(@CurrentTenant() tenant: RequestTenant, @Body() body: Record<string, any>) {
    return this.platform.createSupportManual(tenant.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/support/faqs', 'api/v1/support/faqs'])
  supportFaqs(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.listSupportFaqs(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(['api/support/faqs', 'api/v1/support/faqs'])
  createSupportFaq(@CurrentTenant() tenant: RequestTenant, @Body() body: Record<string, any>) {
    return this.platform.createSupportFaq(tenant.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/support/queries', 'api/v1/support/queries'])
  supportQueries(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.listSupportQueries(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/analytics/:reportType?', 'api/v1/analytics/:reportType?'])
  analytics(@CurrentTenant() tenant: RequestTenant, @Param('reportType') reportType?: string) {
    return this.platform.getAnalyticsReport(tenant.id, reportType || 'overview');
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/notifications/settings', 'api/v1/notifications/settings'])
  notificationSettings(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.getNotificationSettings(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(['api/notifications/settings', 'api/v1/notifications/settings'])
  notificationSettingsUpdate(@CurrentTenant() tenant: RequestTenant, @Body() body: any) {
    return this.platform.updateNotificationSettings(tenant.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(['api/notifications/test', 'api/v1/notifications/test'])
  notificationTest(@CurrentTenant() tenant: RequestTenant, @Body() body: any) {
    return this.platform.queueTestNotification(tenant.id, body);
  }

  @Get(['api/notifications/preview/:templateKey', 'api/v1/notifications/preview/:templateKey'])
  @Header('Content-Type', 'text/html')
  async notificationPreview(@Param('templateKey') templateKey: string) {
    return this.platform.previewNotificationTemplate(templateKey);
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/widget/settings', 'api/v1/widget/settings'])
  widgetSettings(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.getWidgetSettings(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(['api/widget/settings', 'api/v1/widget/settings'])
  widgetSettingsUpdate(@CurrentTenant() tenant: RequestTenant, @Body() body: Record<string, any>) {
    return this.platform.updateWidgetSettings(tenant.id, body);
  }

  @Post(['api/widget/autotrader-webhook', 'api/v1/widget/autotrader-webhook'])
  async widgetAutotraderWebhook(@Req() req: TenantRequest, @Body() body: Record<string, any>) {
    const secret = req.headers['x-webhook-secret'];
    if (secret !== process.env.AUTOTRADER_WEBHOOK_SECRET) {
      return { error: 'Unauthorized webhook.' };
    }
    const tenantId = Number(body.tenant_id || req.headers['x-tenant-id'] || 1);
    const lead = await this.platform.createInboundLead(tenantId, {
      customer_name: body.buyer_name || body.customer_name || 'Autotrader Lead',
      customer_phone: body.buyer_phone || body.customer_phone,
      customer_email: body.buyer_email || body.customer_email,
      vehicle_interest: body.vehicle_interest || body.vehicle || `${body.make || ''} ${body.model || ''}`.trim(),
      source: 'autotrader',
    });
    return { success: true, lead_id: lead.id };
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/whatsapp/settings', 'api/v1/whatsapp/settings'])
  whatsappSettings(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.getWhatsappSettings(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(['api/whatsapp/settings', 'api/v1/whatsapp/settings'])
  whatsappSettingsSave(@CurrentTenant() tenant: RequestTenant, @Body() body: Record<string, string>) {
    return this.platform.saveWhatsappSettings(tenant.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(['api/whatsapp/settings/test', 'api/v1/whatsapp/settings/test'])
  whatsappSettingsTest(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.testWhatsappSettings(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(['api/whatsapp/settings/register-webhook', 'api/v1/whatsapp/settings/register-webhook'])
  whatsappRegister(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.registerWhatsappWebhook(tenant.id);
  }

  @Post(['api/webhooks/whatsapp/:tenantId', 'api/v1/webhooks/whatsapp/:tenantId'])
  async whatsappWebhook(@Param('tenantId') tenantId: string, @Body() body: any) {
    const lead = await this.platform.createInboundLead(Number(tenantId), {
      customer_name: body.name || 'WhatsApp Lead',
      customer_phone: body.phone || body.from,
      vehicle_interest: body.vehicle_interest || null,
      source: 'whatsapp',
    });
    return { success: true, lead_id: lead.id };
  }

  @Get(['api/webhooks/whatsapp/:tenantId', 'api/v1/webhooks/whatsapp/:tenantId'])
  whatsappVerify(@Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string) {
    if (token === process.env.WEBHOOK_VERIFY_TOKEN) {
      return challenge;
    }
    return 'invalid';
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/integrations/settings', 'api/v1/integrations/settings'])
  integrations(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.getIntegrationSettings(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(['api/integrations/facebook/oauth', 'api/v1/integrations/facebook/oauth'])
  integrationsFacebookConnect(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.setFacebookConnection(tenant.id, true);
  }

  @UseGuards(JwtAuthGuard)
  @Post(['api/integrations/facebook/disconnect', 'api/v1/integrations/facebook/disconnect'])
  integrationsFacebookDisconnect(@CurrentTenant() tenant: RequestTenant) {
    return this.platform.setFacebookConnection(tenant.id, false);
  }

  @Post(['api/integrations/webhook/generic/:tenantId', 'api/v1/integrations/webhook/generic/:tenantId'])
  async genericWebhook(@Param('tenantId') tenantId: string, @Body() body: Record<string, any>) {
    const lead = await this.platform.createInboundLead(Number(tenantId), body);
    return { success: true, message: 'Webhook lead successfully created and chatbot triggered.', lead_id: lead.id };
  }

  @Post(['api/integrations/webhook/inbound-email/:tenantId', 'api/v1/integrations/webhook/inbound-email/:tenantId'])
  async inboundEmail(@Param('tenantId') tenantId: string, @Body() body: Record<string, any>) {
    const text = body.text || '';
    const name = /Name:\s*(.+)/i.exec(text)?.[1]?.trim() || 'Inbound Email Lead';
    const phone = /Phone:\s*([0-9\+\s]+)/i.exec(text)?.[1]?.trim() || null;
    const email = /Email:\s*([^\s]+@[^\s]+)/i.exec(text)?.[1]?.trim() || null;
    const vehicle = /Vehicle:\s*(.+)/i.exec(text)?.[1]?.trim() || null;
    const lead = await this.platform.createInboundLead(Number(tenantId), {
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      vehicle_interest: vehicle,
      source: body.from?.includes('autotrader') ? 'autotrader' : 'cars_coza',
    });
    return { success: true, lead_id: lead.id };
  }

  @Post(['api/integrations/webhook/facebook/:tenantId', 'api/v1/integrations/webhook/facebook/:tenantId'])
  async facebookWebhook(@Param('tenantId') tenantId: string, @Body() body: Record<string, any>) {
    const lead = await this.platform.createInboundLead(Number(tenantId), {
      customer_name: body.name || 'Facebook Lead',
      customer_phone: body.phone,
      vehicle_interest: body.vehicle,
      source: 'facebook',
    });
    return { success: true, lead_id: lead.id };
  }

  @UseGuards(JwtAuthGuard)
  @Get(['api/billing/status', 'api/v1/billing/status'])
  billingStatus(@CurrentTenant() tenant: RequestTenant) {
    return this.billing.getStatus(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(['api/billing/checkout', 'api/v1/billing/checkout'])
  async billingCheckout(@CurrentTenant() tenant: RequestTenant, @Body() body: any) {
    const tenantRecord = await this.platform.getTenantById(tenant.id);
    return this.billing.createCheckout(tenantRecord, body.planKey, body.successUrl, body.cancelUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Post(['api/billing/portal', 'api/v1/billing/portal'])
  async billingPortal(@CurrentTenant() tenant: RequestTenant, @Body('returnUrl') returnUrl: string) {
    const tenantRecord = await this.platform.getTenantById(tenant.id);
    return this.billing.createPortal(tenantRecord, returnUrl);
  }
}
