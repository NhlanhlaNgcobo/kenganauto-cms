import React from 'react';
import LegalPageLayout from './LegalPageLayout';

const POPIACompliance = () => {
    return (
        <LegalPageLayout
            title="POPIA Compliance Notice"
            subtitle="Protection of Personal Information Act, No. 4 of 2013."
            badge="Statutory Compliance Document"
        >
            <div className="highlight-box" style={{ background: 'rgba(59,127,245,0.04)', border: '1px solid rgba(59,127,245,0.1)' }}>
                POPIA is South Africa's primary data protection legislation, fully in force since 1 July 2021. It regulates how organisations collect, use, store, share, and safeguard personal information.
            </div>

            <h2>01. Responsible Party Identification</h2>
            <p>In terms of POPIA, the <strong>Responsible Party</strong> is the entity that determines the purpose and means of processing personal information. KENGANAUTO is the Responsible Party in relation to the personal information of its dealership clients and their staff (Users).</p>

            <div className="table-container">
                <table>
                    <thead>
                        <tr><th>Field</th><th>Details</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Entity Name</td><td>KENGANAUTO (Pty) Ltd</td></tr>
                        <tr><td>Registration No.</td><td>[Company Registration Number]</td></tr>
                        <tr><td>Registered Address</td><td>[Physical Address, South Africa]</td></tr>
                        <tr><td>Information Officer</td><td>[Full Name of IO]</td></tr>
                        <tr><td>IO Email</td><td>privacy@kenganauto.co.za</td></tr>
                    </tbody>
                </table>
            </div>

            <h2>02. Conditions for Lawful Processing</h2>
            <p>POPIA sets out eight conditions for the lawful processing of personal information. KENGANAUTO is committed to satisfying all eight conditions in every processing activity:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-10">
                {[
                    { title: '1. Accountability', desc: 'KENGANAUTO take responsibility for ensuring that all personal information processing complies with POPIA.' },
                    { title: '2. Processing Limitation', desc: 'Personal information is only processed where there is a lawful basis. Processing is limited to what is necessary.' },
                    { title: '3. Purpose Specification', desc: 'Personal information is collected only for specific, explicitly defined, and lawful purposes.' },
                    { title: '4. Further Processing Limitation', desc: 'Personal information is not processed further in a manner incompatible with the original collection purpose.' },
                    { title: '5. Information Quality', desc: 'KENGANAUTO take reasonable steps to ensure that personal information held is complete and accurate.' },
                    { title: '6. Openness', desc: 'This Compliance Notice, the Privacy Policy, and the Terms and Conditions are publicly available.' },
                    { title: '7. Security Safeguards', desc: 'Appropriate technical and organisational measures protect personal information.' },
                    { title: '8. Data Subject Participation', desc: 'Data subjects may access, correct, and request deletion of their personal information.' }
                ].map((c, i) => (
                    <div key={i} className="px-6 py-5 rounded-xl transition-all hover:bg-white/5 border border-white/5 group">
                        <h4 className="font-outfit font-black text-[11px] uppercase tracking-widest text-[#C9A84C] mb-2">{c.title}</h4>
                        <p className="text-xs opacity-70 leading-relaxed m-0 group-hover:opacity-70 transition-opacity">{c.desc}</p>
                    </div>
                ))}
            </div>

            <h2>03. Categories of Personal Information Processed</h2>
            <div className="table-container">
                <table>
                    <thead>
                        <tr><th>Category</th><th>Type of Information</th><th>Data Subjects Affected</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Identity</td><td>Full name, job title, user role</td><td>Dealership users</td></tr>
                        <tr><td>Contact Information</td><td>Email address, phone/WhatsApp number, postal address</td><td>Dealership users; end-customers</td></tr>
                        <tr><td>Financial Information</td><td>Monthly income, employment status, employer details, existing credit obligations</td><td>End-customers</td></tr>
                        <tr><td>Vehicle Data</td><td>Registration number, VIN, make, model, year, mileage, condition</td><td>End-customers</td></tr>
                    </tbody>
                </table>
            </div>

            <h2>06. Rights of Data Subjects</h2>
            <p>POPIA confers the following rights on data subjects. KENGANAUTO is committed to facilitating the exercise of these rights promptly and in accordance with the Act:</p>
            <ol>
                <li><strong>Right to be Notified of Collection</strong> — as required by POPIA s.18, informed of the identity of the Responsible Party and purpose of collection.</li>
                <li><strong>Right of Access</strong> — as required by POPIA s.23, confirm whether KENGANAUTO holds personal information and obtain a copy.</li>
                <li><strong>Right to Correction or Deletion</strong> — as required by POPIA s.24, correct entries that are inaccurate, out of date, or incomplete.</li>
                <li><strong>Right to Object to Processing</strong> — as required by POPIA s.11(3), object to the processing of personal information on reasonable grounds.</li>
                <li><strong>Right to Withdraw Consent</strong> — as required by POPIA s.11(1)(a), withdraw consent at any time for particular processing activities.</li>
            </ol>

            <div className="highlight-box">
                <p><strong>To lodge a complaint:</strong> belief that personal information has been processed in violation of POPIA may lodge a complaint with the <strong>Information Regulator of South Africa</strong>.</p>
            </div>
        </LegalPageLayout>
    );
};

export default POPIACompliance;
