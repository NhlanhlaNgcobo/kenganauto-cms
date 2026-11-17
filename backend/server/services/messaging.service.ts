import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { NotificationDelivery, Tenant, WhatsappSetting } from '@prisma/client';
import { Resend } from 'resend';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { decryptString } from '../common/crypto';

type DispatchPayload = {
  tenantId: number;
  channel: 'email' | 'sms' | 'whatsapp';
  destination: string;
  message: string;
  templateKey?: string;
};

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  private async logDelivery(
    tenantId: number,
    payload: DispatchPayload,
    status: string,
    response?: unknown,
  ): Promise<NotificationDelivery> {
    return this.prisma.notificationDelivery.create({
      data: {
        tenantId,
        channel: payload.channel,
        destination: payload.destination,
        templateKey: payload.templateKey,
        status,
        payload,
        response: response as object | undefined,
      },
    });
  }

  private getResend() {
    if (!process.env.RESEND_API_KEY) {
      throw new ServiceUnavailableException('Resend is not configured.');
    }
    return new Resend(process.env.RESEND_API_KEY);
  }

  private async getWhatsappConfig(tenantId: number): Promise<WhatsappSetting> {
    const config = await this.prisma.whatsappSetting.findUnique({
      where: { tenantId },
    });
    if (!config?.encryptedApiKey || !config.whatsappNumber) {
      throw new ServiceUnavailableException('360dialog is not configured for this tenant.');
    }
    return config;
  }

  async sendEmail(tenant: Tenant, destination: string, subject: string, message: string) {
    const resend = this.getResend();
    const response = await resend.emails.send({
      from: `KenganAuto <no-reply@${tenant.subdomain || 'kenganauto.co.za'}>`,
      to: destination,
      subject,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><p>${message.replace(/\n/g, '<br/>')}</p></div>`,
    });
    return response;
  }

  async sendWhatsapp(tenantId: number, destination: string, message: string) {
    const config = await this.getWhatsappConfig(tenantId);
    const apiKey = decryptString(config.encryptedApiKey);

    const response = await fetch('https://waba-v2.360dialog.io/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        D360_API_KEY: apiKey || '',
      },
      body: JSON.stringify({
        to: destination,
        type: 'text',
        text: { body: message },
      }),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`360dialog send failed with ${response.status}.`);
    }

    return response.json();
  }

  async sendSms(_tenantId: number, destination: string, message: string) {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: destination,
            From: process.env.TWILIO_FROM_NUMBER,
            Body: message,
          }),
        },
      );

      if (!response.ok) {
        throw new ServiceUnavailableException(`Twilio send failed with ${response.status}.`);
      }

      return response.json();
    }

    throw new ServiceUnavailableException('SMS provider is not configured.');
  }

  async dispatch(payload: DispatchPayload) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: payload.tenantId },
    });

    try {
      let response: unknown;

      if (payload.channel === 'email') {
        response = await this.sendEmail(tenant, payload.destination, 'KenganAuto Notification', payload.message);
      } else if (payload.channel === 'whatsapp') {
        response = await this.sendWhatsapp(payload.tenantId, payload.destination, payload.message);
      } else {
        response = await this.sendSms(payload.tenantId, payload.destination, payload.message);
      }

      await this.logDelivery(payload.tenantId, payload, 'sent', response);
      return { ok: true, response };
    } catch (error) {
      await this.logDelivery(payload.tenantId, payload, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
