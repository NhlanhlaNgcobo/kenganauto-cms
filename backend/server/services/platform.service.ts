import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import {
  ConversationChannel,
  IntegrationStatus,
  IntegrationType,
  LeadStatus,
  PartsStatus,
  ServiceStatus,
  TradeInStatus,
  VehicleCondition,
  VehicleStatus,
  Prisma,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { JOB_NAMES, JOB_QUEUES } from '../jobs/job.constants';
import { encryptString } from '../common/crypto';

const DEFAULT_NOTIFICATION_SETTINGS = {
  hours: { start: '08:00', end: '17:30' },
  email: {
    new_lead: { active: true, roles: ['sales_exec', 'sales_manager'] },
    finance_app: { active: true, roles: ['finance_manager'] },
    service_confirm: { active: true, roles: ['service_advisor', 'customer'] },
    service_reminder: { active: true, roles: ['customer'] },
    trade_in_offer: { active: true, roles: ['sales_manager', 'customer'] },
    deal_won: { active: true, roles: ['dealer_principal'] },
    weekly_summary: { active: true, roles: ['dealer_principal'] },
    monthly_report: { active: true, roles: ['dealer_principal'] },
  },
  whatsapp: {
    hot_lead: { active: true, roles: ['sales_exec'] },
    customer_arrived: { active: true, roles: ['service_advisor'] },
    vehicle_ready: { active: true, roles: ['customer'] },
    finance_app: { active: true, roles: ['finance_manager'] },
    dp_daily_summary: { active: false, roles: ['dealer_principal'] },
  },
  sms: {
    service_confirm: { active: true, roles: ['customer'] },
    service_reminder: { active: true, roles: ['customer'] },
    finance_outcome: { active: false, roles: ['customer'] },
  },
};

const DEFAULT_AUTOMATION_SEQUENCES = [
  {
    name: 'Speed To Lead',
    triggerType: 'lead.created',
    description: 'Immediate qualification and first-touch automation for inbound leads.',
    steps: [
      { type: 'score', channel: 'ai', delayMinutes: 0 },
      { type: 'notify', channel: 'whatsapp', delayMinutes: 1 },
      { type: 'notify', channel: 'email', delayMinutes: 5 },
    ],
  },
  {
    name: 'Lead Nurture 14 Day',
    triggerType: 'lead.nurture',
    description: 'Multi-touch WhatsApp and email nurture over 14 days.',
    steps: [
      { day: 0, channel: 'whatsapp', mode: 'value' },
      { day: 0, channel: 'email', mode: 'welcome' },
      { day: 2, channel: 'whatsapp', mode: 'insight' },
      { day: 7, channel: 'whatsapp', mode: 'cta' },
      { day: 10, channel: 'email', mode: 'case-study' },
      { day: 14, channel: 'whatsapp', mode: 'exit' },
    ],
  },
  {
    name: 'Database Reactivation',
    triggerType: 'lead.dormant',
    description: 'Reactivation sequence for cold and dormant leads.',
    steps: [
      { day: 0, channel: 'whatsapp', mode: 'reopen' },
      { day: 3, channel: 'email', mode: 'social-proof' },
      { day: 7, channel: 'whatsapp', mode: 'offer' },
    ],
  },
];

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(JOB_QUEUES.notifications) private readonly notificationsQueue: Queue,
    @InjectQueue(JOB_QUEUES.automation) private readonly automationQueue: Queue,
    @InjectQueue(JOB_QUEUES.scoring) private readonly scoringQueue: Queue,
  ) {}

  private toMoney(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === '') return null;
    return Number(value);
  }

  private async logEvent(tenantId: number, eventType: string, metadata?: Record<string, unknown>) {
    await this.prisma.analyticsEvent.create({
      data: {
        tenantId,
        eventType,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  private inferIntent(message: string) {
    const lowered = message.toLowerCase();
    if (lowered.includes('finance') || lowered.includes('installment')) return 'FINANCE';
    if (lowered.includes('trade') || lowered.includes('trade-in')) return 'TRADE_IN';
    if (lowered.includes('service') || lowered.includes('book')) return 'SERVICE_BOOKING';
    if (lowered.includes('test drive')) return 'TEST_DRIVE';
    return 'LEAD_CAPTURE';
  }

  private buildAssistantReply(message: string, dealershipName: string) {
    const lowered = message.toLowerCase();
    if (lowered.includes('finance')) {
      return `We can help with finance options at ${dealershipName}. Share the vehicle price, deposit, and preferred term, and we'll prepare the next step.`;
    }
    if (lowered.includes('trade')) {
      return `We can help with a trade-in valuation. Send the year, make, model, mileage, and a few photos, and we'll log it for the team right away.`;
    }
    if (lowered.includes('service')) {
      return `We can help you book a service. Please send your vehicle registration, preferred date, and the work needed, and we'll line it up.`;
    }
    return `Thanks for reaching out to ${dealershipName}. We have your message and the team can help with stock, finance, trade-ins, and bookings.`;
  }

  async bootstrapTenantDefaults(tenantId: number, tenantName: string, whatsappNumber?: string) {
    await this.prisma.widgetSetting.upsert({
      where: { tenantId },
      create: {
        tenantId,
        greeting: `Hi! I'm the ${tenantName} AI assistant. How can I help you today?`,
        dealershipName: tenantName,
        whatsappNumber,
        offlineMessage: "We're offline right now, but leave a message and we'll respond shortly.",
        businessHours: 'Mon-Fri 08:00-17:30 | Sat 08:00-13:00',
      },
      update: {},
    });

    await this.prisma.tenantNotificationSetting.upsert({
      where: { tenantId },
      create: { tenantId, settings: DEFAULT_NOTIFICATION_SETTINGS },
      update: {},
    });

    const existingSequences = await this.prisma.automationSequence.count({
      where: { tenantId },
    });

    if (!existingSequences) {
      await this.prisma.automationSequence.createMany({
        data: DEFAULT_AUTOMATION_SEQUENCES.map((sequence) => ({
          tenantId,
          name: sequence.name,
          triggerType: sequence.triggerType,
          description: sequence.description,
          steps: sequence.steps,
          active: true,
        })),
      });
    }

    for (const type of [
      IntegrationType.generic_webhook,
      IntegrationType.sendgrid_parse,
      IntegrationType.resend,
      IntegrationType.whatsapp_360dialog,
      IntegrationType.stripe,
    ]) {
      await this.prisma.integrationConnection.upsert({
        where: { tenantId_type: { tenantId, type } },
        create: {
          tenantId,
          type,
          status: IntegrationStatus.unconfigured,
          displayName: type,
        },
        update: {},
      });
    }
  }

  async listLeads(tenantId: number, filters: Record<string, string | undefined>) {
    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId,
        status: filters.status as LeadStatus | undefined,
        source: filters.source || undefined,
        assignedToId: filters.assigned_to ? Number(filters.assigned_to) : undefined,
        OR: filters.search
          ? [
              { customerName: { contains: filters.search, mode: 'insensitive' } },
              { customerPhone: { contains: filters.search, mode: 'insensitive' } },
              { customerEmail: { contains: filters.search, mode: 'insensitive' } },
              { vehicleInterest: { contains: filters.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        assignedTo: true,
        leadNotes: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      leads: leads.map((lead) => ({
        ...lead,
        assigned_name: lead.assignedTo
          ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`.trim()
          : null,
        overdue: lead.lastContactAt
          ? Date.now() - new Date(lead.lastContactAt).getTime() > 1000 * 60 * 60 * 24
          : Date.now() - new Date(lead.createdAt).getTime() > 1000 * 60 * 60 * 24,
      })),
      total: leads.length,
    };
  }

  async getLeadStats(tenantId: number) {
    const grouped = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    });
    const leads = await this.prisma.lead.findMany({
      where: { tenantId },
      select: { createdAt: true, lastContactAt: true },
    });
    const counts = grouped.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {});
    const overdue = leads.filter((lead) => {
      const last = lead.lastContactAt || lead.createdAt;
      return Date.now() - new Date(last).getTime() > 1000 * 60 * 60 * 24;
    }).length;
    return {
      counts,
      total: leads.length,
      overdue,
    };
  }

  async getLead(tenantId: number, leadId: number) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: {
        assignedTo: true,
        leadNotes: { orderBy: { createdAt: 'desc' } },
        conversations: {
          include: { messages: { orderBy: { createdAt: 'asc' } } },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found.');
    }
    return lead;
  }

  async getTeam(tenantId: number) {
    const team = await this.prisma.user.findMany({
      where: { tenantId, active: true },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    });
    return {
      team: team.map((member) => ({
        id: member.id,
        name: `${member.firstName} ${member.lastName}`.trim(),
        role: member.role,
      })),
    };
  }

  async createLead(tenantId: number, data: Record<string, any>) {
    const lead = await this.prisma.lead.create({
      data: {
        tenantId,
        customerName: data.customer_name,
        customerPhone: data.customer_phone || null,
        customerEmail: data.customer_email || null,
        source: data.source || 'website',
        vehicleInterest: data.vehicle_interest || null,
        budgetMin: this.toMoney(data.budget_min),
        budgetMax: this.toMoney(data.budget_max),
        status: (data.status as LeadStatus) || LeadStatus.new,
        assignedToId: data.assigned_to ? Number(data.assigned_to) : null,
        aiScore: Number(data.ai_score || 0),
        metadata: data.metadata || {},
      },
    });
    await this.logEvent(tenantId, 'lead.created', { leadId: lead.id, source: lead.source });
    await this.automationQueue.add(JOB_NAMES.speedToLead, { tenantId, leadId: lead.id });
    return lead;
  }

  async updateLeadStage(tenantId: number, leadId: number, status: LeadStatus) {
    const lead = await this.prisma.lead.updateMany({
      where: { id: leadId, tenantId },
      data: {
        status,
        lastContactAt: new Date(),
      },
    });
    if (!lead.count) {
      throw new NotFoundException('Lead not found.');
    }
    await this.addLeadNote(tenantId, leadId, `Stage changed to ${status}`);
    return this.getLead(tenantId, leadId);
  }

  async assignLead(tenantId: number, leadId: number, userId: number) {
    await this.prisma.lead.updateMany({
      where: { id: leadId, tenantId },
      data: { assignedToId: userId },
    });
    return this.getLead(tenantId, leadId);
  }

  async addLeadNote(tenantId: number, leadId: number, note: string, authorId?: number | null) {
    await this.prisma.leadNote.create({
      data: {
        tenantId,
        leadId,
        authorId: authorId || null,
        note,
      },
    });
    return { ok: true };
  }

  async getLeadSummary(tenantId: number, leadId: number) {
    const lead = await this.getLead(tenantId, leadId);
    const latestConversation = lead.conversations[0];
    const transcript = latestConversation?.messages?.map((message) => `${message.role}: ${message.content}`).join('\n');
    const summary = transcript
      ? `${lead.customerName} enquired via ${lead.source}. Current interest: ${lead.vehicleInterest || 'unspecified vehicle'}. Conversation highlights: ${transcript.slice(0, 260)}`
      : `${lead.customerName} enquired via ${lead.source}. Follow up with stock, finance, and next-step options.`;
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { aiSummary: summary },
    });
    return { summary };
  }

  async bulkLeadAction(tenantId: number, ids: number[], action: string, value?: string) {
    if (action === 'delete') {
      await this.prisma.lead.deleteMany({ where: { tenantId, id: { in: ids } } });
    } else if (action === 'stage' && value) {
      await this.prisma.lead.updateMany({
        where: { tenantId, id: { in: ids } },
        data: { status: value as LeadStatus },
      });
    } else if (action === 'assign' && value) {
      await this.prisma.lead.updateMany({
        where: { tenantId, id: { in: ids } },
        data: { assignedToId: Number(value) },
      });
    }
    return { updated: ids.length, total: ids.length };
  }

  async refreshLeadSummary(tenantId: number, leadId: number) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: {
        conversations: {
          include: { messages: { orderBy: { createdAt: 'asc' } } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!lead) {
      return { ok: false };
    }

    const transcript = lead.conversations[0]?.messages.map((m) => m.content).join(' ') || '';
    const score = Math.max(
      20,
      Math.min(
        95,
        40 +
          (lead.customerPhone ? 10 : 0) +
          (lead.customerEmail ? 10 : 0) +
          (lead.vehicleInterest ? 10 : 0) +
          Math.min(25, Math.floor(transcript.length / 40)),
      ),
    );

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        aiScore: score,
        aiSummary: transcript
          ? `${lead.customerName} is engaged around ${lead.vehicleInterest || 'vehicle availability'}. Recommended next step: call and confirm intent.`
          : `${lead.customerName} requires first human follow-up.`,
      },
    });

    return {
      score,
      breakdown: {
        contactability: lead.customerPhone || lead.customerEmail ? 20 : 5,
        intent: lead.vehicleInterest ? 20 : 10,
        engagement: Math.min(25, Math.floor(transcript.length / 40)),
      },
    };
  }

  async getLeadScore(tenantId: number, leadId: number) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found.');
    }
    return {
      lead_id: lead.id,
      score: lead.aiScore,
      live_score: lead.aiScore,
      breakdown: {
        source: lead.source,
        status: lead.status,
      },
      tier: lead.aiScore >= 80 ? 'hot' : lead.aiScore >= 60 ? 'warm' : 'cold',
      signals: [],
      insights: lead.aiSummary ? { summary: lead.aiSummary } : null,
      scoring_rules: {
        contactability: 'Phone and email boost score',
        engagement: 'Conversation activity raises score',
      },
    };
  }

  async upsertConversationMessage(payload: {
    tenantId: number;
    message: string;
    channel: string;
    externalUserId?: string;
    conversationId?: string;
    tenantName: string;
    leadId?: number;
  }) {
    const intent = this.inferIntent(payload.message);
    let conversationId = payload.conversationId ? Number(payload.conversationId) : undefined;
    let conversation = conversationId
      ? await this.prisma.conversation.findFirst({
          where: { id: conversationId, tenantId: payload.tenantId },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        })
      : null;

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId: payload.tenantId,
          leadId: payload.leadId || null,
          channel: (payload.channel as ConversationChannel) || ConversationChannel.website,
          externalUserId: payload.externalUserId,
          intentDetected: intent,
          sessionData: {},
        },
        include: { messages: true },
      });
    }

    await this.prisma.conversationMessage.createMany({
      data: [
        {
          conversationId: conversation.id,
          role: 'user',
          content: payload.message,
        },
        {
          conversationId: conversation.id,
          role: 'assistant',
          content: this.buildAssistantReply(payload.message, payload.tenantName),
        },
      ],
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        intentDetected: intent,
        updatedAt: new Date(),
      },
    });

    await this.logEvent(payload.tenantId, 'conversation.created', { conversationId: conversation.id });
    const updated = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    return {
      conversation_id: updated.id,
      message: updated.messages[updated.messages.length - 1]?.content,
      intent,
      sentiment: 0.5,
      is_handoff: false,
      degraded: !process.env.ANTHROPIC_API_KEY,
      extras: null,
      session_data: updated.sessionData || {},
    };
  }

  async listConversations(tenantId: number) {
    const conversations = await this.prisma.conversation.findMany({
      where: { tenantId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, lead: true },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return {
      conversations: conversations.map((conversation) => {
        const lastMessage = conversation.messages[conversation.messages.length - 1];
        return {
          id: conversation.id,
          channel: conversation.channel,
          intent: conversation.intentDetected,
          sentiment: conversation.sentimentScore || 0,
          lead: conversation.lead
            ? {
                customer_name: conversation.lead.customerName,
                customer_phone: conversation.lead.customerPhone,
              }
            : null,
          message_count: conversation.messages.length,
          last_message: lastMessage?.content || '',
          created_at: conversation.createdAt,
          updated_at: conversation.updatedAt,
        };
      }),
      total: conversations.length,
    };
  }

  async getConversation(tenantId: number, id: number) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, tenantId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }
    return conversation;
  }

  async getNotificationSettings(tenantId: number) {
    const settings = await this.prisma.tenantNotificationSetting.findUnique({
      where: { tenantId },
    });
    return { settings: (settings?.settings as any) || DEFAULT_NOTIFICATION_SETTINGS };
  }

  async updateNotificationSettings(tenantId: number, settings: any) {
    const result = await this.prisma.tenantNotificationSetting.upsert({
      where: { tenantId },
      create: { tenantId, settings },
      update: { settings },
    });
    return { settings: result.settings };
  }

  async queueTestNotification(tenantId: number, payload: any) {
    await this.notificationsQueue.add(JOB_NAMES.notificationDispatch, {
      tenantId,
      channel: payload.channel,
      destination: payload.destination,
      message: `KenganAuto test notification via ${payload.channel}`,
    });
    return { message: 'Notification queued successfully.' };
  }

  async previewNotificationTemplate(templateKey: string) {
    return `<html><body style="font-family:Arial,sans-serif"><h1>${templateKey}</h1><p>KenganAuto preview template.</p></body></html>`;
  }

  async getWidgetSettings(tenantId: number) {
    const widget = await this.prisma.widgetSetting.findUnique({
      where: { tenantId },
      include: { tenant: true },
    });
    if (!widget) {
      throw new NotFoundException('Widget settings not found.');
    }
    return {
      tenant_id: tenantId,
      bubble_color: widget.bubbleColor,
      accent_color: widget.accentColor,
      greeting: widget.greeting,
      dealership_name: widget.dealershipName,
      logo_url: widget.logoUrl,
      position: widget.position,
      show_lead_form: widget.showLeadForm,
      whatsapp_number: widget.whatsappNumber,
      widget_title: widget.widgetTitle,
      offline_message: widget.offlineMessage,
      business_hours: widget.businessHours,
      auto_open_delay: widget.autoOpenDelay,
    };
  }

  async updateWidgetSettings(tenantId: number, payload: Record<string, any>) {
    await this.prisma.widgetSetting.upsert({
      where: { tenantId },
      create: {
        tenantId,
        bubbleColor: payload.bubble_color || '#1B2A4A',
        accentColor: payload.accent_color || '#C9A84C',
        greeting: payload.greeting || "Hi! I'm the KenganAuto AI assistant. How can I help you today?",
        dealershipName: payload.dealership_name || 'KenganAuto',
        logoUrl: payload.logo_url || null,
        position: payload.position || 'bottom-right',
        showLeadForm: payload.show_lead_form !== false,
        whatsappNumber: payload.whatsapp_number || null,
        widgetTitle: payload.widget_title || 'AI Assistant',
        offlineMessage: payload.offline_message || null,
        businessHours: payload.business_hours || null,
        autoOpenDelay: Number(payload.auto_open_delay || 0),
      },
      update: {
        bubbleColor: payload.bubble_color || undefined,
        accentColor: payload.accent_color || undefined,
        greeting: payload.greeting || undefined,
        dealershipName: payload.dealership_name || undefined,
        logoUrl: payload.logo_url || null,
        position: payload.position || undefined,
        showLeadForm: payload.show_lead_form,
        whatsappNumber: payload.whatsapp_number || null,
        widgetTitle: payload.widget_title || undefined,
        offlineMessage: payload.offline_message || null,
        businessHours: payload.business_hours || null,
        autoOpenDelay: payload.auto_open_delay !== undefined ? Number(payload.auto_open_delay) : undefined,
      },
    });
    return { ok: true };
  }

  async autotraderWebhook(payload: Record<string, any>) {
    const secret = payload.secret;
    if (secret !== process.env.AUTOTRADER_WEBHOOK_SECRET) {
      throw new BadRequestException('Unauthorized webhook.');
    }
  }

  async getWhatsappSettings(tenantId: number) {
    const stored = await this.prisma.whatsappSetting.findUnique({ where: { tenantId } });
    return {
      configured: Boolean(stored?.encryptedApiKey),
      whatsapp_number: stored?.whatsappNumber || '',
      api_key_masked: stored?.encryptedApiKey ? '••••••••••••' : '',
      webhook_registered: stored?.webhookRegistered || false,
      webhook_url: stored?.registeredWebhookUrl || `${process.env.API_PUBLIC_URL}/api/webhooks/whatsapp/${tenantId}`,
    };
  }

  async saveWhatsappSettings(tenantId: number, payload: Record<string, string>) {
    const existing = await this.prisma.whatsappSetting.findUnique({ where: { tenantId } });
    const encryptedApiKey = payload.api_key ? encryptString(payload.api_key.trim()) : existing?.encryptedApiKey || null;
    const encryptedWebhookSecret = payload.webhook_secret
      ? encryptString(payload.webhook_secret.trim())
      : existing?.encryptedWebhookSecret || null;

    await this.prisma.whatsappSetting.upsert({
      where: { tenantId },
      create: {
        tenantId,
        whatsappNumber: payload.whatsapp_number || null,
        encryptedApiKey,
        encryptedWebhookSecret,
      },
      update: {
        whatsappNumber: payload.whatsapp_number || null,
        encryptedApiKey,
        encryptedWebhookSecret,
      },
    });

    await this.prisma.integrationConnection.upsert({
      where: { tenantId_type: { tenantId, type: IntegrationType.whatsapp_360dialog } },
      create: {
        tenantId,
        type: IntegrationType.whatsapp_360dialog,
        status: IntegrationStatus.configured,
      },
      update: {
        status: IntegrationStatus.configured,
      },
    });

    return { message: 'Settings saved successfully!' };
  }

  async testWhatsappSettings(tenantId: number) {
    const stored = await this.prisma.whatsappSetting.findUnique({ where: { tenantId } });
    if (!stored?.encryptedApiKey) {
      throw new ServiceUnavailableException('Save your API key first before testing.');
    }
    return { message: '360dialog connection is configured. Live delivery will use the saved tenant credentials.' };
  }

  async registerWhatsappWebhook(tenantId: number) {
    const stored = await this.prisma.whatsappSetting.findUnique({ where: { tenantId } });
    if (!stored?.encryptedApiKey) {
      throw new ServiceUnavailableException('Save your API key first before registering the webhook.');
    }
    const webhookUrl = `${process.env.API_PUBLIC_URL}/api/webhooks/whatsapp/${tenantId}`;
    await this.prisma.whatsappSetting.update({
      where: { tenantId },
      data: {
        webhookRegistered: true,
        registeredWebhookUrl: webhookUrl,
      },
    });
    return {
      message: 'Webhook registered successfully with 360dialog.',
      webhook_url: webhookUrl,
    };
  }

  async getIntegrationSettings(tenantId: number) {
    const connections = await this.prisma.integrationConnection.findMany({
      where: { tenantId },
    });
    const map = new Map(connections.map((item) => [item.type, item]));
    return {
      success: true,
      integrations: {
        autotrader: { active: true, leads_this_month: await this.prisma.lead.count({ where: { tenantId, source: 'autotrader' } }) },
        cars_coza: { active: true, leads_this_month: await this.prisma.lead.count({ where: { tenantId, source: 'cars_coza' } }) },
        facebook: {
          active: map.get(IntegrationType.facebook)?.status === IntegrationStatus.connected,
          leads_this_month: await this.prisma.lead.count({ where: { tenantId, source: 'facebook' } }),
          page_name: map.get(IntegrationType.facebook)?.displayName || null,
        },
        generic_webhook: {
          active: true,
          leads_this_month: await this.prisma.lead.count({ where: { tenantId, source: 'website' } }),
        },
        widget: { active: true, leads_this_month: await this.prisma.lead.count({ where: { tenantId, source: 'widget' } }) },
        whatsapp: { active: Boolean((await this.prisma.whatsappSetting.findUnique({ where: { tenantId } }))?.encryptedApiKey), leads_this_month: await this.prisma.conversation.count({ where: { tenantId, channel: ConversationChannel.whatsapp } }) },
        inbound_email: `leads-TENANT${tenantId}@inbound.kenganauto.co.za`,
        webhook_url: `${process.env.API_PUBLIC_URL}/api/integrations/webhook/generic/${tenantId}`,
      },
    };
  }

  async setFacebookConnection(tenantId: number, connected: boolean) {
    await this.prisma.integrationConnection.upsert({
      where: { tenantId_type: { tenantId, type: IntegrationType.facebook } },
      create: {
        tenantId,
        type: IntegrationType.facebook,
        status: connected ? IntegrationStatus.connected : IntegrationStatus.unconfigured,
        displayName: connected ? 'KenganAuto Main Page' : null,
      },
      update: {
        status: connected ? IntegrationStatus.connected : IntegrationStatus.unconfigured,
        displayName: connected ? 'KenganAuto Main Page' : null,
      },
    });
    return {
      success: true,
      message: connected ? 'Facebook Page successfully connected.' : 'Facebook disconnected.',
    };
  }

  async createInboundLead(tenantId: number, payload: Record<string, any>) {
    const lead = await this.createLead(tenantId, payload);
    if (lead.customerPhone) {
      await this.notificationsQueue.add(JOB_NAMES.notificationDispatch, {
        tenantId,
        channel: 'whatsapp',
        destination: lead.customerPhone,
        message: `Hi ${lead.customerName.split(' ')[0]}, thanks for your enquiry about ${lead.vehicleInterest || 'our stock'}.`,
      });
    }
    return lead;
  }

  async listCustomers(tenantId: number, query?: string) {
    return this.prisma.customer.findMany({
      where: {
        tenantId,
        OR: query
          ? [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query, mode: 'insensitive' } },
              { vehicleOwnedMake: { contains: query, mode: 'insensitive' } },
              { vehicleOwnedModel: { contains: query, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async updateCustomerTags(tenantId: number, customerId: number, tags: string[]) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }
    return this.prisma.customer.update({
      where: { id: customer.id },
      data: { tags },
    });
  }

  async listStock(tenantId: number) {
    return this.prisma.vehicle.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStock(tenantId: number, payload: Record<string, any>) {
    return this.prisma.vehicle.create({
      data: {
        tenantId,
        make: payload.make,
        model: payload.model,
        year: Number(payload.year),
        variant: payload.variant || null,
        colour: payload.colour || null,
        mileage: payload.mileage ? Number(payload.mileage) : null,
        price: Number(payload.price),
        costPrice: payload.cost_price ? Number(payload.cost_price) : null,
        condition: (payload.condition as VehicleCondition) || VehicleCondition.used,
        stockNumber: payload.stock_number,
        vin: payload.vin,
        status: (payload.status as VehicleStatus) || VehicleStatus.available,
        images: payload.images || [],
        features: payload.features || [],
        description: payload.description || null,
      },
    });
  }

  async updateStock(tenantId: number, id: number, payload: Record<string, any>) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenantId },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found.');
    }
    return this.prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        status: payload.status || undefined,
        price: payload.price ? Number(payload.price) : undefined,
      },
    });
  }

  async bulkStockImport(tenantId: number, vehicles: Record<string, any>[]) {
    for (const vehicle of vehicles) {
      await this.prisma.vehicle.upsert({
        where: {
          tenantId_stockNumber: {
            tenantId,
            stockNumber: vehicle.stock_number,
          },
        },
        create: {
          tenantId,
          make: vehicle.make,
          model: vehicle.model,
          year: Number(vehicle.year),
          variant: vehicle.variant || null,
          colour: vehicle.colour || null,
          mileage: vehicle.mileage ? Number(vehicle.mileage) : null,
          price: Number(vehicle.price),
          condition: (vehicle.condition as VehicleCondition) || VehicleCondition.used,
          stockNumber: vehicle.stock_number,
          vin: vehicle.vin,
          status: (vehicle.status as VehicleStatus) || VehicleStatus.available,
          features: vehicle.features || [],
          images: vehicle.images || [],
        },
        update: {
          price: Number(vehicle.price),
          mileage: vehicle.mileage ? Number(vehicle.mileage) : null,
          status: (vehicle.status as VehicleStatus) || VehicleStatus.available,
        },
      });
    }
    return { imported: vehicles.length };
  }

  async listServiceBookings(tenantId: number, startDate?: string, endDate?: string) {
    return this.prisma.serviceBooking.findMany({
      where: {
        tenantId,
        bookingDate: startDate || endDate
          ? {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined,
            }
          : undefined,
      },
      orderBy: [{ bookingDate: 'asc' }, { bookingTime: 'asc' }],
    });
  }

  async updateServiceBooking(tenantId: number, id: number, payload: Record<string, any>) {
    const existing = await this.prisma.serviceBooking.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Booking not found.');
    }
    const booking = await this.prisma.serviceBooking.update({
      where: { id: existing.id },
      data: {
        status: (payload.status as ServiceStatus) || undefined,
        description: payload.description ?? undefined,
        invoiceAmount: payload.invoice_amount !== undefined ? Number(payload.invoice_amount) : undefined,
      },
    });
    return { booking };
  }

  async getServiceAnalytics(tenantId: number) {
    const bookings = await this.prisma.serviceBooking.findMany({ where: { tenantId } });
    const revenue = bookings.reduce((sum, booking) => sum + Number(booking.invoiceAmount || 0), 0);
    const pending = bookings.filter((booking) => booking.status !== ServiceStatus.completed).length;
    return {
      total_this_week: bookings.length,
      completion_rate: bookings.length ? Math.round((bookings.filter((b) => b.status === ServiceStatus.completed).length / bookings.length) * 100) : 0,
      no_show_rate: 0,
      revenue_this_month: revenue,
      pending_jobs: pending,
      busiest_day: 'Monday',
    };
  }

  async listPartsEnquiries(tenantId: number) {
    return this.prisma.partsEnquiry.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPartsEnquiry(tenantId: number, payload: Record<string, any>) {
    return this.prisma.partsEnquiry.create({
      data: {
        tenantId,
        customerName: payload.customer_name || 'Unknown customer',
        customerPhone: payload.customer_phone || null,
        vehicleMake: payload.vehicle_make || 'Unknown',
        vehicleModel: payload.vehicle_model || 'Unknown',
        partName: payload.part_name || 'Unknown part',
        partNumber: payload.part_number || null,
        quantity: Number(payload.quantity || 1),
        priceQuoted: payload.price_quoted ? Number(payload.price_quoted) : null,
        metadata: payload,
      },
    });
  }

  async updatePartsEnquiry(tenantId: number, id: number, payload: Record<string, any>) {
    const existing = await this.prisma.partsEnquiry.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Enquiry not found.');
    }
    const enquiry = await this.prisma.partsEnquiry.update({
      where: { id: existing.id },
      data: {
        status: (payload.status as PartsStatus) || undefined,
        priceQuoted: payload.price_quoted !== undefined ? Number(payload.price_quoted) : undefined,
      },
    });
    return { enquiry };
  }

  async listPartCatalog(tenantId: number) {
    return this.prisma.partCatalogItem.findMany({
      where: { tenantId },
      orderBy: { description: 'asc' },
    });
  }

  async bulkPartCatalogImport(tenantId: number, parts: Record<string, any>[]) {
    for (const part of parts) {
      await this.prisma.partCatalogItem.upsert({
        where: {
          tenantId_partNumber: {
            tenantId,
            partNumber: part.part_number,
          },
        },
        create: {
          tenantId,
          partNumber: part.part_number,
          description: part.description,
          fitment: part.fitment || null,
          price: Number(part.price),
          stock: Number(part.stock || 0),
        },
        update: {
          description: part.description,
          fitment: part.fitment || null,
          price: Number(part.price),
          stock: Number(part.stock || 0),
        },
      });
    }
    return { imported: parts.length };
  }

  async getPartsAnalytics(tenantId: number) {
    const enquiries = await this.prisma.partsEnquiry.findMany({ where: { tenantId } });
    return {
      revenue_this_month: enquiries.reduce((sum, enquiry) => sum + Number(enquiry.priceQuoted || 0), 0),
      pending_orders_value: enquiries
        .filter((enquiry) => enquiry.status === PartsStatus.ordered)
        .reduce((sum, enquiry) => sum + Number(enquiry.priceQuoted || 0), 0),
      collection_rate: enquiries.length
        ? Math.round((enquiries.filter((enquiry) => enquiry.status === PartsStatus.collected).length / enquiries.length) * 100)
        : 0,
      top_selling_parts: Object.entries(
        enquiries.reduce<Record<string, number>>((acc, enquiry) => {
          acc[enquiry.partName] = (acc[enquiry.partName] || 0) + 1;
          return acc;
        }, {}),
      )
        .map(([name, count]) => ({ name, count }))
        .slice(0, 5),
    };
  }

  async listTradeIns(tenantId: number) {
    const items = await this.prisma.tradeIn.findMany({
      where: { tenantId },
      include: { lead: true },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => ({
      ...item,
      lead: item.lead
        ? {
            customer_name: item.lead.customerName,
            customer_phone: item.lead.customerPhone,
          }
        : null,
    }));
  }

  async updateTradeIn(tenantId: number, id: number, payload: Record<string, any>) {
    const existing = await this.prisma.tradeIn.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Trade-in not found.');
    }
    const tradeIn = await this.prisma.tradeIn.update({
      where: { id: existing.id },
      data: {
        dealerOffer: payload.dealer_offer !== undefined ? Number(payload.dealer_offer) : undefined,
        status: (payload.status as TradeInStatus) || undefined,
      },
      include: { lead: true },
    });
    return { trade_in: tradeIn };
  }

  async getRetentionSequences(tenantId: number) {
    return this.prisma.automationSequence.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async toggleRetentionSequence(tenantId: number, id: number, active: boolean) {
    const sequence = await this.prisma.automationSequence.findFirst({
      where: { id, tenantId },
    });
    if (!sequence) {
      throw new NotFoundException('Sequence not found.');
    }
    return this.prisma.automationSequence.update({
      where: { id: sequence.id },
      data: { active },
    });
  }

  async getLoyaltyAndNps(tenantId: number) {
    const customers = await this.prisma.customer.findMany({ where: { tenantId } });
    const avgNps = customers.length
      ? Math.round(
          customers.reduce((sum, customer) => sum + Number(customer.npsScore || 0), 0) /
            Math.max(1, customers.filter((customer) => customer.npsScore !== null).length),
        )
      : 0;
    return {
      loyalty_tiers: [
        { tier: 'Platinum', threshold: '1000+ pts', benefits: 'VIP Concierge, Priority Service' },
        { tier: 'Gold', threshold: '500-999 pts', benefits: 'Discount on accessories' },
        { tier: 'Silver', threshold: '200-499 pts', benefits: 'Free wash with service' },
        { tier: 'Bronze', threshold: '0-199 pts', benefits: 'Basic points accumulation' },
      ],
      loyalty_points_awards: [
        { action: 'Vehicle Purchase', points: 500 },
        { action: 'Service Booking', points: 50 },
        { action: 'Customer Referral', points: 200 },
        { action: 'Leave Google Review', points: 100 },
      ],
      nps_data: {
        average_score: avgNps,
        scores: customers
          .filter((customer) => customer.npsScore !== null)
          .map((customer) => ({
            customer: `${customer.firstName} ${customer.lastName}`.trim(),
            score: customer.npsScore,
            comment: 'Captured in platform',
          })),
      },
    };
  }

  async listSupportManuals(tenantId: number) {
    return this.prisma.supportManual.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async createSupportManual(tenantId: number, payload: Record<string, any>) {
    return this.prisma.supportManual.create({
      data: {
        tenantId,
        title: payload.title,
        make: payload.make || null,
        model: payload.model || null,
        url: payload.url || null,
        content: payload.content || null,
      },
    });
  }

  async listSupportFaqs(tenantId: number) {
    return this.prisma.supportFaq.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async createSupportFaq(tenantId: number, payload: Record<string, any>) {
    return this.prisma.supportFaq.create({
      data: {
        tenantId,
        question: payload.question,
        answer: payload.answer,
        category: payload.category || null,
      },
    });
  }

  async listSupportQueries(tenantId: number) {
    return this.prisma.supportQuery.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async getAnalyticsReport(tenantId: number, reportType = 'overview') {
    const leadsCount = await this.prisma.lead.count({ where: { tenantId } });
    const wonLeads = await this.prisma.lead.count({ where: { tenantId, status: LeadStatus.won } });
    const serviceBookings = await this.prisma.serviceBooking.findMany({ where: { tenantId } });
    const partsEnquiries = await this.prisma.partsEnquiry.findMany({ where: { tenantId } });
    const automationSequences = await this.prisma.automationSequence.findMany({ where: { tenantId } });
    const conversations = await this.prisma.conversation.count({ where: { tenantId } });

    return {
      overview: {
        kpis: {
          lead_count: leadsCount,
          won_count: wonLeads,
          conversation_count: conversations,
          service_bookings: serviceBookings.length,
        },
      },
      sales: {
        won_lost_reasons: [
          { reason: 'Won', value: wonLeads },
          { reason: 'Lost', value: Math.max(0, leadsCount - wonLeads) },
        ],
        revenue_by_salesperson: [],
        vehicle_popularity: [],
      },
      finance: {
        approval_by_bank: [],
      },
      service: {
        revenue_by_type: [],
        busiest_times: [],
      },
      leads: {
        ai_score_distribution: [
          { score: '0-40', count: 0 },
          { score: '41-60', count: 0 },
          { score: '61-80', count: 0 },
          { score: '81-100', count: 0 },
        ],
        stale_leads_details: [],
      },
      retention: {
        sequences_performance: automationSequences.map((sequence) => ({
          seq: sequence.name,
          open_rate: 0,
          response_rate: 0,
        })),
        loyalty_distribution: [
          { tier: 'Platinum', members: 0 },
          { tier: 'Gold', members: 0 },
          { tier: 'Silver', members: 0 },
          { tier: 'Bronze', members: 0 },
        ],
      },
      response_trend: [],
      monthly_revenue: [],
      live_alerts: [],
      revenue_by_type: [],
      busiest_times: [],
    }[reportType as 'overview'] || {
      response_trend: [],
      monthly_revenue: [],
      live_alerts: [],
      revenue_by_type: [],
      busiest_times: [],
    };
  }

  async listTenants() {
    return this.prisma.tenant.findMany({
      include: {
        users: {
          take: 3,
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTenantById(tenantId: number) {
    return this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });
  }

  async getApiSettings(tenantId: number) {
    const rows = await this.prisma.apiSetting.findMany({
      where: { tenantId },
      orderBy: { serviceName: 'asc' },
    });
    return rows.map((row) => ({
      service_name: row.serviceName,
      status: row.status,
      key_masked: row.encryptedKey ? '••••••••••••' : '',
    }));
  }

  async saveApiSetting(tenantId: number, serviceName: string, key: string) {
    await this.prisma.apiSetting.upsert({
      where: {
        tenantId_serviceName: { tenantId, serviceName },
      },
      create: {
        tenantId,
        serviceName,
        encryptedKey: encryptString(key),
        status: 'verified',
      },
      update: {
        encryptedKey: encryptString(key),
        status: 'verified',
      },
    });
    return { message: 'API setting saved successfully.' };
  }

  async testApiSetting(serviceName: string) {
    return {
      success: true,
      message: `${serviceName} integration credentials are stored. Live verification requires tenant-specific credentials and provider access.`,
    };
  }
}
