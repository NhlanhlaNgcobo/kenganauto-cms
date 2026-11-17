import React from 'react';
import LegalPageLayout from './LegalPageLayout';

const PrivacyPolicy = () => {
    return (
        <LegalPageLayout
            title="Privacy Policy"
            subtitle="How KENGANAUTO collects, uses, protects, and manages personal information in compliance with POPIA."
            badge="Privacy and Data Protection"
        >
            <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
                {[
                    { icon: '🔒', title: 'We Protect Your Data', desc: 'Industry-standard encryption and access controls protect all personal information.' },
                    { icon: '🎯', title: 'Purpose-Limited', desc: 'Data is only used for the specific purpose it was collected for.' },
                    { icon: '🇿🇦', title: 'POPIA Compliant', desc: 'We comply fully with South Africa\'s Protection of Personal Information Act.' },
                    { icon: '👤', title: 'Your Rights', desc: 'You may access, correct, or request deletion of your personal information at any time.' }
                ].map((s, i) => (
                    <div key={i} className="highlight-box shadow-2xl" style={{ textAlign: 'center', margin: 0 }}>
                        <span style={{ fontSize: '2rem', marginBottom: '1rem', display: 'block' }}>{s.icon}</span>
                        <h4 className="font-outfit font-black text-sm uppercase tracking-widest text-white mb-2">{s.title}</h4>
                        <p className="text-xs opacity-70 leading-relaxed mb-0">{s.desc}</p>
                    </div>
                ))}
            </div>

            <h2>01. Who We Are</h2>
            <p>KENGANAUTO (Pty) Ltd ("KENGANAUTO", "we", "us", "our") is a South African technology company that operates the KENGANAUTO platform — a cloud-based SaaS CRM and AI-powered communication platform designed for South African motor vehicle dealerships.</p>

            <h2>02. Who This Policy Applies To</h2>
            <p>This Privacy Policy applies to <strong>dealership clients</strong>, <strong>users</strong>, <strong>visitors</strong>, and <strong>end-customers</strong> whose information is processed through the platform.</p>

            <h2>03. Personal Information We Collect</h2>
            <h3>3.1 From Dealership Clients and Their Users</h3>
            <div className="table-container">
                <table>
                    <thead>
                        <tr><th>Category</th><th>Examples of Information</th><th>Required?</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Identity Info</td><td>Full name, job title</td><td><span className="badge badge-req">Required</span></td></tr>
                        <tr><td>Contact Information</td><td>Email address, mobile number</td><td><span className="badge badge-req">Required</span></td></tr>
                        <tr><td>Business Info</td><td>Dealership name, registration number, address</td><td><span className="badge badge-req">Required</span></td></tr>
                    </tbody>
                </table>
            </div>

            <h3>3.2 From End-Customers (Processed for Dealerships)</h3>
            <div className="table-container">
                <table>
                    <thead>
                        <tr><th>Category</th><th>Examples of Information</th><th>Module</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Identity & Contact</td><td>Full name, mobile number (WhatsApp)</td><td>All modules</td></tr>
                        <tr><td>Vehicle Interest</td><td>Vehicle make, model, budget</td><td>Lead CRM, Chatbot</td></tr>
                        <tr><td>Financial Info</td><td>Income, employment status, debt obligations</td><td>Finance Module</td></tr>
                        <tr><td>Vehicle Trade-In</td><td>VIN, make, model, year, mileage, condition</td><td>Trade-In Module</td></tr>
                    </tbody>
                </table>
            </div>

            <h2>05. Purposes of Processing</h2>
            <p>We process personal information for the purpose of maintaining the platform, providing AI chatbot communication, processing finance pre-qualifications, and managing dealership's vehicle stock and trade-in valuations.</p>

            <h2>07. Sharing of Personal Information</h2>
            <p>We share personal information with trusted service providers who process data on our behalf, including <strong>Anthropic (Claude AI)</strong>, <strong>360dialog (WhatsApp Business API)</strong>, and <strong>Stripe (payment processing)</strong>.</p>

            <h2>08. Cross-Border Transfers</h2>
            <p>As defined in POPIA Section 72, several of our service providers are located outside South Africa. Both parties ensure that cross-border data transfers are subject to equivalent data protection standards.</p>

            <h2>10. Security Measures</h2>
            <div className="highlight-box">
                <p>KENGANAUTO implements and maintains appropriate technical and organisational security measures to protect personal information against loss, damage, unauthorised access, or unlawful processing.</p>
            </div>

            <h2>13. Your Rights Under POPIA</h2>
            <p>Data subjects have the following rights under POPIA: <strong>Right of Access</strong>, <strong>Right to Correction or Deletion</strong>, <strong>Right to Object to Processing</strong>, and <strong>Right to Lodge a Complaint</strong>.</p>

            <h2>16. Contact Us</h2>
            <div className="highlight-box">
                <p><strong>Information Officer:</strong> privacy@kenganauto.co.za</p>
                <p><strong>Support:</strong> support@kenganauto.co.za</p>
            </div>
        </LegalPageLayout>
    );
};

export default PrivacyPolicy;
