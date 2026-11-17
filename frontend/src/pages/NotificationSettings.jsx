import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, MessageCircle, Smartphone, Clock, Eye, Send, ShieldAlert, CheckCircle2, ChevronDown, Bell } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ROLES = [
    { id: 'sales_exec', label: 'Sales Execs' },
    { id: 'sales_manager', label: 'Sales Managers' },
    { id: 'finance_manager', label: 'Finance Managers' },
    { id: 'service_advisor', label: 'Service Advisors' },
    { id: 'dealer_principal', label: 'Dealer Principal' },
    { id: 'customer', label: 'Customer' }
];

export default function NotificationSettings() {
    const { token } = useAuth();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [_saving, setSaving] = useState(false);

    // Test modal state
    const [testModal, setTestModal] = useState(false);
    const [testPayload, setTestPayload] = useState({ channel: 'email', destination: '' });
    const [testStatus, setTestStatus] = useState('');

    async function loadSettings() {
        try {
            const res = await axios.get(`${API_URL}/api/notifications/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSettings(res.data.settings);
        } catch (e) { console.error('Error fetching notification settings:', e); }
        setLoading(false);
    }

    useEffect(() => { loadSettings(); }, []);

    const handleSave = async (updatedSettings) => {
        setSaving(true);
        try {
            await axios.put(`${API_URL}/api/notifications/settings`, updatedSettings, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSettings(updatedSettings);
        } catch (e) { console.error('Error saving settings:', e); }
        setSaving(false);
    };

    const toggleChannelSetting = (channel, key) => {
        const newSet = JSON.parse(JSON.stringify(settings));
        newSet[channel][key].active = !newSet[channel][key].active;
        handleSave(newSet);
    };

    const toggleRole = (channel, key, roleId) => {
        const newSet = JSON.parse(JSON.stringify(settings));
        const currentRoles = newSet[channel][key].roles;
        if (currentRoles.includes(roleId)) {
            newSet[channel][key].roles = currentRoles.filter(r => r !== roleId);
        } else {
            newSet[channel][key].roles.push(roleId);
        }
        handleSave(newSet);
    };

    const handleHoursChange = (type, val) => {
        const newSet = JSON.parse(JSON.stringify(settings));
        newSet.hours[type] = val;
        handleSave(newSet);
    };

    const sendTestNotification = async () => {
        setTestStatus('Sending...');
        try {
            await axios.post(`${API_URL}/api/notifications/test`, testPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTestStatus('Dispatched Successfully');
            setTimeout(() => setTestModal(false), 2000);
        } catch {
            setTestStatus('Failed to send');
        }
    };

    const previewTemplate = (templateKey) => {
        window.open(`${API_URL}/api/notifications/preview/${templateKey}`, '_blank');
    };

    if (loading || !settings) return <div className="p-8 text-[#C9A84C] font-black uppercase tracking-widest">Loading Routing Core...</div>;

    const renderCard = (channelName, icon, dataKey, definitions) => (
        <div className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden mb-8">
            <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/5">
                <h2 className="font-outfit font-black text-white uppercase tracking-widest flex items-center gap-3">
                    {icon} {channelName} Triggers
                </h2>
            </div>
            <div className="divide-y divide-white/5">
                {definitions.map((def, i) => (
                    <div key={i} className="p-6 flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center hover:bg-white/5 transition-colors">
                        <div className="flex-1">
                            <h3 className="font-bold text-white mb-1 tracking-wider">{def.title}</h3>
                            <p className="text-[13px] text-white/66 leading-relaxed max-w-lg">{def.desc}</p>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[280px]">
                            {/* Role Selectors (Pills) */}
                            <div className="flex flex-wrap gap-1.5">
                                {ROLES.map(r => {
                                    const isSelected = settings[dataKey][def.key].roles.includes(r.id);
                                    // Make Customers locked for certain hard-coded routes? Simple UI: just toggle everything
                                    return (
                                        <button key={r.id} onClick={() => toggleRole(dataKey, def.key, r.id)}
                                            className={`px-2 py-1 text-[11px] uppercase font-bold tracking-widest rounded transition-all border
                                                ${isSelected ? 'bg-[#C9A84C]/20 border-[#C9A84C]/50 text-[#C9A84C]' : 'bg-transparent border-white/10 text-white/58 hover:text-white hover:border-white/30'}`}>
                                            {r.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 mt-4 xl:mt-0">
                            {def.hasPreview && (
                                <button onClick={() => previewTemplate(def.key)} className="p-2 border border-white/10 text-white hover:text-[#3B82F6] hover:border-[#3B82F6]/50 rounded-xl transition-all" title="Preview Template">
                                    <Eye size={16} />
                                </button>
                            )}
                            <button onClick={() => toggleChannelSetting(dataKey, def.key)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings[dataKey][def.key].active ? 'bg-[#C9A84C]' : 'bg-white/10'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${settings[dataKey][def.key].active ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto text-white">

            <div className="flex justify-between items-end mb-8 pt-2 relative">
                <div>
                    <h1 className="font-outfit font-black text-3xl text-white tracking-wide">Communication Triggers</h1>
                </div>
                <button onClick={() => setTestModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-xs">
                    <Send size={14} /> Send Global Test
                </button>
            </div>

            {/* ROUTING HOURS LOCK */}
            <div className="bg-black/40 border border-[#C9A84C]/30 p-6 rounded-2xl mb-8 flex items-center justify-between">
                <div>
                    <h2 className="font-outfit font-black text-[#C9A84C] uppercase tracking-widest mb-1 flex items-center gap-2"><Clock size={16} /> Staff Silent Hours Routing</h2>
                    <p className="text-[13px] text-white/66 leading-relaxed max-w-[65ch]">During silent hours, WhatsApp triggers to staff will be suppressed or held in the dashboard queue.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[11px] uppercase font-bold text-white/58 mb-1 tracking-widest">Active From</span>
                        <input type="time" value={settings.hours.start} onChange={(e) => handleHoursChange('start', e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C9A84C]" />
                    </div>
                    <span className="text-white/58 mt-4">—</span>
                    <div className="flex flex-col">
                        <span className="text-[11px] uppercase font-bold text-white/58 mb-1 tracking-widest">Active Until</span>
                        <input type="time" value={settings.hours.end} onChange={(e) => handleHoursChange('end', e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C9A84C]" />
                    </div>
                </div>
            </div>

            {/* EMAIL DEFINITIONS */}
            {renderCard('Email', <Mail size={18} className="text-blue-400" />, 'email', [
                { key: 'new_lead', title: 'New Hot Lead Alert', desc: 'Dispatched when AI detects strong purchase intent.', hasPreview: true },
                { key: 'finance_app', title: 'Finance Application Received', desc: 'F&I module structured data payload notification.', hasPreview: false },
                { key: 'service_confirm', title: 'Service Booked & Confirmed', desc: 'Formal confirmation outlining date, location & required items.', hasPreview: false },
                { key: 'service_reminder', title: 'Service 48h Reminder Sequence', desc: 'Automated follow-up preventing no-shows.', hasPreview: false },
                { key: 'trade_in_offer', title: 'Trade-in Offer Dispatched', desc: 'Automated certificate of offer generation.', hasPreview: false },
                { key: 'deal_won', title: 'Deal Moved To Won', desc: 'Internal motivational dispatch alerting DP + Execs.', hasPreview: false },
                { key: 'weekly_summary', title: 'Automated Weekly KPI Summary', desc: 'Every Monday 08:00 AM snapshot reporting.', hasPreview: false },
                { key: 'monthly_report', title: '1st of Month BI Analytics', desc: 'Deep dive metrics dispatched automatically.', hasPreview: false }
            ])}

            {/* WHATSAPP DEFINITIONS */}
            {renderCard('WhatsApp (Via 360Dialog)', <MessageCircle size={18} className="text-green-400" />, 'whatsapp', [
                { key: 'hot_lead', title: 'Instant Lead Assignment', desc: 'Push directly to staff phones immediately when assigned.' },
                { key: 'customer_arrived', title: 'Service Customer Arrival', desc: 'Alerts Advisor when receptionist checks in the car.' },
                { key: 'vehicle_ready', title: 'Vehicle Ready For Collection', desc: 'Notifies customer directly with collection instructions.' },
                { key: 'finance_app', title: 'Credit App Urgent Alert', desc: 'Rapid alert pointing F&I manager into the system.' },
                { key: 'dp_daily_summary', title: 'Daily DP Overview', desc: 'Scheduled 5 PM total unit sales / bookings recap.' }
            ])}

            {/* SMS DEFINITIONS */}
            {renderCard('Fall-Back SMS (Clickatell)', <Smartphone size={18} className="text-orange-400" />, 'sms', [
                { key: 'service_confirm', title: 'Service Booking (No-WhatsApp)', desc: 'Standard SMS pushed if customer lacks WhatsApp.' },
                { key: 'service_reminder', title: 'Service 48h Reminder (No-WhatsApp)', desc: 'Standard SMS reminder payload.' },
                { key: 'finance_outcome', title: 'Finance Result Payload', desc: 'Shortened SMS alerting customer to check portals.' }
            ])}

            {/* MODAL: TEST SENDER */}
            {testModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0A0F1E] border border-white/10 p-8 rounded-2xl w-full max-w-md relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500" />
                        <h2 className="font-outfit font-black text-white text-xl mb-6 flex items-center gap-3"><Bell className="text-blue-500" /> Dispatch Test Matrix</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-[#C9A84C] mb-2 block">Notification Channel</label>
                                <select value={testPayload.channel} onChange={(e) => setTestPayload({ ...testPayload, channel: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-blue-500 outline-none hover:bg-white/10 transition-colors">
                                    <option value="email">Email Routing (Resend API)</option>
                                    <option value="whatsapp">WhatsApp Cloud (360dialog)</option>
                                    <option value="sms">Carrier SMS (Clickatell)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-[#C9A84C] mb-2 block">Destination (Email or Mobile)</label>
                                <input type="text" value={testPayload.destination} onChange={(e) => setTestPayload({ ...testPayload, destination: e.target.value })} placeholder="+27 82 555 1234 or email@..." className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:border-blue-500 outline-none transition-colors" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button onClick={() => { setTestModal(false); setTestStatus(''); }} className="px-4 py-2 border border-white/10 rounded-lg text-white text-xs font-bold hover:bg-white/5 transition-colors uppercase tracking-wider">Cancel</button>
                            <button onClick={sendTestNotification} disabled={!testPayload.destination} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-row items-center gap-2">
                                {testStatus || 'Dispatch Simulation'} <Send size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
