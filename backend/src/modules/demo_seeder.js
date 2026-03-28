/**
 * Demo Environment Seeder
 * Supplies rich mock data globally when req.tenant.slug === 'demo'
 */

const getDemoStock = (tenantId = 9999) => [
    { id: 9001, tenant_id: tenantId, make: 'Toyota', model: 'Hilux', year: 2023, variant: '2.8 GD-6 RB Legend', colour: 'White', mileage: 12500, price: 749900, stock_number: 'DEMO-001', vin: 'AHT111', status: 'available', images: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800'], features: ['Leather', 'Reverse Camera'] },
    { id: 9002, tenant_id: tenantId, make: 'BMW', model: 'X5', year: 2022, variant: 'xDrive30d M Sport', colour: 'Black Sapphire', mileage: 34000, price: 1250000, stock_number: 'DEMO-002', vin: 'WBA222', status: 'available', images: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800'], features: ['Panoramic Roof', 'Harman Kardon'] },
    { id: 9003, tenant_id: tenantId, make: 'Volkswagen', model: 'Golf 8', year: 2021, variant: 'GTI 2.0 TSI', colour: 'Pure White', mileage: 45000, price: 689900, stock_number: 'DEMO-003', vin: 'WVW333', status: 'available', images: ['https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=80&w=800'], features: ['IQ Light', 'Discover Pro'] },
    { id: 9004, tenant_id: tenantId, make: 'Ford', model: 'Ranger', year: 2022, variant: '2.0 Bi-Turbo Wildtrak', colour: 'Cyber Orange', mileage: 22000, price: 799900, stock_number: 'DEMO-004', vin: 'AFR444', status: 'available', images: ['https://images.unsplash.com/photo-1553152531-ee0d1bdac8bf?auto=format&fit=crop&q=80&w=800'], features: ['Sync 4', 'Roller Shutter'] },
    { id: 9005, tenant_id: tenantId, make: 'Mercedes-Benz', model: 'C-Class', year: 2023, variant: 'C200 AMG Line', colour: 'Polar White', mileage: 8500, price: 920000, stock_number: 'DEMO-005', vin: 'WDD555', status: 'available', images: [], features: ['Digital Light', 'Burmester'] },
    { id: 9006, tenant_id: tenantId, make: 'Audi', model: 'Q5', year: 2021, variant: '40 TDI Quattro S line', colour: 'Navarra Blue', mileage: 56000, price: 759900, stock_number: 'DEMO-006', vin: 'WAU666', status: 'available', images: [], features: ['Matrix LED', 'Virtual Cockpit'] },
    { id: 9007, tenant_id: tenantId, make: 'Toyota', model: 'Fortuner', year: 2022, variant: '2.8 GD-6 VX 4x4', colour: 'Silver', mileage: 41000, price: 810000, stock_number: 'DEMO-007', vin: 'AHT777', status: 'available', images: [], features: ['JBL Audio', 'Auto Tailgate'] },
    { id: 9008, tenant_id: tenantId, make: 'Volkswagen', model: 'Polo', year: 2023, variant: '1.0 TSI Life', colour: 'Reef Blue', mileage: 15000, price: 349900, stock_number: 'DEMO-008', vin: 'WVW888', status: 'available', images: [], features: ['App-Connect', 'LED Headlights'] },
    { id: 9009, tenant_id: tenantId, make: 'Ford', model: 'Everest', year: 2023, variant: '3.0 V6 Platinum', colour: 'Snowflake White', mileage: 12000, price: 1150000, stock_number: 'DEMO-009', vin: 'AFR999', status: 'available', images: [], features: ['Matrix LED', 'Active Park Assist'] },
    { id: 9010, tenant_id: tenantId, make: 'BMW', model: '3 Series', year: 2021, variant: '320i M Sport', colour: 'Portimao Blue', mileage: 62000, price: 620000, stock_number: 'DEMO-010', vin: 'WBA000', status: 'available', images: [], features: ['Sunroof', 'Live Cockpit Pro'] },
    { id: 9011, tenant_id: tenantId, make: 'Hyundai', model: 'Tucson', year: 2022, variant: '2.0 Elite', colour: 'Phantom Black', mileage: 28000, price: 540000, stock_number: 'DEMO-011', vin: 'KTH111', status: 'available', images: [], features: ['Heated Seats', 'Wireless Charging'] },
    { id: 9012, tenant_id: tenantId, make: 'Kia', model: 'Sportage', year: 2023, variant: '1.6 T-GDi GT-Line S', colour: 'Penta Metal', mileage: 9000, price: 730000, stock_number: 'DEMO-012', vin: 'KNA222', status: 'available', images: [], features: ['Harman Kardon', 'Panoramic Roof'] },
];

const getDemoLeads = (tenantId = 9999) => {
    const statuses = ['new', 'new', 'new', 'contacted', 'contacted', 'qualified', 'test_drive_booked', 'negotiation', 'won', 'lost'];
    const sources = ['whatsapp', 'website', 'autotrader', 'facebook'];
    const firstNames = ['John', 'Sarah', 'Michael', 'Emma', 'David', 'Lisa', 'James', 'Mary', 'William', 'Linda'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const vehicles = ['Toyota Hilux', 'BMW X5', 'VW Golf 8', 'Ford Ranger', 'Mercedes C-Class'];

    return Array.from({ length: 25 }).map((_, i) => ({
        id: 8000 + i,
        tenant_id: tenantId,
        customer_name: `${firstNames[i % 10]} ${lastNames[(i + 3) % 10]}`,
        customer_phone: `+27 82 ${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)}`,
        customer_email: `demo${i}@example.com`,
        source: sources[i % sources.length],
        vehicle_interest: vehicles[i % vehicles.length],
        status: statuses[i % statuses.length],
        assigned_to: (i % 3) + 1,
        ai_score: Math.floor(40 + Math.random() * 55),
        created_at: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        overdue: Math.random() > 0.8,
    }));
};

module.exports = {
    getDemoStock,
    getDemoLeads
};
