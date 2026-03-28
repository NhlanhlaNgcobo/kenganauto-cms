/**
 * useLeads — data hook for the Lead Pipeline CRM
 * Fetches leads, provides optimistic stage updates, polling, and filters.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function authHeaders() {
    const token = localStorage.getItem('ka_token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
}

export function useLeads(filters = {}) {
    const [leads, setLeads] = useState([]);
    const [stats, setStats] = useState({ counts: {}, total: 0, overdue: 0 });
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const pollRef = useRef(null);

    const fetchLeads = useCallback(async () => {
        try {
            const params = {};
            if (filters.status) params.status = filters.status;
            if (filters.source) params.source = filters.source;
            if (filters.search) params.search = filters.search;
            if (filters.assigned_to) params.assigned_to = filters.assigned_to;

            const [leadsRes, statsRes] = await Promise.all([
                axios.get(`${API_BASE}/api/leads`, { headers: authHeaders(), params }),
                axios.get(`${API_BASE}/api/leads/stats`, { headers: authHeaders() }),
            ]);
            setLeads(leadsRes.data.leads || []);
            setStats(statsRes.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load leads.');
        } finally {
            setLoading(false);
        }
    }, [JSON.stringify(filters)]);

    const fetchTeam = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/leads/team`, { headers: authHeaders() });
            setTeam(res.data.team || []);
        } catch { /* non-fatal */ }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchLeads();
        fetchTeam();
        // Poll for updates every 30 seconds
        pollRef.current = setInterval(fetchLeads, 30_000);
        return () => clearInterval(pollRef.current);
    }, [fetchLeads]);

    /* Optimistic stage update */
    const moveStage = useCallback(async (leadId, newStatus) => {
        // Optimistic update
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus, overdue: false } : l));
        try {
            await axios.patch(`${API_BASE}/api/leads/${leadId}/stage`, { status: newStatus }, { headers: authHeaders() });
        } catch {
            // Revert on error
            fetchLeads();
        }
    }, [fetchLeads]);

    const addNote = useCallback(async (leadId, note) => {
        const res = await axios.post(`${API_BASE}/api/leads/${leadId}/notes`, { note }, { headers: authHeaders() });
        return res.data;
    }, []);

    const createLead = useCallback(async (data) => {
        const res = await axios.post(`${API_BASE}/api/leads`, data, { headers: authHeaders() });
        await fetchLeads();
        return res.data;
    }, [fetchLeads]);

    const assignLead = useCallback(async (leadId, userId) => {
        const res = await axios.patch(`${API_BASE}/api/leads/${leadId}/assign`, { assigned_to: userId }, { headers: authHeaders() });
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, assigned_to: userId } : l));
        return res.data;
    }, []);

    const bulkAction = useCallback(async (ids, action, value) => {
        const res = await axios.post(`${API_BASE}/api/leads/bulk`, { ids, action, value }, { headers: authHeaders() });
        await fetchLeads();
        return res.data;
    }, [fetchLeads]);

    const generateAISummary = useCallback(async (leadId) => {
        const res = await axios.post(`${API_BASE}/api/leads/${leadId}/ai-summary`, {}, { headers: authHeaders() });
        return res.data.summary;
    }, []);

    return {
        leads, stats, team, loading, error,
        moveStage, addNote, createLead, assignLead, bulkAction, generateAISummary,
        refresh: fetchLeads,
    };
}

export function useLeadDetail(leadId) {
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDetail = useCallback(async () => {
        if (!leadId) return;
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/api/leads/${leadId}`, { headers: authHeaders() });
            setLead(res.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Lead not found.');
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

    return { lead, loading, error, refresh: fetchDetail };
}
