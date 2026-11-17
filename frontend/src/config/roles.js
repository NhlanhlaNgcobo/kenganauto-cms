/**
 * ROLE_CONFIG — defines navigation access per role.
 * Used by Sidebar and ProtectedRoute to hide/guard modules.
 */

export const ROLE_NAV = {
    admin: [
        'dashboard', 'followups', 'leads', 'chatbot', 'finance', 'trade-in', 'stock', 'service', 'parts', 'retention', 'support', 'whatsapp', 'widget',
        'targets', 'customer-care', 'customers', 'ai-impact', 'online-deals'
    ],
    salesperson: [
        'dashboard', 'followups', 'leads', 'online-deals', 'stock', 'customers', 'targets'
    ],
    finance_manager: [
        'dashboard', 'finance', 'online-deals'
    ],
    service_advisor: [
        'dashboard', 'service', 'customers', 'stock', 'customer-care', 'targets'
    ],
    parts_manager: [
        'dashboard', 'parts'
    ],
};

export const ROLE_LABELS = {
    admin: 'Administrator',
    salesperson: 'Sales Executive',
    finance_manager: 'Finance Manager',
    service_advisor: 'Service Advisor',
    parts_manager: 'Parts Manager',
};

export const ROLE_COLORS = {
    admin: { bg: 'rgba(201,168,76,0.12)', text: '#C9A84C' },
    salesperson: { bg: 'rgba(59,127,245,0.12)', text: '#60A5FA' },
    finance_manager: { bg: 'rgba(74,222,128,0.12)', text: '#4ADE80' },
    service_advisor: { bg: 'rgba(251,146,60,0.12)', text: '#FB923C' },
    parts_manager: { bg: 'rgba(167,139,250,0.12)', text: '#A78BFA' },
};
