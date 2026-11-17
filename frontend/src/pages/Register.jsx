/**
 * 5-Step Dealership Onboarding Wizard
 *
 * Step 1 — Dealership details (name, address, province)
 * Step 2 — Admin user (name, email, password)
 * Step 3 — WhatsApp Business number
 * Step 4 — Plan selection (Starter / Growth / Enterprise)
 * Step 5 — Confirmation screen + setup checklist
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Building2, User, Phone, CreditCard, CheckCircle2,
    ArrowRight, ArrowLeft, Eye, EyeOff, Check, AlertCircle,
    MapPin, Mail, Lock, Zap, Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Magnetic } from '../components/motion';

/* ── Province list ── */
const SA_PROVINCES = [
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
    'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape',
];

/* ── Plans ── */
const PLANS = [
    {
        key: 'starter',
        label: 'Starter',
        price: 'R 5,500',
        sub: '/month',
        desc: 'Perfect for small dealerships up to 5 users.',
        features: ['Leads & Pipeline', 'Finance Calculator', 'AI Chatbot (500 conv/mo)', 'WhatsApp Integration'],
        color: '#60A5FA',
    },
    {
        key: 'growth',
        label: 'Growth',
        price: 'R 12,500',
        sub: '/month',
        desc: 'For growing dealerships with multiple departments.',
        features: ['Everything in Starter', 'Service & Parts Modules', 'Trade-In Valuations', 'CRM Analytics Dashboard', 'Unlimited AI conversations'],
        color: '#C9A84C',
        popular: true,
    },
    {
        key: 'enterprise',
        label: 'Enterprise',
        price: 'R 22,000',
        sub: '/month',
        desc: 'Multi-branch, unlimited users, white-labelled.',
        features: ['Everything in Growth', 'Multi-branch Support', 'White-label Branding', 'Dedicated Account Manager', 'Custom AI Training', 'SLA 99.9% Uptime'],
        color: '#A78BFA',
    },
];

/* ── Step indicator ── */
const steps = [
    { icon: Building2, label: 'Dealership' },
    { icon: User, label: 'Admin' },
    { icon: Phone, label: 'WhatsApp' },
    { icon: CreditCard, label: 'Plan' },
    { icon: CheckCircle2, label: 'Done' },
];

/* ── Helper: field wrapper ── */
const Field = ({ label, children }) => (
    <div className="space-y-2">
        <label className="text-[11px] font-black uppercase tracking-[0.2em] block" style={{ color: 'rgba(240,237,232,0.62)' }}>
            {label}
        </label>
        {children}
    </div>
);

/* ══════════════════════════════ */
const Register = () => {
    const [step, setStep] = useState(1);
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        dealership_name: '', address: '', province: '',
        admin_first_name: '', admin_last_name: '', admin_email: '', admin_password: '',
        whatsapp_number: '',
        plan: 'growth',
    });

    const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

    /* ── Validation per step ── */
    const validate = () => {
        setError('');
        if (step === 1) {
            if (!form.dealership_name.trim()) return 'Dealership name is required.';
            if (!form.province) return 'Province is required.';
        }
        if (step === 2) {
            if (!form.admin_first_name.trim()) return 'First name is required.';
            if (!form.admin_last_name.trim()) return 'Last name is required.';
            if (!form.admin_email.trim()) return 'Email is required.';
            if (!/\S+@\S+\.\S+/.test(form.admin_email)) return 'Enter a valid email.';
            if (form.admin_password.length < 8) return 'Password must be at least 8 characters.';
        }
        if (step === 3) {
            if (!form.whatsapp_number.trim()) return 'WhatsApp number is required.';
        }
        return null;
    };

    const next = () => {
        const err = validate();
        if (err) { setError(err); return; }
        setError('');
        setStep(s => s + 1);
    };

    const back = () => { setError(''); setStep(s => s - 1); };

    const submit = async () => {
        setIsLoading(true);
        setError('');
        const res = await register(form);
        setIsLoading(false);
        if (res.success) {
            setResult(res);
            setStep(5);
        } else {
            setError(res.error);
        }
    };

    /* ──────────────── RENDER ──────────────── */
    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#060A14' }}>
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,127,245,0.08), transparent)' }} />

            <div className="w-full max-w-2xl relative z-10 anim-fade-up">

                {/* Brand */}
                <div className="flex items-center gap-2.5 mb-6 justify-center">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center font-outfit font-black text-[12px]"
                        style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.07))', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>
                        KA
                    </div>
                    <h1 className="font-outfit font-black text-lg tracking-tight">
                        <span className="text-white">KENGAN</span><span className="gold-text">AUTO</span>
                    </h1>
                </div>

                {/* Step Indicator */}
                {step < 5 && (
                    <div className="flex items-center justify-center gap-1.5 mb-6">
                        {steps.map((s, i) => {
                            const num = i + 1;
                            const past = num < step;
                            const active = num === step;
                            const Icon = s.icon;
                            return (
                                <React.Fragment key={i}>
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="h-8 w-8 rounded-lg flex items-center justify-center transition-all"
                                            style={{
                                                background: past ? 'rgba(74,222,128,0.1)'
                                                    : active ? 'rgba(201,168,76,0.1)'
                                                        : 'rgba(255,255,255,0.03)',
                                                border: past ? '1px solid rgba(74,222,128,0.2)'
                                                    : active ? '1px solid rgba(201,168,76,0.3)'
                                                        : '1px solid rgba(255,255,255,0.05)',
                                                color: past ? '#4ADE80'
                                                    : active ? '#C9A84C'
                                                        : 'rgba(240,237,232,0.55)',
                                            }}>
                                            {past ? <Check size={14} /> : <Icon size={14} />}
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-widest"
                                            style={{ color: active ? '#C9A84C' : 'rgba(240,237,232,0.62)' }}>
                                            {s.label}
                                        </span>
                                    </div>
                                    {i < steps.length - 1 && (
                                        <div className="h-[1px] flex-1 mb-4" style={{ background: num < step ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)' }} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}

                {/* Card */}
                <div className="rounded-[2.5rem] p-8 md:p-12"
                    style={{
                        background: 'linear-gradient(135deg, rgba(13,22,40,0.95) 0%, rgba(6,10,20,0.98) 100%)',
                        border: '1px solid rgba(201,168,76,0.1)',
                        boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.02) inset',
                        backdropFilter: 'blur(32px)',
                    }}>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-3 px-5 py-3.5 rounded-[10px] mb-8 text-xs font-bold uppercase tracking-wider"
                            style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', color: '#FCA5A5' }}>
                            <AlertCircle size={15} className="flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* ─── STEP 1 ─── */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="font-outfit font-black text-3xl text-white tracking-tight">Dealership Core <span className="ml-2 align-middle font-sans text-sm font-semibold tracking-normal text-white/58">Step 1 of 4</span></h2>
                                <p className="text-sm mt-2 opacity-70 leading-relaxed font-medium">Register your dealership group or single-branch outlet.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-6 pt-2">
                                <Field label="Dealership / Group Name">
                                    <div className="relative group">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[#C9A84C] transition-colors" size={16} style={{ color: 'rgba(201,168,76,0.8)' }} />
                                        <input type="text" className="lux-input pl-12" placeholder="Sunshine Motors"
                                            value={form.dealership_name} onChange={e => set('dealership_name', e.target.value)} />
                                    </div>
                                </Field>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Field label="Province">
                                        <select className="lux-input" value={form.province} onChange={e => set('province', e.target.value)}>
                                            <option value="" style={{ background: '#0D1526' }}>Location…</option>
                                            {SA_PROVINCES.map(p => <option key={p} value={p} style={{ background: '#0D1526' }}>{p}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Physical Address (optional)">
                                        <input type="text" className="lux-input" placeholder="e.g. 15 Rivonia Rd"
                                            value={form.address} onChange={e => set('address', e.target.value)} />
                                    </Field>
                                </div>
                            </div>
                            {form.dealership_name && (
                                <div className="px-5 py-4 rounded-[10px] text-[11px] uppercase font-black tracking-widest flex items-center gap-3"
                                    style={{ background: 'rgba(59,127,245,0.04)', border: '1px solid rgba(59,127,245,0.1)', color: 'rgba(240,237,232,0.62)' }}>
                                    <Globe size={14} className="text-[#60A5FA]" />
                                    Portal Endpoint: <span className="text-[#60A5FA]">
                                        {form.dealership_name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-').substring(0, 30)}.kenganauto.co.za
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── STEP 2 ─── */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="font-outfit font-black text-3xl text-white tracking-tight">Security & Admin <span className="ml-2 align-middle font-sans text-sm font-semibold tracking-normal text-white/58">Step 2 of 4</span></h2>
                                <p className="text-sm mt-2 opacity-70 leading-relaxed font-medium">Create your primary administrator credentials.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-6 pt-2">
                                <Field label="First Name">
                                    <input type="text" className="lux-input" placeholder="David"
                                        value={form.admin_first_name} onChange={e => set('admin_first_name', e.target.value)} />
                                </Field>
                                <Field label="Last Name">
                                    <input type="text" className="lux-input" placeholder="Motsepe"
                                        value={form.admin_last_name} onChange={e => set('admin_last_name', e.target.value)} />
                                </Field>
                            </div>
                            <Field label="Work Email Address">
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[#C9A84C] transition-colors" size={16} style={{ color: 'rgba(201,168,76,0.8)' }} />
                                    <input type="email" className="lux-input pl-12" placeholder="admin@dealership.co.za"
                                        value={form.admin_email} onChange={e => set('admin_email', e.target.value)} />
                                </div>
                            </Field>
                            <Field label="System Password">
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[#C9A84C] transition-colors" size={16} style={{ color: 'rgba(201,168,76,0.8)' }} />
                                    <input type={showPass ? 'text' : 'password'} className="lux-input pl-12 pr-12" placeholder="••••••••••••"
                                        value={form.admin_password} onChange={e => set('admin_password', e.target.value)} />
                                    <button type="button" onClick={() => setShowPass(p => !p)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(240,237,232,0.62)' }}>
                                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {form.admin_password && (
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mt-2">
                                        <div className="h-full transition-all duration-500"
                                            style={{
                                                width: `${Math.min(100, (form.admin_password.length / 12) * 100)}%`,
                                                background: form.admin_password.length < 8 ? '#EF4444' : form.admin_password.length < 10 ? '#F59E0B' : '#10B981'
                                            }} />
                                    </div>
                                )}
                            </Field>
                        </div>
                    )}

                    {/* ─── STEP 3 ─── */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="font-outfit font-black text-3xl text-white tracking-tight">AI Messaging <span className="ml-2 align-middle font-sans text-sm font-semibold tracking-normal text-white/58">Step 3 of 4</span></h2>
                                <p className="text-sm mt-2 opacity-70 leading-relaxed font-medium">Connect your WhatsApp Business number for automation.</p>
                            </div>
                            <Field label="WhatsApp Primary Number">
                                <div className="relative group pt-2">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-[#C9A84C] transition-colors" size={16} style={{ color: 'rgba(201,168,76,0.8)' }} />
                                    <input type="tel" className="lux-input pl-12" placeholder="+27 82 555 1234"
                                        value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} />
                                </div>
                            </Field>
                            <div className="bg-[#10B981]/5 border border-[#10B981]/15 rounded-[10px] p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-[#10B981]/10 rounded-xl">
                                        <Zap size={16} className="text-[#10B981]" />
                                    </div>
                                    <h4 className="font-bold text-white text-sm">Automation Capabilities</h4>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        'Instant AI replies to marketplace leads',
                                        'Automated service & collection reminders',
                                        'Finance application status pushes'
                                    ].map((f, i) => (
                                        <div key={i} className="flex items-center gap-2.5 text-xs font-medium opacity-60">
                                            <div className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            {f}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── STEP 4 ─── */}
                    {step === 4 && (
                        <div className="space-y-8">
                            <div>
                                <h2 className="font-outfit font-black text-3xl text-white tracking-tight">Select Framework <span className="ml-2 align-middle font-sans text-sm font-semibold tracking-normal text-white/58">Step 4 of 4</span></h2>
                                <p className="text-sm mt-2 opacity-70 leading-relaxed font-medium">Enterprise intelligence scaled to your branch volume.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-4 pt-2">
                                {PLANS.map(plan => (
                                    <button key={plan.key}
                                        onClick={() => set('plan', plan.key)}
                                        className="w-full text-left rounded-[10px] transition-all relative overflow-hidden group/plan"
                                        style={{
                                            background: form.plan === plan.key ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${form.plan === plan.key ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                            padding: '1.25rem 1.75rem',
                                        }}>

                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-outfit font-black text-xl text-white tracking-wide uppercase">{plan.label}</h3>
                                                    {plan.popular && (
                                                        <span className="text-[11px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg"
                                                            style={{ background: '#C9A84C', color: '#000' }}>
                                                            Bestseller
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] uppercase font-bold tracking-widest opacity-70">{plan.desc}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-outfit font-black text-xl tracking-tight" style={{ color: plan.color }}>{plan.price}</div>
                                                <div className="text-[11px] font-black uppercase tracking-widest opacity-70">Per Month</div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-white/5">
                                            {plan.features.slice(0, 4).map((f, i) => (
                                                <span key={i} className="text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: plan.color }}>
                                                    <Check size={10} /> {f}
                                                </span>
                                            ))}
                                        </div>

                                        {form.plan === plan.key && (
                                            <div className="absolute top-0 right-0 p-2">
                                                <CheckCircle2 size={16} className="text-[#C9A84C]" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Terms Agreement */}
                            <div className="pt-6 border-t border-white/5 space-y-4">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <div className="relative mt-0.5">
                                        <input type="checkbox" className="sr-only" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} />
                                        <div className={`h-5 w-5 rounded border transition-all flex items-center justify-center ${agreedToTerms ? 'bg-[#C9A84C] border-[#C9A84C]' : 'bg-white/5 border-white/10 group-hover:border-[#C9A84C]/50'}`}>
                                            {agreedToTerms && <Check size={14} className="text-[#0A0F1E] font-black" />}
                                        </div>
                                    </div>
                                    <span className="text-[12px] leading-relaxed opacity-70 group-hover:opacity-60 transition-opacity font-medium">
                                        I have read and agree to the <Link to="/legal/terms" target="_blank" className="text-[#C9A84C] underline hover:text-[#C9A84C] transition-colors font-black">Terms & Conditions</Link>, <Link to="/legal/privacy" target="_blank" className="text-[#C9A84C] underline hover:text-[#C9A84C] transition-colors font-black">Privacy Policy</Link>, and <Link to="/legal/popia" target="_blank" className="text-[#C9A84C] underline hover:text-[#C9A84C] transition-colors font-black">POPIA Compliance Notice</Link>.
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* ─── STEP 5 — Confirmation ─── */}
                    {step === 5 && (
                        <div className="text-center space-y-10 py-4">
                            <div className="h-24 w-24 mx-auto rounded-full flex items-center justify-center relative"
                                style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <CheckCircle2 size={42} className="text-[#10B981]" />
                                <div className="absolute inset-x-0 -bottom-3 flex justify-center">
                                    <div className="bg-[#10B981] text-[11px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full text-black">
                                        Active
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h2 className="font-outfit font-black text-4xl text-white tracking-tight">Ecosystem Live.</h2>
                                <p className="text-sm opacity-70 font-medium max-w-sm mx-auto leading-relaxed">Your dealership OS is provisioned and ready for deployment. Log in below.</p>
                            </div>

                            <div className="rounded-[2rem] p-8 text-left space-y-8"
                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(251,191,36,0.1)' }}>
                                <div className="space-y-1.5">
                                    <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-70">Deployment URL</p>
                                    <p className="font-outfit font-black text-xl text-[#C9A84C] tracking-wide">
                                        {result?.portal_url || `https://${form.dealership_name.toLowerCase().replace(/\s+/g, '-')}.kenganauto.co.za`}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-70">Provisioning Checklist</p>
                                    {[
                                        ['Core Instance Created', true],
                                        ['Admin VPC Account Linked', true],
                                        ['WhatsApp Trunk Provisioned', true],
                                        [`${form.plan.toUpperCase()} Stack Activated`, true],
                                        ['AI Training (Queued 24h)', false],
                                    ].map(([item, done], i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${done ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]' : 'border-white/10 opacity-20'}`}>
                                                {done ? <Check size={10} strokeWidth={4} /> : <div className="h-1 w-1 bg-white rounded-full" />}
                                            </div>
                                            <span className={`text-[11px] font-black uppercase tracking-widest ${done ? 'text-white' : 'opacity-20'}`}>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/dashboard')}
                                className="w-full py-5 font-outfit font-black text-sm tracking-[0.3em] uppercase flex items-center justify-center gap-3 rounded-[10px] group/btn"
                                style={{
                                    background: 'linear-gradient(135deg, #C9A84C 0%, #9A7830 100%)',
                                    color: '#0A0F1E',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.35), 0 8px 20px rgba(0,0,0,0.3)',
                                }}>
                                Launch Dashboard <ArrowRight size={18} className="group-hover/btn:translate-x-1.5 transition-transform" />
                            </button>
                        </div>
                    )}

                    {/* ─── Navigation Buttons ─── */}
                    {step < 5 && (
                        <div className="flex flex-col md:flex-row gap-4 mt-12">
                            {step > 1 && (
                                <button onClick={back}
                                    className="px-8 py-4 rounded-[10px] font-black text-[11px] uppercase tracking-[0.3em] transition-all flex items-center justify-center"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'white' }}>
                                    Back
                                </button>
                            )}
                            <Magnetic strength={0.22} className="flex-1">
                                <button
                                    onClick={step === 4 ? submit : next}
                                    disabled={isLoading || (step === 4 && !agreedToTerms)}
                                    className="w-full py-4.5 rounded-[10px] font-outfit font-black text-xs tracking-[0.4em] uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl h-14"
                                    style={{
                                        background: 'linear-gradient(135deg, #C9A84C 0%, #9A7830 100%)',
                                        color: '#0A0F1E',
                                    }}>
                                    {isLoading ? 'Deploying Core…' : step === 4 ? 'Create My Dealership' : 'Continue'}
                                    {!isLoading && <ArrowRight size={18} />}
                                </button>
                            </Magnetic>
                        </div>
                    )}
                </div>

                <div className="text-center mt-10">
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-70 mb-3">KenganAuto OS v1.2</p>
                    <Link to="/login" className="text-[11px] font-bold text-[#C9A84C]/80 hover:text-[#C9A84C] transition-colors uppercase tracking-[0.2em]">
                        Already registered? <span className="underline underline-offset-4">Sign in</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
