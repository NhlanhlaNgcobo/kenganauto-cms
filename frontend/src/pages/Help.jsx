import React, { useState } from 'react';
import { Search, MessageCircle, Link, Users, ChevronDown, ChevronUp, FileText, Phone, ExternalLink } from 'lucide-react';

const Help = () => {
    const [openFaq, setOpenFaq] = useState(null);

    const faqs = [
        {
            id: 'wa-connect',
            q: 'How do I connect my WhatsApp number?',
            a: 'Navigate to Settings > WhatsApp. Enter your 360dialog API Key and your registered WhatsApp business number. Click "Test Connection" to verify. Once active, incoming leads from Facebook or your website widget will automatically flow into your Leads dashboard.'
        },
        {
            id: 'add-vehicles',
            q: 'How do I add vehicles to my inventory?',
            a: 'Go to the Stock tab. You can click "Add Vehicle" to manually insert details like Make, Model, VIN, and photos. For high-volume dealerships, use the "Bulk Import" button to upload a CSV file containing your full stock list.'
        },
        {
            id: 'invite-team',
            q: 'Can I invite other salespeople?',
            a: 'Yes. Only Admin users can invite team members. Under Settings > General (or during the Onboarding Wizard), type the email address of your staff member, assign them a role (e.g., Salesperson, Finance Manager), and click "Invite". They will receive an email to set their password.'
        },
        {
            id: 'ai-bot',
            q: 'How does the KenganAuto AI work?',
            a: 'The AI acts as an invisible assistant. When a lead replies via WhatsApp or the website widget, the AI automatically categorises the intent (Vehicle Enquiry, Finance, Trade-in) and responds instantly based on your active inventory. If the conversation requires a human touch, the AI will tag it and optionally ping the assigned salesperson.'
        }
    ];

    return (
        <div className="min-h-screen bg-[#0A0F1E] text-white p-8">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-12 text-center">
                <h1 className="font-outfit font-black text-4xl mb-4">KenganAuto Help Centre</h1>
                <p className="text-white/58 mb-8">Everything you need to set up, manage, and scale your dealership on our platform.</p>

                <div className="relative max-w-2xl mx-auto">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/58" size={20} />
                    <input
                        type="text"
                        placeholder="Search for articles, guides or FAQs..."
                        className="w-full bg-[#111A30] border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#C9A84C] transition-colors shadow-lg"
                    />
                </div>
            </div>

            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                {/* Quick Launch Cards */}
                <div className="bg-[#111A30] border border-white/5 rounded-2xl p-6 hover:border-[#C9A84C]/50 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-[#C9A84C] mb-4 group-hover:bg-[#C9A84C] group-hover:text-[#0A0F1E] transition-colors">
                        <MessageCircle size={24} />
                    </div>
                    <h2 className="font-bold text-lg mb-2">WhatsApp Setup</h2>
                    <p className="text-sm text-white/58 leading-relaxed">Connect your 360dialog API key to enable instant WhatsApp messaging.</p>
                </div>

                <div className="bg-[#111A30] border border-white/5 rounded-2xl p-6 hover:border-[#C9A84C]/50 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-emerald-400 mb-4 group-hover:bg-emerald-400 group-hover:text-[#0A0F1E] transition-colors">
                        <Link size={24} />
                    </div>
                    <h2 className="font-bold text-lg mb-2">Website Widget</h2>
                    <p className="text-sm text-white/58 leading-relaxed">Embed our lead-capture script into your native dealership site.</p>
                </div>

                <div className="bg-[#111A30] border border-white/5 rounded-2xl p-6 hover:border-[#C9A84C]/50 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-blue-400 mb-4 group-hover:bg-blue-400 group-hover:text-[#0A0F1E] transition-colors">
                        <Users size={24} />
                    </div>
                    <h2 className="font-bold text-lg mb-2">Team Management</h2>
                    <p className="text-sm text-white/58 leading-relaxed">Manage access controls for sales agents, finance, and admins.</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12">
                {/* FAQ Section */}
                <div className="flex-1">
                    <h2 className="font-outfit font-black text-2xl mb-6">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        {faqs.map((faq) => (
                            <div key={faq.id} className="bg-[#111A30] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 shadow-md">
                                <button
                                    className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#C9A84C]"
                                    aria-expanded={openFaq === faq.id}
                                    aria-controls={`faq-${faq.id}`}
                                    onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                                >
                                    <span className="font-bold text-[15px] pr-4">{faq.q}</span>
                                    {openFaq === faq.id ? <ChevronUp size={20} className="text-[#C9A84C] shrink-0" /> : <ChevronDown size={20} className="text-white/58 shrink-0" />}
                                </button>
                                <div id={`faq-${faq.id}`} hidden={openFaq !== faq.id}>
                                    <p className="px-6 pb-6 text-sm text-white/66 leading-relaxed border-t border-white/5 pt-4">
                                        {faq.a}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Support Widget Link */}
                <div className="w-full md:w-80 space-y-6">
                    <div className="bg-gradient-to-br from-[#1A2235] to-[#0B1120] border border-[#C9A84C]/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A84C] opacity-5 rounded-full blur-3xl rounded-tl-none -mr-16 -mt-16 pointer-events-none"></div>
                        <h2 className="font-outfit font-black text-xl mb-2 text-white">Need Live Help?</h2>
                        <p className="text-sm text-white/58 mb-6">Our dedicated support team is available on WhatsApp or directly via our integrated Chat Support Widget on the bottom right.</p>

                        <div className="space-y-3">
                            <button
                                className="w-full py-3 bg-[#C9A84C] hover:bg-yellow-500 text-[#0A0F1E] font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
                                onClick={() => window.open('https://wa.me/27123456789', '_blank')}
                            >
                                <Phone size={16} /> Contact Support
                            </button>
                            <button className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                                <FileText size={16} /> Submit a Ticket
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#111A30] border border-white/5 rounded-2xl p-6">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-white/58 mb-4">Popular Guides</h3>
                        <ul className="space-y-3">
                            <li><a href="#" className="flex items-center gap-2 text-sm text-white/66 hover:text-[#C9A84C] transition-colors"><ExternalLink size={14} /> Full Setup Walkthrough</a></li>
                            <li><a href="#" className="flex items-center gap-2 text-sm text-white/66 hover:text-[#C9A84C] transition-colors"><ExternalLink size={14} /> Dealing with Lead Duplicates</a></li>
                            <li><a href="#" className="flex items-center gap-2 text-sm text-white/66 hover:text-[#C9A84C] transition-colors"><ExternalLink size={14} /> Understanding AI Scoring</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Help;
