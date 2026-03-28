/**
 * Global Real-time Analytics Router — KenganAuto
 * ─────────────────────────────────────────────────────────────
 * Complete business intelligence aggregates for Dealer Principals.
 */

'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

/* ─────────────────────────────────────────────────────────────
   GET /api/analytics/dashboard
   ───────────────────────────────────────────────────────────── */
router.get('/dashboard', authenticate, (req, res) => {
    const { range } = req.query; // e.g. 'this_month', 'today', 'this_week'

    // Mock Payload simulating exhaustive query aggregation across 11 tables
    res.json({
        top_metrics: [
            { label: 'Total Leads This Month', value: 342, change: '+12%', positive: true },
            { label: 'Leads Converted to Sales', value: '18.4%', change: '+2.1%', positive: true },
            { label: 'Average Response Time', value: '01:45', change: '-15s', positive: true, unit: 'm:s' },
            { label: 'Test Drives Booked', value: 87, change: '+8%', positive: true },
            { label: 'Finance Applications', value: 45, change: '-3%', positive: false },
            { label: 'Total Sales Revenue', value: 'R 8,450,000', change: '+24%', positive: true }
        ],
        pipeline_funnel: [
            { stage: 'New', volume: 342, dropoff: '0%' },
            { stage: 'Contacted', volume: 280, dropoff: '18%' },
            { stage: 'Qualified', volume: 190, dropoff: '32%' },
            { stage: 'Test Drive', volume: 87, dropoff: '54%' },
            { stage: 'Negotiation', volume: 72, dropoff: '17%' },
            { stage: 'Won', volume: 63, dropoff: '12%' }
        ],
        lead_sources: [
            { source: 'WhatsApp', volume: 145, conversion_rate: 22 },
            { source: 'Website', volume: 85, conversion_rate: 15 },
            { source: 'Autotrader', volume: 45, conversion_rate: 18 },
            { source: 'Cars.co.za', volume: 38, conversion_rate: 19 },
            { source: 'Facebook', volume: 20, conversion_rate: 5 },
            { source: 'Walk-in', volume: 5, conversion_rate: 60 },
            { source: 'Referral', volume: 4, conversion_rate: 80 }
        ],
        response_trend: Array.from({ length: 30 }, (_, i) => ({
            day: `Day ${i + 1}`, time: Math.floor(Math.random() * 3) + 1 + Math.random() // Avg between 1s and 4s
        })),
        monthly_revenue: [
            { month: 'Oct', revenue: 5.2, units: 42 },
            { month: 'Nov', revenue: 6.1, units: 48 },
            { month: 'Dec', revenue: 4.8, units: 39 },
            { month: 'Jan', revenue: 7.2, units: 58 },
            { month: 'Feb', revenue: 6.8, units: 51 },
            { month: 'Mar', revenue: 8.45, units: 63 }
        ],
        service_heatmap: Array.from({ length: 30 }, () => Math.floor(Math.random() * 15)), // Daily booking volumes
        chatbot_performance: {
            total_conversations: 1250,
            intents: [
                { name: 'Vehicle Enquiry', value: 45 },
                { name: 'Service Booking', value: 30 },
                { name: 'Parts Enquiry', value: 15 },
                { name: 'General Support', value: 10 }
            ],
            csat_score: 9.2,
            escalation_rate: '14%'
        },
        leaderboard: [
            { name: 'Sarah Naidoo', leads: 85, test_drives: 32, sales: 24, revenue: 'R 3.2M', conversion: '28%' },
            { name: 'David Zondo', leads: 92, test_drives: 28, sales: 19, revenue: 'R 2.6M', conversion: '20%' },
            { name: 'Michael Steyn', leads: 70, test_drives: 15, sales: 11, revenue: 'R 1.4M', conversion: '15%' },
            { name: 'John Doe', leads: 95, test_drives: 12, sales: 9, revenue: 'R 1.25M', conversion: '9%' }
        ],
        live_alerts: [
            { id: 1, type: 'hot_lead', message: 'New Hot Lead (Score 94): Land Cruiser 300', time: '2m ago' },
            { id: 2, type: 'nps_alert', message: 'Negative NPS (Score 4) received from Deal #142', time: '15m ago' },
            { id: 3, type: 'dormant_lead', message: 'Lead #884 untouched for 24h (Assigned: Michael)', time: '1h ago' },
            { id: 4, type: 'finance_sub', message: 'Finance application submitted for John Smith', time: '1h 20m ago' },
            { id: 5, type: 'service_conf', message: 'Service Booking confirmed: VW Polo (Tomorrow 08:00)', time: '2h ago' }
        ]
    });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/analytics/sales — Sales Report
   ───────────────────────────────────────────────────────────── */
router.get('/sales', authenticate, (req, res) => {
    res.json({
        metrics: [
            { label: 'Units Sold', value: 42, target: 50, lastMonth: 38 },
            { label: 'Average Days to Close', value: '14.2 Days', target: '12 Days', lastMonth: '15.5 Days' }
        ],
        revenue_by_salesperson: [
            { name: 'Sarah Naidoo', revenue: 1.8, units: 12 },
            { name: 'David Zondo', revenue: 1.4, units: 9 },
            { name: 'Michael Steyn', revenue: 0.9, units: 5 }
        ],
        won_lost_reasons: [
            { reason: 'Price too high', value: 45 },
            { reason: 'Found specific car elsewhere', value: 25 },
            { reason: 'Finance declined', value: 15 },
            { reason: 'Bought new instead of used', value: 10 },
            { reason: 'Other', value: 5 }
        ],
        best_lead_source: 'WhatsApp via AI Chatbot (24% Conversion)',
        vehicle_popularity: [
            { model: 'Toyota Hilux 2.8 GD-6', enquiries: 120, test_drives: 45, sold: 18 },
            { model: 'Ford Ranger Wildtrak', enquiries: 95, test_drives: 38, sold: 14 },
            { model: 'VW Polo Vivo', enquiries: 150, test_drives: 60, sold: 22 }
        ]
    });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/analytics/finance — Finance Report
   ───────────────────────────────────────────────────────────── */
router.get('/finance', authenticate, (req, res) => {
    res.json({
        metrics: [
            { label: 'Applications Submitted', value: 87, change: '+12%' },
            { label: 'Average Finance Amount', value: 'R 345,000', change: '+5%' },
            { label: 'F&I Product Attachment Rate', value: '64%', change: '+3%' },
            { label: 'Pre-qualification Completion', value: '82%', change: '+8%' },
            { label: 'Overall Finance Penetration', value: '76% of all sales', change: '+2%' }
        ],
        approval_by_bank: [
            { bank: 'WesBank', approval_rate: 68, applications: 35 },
            { bank: 'Standard Bank', approval_rate: 72, applications: 28 },
            { bank: 'Absa', approval_rate: 65, applications: 15 },
            { bank: 'Nedbank', approval_rate: 60, applications: 9 }
        ]
    });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/analytics/service — Service Report
   ───────────────────────────────────────────────────────────── */
router.get('/service', authenticate, (req, res) => {
    res.json({
        metrics: [
            { label: 'Workshop Utilisation', value: '88%', target: '85%' },
            { label: 'No-Show Rate', value: '4.2%', target: '< 5%' },
            { label: 'Average Job Card Value', value: 'R 4,250', change: '+R150' },
            { label: 'Service CSAT Score', value: '9.4/10', change: '+0.2' }
        ],
        revenue_by_type: [
            { type: 'Minor Service', revenue: 125000 },
            { type: 'Major Service', revenue: 210000 },
            { type: 'Warranty Repair', revenue: 85000 },
            { type: 'Tyres & Brakes', revenue: 65000 }
        ],
        busiest_times: [
            { day: 'Monday', am: 85, pm: 40 },
            { day: 'Tuesday', am: 70, pm: 45 },
            { day: 'Wednesday', am: 65, pm: 50 },
            { day: 'Thursday', am: 75, pm: 60 },
            { day: 'Friday', am: 90, pm: 30 }
        ]
    });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/analytics/leads — Lead Quality Report
   ───────────────────────────────────────────────────────────── */
router.get('/leads', authenticate, (req, res) => {
    res.json({
        metrics: [
            { label: 'Avg Lead Velocity (New→Contacted)', value: '14 Mins' },
            { label: 'Stale Leads (>48h untouched)', value: 12 },
            { label: 'AI Conversation Quality Score', value: '8.8/10' }
        ],
        ai_score_distribution: [
            { score: 'Burning (90-100)', count: 45 },
            { score: 'Hot (75-89)', count: 120 },
            { score: 'Warm (50-74)', count: 210 },
            { score: 'Cold (0-49)', count: 85 }
        ],
        stale_leads_details: [
            { id: '#4432', assigned_to: 'John Doe', untouched_hours: 52 },
            { id: '#4501', assigned_to: 'Michael Steyn', untouched_hours: 49 }
        ]
    });
});

/* ─────────────────────────────────────────────────────────────
   GET /api/analytics/retention — Retention Report
   ───────────────────────────────────────────────────────────── */
router.get('/retention', authenticate, (req, res) => {
    res.json({
        metrics: [
            { label: 'Win-Back Campaign Success Rate', value: '4.5%' },
            { label: 'Dealership Google Review Rate', value: '28% of deliveries' },
            { label: 'Overall NPS Score', value: '9.3/10' }
        ],
        sequences_performance: [
            { seq: 'New Buyer Nurture', open_rate: 85, response_rate: 42 },
            { seq: 'Service Retention', open_rate: 78, response_rate: 35 },
            { seq: 'Cold Lead Re-engagement', open_rate: 45, response_rate: 12 },
            { seq: 'Win-Back', open_rate: 35, response_rate: 4 }
        ],
        loyalty_distribution: [
            { tier: 'Platinum', members: 142 },
            { tier: 'Gold', members: 450 },
            { tier: 'Silver', members: 890 },
            { tier: 'Bronze', members: 1250 }
        ]
    });
});

module.exports = { router };
