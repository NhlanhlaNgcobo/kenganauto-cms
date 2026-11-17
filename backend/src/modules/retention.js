'use strict';

const express = require('express');
const { Model } = require('objection');
const router = express.Router();

const AutomationSequence = require('../models/AutomationSequence');
const ReactivationCampaign = require('../models/ReactivationCampaign');
const Tenant = require('../models/Tenant');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const ServiceBooking = require('../models/ServiceBooking');
const { authenticate } = require('../middleware/auth');
const notificationService = require('../services/notification_service');

const REACTIVATION_CHANNELS = ['email', 'sms', 'whatsapp'];
const REACTIVATION_AUDIENCES = ['service_due', 'birthdays', 'dormant_leads', 'all_customers'];
const REACTIVATION_SCHEDULES = ['once', 'daily', 'weekly', 'monthly'];
const REACTIVATION_LOCK_MESSAGE = 'Database reactivation is available on the Enterprise plan only.';
const DEFAULT_SERVICE_INTERVAL_DAYS = 180;
const DEFAULT_SERVICE_WINDOW_DAYS = 30;
const DEFAULT_BIRTHDAY_WINDOW_DAYS = 14;
const DEFAULT_DORMANCY_DAYS = 45;

async function tryDB(dbCall, mockCall) {
    try {
        const result = await dbCall();
        return result || mockCall();
    } catch {
        return mockCall();
    }
}

let mockSequences = [
    {
        id: 1, tenant_id: 1, name: 'NEW BUYER NURTURE', trigger_type: 'deal_delivered', active: true,
        steps: JSON.stringify([
            { day: 1, message: "Congratulations on your new [Vehicle]! We hope you love it. Here's your digital owner's guide: [link]" },
            { day: 7, message: 'Hi [Name], how are you enjoying your new [Vehicle]? Is there anything we can help you with?' },
            { day: 30, message: 'It has been a month with your [Vehicle]. Reply ACCESSORIES to see our latest offers.' },
            { day: 60, message: 'Your first service is coming up in about 2 months. Want us to pre-book a slot?' },
            { day: 90, message: '[Service interval reminder] Book your first service now' },
            { day: 180, message: 'We would love a Google review if you have been happy!' },
            { day: 365, message: 'Happy 1-year anniversary with your [Vehicle]! Here is an exclusive loyalty offer.' }
        ])
    },
    {
        id: 2, tenant_id: 1, name: 'COLD LEAD RE-ENGAGEMENT', trigger_type: 'lead_dormant_30_days', active: true,
        steps: JSON.stringify([
            { day: 30, message: 'Hi [Name], we noticed you were interested in a [Vehicle] a while back. Are you still in the market?' },
            { day: 37, message: 'A relevant vehicle update or price change on the model you liked.' },
            { day: 44, message: 'We have new stock arrivals. Would you like to see what came in this week?' }
        ])
    },
    {
        id: 3, tenant_id: 1, name: 'SERVICE RETENTION', trigger_type: 'service_due_1_month', active: false,
        steps: JSON.stringify([
            { day: -30, message: 'Your [Vehicle] service is coming up. Book now to get your preferred slot.' },
            { day: -14, message: 'Reminder: Your [Vehicle] service is fast approaching.' },
            { day: -7, message: 'Final reminder with a quick-book link.' }
        ])
    },
    {
        id: 4, tenant_id: 1, name: 'WIN-BACK', trigger_type: 'inactive_18_months', active: false,
        steps: JSON.stringify([
            { day: 540, message: "A personal note from the dealer principal with a loyalty offer." },
            { day: 545, message: 'New model announcement relevant to the customer profile.' }
        ])
    }
];

let mockNpsData = {
    average_score: 9.1,
    scores: [
        { customer: 'David Zondo', score: 9, comment: 'Great service' },
        { customer: 'Sarah Naidoo', score: 10, comment: 'Loved the delivery' },
        { customer: 'John Doe', score: 8, comment: 'Was good' }
    ]
};

let mockCustomers = [
    {
        id: 1,
        tenant_id: 1,
        first_name: 'David',
        last_name: 'Zondo',
        email: 'david@example.com',
        phone: '+27821234567',
        whatsapp_number: '+27821234567',
        vehicle_owned_make: 'Ford',
        vehicle_owned_model: 'Ranger',
        purchase_date: '2025-11-12T00:00:00.000Z',
        date_of_birth: '1985-05-18',
        last_contact_at: '2026-02-01T00:00:00.000Z',
        tags: ['Service Regular', 'VIP'],
    },
    {
        id: 2,
        tenant_id: 1,
        first_name: 'Sarah',
        last_name: 'Naidoo',
        email: 'sarah@example.com',
        phone: '+27712345678',
        whatsapp_number: '+27712345678',
        vehicle_owned_make: 'Toyota',
        vehicle_owned_model: 'Hilux',
        purchase_date: '2025-09-10T00:00:00.000Z',
        date_of_birth: '1992-05-11',
        last_contact_at: '2026-01-20T00:00:00.000Z',
        tags: ['Loyalty'],
    }
];

let mockServiceBookings = [
    {
        id: 1,
        tenant_id: 1,
        customer_id: 1,
        vehicle_registration: 'CA123456',
        vehicle_make: 'Ford',
        vehicle_model: 'Ranger',
        booking_date: '2025-11-18',
        status: 'completed',
        service_type: 'major',
    },
    {
        id: 2,
        tenant_id: 1,
        customer_id: 2,
        vehicle_registration: 'ND654321',
        vehicle_make: 'Toyota',
        vehicle_model: 'Hilux',
        booking_date: '2025-12-01',
        status: 'completed',
        service_type: 'minor',
    }
];

let mockLeads = [
    {
        id: 1,
        tenant_id: 1,
        customer_name: 'Ntokozo Maseko',
        customer_phone: '+27835550123',
        customer_email: 'ntokozo@example.com',
        source: 'website',
        vehicle_interest: 'Toyota Fortuner',
        status: 'qualified',
        last_contact_at: '2026-02-10T00:00:00.000Z',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-02-10T00:00:00.000Z',
    },
    {
        id: 2,
        tenant_id: 1,
        customer_name: 'Ayesha Khan',
        customer_phone: '+27724440111',
        customer_email: 'ayesha@example.com',
        source: 'autotrader',
        vehicle_interest: 'VW Tiguan',
        status: 'contacted',
        last_contact_at: '2026-01-22T00:00:00.000Z',
        created_at: '2025-12-10T00:00:00.000Z',
        updated_at: '2026-01-22T00:00:00.000Z',
    }
];

let mockReactivationCampaigns = [];
let mockCampaignRuns = [];
let mockCampaignId = 1000;

function calculateLoyaltyTier(points) {
    if (points >= 1000) return 'Platinum';
    if (points >= 500) return 'Gold';
    if (points >= 200) return 'Silver';
    return 'Bronze';
}

function parseJsonField(value, fallback) {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function normaliseCampaign(campaign) {
    if (!campaign) return null;
    return {
        ...campaign,
        schedule_config: parseJsonField(campaign.schedule_config, {}),
        filters: parseJsonField(campaign.filters, {}),
        last_run_summary: parseJsonField(campaign.last_run_summary, {}),
    };
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function textToHtml(value) {
    return escapeHtml(value).replace(/\n/g, '<br />');
}

function addDays(dateLike, days) {
    const date = new Date(dateLike);
    date.setDate(date.getDate() + days);
    return date;
}

function formatDate(dateLike) {
    if (!dateLike) return '';
    return new Date(dateLike).toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatMonthDay(dateLike) {
    if (!dateLike) return '';
    return new Date(dateLike).toLocaleDateString('en-ZA', {
        day: '2-digit',
        month: 'short',
    });
}

function getTenantDisplayName(tenant) {
    return tenant?.name || 'KenganAuto';
}

function interpolateTemplate(template, tokens) {
    return String(template || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, token) => {
        return tokens[token] ?? '';
    });
}

function getCustomerName(customer) {
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
}

function pickDateValue(...values) {
    return values.find((value) => value) || null;
}

function getNextBirthday(dateOfBirth, now = new Date()) {
    if (!dateOfBirth) return null;
    const source = new Date(dateOfBirth);
    if (Number.isNaN(source.getTime())) return null;

    const next = new Date(now.getFullYear(), source.getMonth(), source.getDate());
    if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        next.setFullYear(next.getFullYear() + 1);
    }
    return next;
}

function getDefaultCampaignBlueprints(tenantId) {
    return [
        {
            tenant_id: tenantId,
            name: 'Service Reminder Flow',
            kind: 'service_reminder',
            channel: 'whatsapp',
            audience_type: 'service_due',
            active: true,
            is_automatic: true,
            schedule_type: 'daily',
            schedule_config: { hour: 8 },
            filters: { service_interval_days: DEFAULT_SERVICE_INTERVAL_DAYS, due_window_days: DEFAULT_SERVICE_WINDOW_DAYS },
            template_subject: 'Your {{dealershipName}} service reminder',
            template_body: 'Hi {{firstName}}, your {{vehicleLabel}} is due for service around {{dueDate}}. Reply to this message and we will reserve your preferred workshop slot at {{dealershipName}}.',
        },
        {
            tenant_id: tenantId,
            name: 'Birthday Delight',
            kind: 'birthday_reminder',
            channel: 'whatsapp',
            audience_type: 'birthdays',
            active: true,
            is_automatic: true,
            schedule_type: 'daily',
            schedule_config: { hour: 9 },
            filters: { lead_days: DEFAULT_BIRTHDAY_WINDOW_DAYS },
            template_subject: 'Happy birthday from {{dealershipName}}',
            template_body: 'Happy birthday {{firstName}}. The team at {{dealershipName}} wishes you an incredible year ahead. If you would like a valet, service quote, or upgrade check-in this month, just reply here.',
        },
        {
            tenant_id: tenantId,
            name: 'Dormant Lead Test Drive Invite',
            kind: 'test_drive_reactivation',
            channel: 'email',
            audience_type: 'dormant_leads',
            active: true,
            is_automatic: true,
            schedule_type: 'weekly',
            schedule_config: { day_of_week: 1 },
            filters: { inactivity_days: DEFAULT_DORMANCY_DAYS },
            template_subject: 'Still open to a {{vehicleInterest}} test drive?',
            template_body: 'Hi {{firstName}}, we still have fresh options for {{vehicleInterest}} buyers. If you want, we can line up a quick test drive this week and show you the latest pricing from {{dealershipName}}.',
        },
    ];
}

async function resolveTenantForRequest(req) {
    if (req.tenant?.plan) return req.tenant;
    if (req.user?.tenant_id) {
        return Tenant.query().findById(req.user.tenant_id);
    }
    if (req.tenant?.id) {
        return Tenant.query().findById(req.tenant.id);
    }
    return null;
}

function isEnterpriseTenant(tenant) {
    return tenant?.plan === 'enterprise';
}

async function requireEnterprise(req, res, next) {
    try {
        const tenant = await resolveTenantForRequest(req);
        if (!isEnterpriseTenant(tenant)) {
            return res.status(403).json({
                error: REACTIVATION_LOCK_MESSAGE,
                upgrade_required: true,
                current_plan: tenant?.plan || 'starter',
            });
        }

        req.retentionTenant = tenant;
        next();
    } catch (error) {
        console.error('[retention] enterprise check failed:', error);
        res.status(500).json({ error: 'Failed to verify tenant plan.' });
    }
}

async function fetchCustomers(tenantId) {
    return tryDB(
        () => Customer.query().where({ tenant_id: tenantId }).orderBy('updated_at', 'desc'),
        () => mockCustomers.filter((item) => item.tenant_id === tenantId)
    );
}

async function fetchLeads(tenantId) {
    return tryDB(
        () => Lead.query().where({ tenant_id: tenantId }).orderBy('updated_at', 'desc'),
        () => mockLeads.filter((item) => item.tenant_id === tenantId)
    );
}

async function fetchServiceBookings(tenantId) {
    return tryDB(
        () => ServiceBooking.query().where({ tenant_id: tenantId }).orderBy('booking_date', 'desc'),
        () => mockServiceBookings.filter((item) => item.tenant_id === tenantId)
    );
}

async function ensureDefaultCampaigns(tenantId, userId = null) {
    const blueprints = getDefaultCampaignBlueprints(tenantId);

    await tryDB(
        async () => {
            const existing = await ReactivationCampaign.query().where({ tenant_id: tenantId });
            const existingKinds = new Set(existing.map((campaign) => campaign.kind));
            const missing = blueprints.filter((campaign) => !existingKinds.has(campaign.kind));

            if (!missing.length) return existing.map(normaliseCampaign);

            const payload = missing.map((campaign) => ({
                ...campaign,
                schedule_config: JSON.stringify(campaign.schedule_config || {}),
                filters: JSON.stringify(campaign.filters || {}),
                last_run_summary: JSON.stringify({}),
                created_by: userId,
                updated_by: userId,
            }));

            await ReactivationCampaign.query().insert(payload);
            const refreshed = await ReactivationCampaign.query().where({ tenant_id: tenantId }).orderBy('created_at', 'desc');
            return refreshed.map(normaliseCampaign);
        },
        () => {
            const existingKinds = new Set(
                mockReactivationCampaigns.filter((item) => item.tenant_id === tenantId).map((item) => item.kind)
            );
            blueprints.forEach((campaign) => {
                if (!existingKinds.has(campaign.kind)) {
                    mockReactivationCampaigns.push({
                        id: ++mockCampaignId,
                        ...campaign,
                        created_by: userId,
                        updated_by: userId,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        last_run_summary: {},
                    });
                }
            });
        }
    );
}

async function listCampaigns(tenantId) {
    return tryDB(
        async () => {
            const campaigns = await ReactivationCampaign.query().where({ tenant_id: tenantId }).orderBy('created_at', 'desc');
            return campaigns.map(normaliseCampaign);
        },
        () => mockReactivationCampaigns.filter((item) => item.tenant_id === tenantId).map(normaliseCampaign)
    );
}

async function listRecentCampaignRuns(tenantId) {
    return tryDB(
        async () => {
            const knex = Model.knex();
            const rows = await knex('reactivation_campaign_runs')
                .where({ tenant_id: tenantId })
                .orderBy('created_at', 'desc')
                .limit(8);

            return rows.map((row) => ({
                ...row,
                audience_snapshot: parseJsonField(row.audience_snapshot, []),
                result_meta: parseJsonField(row.result_meta, {}),
            }));
        },
        () => mockCampaignRuns.filter((item) => item.tenant_id === tenantId).slice(-8).reverse()
    );
}

async function buildServiceDueAudience(tenantId, filters = {}) {
    const customers = await fetchCustomers(tenantId);
    const bookings = await fetchServiceBookings(tenantId);
    const intervalDays = Number(filters.service_interval_days || DEFAULT_SERVICE_INTERVAL_DAYS);
    const dueWindowDays = Number(filters.due_window_days || DEFAULT_SERVICE_WINDOW_DAYS);
    const now = new Date();
    const windowEnd = addDays(now, dueWindowDays);

    return customers.reduce((results, customer) => {
        const customerName = getCustomerName(customer);
        const history = bookings
            .filter((booking) => booking.customer_id === customer.id && booking.status !== 'cancelled')
            .sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));

        const latestPastBooking = history.find((booking) => new Date(booking.booking_date) <= now);
        const upcomingBooking = history.find((booking) => new Date(booking.booking_date) > now);
        const baseDate = pickDateValue(latestPastBooking?.booking_date, customer.purchase_date);

        if (!baseDate || upcomingBooking) {
            return results;
        }

        const dueDate = addDays(baseDate, intervalDays);
        if (dueDate < now || dueDate > windowEnd) {
            return results;
        }

        results.push({
            entity_type: 'customer',
            entity_id: customer.id,
            full_name: customerName,
            first_name: customer.first_name || customerName.split(' ')[0] || 'there',
            email: customer.email || null,
            phone: customer.phone || null,
            whatsapp_number: customer.whatsapp_number || customer.phone || null,
            vehicleInterest: customer.vehicle_owned_model || `${customer.vehicle_owned_make || ''} ${customer.vehicle_owned_model || ''}`.trim(),
            vehicleLabel: `${customer.vehicle_owned_make || ''} ${customer.vehicle_owned_model || ''}`.trim() || 'your vehicle',
            dueDate: formatDate(dueDate),
            bookingDate: latestPastBooking ? formatDate(latestPastBooking.booking_date) : '',
        });
        return results;
    }, []);
}

async function buildBirthdayAudience(tenantId, filters = {}) {
    const customers = await fetchCustomers(tenantId);
    const leadDays = Number(filters.lead_days || DEFAULT_BIRTHDAY_WINDOW_DAYS);
    const now = new Date();
    const windowEnd = addDays(now, leadDays);

    return customers.reduce((results, customer) => {
        const nextBirthday = getNextBirthday(customer.date_of_birth, now);
        if (!nextBirthday || nextBirthday > windowEnd) {
            return results;
        }

        const customerName = getCustomerName(customer);
        results.push({
            entity_type: 'customer',
            entity_id: customer.id,
            full_name: customerName,
            first_name: customer.first_name || customerName.split(' ')[0] || 'there',
            email: customer.email || null,
            phone: customer.phone || null,
            whatsapp_number: customer.whatsapp_number || customer.phone || null,
            birthday: formatMonthDay(nextBirthday),
            vehicleLabel: `${customer.vehicle_owned_make || ''} ${customer.vehicle_owned_model || ''}`.trim() || 'your vehicle',
        });
        return results;
    }, []);
}

async function buildDormantLeadAudience(tenantId, filters = {}) {
    const leads = await fetchLeads(tenantId);
    const inactivityDays = Number(filters.inactivity_days || DEFAULT_DORMANCY_DAYS);
    const threshold = addDays(new Date(), -inactivityDays);
    const excludedStatuses = new Set(['won', 'lost', 'test_drive_booked']);

    return leads.reduce((results, lead) => {
        const referenceDate = pickDateValue(lead.last_contact_at, lead.updated_at, lead.created_at);
        if (!referenceDate || new Date(referenceDate) > threshold || excludedStatuses.has(lead.status)) {
            return results;
        }

        const firstName = (lead.customer_name || '').split(' ')[0] || 'there';
        results.push({
            entity_type: 'lead',
            entity_id: lead.id,
            full_name: lead.customer_name,
            first_name: firstName,
            email: lead.customer_email || null,
            phone: lead.customer_phone || null,
            whatsapp_number: lead.customer_phone || null,
            vehicleInterest: lead.vehicle_interest || 'your preferred vehicle',
            vehicleLabel: lead.vehicle_interest || 'your preferred vehicle',
            lastContactAt: formatDate(referenceDate),
        });
        return results;
    }, []);
}

async function buildAllCustomerAudience(tenantId) {
    const customers = await fetchCustomers(tenantId);
    return customers
        .filter((customer) => customer.email || customer.phone || customer.whatsapp_number)
        .map((customer) => ({
            entity_type: 'customer',
            entity_id: customer.id,
            full_name: getCustomerName(customer),
            first_name: customer.first_name || 'there',
            email: customer.email || null,
            phone: customer.phone || null,
            whatsapp_number: customer.whatsapp_number || customer.phone || null,
            vehicleLabel: `${customer.vehicle_owned_make || ''} ${customer.vehicle_owned_model || ''}`.trim() || 'your vehicle',
        }));
}

async function buildAudience(tenantId, audienceType, filters = {}) {
    if (audienceType === 'service_due') return buildServiceDueAudience(tenantId, filters);
    if (audienceType === 'birthdays') return buildBirthdayAudience(tenantId, filters);
    if (audienceType === 'dormant_leads') return buildDormantLeadAudience(tenantId, filters);
    return buildAllCustomerAudience(tenantId);
}

function getAudienceSample(audience) {
    return audience.slice(0, 5).map((person) => ({
        entity_type: person.entity_type,
        entity_id: person.entity_id,
        full_name: person.full_name,
        email: person.email,
        phone: person.phone,
        whatsapp_number: person.whatsapp_number,
    }));
}

function campaignIsDue(campaign, now = new Date()) {
    if (!campaign.active || !campaign.is_automatic) return false;

    const processedKey = campaign.last_processed_key;
    const todayKey = now.toISOString().slice(0, 10);
    if (processedKey === todayKey) return false;

    const scheduleType = campaign.schedule_type || 'once';
    const schedule = parseJsonField(campaign.schedule_config, {});

    if (scheduleType === 'daily') return true;
    if (scheduleType === 'weekly') {
        const targetDay = Number(schedule.day_of_week ?? 1);
        return now.getDay() === targetDay;
    }
    if (scheduleType === 'monthly') {
        const targetDate = Number(schedule.day_of_month ?? 1);
        return now.getDate() === targetDate;
    }
    return !campaign.last_run_at;
}

async function persistCampaignRun(tenantId, campaignId, summary, audience) {
    return tryDB(
        async () => {
            const knex = Model.knex();
            await knex('reactivation_campaign_runs').insert({
                tenant_id: tenantId,
                campaign_id: campaignId,
                trigger_source: summary.trigger_source,
                audience_count: summary.audience_count,
                delivered_count: summary.delivered_count,
                failed_count: summary.failed_count,
                skipped_count: summary.skipped_count,
                audience_snapshot: JSON.stringify(getAudienceSample(audience)),
                result_meta: JSON.stringify(summary),
            });
        },
        () => {
            mockCampaignRuns.push({
                id: mockCampaignRuns.length + 1,
                tenant_id: tenantId,
                campaign_id: campaignId,
                trigger_source: summary.trigger_source,
                audience_count: summary.audience_count,
                delivered_count: summary.delivered_count,
                failed_count: summary.failed_count,
                skipped_count: summary.skipped_count,
                audience_snapshot: getAudienceSample(audience),
                result_meta: summary,
                created_at: new Date().toISOString(),
            });
        }
    );
}

async function updateCampaignRunState(campaign, summary, actorId) {
    const payload = {
        last_run_at: summary.executed_at,
        last_processed_key: summary.processed_key,
        last_run_summary: JSON.stringify(summary),
        updated_by: actorId || campaign.updated_by || null,
        updated_at: new Date().toISOString(),
    };

    return tryDB(
        () => ReactivationCampaign.query().patchAndFetchById(campaign.id, payload),
        () => {
            const target = mockReactivationCampaigns.find((item) => item.id === campaign.id);
            if (target) Object.assign(target, { ...payload, last_run_summary: summary });
            return target;
        }
    );
}

async function deliverCampaignMessage({ tenant, campaign, recipient }) {
    const tokens = {
        dealershipName: getTenantDisplayName(tenant),
        firstName: recipient.first_name || 'there',
        fullName: recipient.full_name || recipient.first_name || 'there',
        vehicleInterest: recipient.vehicleInterest || recipient.vehicleLabel || 'your preferred vehicle',
        vehicleLabel: recipient.vehicleLabel || recipient.vehicleInterest || 'your vehicle',
        dueDate: recipient.dueDate || '',
        birthday: recipient.birthday || '',
        bookingDate: recipient.bookingDate || '',
        lastContactAt: recipient.lastContactAt || '',
    };

    const body = interpolateTemplate(campaign.template_body, tokens).trim();
    if (!body) return { success: false, error: 'Template resolved to an empty body.' };

    if (campaign.channel === 'email') {
        const subject = interpolateTemplate(campaign.template_subject || campaign.name, tokens).trim();
        if (!recipient.email) return { success: false, skipped: true, error: 'Missing email address.' };
        return notificationService.sendEmail(recipient.email, subject, campaign.name, textToHtml(body));
    }

    if (campaign.channel === 'sms') {
        if (!recipient.phone) return { success: false, skipped: true, error: 'Missing mobile number.' };
        return notificationService.sendSMS(recipient.phone, body);
    }

    if (!recipient.whatsapp_number) return { success: false, skipped: true, error: 'Missing WhatsApp number.' };
    return notificationService.sendWhatsApp(recipient.whatsapp_number, body, true, tenant.id);
}

async function runCampaign({ tenant, campaign, actorId = null, triggerSource = 'manual' }) {
    const audience = await buildAudience(tenant.id, campaign.audience_type, campaign.filters);
    const summary = {
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        trigger_source: triggerSource,
        audience_type: campaign.audience_type,
        audience_count: audience.length,
        delivered_count: 0,
        failed_count: 0,
        skipped_count: 0,
        executed_at: new Date().toISOString(),
        processed_key: new Date().toISOString().slice(0, 10),
        sample_recipients: getAudienceSample(audience),
    };

    for (const recipient of audience) {
        const result = await deliverCampaignMessage({ tenant, campaign, recipient });
        if (result?.success) {
            summary.delivered_count += 1;
        } else if (result?.skipped) {
            summary.skipped_count += 1;
        } else {
            summary.failed_count += 1;
        }
    }

    await updateCampaignRunState(campaign, summary, actorId);
    await persistCampaignRun(tenant.id, campaign.id, summary, audience);
    return summary;
}

async function processDueCampaignsForTenant(tenant) {
    if (!isEnterpriseTenant(tenant)) return [];

    await ensureDefaultCampaigns(tenant.id);
    const campaigns = await listCampaigns(tenant.id);
    const dueCampaigns = campaigns.filter((campaign) => campaignIsDue(campaign));
    const summaries = [];

    for (const campaign of dueCampaigns) {
        summaries.push(await runCampaign({ tenant, campaign, triggerSource: 'scheduler' }));
    }

    return summaries;
}

let schedulerStarted = false;
function startReactivationScheduler() {
    if (schedulerStarted) return;
    schedulerStarted = true;

    const interval = setInterval(async () => {
        try {
            const tenants = await Tenant.query().where({ plan: 'enterprise', active: true });
            for (const tenant of tenants) {
                await processDueCampaignsForTenant(tenant);
            }
        } catch (error) {
            console.error('[retention] reactivation scheduler failed:', error.message);
        }
    }, 15 * 60 * 1000);

    if (typeof interval.unref === 'function') {
        interval.unref();
    }
}

startReactivationScheduler();

router.get('/sequences', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;

    const sequences = await tryDB(
        () => AutomationSequence.query().where({ tenant_id: tenantId }),
        () => mockSequences.filter((item) => item.tenant_id === tenantId)
    );

    res.json(sequences.map((sequence) => ({
        ...sequence,
        steps: parseJsonField(sequence.steps, []),
    })));
});

router.patch('/sequences/:id/toggle', authenticate, async (req, res) => {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { active } = req.body;

    const updated = await tryDB(
        async () => {
            const sequence = await AutomationSequence.query().findById(id);
            if (!sequence || sequence.tenant_id !== tenantId) return null;
            return AutomationSequence.query().patchAndFetchById(id, { active: !!active });
        },
        () => {
            const sequence = mockSequences.find((item) => item.id === Number(id) && item.tenant_id === tenantId);
            if (sequence) sequence.active = !!active;
            return sequence;
        }
    );

    if (!updated) return res.status(404).json({ error: 'Sequence not found.' });
    updated.steps = parseJsonField(updated.steps, []);
    res.json(updated);
});

router.get('/loyalty-nps', authenticate, (req, res) => {
    res.json({
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
            { action: 'Leave Google Review', points: 100 }
        ],
        nps_data: mockNpsData
    });
});

router.get('/reactivation', authenticate, async (req, res) => {
    try {
        const tenant = await resolveTenantForRequest(req);
        const plan = tenant?.plan || 'starter';
        const locked = !isEnterpriseTenant(tenant);

        if (!locked) {
            await ensureDefaultCampaigns(tenant.id, req.user.id);
        }

        const [campaigns, recentRuns, serviceDue, birthdays, dormantLeads] = locked
            ? [[], [], [], [], []]
            : await Promise.all([
                listCampaigns(tenant.id),
                listRecentCampaignRuns(tenant.id),
                buildServiceDueAudience(tenant.id),
                buildBirthdayAudience(tenant.id),
                buildDormantLeadAudience(tenant.id),
            ]);

        res.json({
            plan,
            locked,
            upgrade_required: locked,
            upgrade_message: locked ? REACTIVATION_LOCK_MESSAGE : null,
            audience_preview: {
                service_due: serviceDue.length,
                birthdays: birthdays.length,
                dormant_leads: dormantLeads.length,
            },
            campaigns,
            recent_runs: recentRuns,
            enterprise_features: [
                'Automatic service reminders based on customer history',
                'Birthday outreach with dealership-branded messaging',
                'Old lead test-drive reactivation journeys',
                'Manual email, SMS, and WhatsApp campaign builder',
            ],
        });
    } catch (error) {
        console.error('[retention] failed to load reactivation overview:', error);
        res.status(500).json({ error: 'Failed to load database reactivation.' });
    }
});

router.get('/reactivation/audience-preview', authenticate, requireEnterprise, async (req, res) => {
    try {
        const { audience_type, filters } = req.query;
        if (!REACTIVATION_AUDIENCES.includes(audience_type)) {
            return res.status(400).json({ error: 'Invalid audience_type supplied.' });
        }

        const parsedFilters = typeof filters === 'string' ? parseJsonField(filters, {}) : {};
        const audience = await buildAudience(req.retentionTenant.id, audience_type, parsedFilters);
        res.json({
            audience_type,
            count: audience.length,
            sample: getAudienceSample(audience),
        });
    } catch (error) {
        console.error('[retention] audience preview failed:', error);
        res.status(500).json({ error: 'Failed to preview campaign audience.' });
    }
});

router.post('/reactivation/campaigns', authenticate, requireEnterprise, async (req, res) => {
    try {
        const {
            name,
            kind = 'manual',
            channel,
            audience_type,
            active = true,
            schedule_type = 'once',
            schedule_config = {},
            filters = {},
            template_subject = '',
            template_body,
        } = req.body;

        if (!name?.trim() || !template_body?.trim()) {
            return res.status(400).json({ error: 'Campaign name and template body are required.' });
        }
        if (!REACTIVATION_CHANNELS.includes(channel)) {
            return res.status(400).json({ error: 'Invalid channel supplied.' });
        }
        if (!REACTIVATION_AUDIENCES.includes(audience_type)) {
            return res.status(400).json({ error: 'Invalid audience selected.' });
        }
        if (!REACTIVATION_SCHEDULES.includes(schedule_type)) {
            return res.status(400).json({ error: 'Invalid schedule selected.' });
        }

        const payload = {
            tenant_id: req.retentionTenant.id,
            name: name.trim(),
            kind,
            channel,
            audience_type,
            active: !!active,
            is_automatic: kind !== 'manual' || schedule_type !== 'once',
            schedule_type,
            schedule_config: JSON.stringify(schedule_config || {}),
            filters: JSON.stringify(filters || {}),
            template_subject: template_subject?.trim() || null,
            template_body: template_body.trim(),
            last_run_summary: JSON.stringify({}),
            created_by: req.user.id,
            updated_by: req.user.id,
        };

        const created = await tryDB(
            async () => {
                const campaign = await ReactivationCampaign.query().insertAndFetch(payload);
                return normaliseCampaign(campaign);
            },
            () => {
                const campaign = normaliseCampaign({
                    id: ++mockCampaignId,
                    ...payload,
                    schedule_config,
                    filters,
                    last_run_summary: {},
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
                mockReactivationCampaigns.push(campaign);
                return campaign;
            }
        );

        res.status(201).json(created);
    } catch (error) {
        console.error('[retention] failed to create campaign:', error);
        res.status(500).json({ error: 'Failed to create campaign.' });
    }
});

router.patch('/reactivation/campaigns/:id', authenticate, requireEnterprise, async (req, res) => {
    try {
        const campaignId = Number(req.params.id);
        const patch = {};
        const allowedKeys = ['name', 'channel', 'audience_type', 'active', 'schedule_type', 'template_subject', 'template_body'];
        allowedKeys.forEach((key) => {
            if (req.body[key] !== undefined) patch[key] = req.body[key];
        });

        if (req.body.schedule_config !== undefined) patch.schedule_config = JSON.stringify(req.body.schedule_config || {});
        if (req.body.filters !== undefined) patch.filters = JSON.stringify(req.body.filters || {});
        patch.updated_by = req.user.id;
        patch.updated_at = new Date().toISOString();

        const updated = await tryDB(
            async () => {
                const existing = await ReactivationCampaign.query().findById(campaignId);
                if (!existing || existing.tenant_id !== req.retentionTenant.id) return null;
                if (patch.schedule_type !== undefined) {
                    patch.is_automatic = existing.kind !== 'manual' || patch.schedule_type !== 'once';
                }
                const campaign = await ReactivationCampaign.query().patchAndFetchById(campaignId, patch);
                return normaliseCampaign(campaign);
            },
            () => {
                const campaign = mockReactivationCampaigns.find((item) => item.id === campaignId && item.tenant_id === req.retentionTenant.id);
                if (!campaign) return null;
                if (patch.schedule_type !== undefined) {
                    patch.is_automatic = campaign.kind !== 'manual' || patch.schedule_type !== 'once';
                }
                Object.assign(campaign, {
                    ...patch,
                    schedule_config: req.body.schedule_config !== undefined ? req.body.schedule_config : campaign.schedule_config,
                    filters: req.body.filters !== undefined ? req.body.filters : campaign.filters,
                });
                return normaliseCampaign(campaign);
            }
        );

        if (!updated) return res.status(404).json({ error: 'Campaign not found.' });
        res.json(updated);
    } catch (error) {
        console.error('[retention] failed to update campaign:', error);
        res.status(500).json({ error: 'Failed to update campaign.' });
    }
});

router.post('/reactivation/campaigns/:id/run', authenticate, requireEnterprise, async (req, res) => {
    try {
        const campaignId = Number(req.params.id);
        const campaigns = await listCampaigns(req.retentionTenant.id);
        const campaign = campaigns.find((item) => item.id === campaignId);

        if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

        const summary = await runCampaign({
            tenant: req.retentionTenant,
            campaign,
            actorId: req.user.id,
            triggerSource: 'manual',
        });

        res.json(summary);
    } catch (error) {
        console.error('[retention] failed to run campaign:', error);
        res.status(500).json({ error: 'Failed to run campaign.' });
    }
});

router.post('/reactivation/process-due', authenticate, requireEnterprise, async (req, res) => {
    try {
        const summaries = await processDueCampaignsForTenant(req.retentionTenant);
        res.json({ processed: summaries.length, runs: summaries });
    } catch (error) {
        console.error('[retention] due processing failed:', error);
        res.status(500).json({ error: 'Failed to process due automations.' });
    }
});

module.exports = { router, calculateLoyaltyTier };
