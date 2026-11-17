import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Magnetic } from '../components/motion';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) { setError('Email is required.'); return; }
        setError('');
        setIsLoading(true);

        try {
            await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/forgot-password`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                }
            );
            setSent(true);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#060A14' }}>
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(201,168,76,0.05), transparent)' }} />

            <div className="w-full max-w-md anim-fade-up">
                {/* Brand */}
                <div className="flex items-center gap-3 mb-8 justify-center">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center font-outfit font-black text-sm"
                        style={{ background: 'linear-gradient(135deg,rgba(201,168,76,0.2),rgba(201,168,76,0.07))', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>
                        KA
                    </div>
                    <h1 className="font-outfit font-black text-xl">
                        <span className="text-white">KENGAN</span><span className="gold-text">AUTO</span>
                    </h1>
                </div>

                <div className="rounded-3xl p-10"
                    style={{
                        background: 'linear-gradient(135deg, rgba(17,30,53,0.9) 0%, rgba(10,15,30,0.95) 100%)',
                        border: '1px solid rgba(201,168,76,0.15)',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(20px)',
                    }}>

                    {!sent ? (
                        <>
                            <div className="mb-8">
                                <h2 className="font-outfit font-black text-2xl text-white">Forgot your password?</h2>
                                <p className="text-sm mt-4" style={{ color: 'rgba(240,237,232,0.62)' }}>
                                    Enter your email and we'll send a reset link valid for 15 minutes.
                                </p>
                            </div>

                            {error && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6 text-sm font-medium"
                                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-[0.2em] block" style={{ color: 'rgba(240,237,232,0.62)' }}>
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2" size={16} style={{ color: 'rgba(201,168,76,0.8)' }} />
                                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                            placeholder="name@dealership.co.za" className="lux-input pl-11" required />
                                    </div>
                                </div>

                                <Magnetic strength={0.25} className="w-full">
                                    <button type="submit" disabled={isLoading}
                                        className="w-full py-4 font-outfit font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 rounded-2xl transition-all disabled:opacity-60"
                                        style={{
                                            background: 'linear-gradient(135deg, #C9A84C 0%, #9A7830 100%)',
                                            color: '#0A0F1E',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.35), 0 8px 20px rgba(0,0,0,0.3)',
                                        }}>
                                        {isLoading ? 'Sending…' : (<>Send Reset Link <ArrowRight size={17} /></>)}
                                    </button>
                                </Magnetic>
                            </form>
                        </>
                    ) : (
                        <div className="text-center space-y-6">
                            <div className="h-16 w-16 mx-auto rounded-2xl flex items-center justify-center"
                                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)' }}>
                                <CheckCircle2 size={28} style={{ color: '#4ADE80' }} />
                            </div>
                            <div>
                                <h2 className="font-outfit font-black text-2xl text-white mb-2">Check your inbox</h2>
                                <p className="text-sm" style={{ color: 'rgba(240,237,232,0.62)' }}>
                                    If <span className="font-bold text-white">{email}</span> is registered, a reset link has been sent. It expires in 15 minutes.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid rgba(201,168,76,0.08)' }}>
                        <Link to="/login"
                            className="inline-flex items-center gap-2 text-[12px] font-bold transition-colors"
                            style={{ color: 'rgba(201,168,76,0.8)' }}>
                            <ArrowLeft size={13} /> Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
