import React, { useEffect, useMemo, useState } from 'react';
import {
    Activity,
    CalendarClock,
    ChevronDown,
    ChevronUp,
    Crown,
    Gift,
    Heart,
    Lock,
    Mail,
    MessageCircle,
    Play,
    RefreshCw,
    Send,
    Smartphone,
    ToggleLeft,
    ToggleRight,
    Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageShell, Surface } from '../components/PageShell';
import CollapsibleSection from '../components/CollapsibleSection';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const CHANNEL_OPTIONS = [
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'sms', label: 'SMS', icon: Smartphone },
];

const AUDIENCE_OPTIONS = [
    { value: 'dormant_leads', label: 'Old leads' },
    { value: 'service_due', label: 'Service due' },
    { value: 'birthdays', label: 'Birthdays' },
    { value: 'all_customers', label: 'All customers' },
];

const SCHEDULE_OPTIONS = [
    { value: 'once', label: 'One-off' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
];

const DEFAULT_FORM = {
    name: 'Weekend reactivation blast',
    channel: 'whatsapp',
    audience_type: 'dormant_leads',
    schedule_type: 'once',
    template_subject: 'You are invited back to {{dealershipName}}',
    template_body: 'Hi {{firstName}}, we have fresh stock and flexible options available for {{vehicleInterest}} buyers this week. If you want, we can book you in for a quick test drive at {{dealershipName}}.',
};

function getToken() {
    return localStorage.getItem('ka_token') || localStorage.getItem('token');
}

async function apiFetch(path, options = {}) {
    const token = getToken();
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Request failed.');
    }

    return data;
}

function SectionHeader({ title, subtitle, action }) {
    return (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
                <h2 className="font-outfit text-2xl font-black text-white">{title}</h2>
                {subtitle ? <p className="mt-2 text-sm leading-7 text-white/66">{subtitle}</p> : null}
            </div>
            {action}
        </div>
    );
}

function StatCard({ icon, label, value, hint }) {
    const IconComponent = icon;
    return (
        <Surface className="rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-white/72">{label}</span>
                <div className="rounded-xl bg-white/5 p-2 text-[#C9A84C]">
                    <IconComponent size={16} />
                </div>
            </div>
            <p className="font-outfit text-4xl font-black text-white">{value}</p>
            <p className="mt-2 text-sm leading-6 text-white/58">{hint}</p>
        </Surface>
    );
}

function Pill({ children }) {
    return (
        <span className="rounded-full bg-white/6 px-3 py-1.5 text-xs font-semibold text-white/72">
            {children}
        </span>
    );
}

function AudiencePreview({ preview, previewLoading, audienceType }) {
    return (
        <Surface className="rounded-2xl p-5">
            <SectionHeader
                title="Audience preview"
                subtitle="Check the contact count before you send."
                action={previewLoading ? <RefreshCw size={16} className="animate-spin text-[#C9A84C]" /> : <Users size={16} className="text-[#C9A84C]" />}
            />

            <div className="rounded-2xl bg-[#0D1526] p-4">
                <p className="text-sm font-semibold text-white/70">{AUDIENCE_OPTIONS.find((item) => item.value === audienceType)?.label || 'Audience'}</p>
                <p className="mt-2 font-outfit text-4xl font-black text-white">{preview?.count || 0}</p>
            </div>

            <div className="mt-4 divide-y divide-white/8">
                {(preview?.sample || []).map((person) => (
                    <div key={`${person.entity_type}-${person.entity_id}`} className="py-3">
                        <p className="text-sm font-semibold text-white">{person.full_name}</p>
                        <p className="mt-1 text-sm text-white/58">{person.email || person.whatsapp_number || person.phone || 'No contact method'}</p>
                    </div>
                ))}

                {!previewLoading && (!preview?.sample || preview.sample.length === 0) ? (
                    <div className="py-3 text-sm leading-7 text-white/66">
                        No matching contacts yet. Add birthdays to customer records and keep service history current to improve coverage.
                    </div>
                ) : null}
            </div>
        </Surface>
    );
}

function CampaignCard({ campaign, onToggle, onRun, runningCampaignId }) {
    const channel = CHANNEL_OPTIONS.find((item) => item.value === campaign.channel);
    const ChannelIcon = channel?.icon || Send;

    return (
        <div className="border-t border-white/8 pt-5 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-outfit text-xl font-black text-white">{campaign.name}</h3>
                        <Pill>
                            <span className="inline-flex items-center gap-1.5">
                                <ChannelIcon size={12} className="text-[#C9A84C]" />
                                {channel?.label || campaign.channel}
                            </span>
                        </Pill>
                        <Pill>{AUDIENCE_OPTIONS.find((item) => item.value === campaign.audience_type)?.label || campaign.audience_type}</Pill>
                        <Pill>{campaign.schedule_type}</Pill>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-white/66">{campaign.template_body}</p>
                    {campaign.last_run_summary?.executed_at ? (
                        <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/58">
                            <span>Last run: {new Date(campaign.last_run_summary.executed_at).toLocaleString()}</span>
                            <span>Audience: {campaign.last_run_summary.audience_count || 0}</span>
                            <span className="text-green-300">Delivered: {campaign.last_run_summary.delivered_count || 0}</span>
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onToggle(campaign)}
                        className={campaign.active ? 'text-green-400' : 'text-white/58'}
                        title={campaign.active ? 'Pause campaign' : 'Resume campaign'}
                    >
                        {campaign.active ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
                    </button>
                    <button
                        onClick={() => onRun(campaign.id)}
                        disabled={runningCampaignId === campaign.id}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-4 py-2.5 text-sm font-semibold text-[#0A0F1E] transition hover:opacity-90 disabled:opacity-60"
                    >
                        <Play size={14} />
                        {runningCampaignId === campaign.id ? 'Running...' : 'Run now'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function EmptyCard({ text }) {
    return (
        <div className="py-3 text-sm leading-7 text-white/66">
            {text}
        </div>
    );
}

function TabBar({ view, setView }) {
    const tabs = [
        { id: 'reactivation', label: 'Database reactivation' },
        { id: 'sequences', label: 'Sequences' },
        { id: 'loyalty', label: 'Loyalty & NPS' },
    ];

    return (
        <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setView(tab.id)}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${view === tab.id ? 'bg-[#C9A84C] text-[#0A0F1E]' : 'border border-white/10 bg-[#121A2B] text-white/72 hover:text-white'}`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

export default function Retention() {
    const navigate = useNavigate();
    const [view, setView] = useState('reactivation');
    const [sequences, setSequences] = useState([]);
    const [loyaltyData, setLoyaltyData] = useState(null);
    const [expandedSeq, setExpandedSeq] = useState(null);
    const [reactivation, setReactivation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [processingDue, setProcessingDue] = useState(false);
    const [runningCampaignId, setRunningCampaignId] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [form, setForm] = useState(DEFAULT_FORM);

    const automaticCampaigns = useMemo(
        () => (reactivation?.campaigns || []).filter((campaign) => campaign.is_automatic),
        [reactivation]
    );

    const manualCampaigns = useMemo(
        () => (reactivation?.campaigns || []).filter((campaign) => !campaign.is_automatic),
        [reactivation]
    );

    useEffect(() => {
        if (view === 'reactivation') {
            loadReactivation();
            return;
        }
        if (view === 'sequences') {
            loadSequences();
            return;
        }
        loadLoyalty();
    }, [view]);

    useEffect(() => {
        if (view !== 'reactivation' || reactivation?.locked) return;
        loadPreview(form.audience_type);
    }, [view, reactivation?.locked, form.audience_type]);

    const loadReactivation = async () => {
        setLoading(true);
        try {
            const data = await apiFetch('/api/retention/reactivation');
            setReactivation(data);
        } catch (error) {
            console.error('Error fetching database reactivation', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSequences = async () => {
        setLoading(true);
        try {
            const data = await apiFetch('/api/retention/sequences');
            setSequences(data);
        } catch (error) {
            console.error('Error fetching sequences', error);
        } finally {
            setLoading(false);
        }
    };

    const loadLoyalty = async () => {
        setLoading(true);
        try {
            const data = await apiFetch('/api/retention/loyalty-nps');
            setLoyaltyData(data);
        } catch (error) {
            console.error('Error fetching loyalty data', error);
        } finally {
            setLoading(false);
        }
    };

    const loadPreview = async (audienceType) => {
        setPreviewLoading(true);
        try {
            const data = await apiFetch(`/api/retention/reactivation/audience-preview?audience_type=${audienceType}`);
            setPreview(data);
        } catch (error) {
            console.error('Error previewing audience', error);
        } finally {
            setPreviewLoading(false);
        }
    };

    const toggleSequence = async (id, activeStatus) => {
        try {
            const data = await apiFetch(`/api/retention/sequences/${id}/toggle`, {
                method: 'PATCH',
                body: JSON.stringify({ active: !activeStatus }),
            });
            setSequences((current) => current.map((sequence) => (sequence.id === id ? data : sequence)));
        } catch (error) {
            alert(error.message || 'Failed to toggle sequence.');
        }
    };

    const toggleCampaign = async (campaign) => {
        try {
            await apiFetch(`/api/retention/reactivation/campaigns/${campaign.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ active: !campaign.active }),
            });
            await loadReactivation();
        } catch (error) {
            alert(error.message || 'Failed to update campaign.');
        }
    };

    const runCampaign = async (campaignId) => {
        setRunningCampaignId(campaignId);
        try {
            await apiFetch(`/api/retention/reactivation/campaigns/${campaignId}/run`, { method: 'POST' });
            await loadReactivation();
        } catch (error) {
            alert(error.message || 'Failed to run campaign.');
        } finally {
            setRunningCampaignId(null);
        }
    };

    const processDueCampaigns = async () => {
        setProcessingDue(true);
        try {
            await apiFetch('/api/retention/reactivation/process-due', { method: 'POST' });
            await loadReactivation();
        } catch (error) {
            alert(error.message || 'Failed to process due automations.');
        } finally {
            setProcessingDue(false);
        }
    };

    const handleCreateCampaign = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        try {
            await apiFetch('/api/retention/reactivation/campaigns', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    kind: 'manual',
                    active: true,
                }),
            });
            setForm(DEFAULT_FORM);
            await loadReactivation();
        } catch (error) {
            alert(error.message || 'Failed to create campaign.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PageShell
            title="Database reactivation"
            description="This page is now structured around the actual workflow: check the audience, review the automatic campaigns, then create one manual campaign if you need it."
            actions={
                <div className="flex flex-wrap items-center gap-3">
                    {view === 'reactivation' && !reactivation?.locked ? (
                        <button
                            onClick={processDueCampaigns}
                            disabled={processingDue}
                            className="inline-flex items-center gap-2 rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C]/10 px-4 py-2.5 text-sm font-semibold text-[#F7D774] transition hover:bg-[#C9A84C]/15 disabled:opacity-60"
                        >
                            <RefreshCw size={15} className={processingDue ? 'animate-spin' : ''} />
                            {processingDue ? 'Processing...' : 'Process due'}
                        </button>
                    ) : null}
                    <TabBar view={view} setView={setView} />
                </div>
            }
            maxWidth="max-w-[1440px]"
        >
            {view === 'reactivation' ? (
                loading ? (
                    <Surface className="rounded-3xl p-10 text-center text-sm text-white/58">Loading database reactivation...</Surface>
                ) : reactivation?.locked ? (
                    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                        <Surface className="rounded-3xl">
                            <SectionHeader
                                title="Database reactivation is on Enterprise"
                                subtitle="Unlock automated service reminders, birthday outreach, old lead reactivation, and a campaign builder from one page."
                                action={
                                    <button
                                        onClick={() => navigate('/settings/billing')}
                                        className="rounded-xl bg-[#C9A84C] px-5 py-3 text-sm font-semibold text-[#0A0F1E] transition hover:opacity-90"
                                    >
                                        Upgrade plan
                                    </button>
                                }
                            />

                            <div className="grid gap-4 md:grid-cols-2">
                                {(reactivation.enterprise_features || []).map((feature) => (
                                    <div key={feature} className="border-t border-white/8 py-4 first:border-t-0 first:pt-0 text-sm leading-7 text-white/72">
                                        {feature}
                                    </div>
                                ))}
                            </div>
                        </Surface>

                        <Surface className="rounded-3xl">
                            <SectionHeader title="Current access" subtitle={reactivation.upgrade_message} />
                            <div className="rounded-2xl bg-white/[0.03] p-5">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-xl bg-red-500/10 p-2 text-red-400">
                                        <Lock size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-white/58">Plan</p>
                                        <p className="mt-1 font-outfit text-2xl font-black text-white">{reactivation.plan?.toUpperCase()}</p>
                                    </div>
                                </div>
                            </div>
                        </Surface>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <StatCard icon={CalendarClock} label="Service due" value={reactivation?.audience_preview?.service_due || 0} hint="Customers entering the next service window." />
                            <StatCard icon={Gift} label="Birthdays" value={reactivation?.audience_preview?.birthdays || 0} hint="Customers with birthdays inside the reminder window." />
                            <StatCard icon={Activity} label="Old leads" value={reactivation?.audience_preview?.dormant_leads || 0} hint="Leads ready for a fresh follow-up." />
                            <StatCard icon={Crown} label="Plan" value={reactivation?.plan?.toUpperCase() || 'ENTERPRISE'} hint="Database reactivation is available." />
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]">
                            <div className="space-y-6">
                                <Surface className="rounded-3xl">
                                    <SectionHeader
                                        title="Automatic campaigns"
                                        subtitle="These stay on in the background. Your team should only need to review them and run a manual test when needed."
                                    />
                                    <div className="space-y-4">
                                        {automaticCampaigns.length ? automaticCampaigns.map((campaign) => (
                                            <CampaignCard
                                                key={campaign.id}
                                                campaign={campaign}
                                                onToggle={toggleCampaign}
                                                onRun={runCampaign}
                                                runningCampaignId={runningCampaignId}
                                            />
                                        )) : <EmptyCard text="No automatic campaigns are available yet." />}
                                    </div>
                                </Surface>

                                <Surface className="rounded-3xl">
                                    <SectionHeader
                                        title="Manual campaign"
                                        subtitle="Use this only for one-off pushes. The advanced builder stays collapsed until the user chooses to open it."
                                    />

                                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                                        <div className="space-y-4">
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <label className="space-y-2">
                                                    <span className="text-sm font-medium text-white/66">Campaign name</span>
                                                    <input
                                                        value={form.name}
                                                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                                        className="w-full rounded-2xl border border-white/10 bg-[#0D1526] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A84C]/35"
                                                    />
                                                </label>

                                                <label className="space-y-2">
                                                    <span className="text-sm font-medium text-white/66">Audience</span>
                                                    <select
                                                        value={form.audience_type}
                                                        onChange={(event) => setForm((current) => ({ ...current, audience_type: event.target.value }))}
                                                        className="w-full rounded-2xl border border-white/10 bg-[#0D1526] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A84C]/35"
                                                    >
                                                        {AUDIENCE_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                </label>
                                            </div>

                                            <CollapsibleSection
                                                title="Message and delivery options"
                                                subtitle="Channel, schedule, subject, and message template."
                                                defaultOpen
                                            >
                                                <form onSubmit={handleCreateCampaign} className="space-y-4">
                                                    <div className="grid gap-4 md:grid-cols-2">
                                                        <label className="space-y-2">
                                                            <span className="text-sm font-medium text-white/66">Channel</span>
                                                            <select
                                                                value={form.channel}
                                                                onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}
                                                                className="w-full rounded-2xl border border-white/10 bg-[#0D1526] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A84C]/35"
                                                            >
                                                                {CHANNEL_OPTIONS.map((option) => (
                                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                                ))}
                                                            </select>
                                                        </label>

                                                        <label className="space-y-2">
                                                            <span className="text-sm font-medium text-white/66">Schedule</span>
                                                            <select
                                                                value={form.schedule_type}
                                                                onChange={(event) => setForm((current) => ({ ...current, schedule_type: event.target.value }))}
                                                                className="w-full rounded-2xl border border-white/10 bg-[#0D1526] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A84C]/35"
                                                            >
                                                                {SCHEDULE_OPTIONS.map((option) => (
                                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                                ))}
                                                            </select>
                                                        </label>
                                                    </div>

                                                    {form.channel === 'email' ? (
                                                        <label className="space-y-2">
                                                            <span className="text-sm font-medium text-white/66">Email subject</span>
                                                            <input
                                                                value={form.template_subject}
                                                                onChange={(event) => setForm((current) => ({ ...current, template_subject: event.target.value }))}
                                                                className="w-full rounded-2xl border border-white/10 bg-[#0D1526] px-4 py-3 text-sm text-white outline-none transition focus:border-[#C9A84C]/35"
                                                            />
                                                        </label>
                                                    ) : null}

                                                    <label className="space-y-2">
                                                        <span className="text-sm font-medium text-white/66">Message</span>
                                                        <textarea
                                                            rows={6}
                                                            value={form.template_body}
                                                            onChange={(event) => setForm((current) => ({ ...current, template_body: event.target.value }))}
                                                            className="w-full rounded-2xl border border-white/10 bg-[#0D1526] px-4 py-4 text-sm leading-7 text-white outline-none transition focus:border-[#C9A84C]/35"
                                                        />
                                                    </label>

                                                    <div className="rounded-2xl bg-[#0D1526] p-4">
                                                        <p className="text-sm leading-7 text-white/58">
                                                            Personalisation tokens: <span className="text-[#C9A84C]">{'{{firstName}}'}</span>, <span className="text-[#C9A84C]">{'{{vehicleInterest}}'}</span>, <span className="text-[#C9A84C]">{'{{dealershipName}}'}</span>, <span className="text-[#C9A84C]">{'{{dueDate}}'}</span>.
                                                        </p>
                                                        <button
                                                            type="submit"
                                                            disabled={submitting}
                                                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-5 py-3 text-sm font-semibold text-[#0A0F1E] transition hover:opacity-90 disabled:opacity-60"
                                                        >
                                                            <Send size={15} />
                                                            {submitting ? 'Creating campaign...' : 'Create campaign'}
                                                        </button>
                                                    </div>
                                                </form>
                                            </CollapsibleSection>
                                        </div>

                                        <AudiencePreview
                                            preview={preview}
                                            previewLoading={previewLoading}
                                            audienceType={form.audience_type}
                                        />
                                    </div>
                                </Surface>

                                <Surface className="rounded-3xl">
                                    <SectionHeader
                                        title="Saved manual campaigns"
                                        subtitle="Keep the finished campaigns here so the user sees one clean library instead of another dashboard."
                                    />
                                    <div className="space-y-4">
                                        {manualCampaigns.length ? manualCampaigns.map((campaign) => (
                                            <CampaignCard
                                                key={campaign.id}
                                                campaign={campaign}
                                                onToggle={toggleCampaign}
                                                onRun={runCampaign}
                                                runningCampaignId={runningCampaignId}
                                            />
                                        )) : <EmptyCard text="No manual campaigns yet. Create one above when you are ready." />}
                                    </div>
                                </Surface>
                            </div>

                            <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
                                <Surface className="rounded-3xl">
                                    <SectionHeader title="Simple workflow" subtitle="This side panel is now just a quick guide." />
                                    <ol className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-[#C9A84C]">
                                        {[
                                            'Check the audience counts first.',
                                            'Leave the automatic campaigns running unless there is a reason to pause them.',
                                            'Use a manual campaign only for one-off pushes or event invites.',
                                        ].map((item) => (
                                            <li key={item} className="pl-1 text-sm leading-7 text-white/72">
                                                {item}
                                            </li>
                                        ))}
                                    </ol>
                                </Surface>

                                <Surface className="rounded-3xl">
                                    <SectionHeader title="Recent activity" subtitle="Latest campaign runs for this dealership." />
                                    <div className="space-y-3">
                                        {(reactivation?.recent_runs || []).length === 0 ? (
                                            <EmptyCard text="No campaigns have been run yet. Use “Run now” on a campaign to create your first live test." />
                                        ) : (
                                            reactivation.recent_runs.map((run) => (
                                                <div key={run.id} className="border-t border-white/8 py-4 first:border-t-0 first:pt-0">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-white">Campaign #{run.campaign_id}</p>
                                                            <p className="mt-1 text-sm text-white/58">{run.trigger_source}</p>
                                                        </div>
                                                        <p className="text-sm text-white/58">{new Date(run.created_at).toLocaleString()}</p>
                                                    </div>

                                                    <div className="mt-4 grid grid-cols-3 gap-3">
                                                        <div className="rounded-2xl bg-white/4 p-3 text-center">
                                                            <p className="text-xs text-white/58">Audience</p>
                                                            <p className="mt-2 text-lg font-black text-white">{run.audience_count}</p>
                                                        </div>
                                                        <div className="rounded-2xl bg-green-500/10 p-3 text-center">
                                                            <p className="text-xs text-green-300/75">Delivered</p>
                                                            <p className="mt-2 text-lg font-black text-green-300">{run.delivered_count}</p>
                                                        </div>
                                                        <div className="rounded-2xl bg-red-500/10 p-3 text-center">
                                                            <p className="text-xs text-red-300/75">Failed / skipped</p>
                                                            <p className="mt-2 text-lg font-black text-red-300">{(run.failed_count || 0) + (run.skipped_count || 0)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Surface>
                            </div>
                        </div>
                    </>
                )
            ) : null}

            {view === 'sequences' ? (
                <Surface className="rounded-3xl">
                    <SectionHeader
                        title="Sequences"
                        subtitle="These are your broader nurture flows. They stay separate from database reactivation so the page remains easier to use."
                    />

                    {loading ? (
                        <p className="text-sm text-white/58">Loading sequences...</p>
                    ) : (
                        <div className="space-y-4">
                            {sequences.map((sequence) => (
                                <div key={sequence.id} className={`overflow-hidden rounded-2xl border ${sequence.active ? 'border-[#C9A84C]/25 bg-[#121A2B]' : 'border-white/10 bg-[#121A2B]/70'}`}>
                                    <div className="flex cursor-pointer items-center justify-between p-5" onClick={() => setExpandedSeq(expandedSeq === sequence.id ? null : sequence.id)}>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    toggleSequence(sequence.id, sequence.active);
                                                }}
                                                className={sequence.active ? 'text-green-400' : 'text-white/58'}
                                            >
                                                {sequence.active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                            </button>
                                            <div>
                                                <h3 className="font-outfit text-xl font-black text-white">{sequence.name}</h3>
                                                <p className="mt-1 text-sm text-white/58">Trigger: {sequence.trigger_type}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-white/58">
                                            <p className="text-sm">{sequence.steps?.length || 0} steps</p>
                                            {expandedSeq === sequence.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </div>

                                    {expandedSeq === sequence.id ? (
                                        <div className="border-t border-white/8 bg-[#0D1526] p-5">
                                            <div className="space-y-4">
                                                {sequence.steps?.map((step, index) => (
                                                    <div key={index} className="flex gap-4">
                                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/8 text-sm font-semibold text-white">
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-white/70">
                                                                {step.day < 0 ? `Day ${step.day} before trigger` : `Day ${step.day}`}
                                                            </p>
                                                            <p className="mt-1 text-sm leading-7 text-white/66">{step.message}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </Surface>
            ) : null}

            {view === 'loyalty' && loyaltyData ? (
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <StatCard icon={Heart} label="Net promoter score" value={loyaltyData.nps_data?.average_score} hint="Average customer sentiment after delivery." />
                        <StatCard icon={Crown} label="Loyalty tiers" value={loyaltyData.loyalty_tiers?.length || 0} hint="Tier structures available to the team." />
                        <StatCard icon={Gift} label="Points actions" value={loyaltyData.loyalty_points_awards?.length || 0} hint="Reward actions configured in the system." />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <Surface className="rounded-3xl">
                            <SectionHeader title="Recent feedback" subtitle="Latest customer sentiment recorded in the system." />
                            <div className="space-y-3">
                                {loyaltyData.nps_data?.scores.map((score, index) => (
                                    <div key={index} className="flex items-center justify-between rounded-2xl bg-[#0D1526] p-4">
                                        <div>
                                            <p className="text-sm font-semibold text-white">{score.customer}</p>
                                            <p className="mt-1 text-sm text-white/58">{score.comment}</p>
                                        </div>
                                        <div className={`text-xl font-black ${score.score >= 9 ? 'text-green-400' : score.score >= 7 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {score.score}/10
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Surface>

                        <Surface className="rounded-3xl">
                            <SectionHeader title="Tier benefits" subtitle="A simpler view of loyalty benefits by tier." />
                            <div className="grid gap-3 md:grid-cols-2">
                                {loyaltyData.loyalty_tiers?.map((tier, index) => (
                                    <div key={index} className="rounded-2xl bg-[#0D1526] p-4">
                                        <div className="flex items-end justify-between gap-3">
                                            <p className="text-lg font-black text-white">{tier.tier}</p>
                                            <p className="text-sm text-white/58">{tier.threshold}</p>
                                        </div>
                                        <p className="mt-2 text-sm leading-7 text-white/66">{tier.benefits}</p>
                                    </div>
                                ))}
                            </div>
                        </Surface>
                    </div>
                </div>
            ) : null}
        </PageShell>
    );
}
