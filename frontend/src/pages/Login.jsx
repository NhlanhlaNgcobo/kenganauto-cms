import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getSubdomain } from '../utils/tenant';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const subdomain = getSubdomain();
    const from = location.state?.from?.pathname || '/dashboard';

    // Show session-expired message if redirected from idle timeout
    useEffect(() => {
        const reason = new URLSearchParams(location.search).get('reason');
        if (reason === 'idle') setError('Your session expired due to 8 hours of inactivity.');
        if (reason === 'expired') setError('Your session expired. Please log in again.');
    }, [location.search]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const loginSubdomain = window.localSubdomain || subdomain;
        const result = await login(email, password, loginSubdomain);
        setIsLoading(false);

        if (result.success) {
            navigate(from, { replace: true });
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="min-h-screen flex" style={{ background: '#060A14' }}>

            {/* ── Left Brand Panel ── */}
            <div className="hidden lg:flex flex-col justify-between w-1/2 p-14 relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, #060A14 0%, #0D1526 60%, #111E35 100%)',
                    borderRight: '1px solid rgba(201,168,76,0.1)',
                }}>

                <div className="absolute top-0 left-0 w-96 h-96 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)', transform: 'translate(-30%,-30%)' }} />
                <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(59,127,245,0.07) 0%, transparent 70%)', transform: 'translate(30%,30%)' }} />

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center font-outfit font-black text-sm"
                        style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.07))', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>
                        KA
                    </div>
                    <div>
                        <h1 className="font-outfit font-black text-xl tracking-tight">
                            <span className="text-white">KENGAN</span><span className="gold-text">AUTO</span>
                        </h1>
                        <p className="text-[9px] tracking-[0.25em] uppercase" style={{ color: 'rgba(201,168,76,0.4)' }}>Automotive Intelligence OS</p>
                    </div>
                </div>

                {/* Hero */}
                <div className="relative z-10 space-y-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: 'rgba(201,168,76,0.5)' }}>
                        Built for South African Dealerships
                    </p>
                    <h2 className="font-outfit font-black text-5xl leading-tight text-white">
                        The Future of<br />
                        <span className="gold-text">Automotive</span><br />
                        Commerce.
                    </h2>
                    <p className="text-base leading-relaxed max-w-sm" style={{ color: 'rgba(240,237,232,0.45)' }}>
                        AI-driven lead management, real-time finance proposals, and predictive stock intelligence — all in one platform.
                    </p>
                </div>

                {/* Feature grid */}
                <div className="relative z-10 grid grid-cols-2 gap-4">
                    {[
                        ['10 Modules', 'End-to-end CRM'],
                        ['POPIA Compliant', 'Data protected'],
                        ['Live AI Chat', 'WhatsApp + Web'],
                        ['ZAR Finance Calc', 'SA Banks integrated'],
                    ].map(([title, sub], i) => (
                        <div key={i} className="p-4 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.1)' }}>
                            <p className="text-sm font-bold text-white mb-0.5">{title}</p>
                            <p className="text-[11px]" style={{ color: 'rgba(240,237,232,0.35)' }}>{sub}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right Login Panel ── */}
            <div className="flex-1 flex items-center justify-center p-8 relative"
                style={{ background: 'linear-gradient(160deg, #0A0F1E 0%, #060A14 100%)' }}>

                <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(59,127,245,0.06) 0%, transparent 70%)' }} />

                <div className="w-full max-w-md anim-fade-up">
                    <div className="rounded-3xl p-10"
                        style={{
                            background: 'linear-gradient(135deg, rgba(17,30,53,0.8) 0%, rgba(10,15,30,0.9) 100%)',
                            border: '1px solid rgba(201,168,76,0.15)',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
                            backdropFilter: 'blur(20px)',
                        }}>

                        <div className="mb-8">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: 'rgba(201,168,76,0.5)' }}>
                                Dealer Portal
                            </p>
                            <h2 className="font-outfit font-black text-3xl text-white">Welcome back.</h2>
                            <p className="text-sm mt-2 font-medium" style={{ color: 'rgba(240,237,232,0.4)' }}>
                                Sign in to access your dealership OS.
                            </p>

                            {/* Subdomain context / override */}
                            <div className="mt-4">
                                {(!subdomain || subdomain === 'local-dealership') ? (
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] block" style={{ color: 'rgba(201,168,76,0.3)' }}>
                                            Development Subdomain
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                defaultValue={subdomain || 'local-dealership'}
                                                onChange={(e) => window.localSubdomain = e.target.value}
                                                className="lux-input py-2 text-xs"
                                                placeholder="e.g. sunshine-motors"
                                            />
                                            <span className="text-[10px] font-bold opacity-30">.kenganauto.co.za</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                                        style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
                                        🏢 {subdomain} Endpoint Active
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Error Banner */}
                        {error && (
                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6 text-sm font-medium"
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
                                <AlertCircle size={16} className="flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] block" style={{ color: 'rgba(240,237,232,0.4)' }}>
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2" size={16} style={{ color: 'rgba(201,168,76,0.4)' }} />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                        placeholder="name@dealership.co.za" className="lux-input pl-11" required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] block" style={{ color: 'rgba(240,237,232,0.4)' }}>
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2" size={16} style={{ color: 'rgba(201,168,76,0.4)' }} />
                                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••••••" className="lux-input pl-11 pr-12" required />
                                    <button type="button" onClick={() => setShowPass(p => !p)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2"
                                        style={{ color: 'rgba(240,237,232,0.25)' }}>
                                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="text-right">
                                <Link to="/forgot-password"
                                    className="text-[11px] font-bold transition-colors"
                                    style={{ color: 'rgba(201,168,76,0.5)' }}>
                                    Forgot Password?
                                </Link>
                            </div>

                            <button type="submit"
                                disabled={isLoading}
                                className="w-full py-4 font-outfit font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 rounded-2xl transition-all group disabled:opacity-60"
                                style={{
                                    background: 'linear-gradient(135deg, #C9A84C 0%, #9A7830 100%)',
                                    color: '#0A0F1E',
                                    boxShadow: '0 8px 32px rgba(201,168,76,0.25)',
                                }}>
                                {isLoading ? 'Signing in…' : (
                                    <>Enter Dashboard <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 flex items-center justify-between"
                            style={{ borderTop: '1px solid rgba(201,168,76,0.08)' }}>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(201,168,76,0.4)' }}>
                                <ShieldCheck size={13} style={{ color: '#C9A84C' }} />
                                POPIA Secure · Session: 8h
                            </div>
                            <Link to="/register"
                                className="text-[11px] font-bold transition-colors"
                                style={{ color: 'rgba(201,168,76,0.5)' }}>
                                New Dealership →
                            </Link>
                        </div>
                    </div>

                    <p className="text-center mt-6 text-[11px]" style={{ color: 'rgba(240,237,232,0.2)' }}>
                        © 2026 KenganAuto · Automotive Intelligence OS
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
