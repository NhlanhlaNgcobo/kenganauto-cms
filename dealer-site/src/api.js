// Acme Cars → KenganAuto public dealer API.
// Configure per environment with VITE_API_URL, VITE_TENANT_ID, VITE_DASHBOARD_URL.
export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
export const TENANT_ID = import.meta.env.VITE_TENANT_ID || '5';
export const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:5173/dashboard';

const BASE = `${API_BASE}/api/public/dealer/${TENANT_ID}`;

// Anonymous per-browser id so the dealer sees "viewed 3 cars before enquiring" — no personal data.
export const visitorId = (() => {
  const key = 'acme_vid';
  try {
    let v = localStorage.getItem(key);
    if (!v) { v = `v_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`; localStorage.setItem(key, v); }
    return v;
  } catch {
    return `v_${Math.random().toString(36).slice(2, 10)}`;
  }
})();

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify({ ...body, visitor_id: visitorId }) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again or call us.');
  return data;
}

export const api = {
  profile: () => request('/profile'),
  stock: () => request('/stock'),
  track: (vehicle_id) => request('/track', { method: 'POST', body: { type: 'vehicle_view', vehicle_id } }).catch(() => null),
  enquiry: (body) => request('/enquiry', { method: 'POST', body }),
  finance: (body) => request('/finance', { method: 'POST', body }),
  tradeEstimate: (body) => request('/trade-in/estimate', { method: 'POST', body }),
  tradeIn: (body) => request('/trade-in', { method: 'POST', body }),
  service: (body) => request('/service', { method: 'POST', body }),
  onlineDeal: (body) => request('/online-deal', { method: 'POST', body }),
};
