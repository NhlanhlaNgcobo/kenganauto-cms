import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const token = params.get('token');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        if (password !== confirm) { setError('Passwords do not match.'); return; }
        if (!token) { setError('Invalid reset link.'); return; }

        setIsLoading(true);
        try {
            const res = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/reset-password`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, new_password: password }),
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setDone(true);
        } catch (err) {
            setError(err.message || 'Reset failed. The link may have expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#060A14' }}>
            <div className="w-full max-w-md anim-fade-up">
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
                    }}>

                    {!done ? (
                        <>
                            <div className="mb-8">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: 'rgba(201,168,76,0.5)' }}>
                                    Reset Password
                                </p>
                                <h2 className="font-outfit font-black text-2xl text-white">Set new password</h2>
                                <p className="text-sm mt-2" style={{ color: 'rgba(240,237,232,0.4)' }}>Must be at least 8 characters.</p>
                            </div>

                            {error && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6 text-sm"
                                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
                                    <AlertCircle size={16} />{error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] block" style={{ color: 'rgba(240,237,232,0.4)' }}>New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2" size={16} style={{ color: 'rgba(201,168,76,0.4)' }} />
                                        <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                                            placeholder="Min 8 characters" className="lux-input pl-11 pr-12" />
                                        <button type="button" onClick={() => setShowPass(p => !p)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(240,237,232,0.25)' }}>
                                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] block" style={{ color: 'rgba(240,237,232,0.4)' }}>Confirm Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2" size={16} style={{ color: 'rgba(201,168,76,0.4)' }} />
                                        <input type={showPass ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                                            placeholder="Repeat password" className="lux-input pl-11" />
                                    </div>
                                </div>
                                <button type="submit" disabled={isLoading}
                                    className="w-full py-4 font-outfit font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 rounded-2xl transition-all disabled:opacity-60"
                                    style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #9A7830 100%)', color: '#0A0F1E', boxShadow: '0 8px 32px rgba(201,168,76,0.25)' }}>
                                    {isLoading ? 'Updating…' : (<>Update Password <ArrowRight size={17} /></>)}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center space-y-6">
                            <div className="h-16 w-16 mx-auto rounded-2xl flex items-center justify-center"
                                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)' }}>
                                <CheckCircle2 size={28} style={{ color: '#4ADE80' }} />
                            </div>
                            <div>
                                <h2 className="font-outfit font-black text-2xl text-white mb-2">Password updated!</h2>
                                <p className="text-sm" style={{ color: 'rgba(240,237,232,0.4)' }}>You can now sign in with your new password.</p>
                            </div>
                            <button onClick={() => navigate('/login')}
                                className="w-full py-4 font-outfit font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 rounded-2xl"
                                style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #9A7830 100%)', color: '#0A0F1E' }}>
                                Go to Login <ArrowRight size={17} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
