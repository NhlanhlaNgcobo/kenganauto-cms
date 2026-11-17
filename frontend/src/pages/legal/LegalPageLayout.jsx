import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const LegalPageLayout = ({ title, subtitle, badge, children }) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen pb-20" style={{ background: '#0A0F1E', color: '#F0EDE8' }}>
            {/* Header */}
            <header className="px-8 py-6 flex items-center justify-between sticky top-0 z-50"
                style={{ background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                        <ArrowLeft size={20} className="text-[#C9A84C]" />
                    </button>
                    <div>
                        <h1 className="font-outfit font-black text-lg text-white">{title}</h1>
                        <p className="text-xs font-medium text-white/62">{badge}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center font-outfit font-black text-[12px]"
                        style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
                        KA
                    </div>
                </div>
            </header>

            {/* Hero */}
            <div className="px-8 py-20 text-center relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0D1526 0%, #060A14 100%)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div className="absolute inset-x-0 top-0 h-40 pointer-events-none"
                    style={{ background: 'radial-gradient(circle at 50% 0%, rgba(201,168,76,0.06), transparent 70%)' }} />
                
                <div className="max-w-3xl mx-auto anim-fade-up">
                    <h1 className="font-outfit font-black text-4xl md:text-5xl text-white mb-6 uppercase tracking-tight">{title}</h1>
                    <p className="text-lg text-white/66 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
                </div>
            </div>

            {/* Content Container */}
            <div className="max-w-4xl mx-auto px-8 py-16 anim-fade-up delay-200">
                <style>{`
                    .legal-content h2 { font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 1.5rem; text-transform: uppercase; letter-spacing: 0.1em; color: white; margin-top: 3rem; margin-bottom: 1.5rem; display: flex; align-items: start; gap: 1rem; }
                    .legal-content h2::before { content: '§'; color: #C9A84C; opacity: 0.5; }
                    .legal-content h3 { font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.2em; color: #C9A84C; margin-top: 2rem; margin-bottom: 1rem; }
                    .legal-content p { color: rgba(240,237,232,0.74); font-size: 1rem; line-height: 1.8; margin-bottom: 1.25rem; max-width: 62ch; }
                    .legal-content ul, .legal-content ol { margin-bottom: 1.5rem; padding-left: 1.5rem; }
                    .legal-content li { color: rgba(240,237,232,0.74); font-size: 1rem; line-height: 1.8; margin-bottom: 0.75rem; list-style-type: square; max-width: 62ch; }
                    .legal-content strong { color: white; font-weight: 700; }
                    .legal-content a { color: #C9A84C; text-decoration: underline; text-underline-offset: 4px; }
                    .legal-content .highlight-box { background: rgba(201,168,76,0.04); border: 1px solid rgba(201,168,76,0.1); border-radius: 1rem; padding: 2rem; margin: 2rem 0; max-width: 66ch; }
                    .legal-content .table-container { overflow-x: auto; margin: 2rem 0; border: 1px solid rgba(255,255,255,0.05); border-radius: 1rem; }
                    .legal-content table { width: 100%; border-collapse: collapse; }
                    .legal-content th { background: rgba(255,255,255,0.02); text-align: left; padding: 1rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(201,168,76,0.92); border-bottom: 1px solid rgba(255,255,255,0.05); }
                    .legal-content td { padding: 1rem; font-size: 0.875rem; color: rgba(240,237,232,0.72); border-bottom: 1px solid rgba(255,255,255,0.06); vertical-align: top; }
                    .legal-content .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
                    .legal-content .badge-req { background: rgba(201,168,76,0.1); color: #C9A84C; }
                    .legal-content .badge-popia { background: rgba(16,185,129,0.1); color: #10B981; }
                `}</style>
                <div className="legal-content">
                    {children}
                </div>
            </div>

            {/* Footer */}
            <footer className="max-w-4xl mx-auto px-8 py-10 text-center opacity-70 border-t border-white/5">
                <p className="text-[11px] font-black uppercase tracking-[0.4em]">© 2026 KenganAuto (Pty) Ltd · Registered in South Africa</p>
            </footer>
        </div>
    );
};

export default LegalPageLayout;
