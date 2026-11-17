/**
 * Demo seeder for the "enterprise-demo" tenant (id 5) ONLY.
 * - Sets known passwords on the role-based demo users.
 * - Reseeds a rich, recent dataset (leads, vehicles, deals, conversations)
 *   so the dashboard, pipeline, and analytics look realistic.
 *
 * Safe: scoped to tenant_id = 5. Does NOT touch other tenants.
 * Run:  node scripts/seed_demo.js
 */
'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const knex = require('../src/config/db');

const T = 5;
const DAY = 24 * 3600 * 1000;
const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const pick = (arr, i) => arr[i % arr.length];
// Seeded PRNG (mulberry32) so every reseed produces the same, presentation-stable numbers.
let _seed = 20261115;
const rng = () => { _seed |= 0; _seed = (_seed + 0x6D2B79F5) | 0; let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rand = (a, b) => a + Math.floor(rng() * (b - a + 1));

const DEMO_PASSWORD = 'demo1234';

const FIRST = ['Thabo', 'Priya', 'Jacques', 'Lerato', 'Mohamed', 'Zanele', 'Pieter', 'Amara', 'Sibongile', 'Ryan', 'Naledi', 'Kyle', 'Fatima', 'Sizwe', 'Chloe', 'Bongani', 'Megan', 'Tariq', 'Ayesha', 'Dineo'];
const LAST = ['Molefe', 'Naidoo', 'du Plessis', 'Sithole', 'Patel', 'Dlamini', 'van der Merwe', 'Osei', 'Ndlovu', 'Botha', 'Khumalo', 'Smith', 'Jacobs', 'Mokoena', 'Pillay'];
const SOURCES = ['whatsapp', 'whatsapp', 'whatsapp', 'website', 'website', 'autotrader', 'cars_coza', 'facebook', 'walk_in', 'phone', 'referral'];
// map 'referral' (not in enum) → keep enum-safe
const DIGITAL = ['whatsapp', 'website', 'facebook', 'autotrader', 'cars_coza'];
const ENUM_SOURCES = ['whatsapp', 'website', 'autotrader', 'cars_coza', 'facebook', 'walk_in', 'phone'];
// [make, model, year, variant, price, condition, photo slug, colour (matches the photo), mileage km, features, status]
// Photos: frontend/public/demo-vehicles/<slug>.jpg — see CREDITS.md there for licences/attribution.
const VEHICLES = [
    ['Toyota', 'Hilux', 2023, '2.8 GD-6 RB Legend', 749900, 'used', 'toyota-hilux', 'Glacier White', 38500, ['Leather Seats', 'Reverse Camera', 'Towbar', 'Apple CarPlay', 'Diff Lock'], 'reserved'],
    ['Toyota', 'Fortuner', 2022, '2.8 GD-6 VX 4x4 AT', 810000, 'demo', 'toyota-fortuner', 'Glacier White', 9800, ['JBL Audio', 'Power Tailgate', '7 Seats', 'Adaptive Cruise'], 'available'],
    ['Ford', 'Ranger', 2023, '2.0 BiT Wildtrak 4x4', 799900, 'used', 'ford-ranger', 'Saber Orange', 27400, ['Roller Shutter', 'SYNC 4', '360° Camera', 'Matrix LED'], 'available'],
    ['Ford', 'Everest', 2024, '3.0 V6 Platinum 4WD', 1150000, 'new', 'ford-everest', 'Arctic White', 18, ['Panoramic Roof', 'B&O Sound', 'Massage Seats', 'Trail Turn Assist'], 'available'],
    ['Volkswagen', 'Polo', 2024, '1.0 TSI Life', 379900, 'demo', 'vw-polo', 'Pure White', 4200, ['App-Connect', 'LED Headlights', 'Digital Cockpit'], 'available'],
    ['Volkswagen', 'Golf 8 GTI', 2023, '2.0 TSI DSG', 799900, 'used', 'vw-golf-gti', 'Pomelo Yellow', 16300, ['IQ.Light', 'Harman Kardon', 'DCC Adaptive Chassis'], 'available'],
    ['BMW', 'X5', 2022, 'M Competition', 2150000, 'used', 'bmw-x5', 'Marina Bay Blue', 31000, ['Sky Lounge Roof', 'Bowers & Wilkins', 'M Drive Pro', 'Laser Lights'], 'available'],
    ['BMW', '3 Series', 2022, 'M340i xDrive', 1095000, 'used', 'bmw-3-series', 'Black Sapphire', 42600, ['Live Cockpit Pro', 'Harman Kardon', 'Sunroof', 'Adaptive M Suspension'], 'reserved'],
    ['Mercedes-Benz', 'C-Class', 2024, 'C180 Avantgarde', 875000, 'demo', 'mercedes-c-class', 'Mojave Silver', 6900, ['MBUX Hyperscreen', 'Burmester', 'Digital Light'], 'available'],
    ['Mercedes-Benz', 'GLE', 2021, 'GLE 350d 4MATIC', 1340000, 'used', 'mercedes-gle', 'Polar White', 54800, ['Air Suspension', '7 Seats', 'Burmester', 'Night Package'], 'available'],
    ['Audi', 'Q5', 2022, '40 TDI quattro S line', 849900, 'used', 'audi-q5', 'Daytona Grey', 36900, ['Matrix LED', 'Virtual Cockpit Plus', 'B&O Sound'], 'available'],
    ['Hyundai', 'Tucson', 2024, '2.0 Elite', 619900, 'new', 'hyundai-tucson', 'Amazon Grey', 25, ['Heated Seats', 'Wireless Charging', 'Blind Spot View Monitor'], 'available'],
    ['Kia', 'Sportage', 2023, '1.6 T-GDi GT-Line', 730000, 'used', 'kia-sportage', 'Snow White Pearl', 22100, ['Harman Kardon', 'Panoramic Roof', 'Curved Display'], 'sold'],
    ['Haval', 'Jolion', 2024, '1.5T Super Luxury', 449900, 'new', 'haval-jolion', 'Hamilton White', 12, ['360° Camera', 'Head-Up Display', 'Wireless CarPlay'], 'available'],
    ['Toyota', 'Corolla Cross', 2023, '1.8 XR Hybrid', 519900, 'demo', 'toyota-corolla-cross', 'Silver Metallic', 8700, ['Hybrid', 'Toyota Safety Sense', 'Power Tailgate'], 'available'],
    ['Isuzu', 'D-Max', 2025, '3.0 X-Rider 4x4', 829900, 'new', 'isuzu-d-max', 'Mercury Silver', 30, ['X-Rider Styling', '4x4 Low Range', 'Apple CarPlay'], 'available'],
    ['Suzuki', 'Swift', 2023, '1.4T Sport', 349900, 'used', 'suzuki-swift', 'Champion Yellow', 19800, ['Sport Seats', 'Turbo', 'Cruise Control'], 'available'],
    ['Nissan', 'Navara', 2022, '2.5 DDTi LE 4x4', 649900, 'used', 'nissan-navara', 'Solid White', 47200, ['Leather', 'Around View Monitor', 'Towbar'], 'available'],
    ['Land Rover', 'Defender', 2023, '110 D300 S Adventure', 1695000, 'used', 'land-rover-defender', 'Pangea Green', 14500, ['Air Suspension', 'Adventure Pack', 'Meridian Sound', 'ClearSight'], 'available'],
    ['Chery', 'Tiggo 4 Pro', 2025, '1.5T Elite SE', 359900, 'new', 'chery-tiggo-4-pro', 'Moonstone Silver', 15, ['Sunroof', '10.25" Display', 'Wireless Charging'], 'available'],
    ['Toyota', 'Land Cruiser 300', 2022, '3.3D VX-R', 2195000, 'used', 'toyota-land-cruiser-300', 'Pearl White', 28700, ['Multi-Terrain Select', 'JBL Audio', 'Cool Box', 'Adaptive Suspension'], 'reserved'],
];
const AGE_DAYS = [12, 34, 8, 3, 21, 47, 66, 15, 9, 92, 28, 5, 40, 2, 18, 4, 73, 55, 11, 6, 24];
const STATUSES = ['new', 'new', 'new', 'contacted', 'contacted', 'qualified', 'qualified', 'test_drive_booked', 'negotiation', 'won', 'won', 'lost'];
const BANKS = ['WesBank', 'Standard Bank', 'Absa', 'Nedbank', 'MFC'];
const INTENTS = ['VEHICLE_ENQUIRY', 'TEST_DRIVE', 'FINANCE_APPLICATION', 'TRADE_IN', 'PRICE_CHECK'];

async function run() {
    console.log('Seeding demo tenant (id 5)…');

    // 1. Known passwords for the role users
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const updated = await knex('users').where({ tenant_id: T }).update({ password_hash: hash });
    console.log(`  passwords set on ${updated} users (password: ${DEMO_PASSWORD})`);

    // Realistic names for the presentation (matched by the existing role emails), plus two more sales execs
    const NAMES = {
        'admin@enterprise-demo.co.za': ['Nomvula', 'Khumalo'],
        'sales@enterprise-demo.co.za': ['Sizwe', 'Mthembu'],
        'finance@enterprise-demo.co.za': ['Farah', 'Adams'],
        'parts@enterprise-demo.co.za': ['Pieter', 'Joubert'],
        'service@enterprise-demo.co.za': ['Anele', 'Zungu'],
    };
    for (const [email, [first_name, last_name]] of Object.entries(NAMES)) {
        await knex('users').where({ tenant_id: T, email }).update({ first_name, last_name });
    }
    for (const [email, first_name, last_name] of [['kyle@enterprise-demo.co.za', 'Kyle', 'van Wyk'], ['priya@enterprise-demo.co.za', 'Priya', 'Naidoo']]) {
        const exists = await knex('users').where({ tenant_id: T, email }).first();
        if (!exists) {
            await knex('users').insert({ tenant_id: T, first_name, last_name, email, password_hash: hash, role: 'salesperson', active: true, created_at: iso(now), updated_at: iso(now) });
        }
    }

    const users = await knex('users').where({ tenant_id: T }).select('id', 'role');
    const salesUsers = users.filter(u => ['salesperson', 'admin'].includes(u.role)).map(u => u.id);
    const salesId = () => pick(salesUsers.length ? salesUsers : [users[0].id], rand(0, 10));

    // Dealership identity used by the dashboard, the chat widget and the Acme Cars website
    await knex('tenants').where({ id: T }).update({
        name: 'Acme Cars', primary_color: '#FF4F1A', whatsapp_number: '+27105550199',
        address: '21 Ignition Avenue, Sandton', city: 'Johannesburg', province: 'Gauteng', updated_at: iso(now),
        ai_go_live_at: iso(now - 75 * DAY), // instant AI replies switched on 75 days ago
    });

    // 2. Clear tenant-5 transactional data (FK-safe order)
    await knex('inspections').where({ tenant_id: T }).del().catch(() => {});
    await knex('online_deals').where({ tenant_id: T }).del().catch(() => {});
    await knex('website_events').where({ tenant_id: T }).del().catch(() => {});
    await knex('concern_events').where({ tenant_id: T }).del().catch(() => {});
    await knex('concerns').where({ tenant_id: T }).del().catch(() => {});
    await knex('csi_surveys').where({ tenant_id: T }).del().catch(() => {});
    await knex('sales_targets').where({ tenant_id: T }).del().catch(() => {});
    await knex('parts_enquiries').where({ tenant_id: T }).del().catch(() => {});
    await knex('conversations').where({ tenant_id: T }).del();
    await knex('finance_applications').where({ tenant_id: T }).del().catch(() => {});
    await knex('service_bookings').where({ tenant_id: T }).del().catch(() => {});
    await knex('deals').where({ tenant_id: T }).del().catch(() => {});
    await knex('trade_ins').where({ tenant_id: T }).del().catch(() => {});
    await knex('leads').where({ tenant_id: T }).del();
    await knex('vehicles').where({ tenant_id: T }).del();
    await knex('customers').where({ tenant_id: T }).del().catch(() => {});

    // 3. Vehicles
    const vehicleIds = [];
    for (let i = 0; i < VEHICLES.length; i++) {
        const [make, model, year, variant, price, condition, slug, colour, mileage, features, status] = VEHICLES[i];
        const age = AGE_DAYS[i % AGE_DAYS.length];
        const km = mileage.toLocaleString('en-ZA');
        const description = condition === 'new'
            ? `Brand-new ${year} ${make} ${model} ${variant} in ${colour}. Full manufacturer warranty and service plan. Highlights: ${features.slice(0, 3).join(', ')}. Finance and trade-ins welcome — book your test drive today.`
            : `${condition === 'demo' ? 'Dealer demo' : 'One-owner'} ${year} ${make} ${model} ${variant} in ${colour} with ${km} km and full service history. Highlights: ${features.slice(0, 3).join(', ')}. Finance and trade-ins welcome — book your test drive today.`;
        const [id] = await knex('vehicles').insert({
            tenant_id: T, make, model, year, variant, colour, mileage,
            price, cost_price: Math.round(price * (condition === 'new' ? 0.955 : condition === 'demo' ? 0.94 : 0.925)), condition, status,
            stock_number: `EDEMO-${String(i + 1).padStart(3, '0')}`,
            vin: `EDEMOVIN${String(i + 1).padStart(6, '0')}`,
            images: JSON.stringify([`/demo-vehicles/${slug}.jpg`]),
            features: JSON.stringify(features),
            description,
            days_in_stock: age,
            created_at: iso(now - age * DAY),
            updated_at: iso(now),
        });
        vehicleIds.push(id);
    }
    console.log(`  ${vehicleIds.length} vehicles`);

    // 4. Leads (recent, varied) — some overdue, some fast-responded
    const leadIds = [];
    const wonLeadIds = [];
    for (let i = 0; i < 32; i++) {
        const status = pick(STATUSES, i + rand(0, 2));
        const HOUR = 3600 * 1000;
        const responseMins = pick([1, 2, 3, 3, 4, 4, 6, 9, 14, 38], i); // first-response time
        let createdForOverdue, lastContact;
        if (status === 'won' || status === 'lost') {
            // closed deals: answered within minutes (feeds speed-to-lead); closed leads are never overdue
            createdForOverdue = now - rand(2, 28) * DAY - rand(0, 23) * HOUR;
            lastContact = createdForOverdue + responseMins * 60000;
        } else if (status === 'new') {
            // fresh enquiries, a couple left uncontacted for 2+ days (genuinely overdue)
            createdForOverdue = i % 5 === 0 ? now - rand(2, 3) * DAY : now - rand(1, 20) * HOUR;
            lastContact = null;
        } else if (i % 9 === 0) {
            // a couple of active leads that slipped through the cracks (overdue)
            createdForOverdue = now - rand(3, 6) * DAY;
            lastContact = createdForOverdue + responseMins * 60000;
        } else if (i % 2 === 0) {
            // active, recent enquiries answered fast
            createdForOverdue = now - rand(2, 22) * HOUR;
            lastContact = createdForOverdue + responseMins * 60000;
        } else {
            // active, older pipeline leads with a follow-up in the last day
            createdForOverdue = now - rand(15, 28) * DAY;
            lastContact = now - rand(1, 18) * HOUR;
        }
        const srcRaw = pick(SOURCES, i);
        const source = ENUM_SOURCES.includes(srcRaw) ? srcRaw : 'walk_in';
        const score = status === 'won' ? rand(85, 99)
            : status === 'negotiation' ? rand(78, 92)
            : status === 'test_drive_booked' ? rand(70, 88)
            : status === 'qualified' ? rand(55, 80)
            : status === 'lost' ? rand(10, 40)
            : rand(30, 70);
        const veh = pick(VEHICLES, i);
        const [id] = await knex('leads').insert({
            tenant_id: T,
            customer_name: `${pick(FIRST, i)} ${pick(LAST, i + 3)}`,
            customer_phone: `+2782${rand(1000000, 9999999)}`,
            customer_email: `lead${i}@example.co.za`,
            source,
            vehicle_interest: `${veh[0]} ${veh[1]}`,
            budget_min: (veh[4] * 0.8) | 0,
            budget_max: veh[4],
            status,
            assigned_to: salesId(),
            ai_score: score,
            last_contact_at: lastContact ? iso(lastContact) : null,
            // digital enquiries get the instant AI reply; phone/walk-in are answered by staff
            first_response_at: DIGITAL.includes(source) ? iso(createdForOverdue + rand(6, 45) * 1000) : (lastContact ? iso(createdForOverdue + responseMins * 60000) : null),
            first_response_by: DIGITAL.includes(source) ? 'ai' : (lastContact ? 'staff' : null),
            appointment_at: ['test_drive_booked', 'negotiation', 'won'].includes(status) ? iso(createdForOverdue + rand(1, 4) * DAY) : null,
            notes: i % 4 === 0 ? 'Keen buyer — wants finance pre-approval.' : null,
            created_at: iso(createdForOverdue),
            updated_at: iso(lastContact || createdForOverdue),
        });
        leadIds.push({ id, status, vehIdx: i % vehicleIds.length });
        if (status === 'won') wonLeadIds.push(id);
    }
    console.log(`  ${leadIds.length} leads`);

    // 4b. Lead history (days -165 … -31), closed won/lost, for the AI Impact before/after report.
    // Before go-live staff answered during office hours (after-hours leads waited until morning,
    // some were never answered). After go-live digital leads get an AI reply within a minute.
    // Uplift is kept in line with published results (Impel: ~+26% lead-to-sale), not inflated.
    const goLive = now - 75 * DAY;
    const H = 3600 * 1000;
    const LEAD_HOURS = [7, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 18, 19, 19, 20, 20, 21, 22];
    let hist = 0;
    for (let d = 165; d >= 31; d--) {
        const perDay = rng() < 0.35 ? 2 : 1;
        for (let k = 0; k < perDay; k++) {
            // enquiries cluster in office hours and the evening, like real dealer traffic
            const day0 = new Date(now - d * DAY); day0.setHours(pick(LEAD_HOURS, rand(0, LEAD_HOURS.length - 1)), rand(0, 59), 0, 0);
            const created = day0.getTime();
            const afterAI = created >= goLive;
            const srcRaw = pick(SOURCES, rand(0, SOURCES.length - 1));
            const source = ENUM_SOURCES.includes(srcRaw) ? srcRaw : 'walk_in';
            const dt = new Date(created); const hr = dt.getHours(); const wd = dt.getDay();
            const afterHours = wd === 0 || wd === 6 || hr < 8 || hr >= 17;
            let first = null; let by = null;
            if (afterAI && DIGITAL.includes(source)) { first = created + rand(5, 50) * 1000; by = 'ai'; }
            else if (rng() >= (afterAI ? 0.12 : 0.2)) {
                if (afterHours) {
                    const m = new Date(created); if (hr >= 17) m.setDate(m.getDate() + 1); if (m.getDay() === 0) m.setDate(m.getDate() + 1);
                    m.setHours(8, 30 + rand(0, 90), 0, 0); first = Math.max(m.getTime(), created + 20 * 60000);
                } else first = created + pick([4, 9, 14, 22, 35, 48, 65, 95, 140, 210], rand(0, 9)) * 60000;
                by = 'staff';
            }
            const fast = first && first - created <= 5 * 60000;
            const appt = rng() < (afterAI ? 0.29 : 0.23) + (fast ? 0.03 : 0) - (first ? 0 : 0.12);
            const won = appt && rng() < 0.37;
            const closed = Math.min(created + rand(3, 20) * DAY, now - 31 * DAY);
            const veh = pick(VEHICLES, rand(0, VEHICLES.length - 1));
            await knex('leads').insert({
                tenant_id: T,
                customer_name: `${pick(FIRST, rand(0, FIRST.length - 1))} ${pick(LAST, rand(0, LAST.length - 1))}`,
                customer_phone: `+2784${rand(1000000, 9999999)}`,
                customer_email: `hist${hist}@example.co.za`,
                source, vehicle_interest: `${veh[0]} ${veh[1]}`,
                budget_min: (veh[4] * 0.8) | 0, budget_max: veh[4],
                status: won ? 'won' : 'lost', assigned_to: salesId(), ai_score: won ? rand(80, 97) : rand(15, 55),
                last_contact_at: first ? iso(Math.max(first, closed)) : null,
                first_response_at: first ? iso(first) : null, first_response_by: by,
                appointment_at: appt ? iso(Math.min(created + rand(1, 5) * DAY, closed)) : null,
                created_at: iso(created), updated_at: iso(closed),
            });
            hist++;
        }
    }
    console.log(`  ${hist} historical leads (AI go-live ${new Date(goLive).toISOString().slice(0, 10)})`);

    // 5. Deals — spread across the last 6 months; "won" leads become delivered deals
    const stages = ['presented', 'test_drive', 'negotiation', 'finance_submitted', 'approved', 'contracted', 'delivered'];
    let dealCount = 0;
    // Steady growth story: units per calendar month (oldest → current month-to-date)
    const UNITS = [6, 7, 7, 8, 9, 10];
    const today = new Date();
    for (let m = 5; m >= 0; m--) {
        const unitsThisMonth = UNITS[5 - m];
        const monthStart = new Date(today.getFullYear(), today.getMonth() - m, 1).getTime();
        const daysAvail = m === 0 ? Math.max(today.getDate() - 1, 1) : new Date(today.getFullYear(), today.getMonth() - m + 1, 0).getDate() - 1;
        for (let j = 0; j < unitsThisMonth; j++) {
            const vehIdx = (dealCount * 5 + 2) % vehicleIds.length; // even rotation → revenue tracks unit growth
            const price = VEHICLES[vehIdx][4] * (0.95 + rng() * 0.08);
            // dated inside that calendar month (current month: up to yesterday) so monthly KPIs line up
            const dealDate = monthStart + Math.round((j + 0.5) * (daysAvail / unitsThisMonth)) * DAY + rand(8, 16) * 3600 * 1000;
            const delivered = m > 0 || j % 3 !== 2; // current month: most delivered, a few still open in the pipeline
            const leadRef = pick(leadIds, dealCount + j).id;
            await knex('deals').insert({
                tenant_id: T,
                lead_id: leadRef,
                vehicle_id: vehicleIds[vehIdx],
                salesperson_id: salesId(),
                stage: delivered ? 'delivered' : ['negotiation', 'finance_submitted', 'approved'][Math.floor(j / 3) % 3],
                sale_price: Math.round(price),
                finance_amount: Math.round(price * 0.85),
                deposit: Math.round(price * 0.15),
                monthly_installment: Math.round((price * 0.85) / 60),
                bank_name: pick(BANKS, j),
                deal_date: iso(dealDate),
                delivered_at: delivered ? iso(Math.min(dealDate + rand(0, 1) * DAY, now - 3600000)) : null,
                profit_margin: Math.round(price * 0.08),
                created_at: iso(dealDate),
                updated_at: iso(now),
            });
            dealCount++;
        }
    }
    console.log(`  ${dealCount} deals`);

    // 6. Conversations (chatbot) with sentiment + intent
    let convCount = 0;
    for (let i = 0; i < Math.min(leadIds.length, 20); i++) {
        const lead = leadIds[i];
        const sentiment = (0.66 + rng() * 0.32).toFixed(2);
        await knex('conversations').insert({
            tenant_id: T,
            lead_id: lead.id,
            channel: pick(['whatsapp', 'website', 'facebook'], i),
            messages: JSON.stringify([
                { role: 'user', content: 'Hi, is this vehicle still available?', timestamp: iso(now - i * DAY) },
                { role: 'assistant', content: 'Yes! Would you like to book a test drive or get a finance estimate?', timestamp: iso(now - i * DAY + 60000) },
            ]),
            ai_summary: 'Customer enquiring about availability and finance.',
            intent_detected: pick(INTENTS, i),
            sentiment_score: sentiment,
            created_at: iso(now - i * DAY),
            updated_at: iso(now - i * DAY),
        });
        convCount++;
    }
    console.log(`  ${convCount} conversations`);

    // 7. Customers (loyalty + NPS) for retention analytics
    const customerIds = [];
    const customerInfo = [];
    for (let i = 0; i < 40; i++) {
        const veh = pick(VEHICLES, i);
        const [id] = await knex('customers').insert({
            tenant_id: T,
            first_name: pick(FIRST, i + 2),
            last_name: pick(LAST, i),
            email: `cust${i}@example.co.za`,
            phone: (customerInfo[i] = { name: `${pick(FIRST, i + 2)} ${pick(LAST, i)}`, phone: `+2783${rand(1000000, 9999999)}` }).phone,
            whatsapp_number: `+2783${rand(1000000, 9999999)}`,
            vehicle_owned_make: veh[0],
            vehicle_owned_model: veh[1],
            vehicle_owned_year: veh[2],
            registration: `${pick(['GP', 'WP', 'KZN', 'EC'], i)} ${rand(100, 999)}-${rand(100, 999)}`,
            purchase_date: iso(now - rand(30, 900) * DAY),
            loyalty_points: pick([1200, 1500, 700, 850, 300, 420, 50, 90, 0], i),
            nps_score: pick([10, 9, 9, 8, 10, 7, 9, 6, 8, 10], i),
            last_contact_at: iso(now - rand(1, 120) * DAY),
            tags: JSON.stringify([]),
            created_at: iso(now - rand(30, 900) * DAY),
            updated_at: iso(now),
        });
        customerIds.push(id);
    }
    console.log(`  ${customerIds.length} customers`);

    // 8. Service bookings (for service analytics + reminders)
    const SVC_TYPES = ['minor', 'major', 'warranty', 'tyres', 'body_repair', 'other'];
    const SVC_STATUS = ['booked', 'confirmed', 'in_progress', 'completed', 'completed', 'cancelled'];
    let svcCount = 0;
    for (let i = 0; i < 34; i++) {
        const veh = pick(VEHICLES, i);
        const type = pick(SVC_TYPES, i);
        const status = pick(SVC_STATUS, i);
        const future = i % 3 === 0; // some upcoming, some past
        const bookingMs = future ? now + rand(1, 10) * DAY : now - rand(1, 40) * DAY;
        const invoice = status === 'completed' ? pick([1850, 4250, 6900, 3200, 980, 12500], i) : null;
        await knex('service_bookings').insert({
            tenant_id: T,
            customer_id: pick(customerIds, i),
            customer_name: pick(customerInfo, i).name,
            customer_phone: pick(customerInfo, i).phone,
            vehicle_registration: `${pick(['GP', 'WP', 'KZN'], i)} ${rand(100, 999)}-${rand(100, 999)}`,
            vehicle_make: veh[0],
            vehicle_model: veh[1],
            service_type: type,
            description: `${type} service`,
            booking_date: new Date(bookingMs).toISOString().slice(0, 10),
            booking_time: pick(['08:00', '09:30', '11:00', '13:30', '15:00'], i),
            advisor_id: salesId(),
            status,
            reminder_48h_sent: future ? false : true,
            reminder_2h_sent: future ? false : true,
            job_card_number: status === 'completed' ? `JC-${1000 + i}` : null,
            invoice_amount: invoice,
            created_at: iso(now - rand(1, 60) * DAY),
            updated_at: iso(now),
        });
        svcCount++;
    }
    console.log(`  ${svcCount} service bookings`);

    // 9. Finance applications
    let finCount = 0;
    const FIN_STATUS = ['pending', 'submitted', 'approved', 'approved', 'declined'];
    for (let i = 0; i < 18; i++) {
        const lead = pick(leadIds, i * 2);
        const veh = pick(VEHICLES, i);
        await knex('finance_applications').insert({
            tenant_id: T,
            lead_id: lead.id,
            monthly_income: rand(25, 85) * 1000,
            employment_status: pick(['permanent', 'self_employed', 'contract'], i),
            vehicle_price: veh[4],
            deposit_amount: Math.round(veh[4] * 0.1),
            term_months: pick([60, 72, 60, 48], i),
            interest_rate: (11 + rng() * 2).toFixed(2),
            monthly_installment: Math.round((veh[4] * 0.9) / 60),
            status: pick(FIN_STATUS, i),
            bank_reference: pick(BANKS, i),
            created_at: iso(now - rand(1, 30) * DAY),
            updated_at: iso(now),
        });
        finCount++;
    }
    console.log(`  ${finCount} finance applications`);

    const insertId = (r) => (typeof r[0] === 'object' ? r[0].id : r[0]);

    // 10. Trade-ins (DB enum: enquiry | valued | accepted | declined)
    const TRADES = [
        [2017, 'Volkswagen', 'Polo Vivo 1.4 Trendline', 98000, 'good', 'White', 128000, 121000, 'accepted'],
        [2018, 'Toyota', 'Corolla Quest 1.8', 112000, 'good', 'Silver', 168000, 160000, 'valued'],
        [2016, 'Ford', 'Ranger 2.2 XL', 154000, 'fair', 'Blue', 189000, null, 'enquiry'],
        [2019, 'Hyundai', 'Grand i10 1.25 Fluid', 64000, 'excellent', 'Red', 142000, 138000, 'valued'],
        [2015, 'BMW', '320d Luxury Line', 171000, 'fair', 'Black', 198000, 185000, 'declined'],
        [2020, 'Renault', 'Kwid 1.0 Climber', 41000, 'good', 'Orange', 98000, null, 'enquiry'],
        [2018, 'Mercedes-Benz', 'C200 AMG Line', 88000, 'excellent', 'Grey', 389000, 372000, 'accepted'],
        [2019, 'Toyota', 'Fortuner 2.4 GD-6', 132000, 'good', 'White', 412000, null, 'enquiry'],
    ];
    for (let i = 0; i < TRADES.length; i++) {
        const [year, make, model, mileage, condition, colour, est, offer, status] = TRADES[i];
        await knex('trade_ins').insert({
            tenant_id: T, lead_id: pick(leadIds, i * 3).id, year, make, model, mileage, condition, colour,
            registration: `${pick(['GP', 'WP', 'KZN'], i)} ${rand(100, 999)}-${rand(100, 999)}`,
            estimated_value: est, dealer_offer: offer, status, photos: JSON.stringify([]),
            created_at: iso(now - rand(1, 20) * DAY), updated_at: iso(now - rand(0, 2) * DAY),
        });
    }
    console.log(`  ${TRADES.length} trade-ins`);

    // 11. Parts enquiries (DB enum: enquiry | quoted | ordered | ready | collected)
    const PARTS = [
        ['Front brake pads', 'TOY-04465-0K290', 'Toyota', 'Hilux', 1, 'quoted', 1450],
        ['Oil filter', 'VW-04E115561H', 'Volkswagen', 'Polo', 2, 'ready', 380],
        ['Headlight assembly (LH)', 'FD-MB3B-13W030', 'Ford', 'Ranger', 1, 'ordered', 8950],
        ['Wiper blades (pair)', 'BMW-61610049234', 'BMW', '3 Series', 1, 'collected', 690],
        ['Air filter', 'HY-28113-N9000', 'Hyundai', 'Tucson', 1, 'enquiry', null],
        ['Battery 74Ah', 'MB-A0009822108', 'Mercedes-Benz', 'C-Class', 1, 'quoted', 3250],
        ['Rear shock absorbers (pair)', 'ISU-8-98321-311', 'Isuzu', 'D-Max', 1, 'ordered', 5400],
        ['Cabin pollen filter', 'KIA-97133-P0000', 'Kia', 'Sportage', 1, 'ready', 520],
        ['Tow bar wiring kit', 'TOY-PZQ67-0K000', 'Toyota', 'Fortuner', 1, 'enquiry', null],
        ['Spark plugs (set of 4)', 'VW-04E905612C', 'Volkswagen', 'Golf 8 GTI', 1, 'collected', 1120],
    ];
    for (let i = 0; i < PARTS.length; i++) {
        const [part_name, part_number, vehicle_make, vehicle_model, quantity, status, price_quoted] = PARTS[i];
        await knex('parts_enquiries').insert({
            tenant_id: T, customer_name: `${pick(FIRST, i + 5)} ${pick(LAST, i + 1)}`, customer_phone: `+2784${rand(1000000, 9999999)}`,
            vehicle_make, vehicle_model, part_name, part_number, quantity, status, price_quoted,
            created_at: iso(now - rand(0, 14) * DAY), updated_at: iso(now - rand(0, 2) * DAY),
        });
    }
    console.log(`  ${PARTS.length} parts enquiries`);

    // 12. CSI surveys (WhatsApp, 0-10) with AI triage; low scores open concerns with an SLA + audit trail
    const { heuristic } = require('../src/services/feedback_ai');
    const serviceAdvisor = users.find((u) => u.role === 'service_advisor')?.id || users[0].id;
    const SLA_H = { high: 24, medium: 72, low: 168 };
    const FEEDBACK = [
        [10, 'Excellent service, car was ready early and spotless. Thank you Anele!', 'service'],
        [9, 'Friendly staff and quick turnaround.', 'service'],
        [10, 'Sizwe made buying my Fortuner so easy. Professional from start to finish.', 'sale'],
        [4, 'Car was ready 3 hours late and nobody called me with an update.', 'service'],
        [9, null, 'service'],
        [8, 'Good overall, waiting area coffee machine was broken.', 'service'],
        [10, 'Best dealership experience I have had. Thank you!', 'sale'],
        [6, 'Invoice was more expensive than the quote I was given.', 'service'],
        [9, 'Helpful advisor, explained everything clearly.', 'service'],
        [10, null, 'sale'],
        [3, 'Still hearing the same noise after the repair. Very disappointed.', 'service'],
        [9, 'Smooth delivery, car was perfectly prepared.', 'sale'],
        [8, null, 'service'],
        [10, 'Great communication on WhatsApp throughout.', 'service'],
        [7, 'Finance paperwork took longer than expected.', 'sale'],
        [9, 'Quick and professional.', 'service'],
        [10, 'Amazing team, will definitely be back.', 'sale'],
        [9, null, 'service'],
        [5, 'Service advisor was rude when I asked about the delay.', 'service'],
        [10, 'Fantastic. Car washed and vacuumed too!', 'service'],
        [9, 'Very happy with my new Polo.', 'sale'],
        [8, 'Good service, slightly long wait.', 'service'],
        [10, null, 'service'],
        [9, 'Great experience with Priya.', 'sale'],
    ];
    let csiCount = 0, concernCount = 0;
    for (let i = 0; i < FEEDBACK.length; i++) {
        const [score, comment, ctx] = FEEDBACK[i];
        const veh = pick(VEHICLES, i);
        const sentAt = now - (i * 2.4 + 0.5) * DAY;
        const ai = heuristic({ score, comment });
        const name = `${pick(FIRST, i + 7)} ${pick(LAST, i + 4)}`;
        const phone = `+2782${rand(1000000, 9999999)}`;
        const sid = insertId(await knex('csi_surveys').insert({
            tenant_id: T, customer_name: name, customer_phone: phone, context_type: ctx,
            context_label: `${veh[0]} ${veh[1]}${ctx === 'service' ? ` · JC-${2100 + i}` : ' · delivery'}`,
            staff_id: ctx === 'service' ? serviceAdvisor : salesId(),
            status: 'responded', score, comment, sentiment: ai.sentiment, ai_category: ai.category, ai_summary: ai.summary,
            sent_at: iso(sentAt), responded_at: iso(sentAt + rand(1, 6) * 3600 * 1000), created_at: iso(sentAt), updated_at: iso(sentAt),
        }).returning('id'));
        csiCount++;
        if (ai.needs_followup) {
            const createdAt = sentAt + 2 * 3600 * 1000;
            const resolved = i > 12; // older concerns resolved, recent ones still open
            const cid = insertId(await knex('concerns').insert({
                tenant_id: T, survey_id: sid, customer_name: name, customer_phone: phone,
                department: ctx === 'sale' ? 'sales' : 'service', severity: ai.severity,
                subject: `CSI ${score}/10 — ${ai.category.replace(/_/g, ' ')}`, description: `Customer said: "${comment || 'No comment'}"`,
                status: resolved ? 'resolved' : (i % 2 ? 'in_progress' : 'open'), source: 'csi_auto', ai_category: ai.category,
                assigned_to: ctx === 'sale' ? users.find((u) => u.role === 'admin')?.id : serviceAdvisor,
                resolution: resolved ? 'Called the customer, apologised and booked a complimentary valet on their next visit.' : null,
                due_at: iso(createdAt + SLA_H[ai.severity] * 3600 * 1000), resolved_at: resolved ? iso(createdAt + 20 * 3600 * 1000) : null,
                created_at: iso(createdAt), updated_at: iso(now),
            }).returning('id'));
            await knex('concern_events').insert({ tenant_id: T, concern_id: cid, actor_id: null, action: 'created', detail: `Auto-opened from CSI survey #${sid} (score ${score}, AI triage)`, created_at: iso(createdAt) });
            await knex('concern_events').insert({ tenant_id: T, concern_id: cid, actor_id: serviceAdvisor, action: 'assigned', detail: 'Assigned to department owner', created_at: iso(createdAt + 1800000) });
            if (resolved) await knex('concern_events').insert({ tenant_id: T, concern_id: cid, actor_id: serviceAdvisor, action: 'status_changed', detail: 'in_progress → resolved', created_at: iso(createdAt + 20 * 3600 * 1000) });
            concernCount++;
        }
    }
    // One manually-logged concern, so both sources show in the demo
    const manualAt = now - 1 * DAY;
    const mid = insertId(await knex('concerns').insert({
        tenant_id: T, customer_name: 'Ayesha Patel', customer_phone: '+27825550142', department: 'finance', severity: 'medium',
        subject: 'NATIS papers not received after 3 weeks', description: 'Customer bought a Corolla Cross; registration documents still outstanding.',
        status: 'open', source: 'manual', ai_category: 'finance_admin', assigned_to: users.find((u) => u.role === 'finance_manager')?.id || null,
        due_at: iso(manualAt + 72 * 3600 * 1000), created_at: iso(manualAt), updated_at: iso(manualAt),
    }).returning('id'));
    await knex('concern_events').insert({ tenant_id: T, concern_id: mid, actor_id: users.find((u) => u.role === 'admin')?.id, action: 'created', detail: 'Logged manually (medium, AI category: finance_admin)', created_at: iso(manualAt) });
    console.log(`  ${csiCount} CSI surveys, ${concernCount + 1} concerns`);

    // 13. Targets for the current month, calibrated against live actuals so the scorecard shows
    //     a realistic mix (achieved / on track / at risk / behind).
    const d = new Date();
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const start = `${period}-01`;
    const next = new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 1)).toISOString().slice(0, 10);
    const count = async (q) => Number((await q.count('* as c').first()).c) || 0;
    const inP = (q, col) => q.andWhere(col, '>=', start).andWhere(col, '<', next);
    const elapsed = Math.max(d.getDate(), 1), dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const proj = (a) => Math.max(1, Math.round((a / elapsed) * dim));
    const tgt = (a, mode) => Math.max(2, Math.round(mode === 'achieved' ? a * 0.9 : mode === 'on_track' ? proj(a) * 0.92 : mode === 'at_risk' ? proj(a) * 1.08 : proj(a) * 1.45));
    const dealershipActuals = {
        leads: await count(inP(knex('leads').where({ tenant_id: T }), 'created_at')),
        test_drives: await count(inP(knex('leads').where({ tenant_id: T }).whereIn('status', ['test_drive_booked', 'negotiation', 'won']), 'updated_at')),
        sales_won: await count(inP(knex('leads').where({ tenant_id: T, status: 'won' }), 'updated_at')),
        service_bookings: await count(inP(knex('service_bookings').where({ tenant_id: T }).whereNot({ status: 'cancelled' }), 'booking_date')),
    };
    const targetRows = [
        [null, 'leads', tgt(dealershipActuals.leads, 'on_track')],
        [null, 'test_drives', tgt(dealershipActuals.test_drives, 'at_risk')],
        [null, 'sales_won', tgt(dealershipActuals.sales_won, 'on_track')],
        [null, 'service_bookings', tgt(dealershipActuals.service_bookings, 'achieved')],
        [null, 'csi_score', 9],
    ];
    const salesPeople = users.filter((u) => u.role === 'salesperson').map((u) => u.id);
    const modes = ['achieved', 'on_track', 'behind'];
    for (let i = 0; i < salesPeople.length; i++) {
        const uid = salesPeople[i];
        const a = await count(inP(knex('leads').where({ tenant_id: T, assigned_to: uid }), 'created_at'));
        const w = await count(inP(knex('leads').where({ tenant_id: T, assigned_to: uid, status: 'won' }), 'updated_at'));
        targetRows.push([uid, 'leads', tgt(a, modes[i % 3])], [uid, 'sales_won', tgt(w, modes[(i + 1) % 3])]);
    }
    const admin = users.find((u) => u.role === 'admin')?.id || null;
    for (const [user_id, metric, target_value] of targetRows) {
        await knex('sales_targets').insert({ tenant_id: T, user_id, metric, period, target_value, created_by: admin, created_at: iso(now), updated_at: iso(now) });
    }
    console.log(`  ${targetRows.length} targets for ${period}`);

    // 13b. Service-lane inspections (checklist engine) with customer approvals
    const INSPECT = [
        ['Front brake pads', 'Brakes', 'soon', 'Pads at roughly 3 mm. Replace before they reach the wear indicator to protect the discs.', 2450],
        ['Wheel alignment', 'Tyres & wheels', 'soon', 'Uneven wear on the front inner edges suggests the alignment is out.', 650],
        ['Front tyres (pair)', 'Tyres & wheels', 'urgent', 'Tread close to the 1.6 mm legal limit. Replace for safe wet-weather braking.', 4200],
        ['Wiper blades', 'Visibility', 'soon', 'Blades are streaking. Replace before the rainy season.', 380],
        ['Cabin air filter', 'Air-conditioning', 'monitor', 'Filter is discoloured. Replace to keep the air-con smelling fresh.', 520],
        ['Battery', 'Electrical', 'monitor', 'Battery tested weak for its age. Replace at the next service or if starting is slow.', 2100],
    ];
    const inspBookings = await knex('service_bookings').where({ tenant_id: T }).whereIn('status', ['completed', 'in_progress']).orderBy('id');
    let inspCount = 0;
    for (const [n, bk] of inspBookings.entries()) {
        const done = bk.status === 'completed';
        const findings = [0, 1, 2].map((j) => INSPECT[(n * 2 + j) % INSPECT.length]).map(([item, area, severity, recommendation, est_price], j) => ({
            item, area, severity, recommendation, est_price,
            status: done ? ((n + j) % 5 < 2 || severity === 'urgent' ? 'approved' : 'declined') : (j === 0 && n % 2 ? 'approved' : 'pending'),
        }));
        await knex('inspections').insert({
            tenant_id: T, booking_id: bk.id, findings: JSON.stringify(findings), photos: '[]', engine: 'checklist',
            summary: 'Standard multi-point check for this service type. The technician confirms each item on the hoist.',
            sent_at: done ? bk.updated_at : null, created_at: iso(now - rand(1, 40) * DAY), updated_at: iso(now),
        });
        inspCount++;
    }
    console.log(`  ${inspCount} service inspections`);

    // 13c. Online deals reserved on the Acme Cars website
    const available = await knex('vehicles').where({ tenant_id: T, status: 'available' }).orderBy('price', 'desc');
    const OD = [
        { veh: available[2], name: 'Lindiwe Mahlangu', hoursAgo: 3, payment: 'finance', status: 'reserved', fulfilment: 'delivery', address: '14 Jacaranda Street, Waterkloof, Pretoria', trade: 210000 },
        { veh: available[6], name: 'Daniel Ferreira', hoursAgo: 30, payment: 'cash', status: 'docs_pending', fulfilment: 'collect' },
        { veh: available[9], name: 'Nandi Zulu', hoursAgo: 52, payment: 'finance', status: 'approved', fulfilment: 'collect' },
    ].filter((o) => o.veh);
    for (const [k, o] of OD.entries()) {
        const at = now - o.hoursAgo * H;
        const price = Number(o.veh.price);
        const deposit = o.payment === 'finance' ? Math.round(price * 0.1) : null;
        const rate = 11.75 / 1200; const p = price - (deposit || 0) - (o.trade || 0);
        const est = o.payment === 'finance' ? Math.round((p * rate) / (1 - Math.pow(1 + rate, -72))) : null;
        const ref = ['AC-7KQ4M', 'AC-R2HX9', 'AC-5TWN8'][k];
        const [lid] = await knex('leads').insert({
            tenant_id: T, customer_name: o.name, customer_phone: `+2782${rand(1000000, 9999999)}`, customer_email: `online${k}@example.co.za`,
            source: 'website', vehicle_interest: `${o.veh.year} ${o.veh.make} ${o.veh.model}`, budget_max: price,
            status: 'negotiation', assigned_to: salesId(), ai_score: 93,
            notes: `[Acme Cars website] ONLINE DEAL ${ref} — reserved online, ${o.payment === 'finance' ? `est. R${est.toLocaleString('en-ZA')}/month` : 'cash'}.`,
            first_response_at: iso(at + 9000), first_response_by: 'ai', last_contact_at: iso(at + 9000), appointment_at: iso(at + 2 * DAY),
            created_at: iso(at), updated_at: iso(at),
        }).returning('id');
        const leadId = typeof lid === 'object' ? lid.id : lid;
        const [did] = await knex('deals').insert({
            tenant_id: T, lead_id: leadId, vehicle_id: o.veh.id, salesperson_id: salesId(),
            stage: o.status === 'approved' ? 'approved' : o.payment === 'finance' ? 'finance_submitted' : 'negotiation',
            sale_price: price, deposit, finance_amount: o.payment === 'finance' ? p : null, monthly_installment: est,
            deal_date: iso(at), created_at: iso(at), updated_at: iso(at),
        }).returning('id');
        await knex('online_deals').insert({
            tenant_id: T, lead_id: leadId, vehicle_id: o.veh.id, deal_id: typeof did === 'object' ? did.id : did, reference: ref,
            payment_method: o.payment, vehicle_price: price, deposit, term_months: o.payment === 'finance' ? 72 : null, est_monthly: est,
            trade_in_estimate: o.trade || null, fulfilment: o.fulfilment, fulfilment_date: new Date(at + 3 * DAY).toISOString().slice(0, 10),
            delivery_address: o.address || null, status: o.status, hold_expires_at: iso(at + 48 * H), created_at: iso(at), updated_at: iso(at),
        });
        await knex('vehicles').where({ id: o.veh.id }).update({ status: 'reserved' });
        await knex('website_events').insert({ tenant_id: T, type: 'online_deal', label: `${o.name.split(' ')[0]} reserved the ${o.veh.year} ${o.veh.make} ${o.veh.model} online — ${o.payment === 'finance' ? `R${est.toLocaleString('en-ZA')}/month` : 'cash'}${o.trade ? ' + trade-in' : ''}`, vehicle_id: o.veh.id, lead_id: leadId, meta: JSON.stringify({ reference: ref }), created_at: iso(at) });
        await knex('website_events').insert({ tenant_id: T, type: 'ai_reply', label: `AI replied to ${o.name.split(' ')[0]} on WhatsApp in 9s`, lead_id: leadId, meta: '{}', created_at: iso(at + 9000) });
    }
    console.log(`  ${OD.length} online deals`);

    // 14. Website activity history (Acme Cars site → KenganAuto): last 7 days
    const vehRows = await knex('vehicles').where({ tenant_id: T }).whereNot({ status: 'sold' }).select('id', 'year', 'make', 'model');
    const weight = (v) => ({ Defender: 9, 'X5': 7, Ranger: 7, 'Golf 8 GTI': 6, Hilux: 6, 'Land Cruiser 300': 5 }[v.model] || 2);
    let evCount = 0;
    for (const v of vehRows) {
        for (let k = 0; k < weight(v) * 3; k++) {
            const at = now - rand(10, 7 * 24 * 60) * 60000;
            await knex('website_events').insert({ tenant_id: T, type: 'vehicle_view', label: `Viewed ${v.year} ${v.make} ${v.model}`, vehicle_id: v.id, visitor_id: `v${rand(1000, 9999)}`, meta: '{}', created_at: iso(at) });
            evCount++;
        }
    }
    const siteLeads = await knex('leads').where({ tenant_id: T }).andWhere('created_at', '>=', iso(now - 7 * DAY)).whereIn('source', ['website']).where((b) => b.whereNull('notes').orWhere('notes', 'not like', '%ONLINE DEAL%')).select('id', 'customer_name', 'vehicle_interest', 'status', 'created_at');
    for (const l of siteLeads) {
        const kind = l.status === 'test_drive_booked' ? 'test_drive' : 'enquiry';
        await knex('website_events').insert({ tenant_id: T, type: kind, label: `${l.customer_name.split(' ')[0]} ${kind === 'test_drive' ? 'booked a test drive' : 'enquired'} — ${l.vehicle_interest || 'general'}`, lead_id: l.id, meta: '{}', created_at: l.created_at });
        const secs = rand(6, 40);
        await knex('website_events').insert({ tenant_id: T, type: 'ai_reply', label: `AI replied to ${l.customer_name.split(' ')[0]} on WhatsApp in ${secs}s`, lead_id: l.id, meta: '{}', created_at: iso(new Date(l.created_at).getTime() + secs * 1000) });
        evCount += 2;
    }
    console.log(`  ${evCount} website events`);

    console.log('\nDemo seed complete.');
    console.log('Login (all roles, password demo1234): admin@ / sales@ / kyle@ / priya@ / finance@ / service@ / parts@enterprise-demo.co.za');
    await knex.destroy();
}

run().catch((e) => { console.error(e); process.exit(1); });
