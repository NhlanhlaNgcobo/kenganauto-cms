import React from 'react';
import LegalPageLayout from './LegalPageLayout';

const TermsAndConditions = () => {
    return (
        <LegalPageLayout
            title="Terms and Conditions"
            subtitle="Governing the subscription and use of the KENGANAUTO SaaS platform by dealership clients in South Africa."
            badge="B2B Subscription Agreement"
        >
            <div className="highlight-box">
                <strong>Please read carefully.</strong> By registering for, accessing, or using the KENGANAUTO platform, the dealership entity ("Client") agrees to be bound by these Terms and Conditions. These terms constitute a binding legal agreement between the Client and KENGANAUTO (Pty) Ltd. If you do not agree, do not access or use the platform.
            </div>

            <h2>01. Definitions and Interpretation</h2>
            <div className="table-container">
                <table>
                    <thead>
                        <tr><th>Term</th><th>Definition</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><strong>"KENGANAUTO"</strong></td><td>KENGANAUTO (Pty) Ltd, a company registered in the Republic of South Africa, and the operator and owner of the platform.</td></tr>
                        <tr><td><strong>"Platform"</strong></td><td>The KENGANAUTO multi-tenant SaaS CRM, including all modules, the AI chatbot, analytics dashboard, and associated tools.</td></tr>
                        <tr><td><strong>"Client"</strong></td><td>The dealership entity (whether a sole proprietor, close corporation, private company, or public company) that subscribes to and uses the Platform.</td></tr>
                        <tr><td><strong>"POPIA"</strong></td><td>The Protection of Personal Information Act, No. 4 of 2013 (South Africa).</td></tr>
                        <tr><td><strong>"AI Services"</strong></td><td>The artificial intelligence features of the Platform including the Claude-powered chatbot and lead scoring.</td></tr>
                    </tbody>
                </table>
            </div>

            <h2>02. Platform Description and Services</h2>
            <h3>2.1 Services Provided</h3>
            <p>KENGANAUTO provides the Client with access to a cloud-hosted, multi-tenant SaaS CRM platform designed specifically for South African motor vehicle dealerships.</p>
            <ul>
                <li><strong>Lead Pipeline CRM</strong> — lead capture, qualification, assignment, and pipeline tracking</li>
                <li><strong>AI Chatbot</strong> — WhatsApp Business and website chat widget powered by Anthropic Claude AI</li>
                <li><strong>Finance Module</strong> — embedded installment calculator and finance application tracking</li>
                <li><strong>Trade-In and Valuations</strong> — automated valuations and trade-in capture</li>
                <li><strong>Stock Management</strong> — vehicle inventory management auto-synced to the chatbot</li>
                <li><strong>SuperAdmin & Analytics</strong> — real-time monitoring of all branch activities</li>
            </ul>

            <h2>03. Account Registration and Access</h2>
            <h3>3.1 Registration</h3>
            <p>To access the Platform, the Client must complete the registration process and provide accurate, complete, and current information including the dealership's legal name and registered address.</p>

            <h3>3.2 Authorised Users</h3>
            <p>The Client is responsible for creating and managing User accounts within their Tenant. user credentials must be kept confidential and not shared between individuals.</p>

            <h2>04. Subscription Plans and Fees</h2>
            <p>Plan features, User limits, and module access are detailed on the KENGANAUTO website. Setup fees are payable prior to Platform activation.</p>

            <h2>05. Billing, Payment, and Renewal</h2>
            <p>Subscription Fees are billed monthly or annually in advance. Payment is processed via Stripe or EFT. If a payment is not received within 7 days of the due date, KENGANAUTO reserves the right to suspend access.</p>

            <h2>06. Acceptable Use Policy</h2>
            <p>Clients are prohibited from using the platform for unlawful purposes, reverse engineering the source code, or sending unsolicited bulk communications (spam) via WhatsApp or email.</p>

            <h2>07. Data Ownership and Processing</h2>
            <p>All data uploaded, generated, or stored by the Client within their Tenant remains the sole property of the Client. KENGANAUTO processes this data solely for the purpose of maintaining the platform.</p>

            <h2>08. POPIA and Data Protection</h2>
            <p>The Client is the <strong>Responsible Party</strong> for end-customer data, and KENGANAUTO is the <strong>Operator</strong>. Both parties agree to comply with all provisions of POPIA in their use of the platform.</p>

            <h2>13. Limitation of Liability</h2>
            <div className="highlight-box" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                KENGANAUTO's total aggregate liability to the Client shall not exceed <strong>the total Subscription Fees paid by the Client in the 3 months immediately preceding the event giving rise to the claim.</strong>
            </div>

            <h2>16. Term and Termination</h2>
            <p>Subscriptions may be terminated by Either Party upon 30 days' written notice. Upon termination, Client Data will be available for export for a period of 30 days before being permanently deleted.</p>
        </LegalPageLayout>
    );
};

export default TermsAndConditions;
