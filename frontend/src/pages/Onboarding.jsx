import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { MessageCircle, Car, Code, Users, CheckCircle, ChevronRight, Download, Upload, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const steps = [
    { id: 1, title: 'Connect WhatsApp', icon: MessageCircle },
    { id: 2, title: 'Add Inventory', icon: Car },
    { id: 3, title: 'Embed Widget', icon: Code },
    { id: 4, title: 'Add Team', icon: Users },
    { id: 5, title: 'Go Live', icon: CheckCircle },
];

const Onboarding = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [showConfetti, setShowConfetti] = useState(false);

    // Form states
    const [waKey, setWaKey] = useState('');
    const [waNumber, setWaNumber] = useState('');

    const handleNext = () => {
        if (currentStep < 5) {
            setCurrentStep(s => s + 1);
        }
    };

    const handleFinish = () => {
        setShowConfetti(true);
        setTimeout(() => {
            navigate('/dashboard');
        }, 4000); // 4 seconds of confetti before redirect
    };

    const currentStepData = steps.find(s => s.id === currentStep);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#080C17]"
            style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(201,168,76,0.05) 0%, transparent 70%)' }}>

            {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} colors={['#C9A84C', '#FFFFFF', '#0A0F1E']} />}

            <div className="w-full max-w-4xl bg-[#0B1120] rounded-3xl shadow-2xl border border-white/5 overflow-hidden flex flex-col md:flex-row min-h-[600px]">

                {/* Left Sidebar (Progress) */}
                <div className="w-full md:w-1/3 bg-[#111A30] p-8 border-r border-white/5 flex flex-col">
                    <div className="mb-12">
                        <h2 className="font-outfit font-black text-2xl text-white">Welcome,<br /><span className="text-[#C9A84C]">{user?.first_name || 'Dealer'}</span></h2>
                        <p className="text-white/40 text-sm mt-2">Let's set up your KenganAuto OS in just a few steps.</p>
                    </div>

                    <div className="flex-1 space-y-6">
                        {steps.map(step => (
                            <div key={step.id} className={`flex items-center gap-4 transition-opacity ${step.id > currentStep ? 'opacity-30' : 'opacity-100'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                  ${step.id === currentStep ? 'border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10' :
                                        step.id < currentStep ? 'border-emerald-400 text-emerald-400 bg-emerald-400/10' : 'border-white/10 text-white/50 bg-white/5'}`}>
                                    {step.id < currentStep ? <CheckCircle size={18} /> : <step.icon size={18} />}
                                </div>
                                <div>
                                    <p className={`text-sm font-bold uppercase tracking-wider ${step.id === currentStep ? 'text-white' : 'text-white/50'}`}>
                                        Step {step.id}
                                    </p>
                                    <p className={`text-xs ${step.id === currentStep ? 'text-[#C9A84C]' : 'text-white/30'}`}>
                                        {step.title}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="w-full md:w-2/3 p-8 md:p-12 relative flex flex-col overflow-y-auto hidden-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex-1 flex flex-col justify-center"
                        >

                            {/* STEP 1: Connect WhatsApp */}
                            {currentStep === 1 && (
                                <div className="space-y-6">
                                    <h3 className="font-outfit font-black text-3xl text-white">Connect WhatsApp</h3>
                                    <p className="text-white/50">Link your 360dialog account to capture leads automatically.</p>

                                    <div className="space-y-4 pt-4">
                                        <div>
                                            <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">360dialog API Key</label>
                                            <input type="password" placeholder="D3BXXXXXXXXXXXXXXXX" value={waKey} onChange={e => setWaKey(e.target.value)}
                                                className="w-full bg-[#080C17] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C9A84C] transition-colors" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">WhatsApp Number</label>
                                            <input type="text" placeholder="+27 82 000 0000" value={waNumber} onChange={e => setWaNumber(e.target.value)}
                                                className="w-full bg-[#080C17] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C9A84C] transition-colors" />
                                        </div>
                                        <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold transition-colors">
                                            Test Connection
                                        </button>
                                        <p className="text-center text-xs text-[#C9A84C] cursor-pointer hover:underline flex items-center justify-center gap-1">
                                            <ExternalLink size={12} /> Watch Video Tutorial
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Add Inventory */}
                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    <h3 className="font-outfit font-black text-3xl text-white">Add Your Inventory</h3>
                                    <p className="text-white/50">Upload your vehicles so the AI can start quoting customers.</p>

                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                        <div className="bg-[#111A30] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:bg-white/5 transition-colors group">
                                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-[#C9A84C] group-hover:bg-[#C9A84C] group-hover:text-[#0A0F1E] transition-all">
                                                <Upload size={24} />
                                            </div>
                                            <h4 className="font-bold text-white">Bulk CSV Upload</h4>
                                            <p className="text-xs text-white/40">Upload a spreadsheet</p>
                                        </div>
                                        <div className="bg-[#111A30] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:bg-white/5 transition-colors group">
                                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white group-hover:bg-white group-hover:text-[#0A0F1E] transition-all">
                                                <Car size={24} />
                                            </div>
                                            <h4 className="font-bold text-white">Add Manually</h4>
                                            <p className="text-xs text-white/40">Enter one by one</p>
                                        </div>
                                    </div>
                                    <button className="w-full py-3 mt-4 rounded-xl border border-white/5 flex items-center justify-center gap-2 text-white/50 hover:text-white hover:bg-white/5 transition-colors">
                                        <Download size={16} /> Download CSV Template
                                    </button>
                                </div>
                            )}

                            {/* STEP 3: Embed Widget */}
                            {currentStep === 3 && (
                                <div className="space-y-6">
                                    <h3 className="font-outfit font-black text-3xl text-white">Embed Web Widget</h3>
                                    <p className="text-white/50">Paste this line of code before the closing <code className="text-[#C9A84C]">&lt;/body&gt;</code> tag of your website (WordPress, Wix, etc).</p>

                                    <div className="bg-[#080C17] border border-white/10 rounded-xl p-4 relative font-mono text-sm text-white/70 overflow-x-auto">
                                        &lt;script src="https://kenganauto.co.za/api/widget.js?tenant={user?.tenant_id || 'demo'}" defer&gt;&lt;/script&gt;
                                        <button className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-xs font-bold text-white transition-colors"
                                            onClick={() => navigator.clipboard.writeText(`<script src="https://kenganauto.co.za/api/widget.js?tenant=${user?.tenant_id || 'demo'}" defer></script>`)}>
                                            Copy
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-widest text-white/30">Integration Guides</p>
                                        <div className="flex gap-2">
                                            <span className="px-3 py-1 rounded bg-white/5 text-xs text-white/60 hover:text-white cursor-pointer transition-colors">WordPress</span>
                                            <span className="px-3 py-1 rounded bg-white/5 text-xs text-white/60 hover:text-white cursor-pointer transition-colors">Wix</span>
                                            <span className="px-3 py-1 rounded bg-white/5 text-xs text-white/60 hover:text-white cursor-pointer transition-colors">Squarespace</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Add Team */}
                            {currentStep === 4 && (
                                <div className="space-y-6">
                                    <h3 className="font-outfit font-black text-3xl text-white">Add Your Team</h3>
                                    <p className="text-white/50">Invite colleagues to help manage leads and vehicle stock.</p>

                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <input type="email" placeholder="Email Address"
                                                className="flex-1 bg-[#080C17] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C9A84C]" />
                                            <select className="bg-[#080C17] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#C9A84C]">
                                                <option value="salesperson">Salesperson</option>
                                                <option value="finance_manager">Finance Manager</option>
                                                <option value="service_advisor">Service Advisor</option>
                                            </select>
                                        </div>
                                        <button className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors">
                                            + Invite Member
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 5: Go Live */}
                            {currentStep === 5 && (
                                <div className="space-y-6 text-center">
                                    <div className="w-24 h-24 mx-auto bg-emerald-400/10 text-emerald-400 rounded-full flex items-center justify-center">
                                        <CheckCircle size={48} />
                                    </div>
                                    <h3 className="font-outfit font-black text-4xl text-white">You're Ready!</h3>
                                    <p className="text-white/50">Your dealership is now powered by KenganAuto OS.</p>

                                    <div className="bg-[#111A30] border border-white/5 rounded-2xl p-6 text-left space-y-3 mt-6">
                                        <p className="text-xs font-bold tracking-widest uppercase text-white/30 mb-4">Launch Checklist</p>
                                        <div className="flex items-center gap-3 text-white/70">
                                            <CheckCircle size={16} className="text-emerald-400" /> WhatsApp API Active
                                        </div>
                                        <div className="flex items-center gap-3 text-white/70">
                                            <CheckCircle size={16} className="text-emerald-400" /> Inventory Populated
                                        </div>
                                        <div className="flex items-center gap-3 text-white/70">
                                            <CheckCircle size={16} className="text-emerald-400" /> Widget Copied
                                        </div>
                                    </div>
                                </div>
                            )}

                        </motion.div>
                    </AnimatePresence>

                    {/* Footer Controls */}
                    <div className="mt-auto pt-8 flex items-center justify-between border-t border-white/5">
                        {currentStep > 1 && currentStep < 5 ? (
                            <button onClick={() => setCurrentStep(s => s - 1)} className="px-6 py-2 rounded-xl text-white/50 hover:text-white transition-colors">
                                Back
                            </button>
                        ) : <div />}

                        {currentStep < 5 ? (
                            <div className="flex items-center gap-4">
                                <button onClick={handleNext} className="text-sm font-bold text-white/40 hover:text-white transition-colors">Skip for now</button>
                                <button onClick={handleNext} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C9A84C] text-[#0A0F1E] font-bold shadow-lg hover:opacity-90 transition-opacity">
                                    Next Step <ChevronRight size={18} />
                                </button>
                            </div>
                        ) : (
                            <button onClick={handleFinish} className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-emerald-400 text-[#0A0F1E] font-black shadow-lg hover:opacity-90 transition-opacity whitespace-nowrap text-lg uppercase tracking-wider">
                                Launch Dealership <RocketIcon />
                            </button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

const RocketIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
)

export default Onboarding;
