import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function authHeaders() {
    const token = localStorage.getItem('ka_token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Authenticated JSON API helper: api.get('/api/x'), api.post('/api/x', body) … */
export const api = {
    get: (path, params) => axios.get(`${API_URL}${path}`, { params, headers: authHeaders() }).then((r) => r.data),
    post: (path, body) => axios.post(`${API_URL}${path}`, body, { headers: authHeaders() }).then((r) => r.data),
    patch: (path, body) => axios.patch(`${API_URL}${path}`, body, { headers: authHeaders() }).then((r) => r.data),
    del: (path) => axios.delete(`${API_URL}${path}`, { headers: authHeaders() }).then((r) => r.data),
};

export const errMsg = (e, fallback = 'Something went wrong') => e?.response?.data?.error || fallback;
