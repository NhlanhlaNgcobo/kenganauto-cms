import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Plan, SubscriptionStatus, Tenant } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

const PLAN_LIMITS: Record<Plan, { conversations: number; users: number; vehicles: number }> = {
  starter: { conversations: 500, users: 5, vehicles: 100 },
  growth: { conversations: 2500, users: 25, vehicles: 500 },
  enterprise: { conversations: 10000, users: 100, vehicles: 5000 },
};

@Injectable()
export class BillingService {
  private stripe: Stripe | null = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })
    : null;

  constructor(private readonly prisma: PrismaService) {}

  getPlanLimits(plan: Plan) {
    return PLAN_LIMITS[plan];
  }

  private getPriceId(plan: string) {
    const map: Record<string, string | undefined> = {
      starter: process.env.STRIPE_PRICE_STARTER,
      growth: process.env.STRIPE_PRICE_GROWTH,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
    };
    return map[plan];
  }

  private ensureStripe() {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe is not configured.');
    }
    return this.stripe;
  }

  async getStatus(tenantId: number) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const usage = await this.prisma.analyticsEvent.count({
      where: {
        tenantId,
        eventType: 'conversation.created',
      },
    });
    const limits = this.getPlanLimits(tenant.plan);

    return {
      plan: tenant.plan,
      status: tenant.subscriptionStatus,
      trial_ends_at: tenant.trialEndsAt,
      current_period_end: tenant.currentPeriodEnd,
      setup_fee_paid: tenant.setupFeePaid,
      usage: {
        conversations: {
          used: usage,
          limit: limits.conversations,
        },
        users: {
          limit: limits.users,
        },
        vehicles: {
          limit: limits.vehicles,
        },
      },
    };
  }

  async createCheckout(tenant: Tenant, planKey: string, successUrl: string, cancelUrl: string) {
    const stripe = this.ensureStripe();
    const priceId = this.getPriceId(planKey);

    if (!priceId) {
      throw new BadRequestException('Invalid plan selected.');
    }

    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: tenant.name,
        metadata: { tenantId: String(tenant.id) },
      });
      customerId = customer.id;
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { tenantId: String(tenant.id), planKey },
    });

    return { url: session.url };
  }

  async createPortal(tenant: Tenant, returnUrl: string) {
    const stripe = this.ensureStripe();
    if (!tenant.stripeCustomerId) {
      throw new BadRequestException('No active billing profile found.');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }
}
