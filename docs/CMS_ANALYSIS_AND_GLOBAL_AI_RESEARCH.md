# CMS Systems analysis, KenganAuto adaptation, and global automotive-AI research

_Prepared 15 Nov 2026. Sources are listed at the end. Vendor-reported figures are labelled as such._

## 1. Method

- **REA** (`morluto/rea`, "Reverse Engineer Anything") is an MCP server and CLI for agent-driven reverse engineering of binaries, apps and websites. It is meant for software you own or are authorised to examine.
- CMS Systems' product runs behind customer logins, so its internals were **not** probed. The analysis covers only CMS's **public product pages**: the home page plus nine module pages at cmssystems.co.za. That is the lawful, public-surface part of REA's website workflow.

## 2. CMS Systems: what they sell

CMS Systems was founded in 1999. It has offices in Centurion and Stellenbosch, and an ISL reseller covers the MENA region. It is a cloud dealership suite with nine modules:

| Module | Key capabilities (from CMS's own pages) |
|---|---|
| Lead Management (LMS) | Real-time lead injection from OEMs, portals, QR codes and campaigns. Round-robin and floor-based routing. Logimeter CallConnect voice recordings. WhatsApp and click-to-call. Source and agent reports. |
| Sales Cloud | CI-branded quotes (single vehicle or fleet). OTP and vehicle orders. Digital deal file with e-signature ("CMS Vault"). DMS/F&I links (Keyloop, Auto IT, Evolve). Driver's-licence scan to create a prospect. Mobile test-drive booking. |
| Stock Management | Real-time DMS stock view. Multi-user mobile stock take (VIN, licence disc and QR scanning, geo-pins). Publishing to AutoTrader, Cars.co.za and Carfind. **"Silent Salesman" QR on showroom cars that creates leads.** Demo, loan-car and key control. Traffic-fine and driver history. |
| Workshop Management | Online booking. Technician scheduling and job cards. Tablet check-in with photos. WhatsApp, SMS and email progress updates. Carry-over jobs. **WhatsApp bot that sends CSI surveys after each service.** |
| CRM | 360° customer view. Birthday, licence-renewal and service reminders. Campaign manager. **Concern and case logging (CRP) with an audit trail.** Lifecycle tracking. |
| Valuation | In-app trade-in valuation using TransUnion data. Mobile capture. **Manager approval workflow.** Multi-vehicle valuations. Push to stock. |
| Fleet | OEM forecasting. Bulk quoting. Fleet pipeline. Call cards for regional sales managers. |
| OEM Analytics & Targets | **Dealer scorecards. Monthly and quarterly targets with at-risk alerts.** Funnel analytics. Group-wide views. |
| Reporting | Live dashboards. Scheduled reports. Lead-source ROI. Workshop and stock intelligence. POPIA audit logs. |

**What CMS does not show:** its public site makes no claim of AI features of any kind. It also publishes no pricing and no quantified outcomes or case studies.

## 3. Gap analysis against KenganAuto

| CMS capability | KenganAuto before this change | Action |
|---|---|---|
| Lead capture, routing, WhatsApp | ✅ Yes, plus AI chatbot, AI lead scoring and speed-to-lead | Already ahead (AI) |
| Stock, portal feed (AutoTrader) | ✅ Yes | — |
| Trade-in valuation (TransUnion) | ✅ Yes | Approval workflow still missing (next) |
| Service bookings, job cards, WhatsApp updates | ✅ Yes | — |
| Retention: birthdays, reminders, reactivation campaigns | ✅ Yes | — |
| **Post-service CSI via WhatsApp** | ❌ | **Built: Customer Care module** |
| **Concern / case logging + audit trail** | ❌ | **Built: Customer Care module** |
| **Targets & scorecards with at-risk alerts** | ❌ | **Built: Targets module** |
| **Silent Salesman QR → lead** | ❌ | **Built: Showroom tools** |
| Digital deal file + e-signature | ❌ | Backlog |
| Driver's-licence / licence-disc scan | ❌ | Backlog (high SA relevance) |
| Mobile stock take, key/demo control, traffic fines | ❌ | Backlog |
| Fleet and OEM network views | ❌ | Backlog (only if selling to OEMs or groups) |
| Telephony integration (CallConnect-style) | ❌ | Backlog |

## 4. What was built (this change)

1. **Customer Care** (`/customer-care`, `backend/src/modules/customer_care.js`)
   - A CSI survey (0–10) goes out automatically on WhatsApp when a service job is marked **completed**. It can also be sent manually after a sale.
   - Each reply is **AI-triaged**: sentiment, category (turnaround time, communication, pricing and so on) and severity. Claude does this when `ANTHROPIC_API_KEY` is set; otherwise a deterministic keyword fallback runs.
   - A score of 6 or lower, or a negative comment, **auto-opens a concern** with an SLA: 24h for high severity, 72h for medium, 7 days for low.
   - Concern workflow: department, owner and status. A resolution note is required before a concern can be closed. A **full audit trail** records every change.
   - Dashboard tiles: NPS, average CSI, response rate, open and past-SLA concerns, average resolution time, and the AI-categorised drivers behind low scores.
2. **Targets & Scorecards** (`/targets`, `backend/src/modules/targets.js`)
   - Monthly targets for the whole dealership or per person, covering leads, test drives, units sold, service bookings and average CSI.
   - Live actuals, run-rate projection, and **on-track / at-risk / behind** flags. "At risk" means projected below target; "behind" means projected below 85% of target.
   - Only admins can set targets. Other staff see the dealership line plus their own targets.
3. **Showroom tools** (Stock → view vehicle, `backend/src/modules/showroom.js`)
   - **Silent Salesman QR:** an HMAC-signed, non-guessable public link per stock unit, with a printable windscreen card. The mobile vehicle page has a test-drive or callback form with **POPIA consent** and SA mobile-number validation, and is rate-limited. Each enquiry becomes a high-intent walk-in lead and raises an in-app alert.
   - **AI advert copy:** an AutoTrader-style description written only from stock fields (it is told not to invent features), which can be saved to the listing.

Supporting fixes made along the way:
- Added the missing `vehicles.description` column.
- Stock page API calls now send the auth header; they were getting 401s.
- The global CSS reset was moved into `@layer base`. It had been silently disabling every Tailwind padding and margin utility across the app.

## 5. Research: what automotive companies outside SA have done with AI

**Reliability key:** 🟢 company or regulator-level primary source · 🟡 company press release (self-reported) · 🟠 vendor case study (self-reported, marketing).

### Dealer groups and retailers
- **CarMax (US) 🟢/🟡:** Used Azure OpenAI to condense **~100,000 customer reviews into 5,000 car-research-page summaries** in a few months. It estimated the manual process would have taken **~11 years**. Microsoft reported an **80% editorial approval rate** for the AI output.
- **Auto Trader UK "Co-Driver" 🟡:** AI-generated adverts and image ordering, launched Feb 2025. **96%** of retailers accepted the first proposed description early on. By April 2026, **85% of its dealer customers** were using it: **2.5M+ descriptions and image re-orders** in 12 months, saving an estimated **~200,000 hours**.
- **Lithia & Driveway (US/UK) 🟡:** Rolled Pinewood.AI's DMS out to about 50 UK sites (Oct 2024). It has a five-year commitment to deploy it across its US and Canadian stores. In 2026, Pinewood launched "Pi", an AI intelligence layer inside the DMS. In Q2 2026 commentary, Lithia's CEO partly credited AI tools for a **+$339 (20%) sequential rise in used-vehicle gross profit per unit**.
- **Carvana (US) 🟡/🟠:** Reports that **>30% of retail and >60% of selling customers** complete their process digitally before delivery (Q3 2025 call). Trade press reports a **20% reduction in calls per purchase** from AI models; this was not verified against filings.

### OEMs
- **Mercedes-Benz 🟡:** The MBUX Virtual Assistant runs on Google Gemini through Vertex AI. It also has a gen-AI sales assistant in its online store, and a bilingual Messenger bot in the Middle East handles test-drive bookings.
- **BMW / MINI 🟡:** A 24/7 AI assistant answers product and service questions from a verified knowledge base. BMW says it has **600+ AI use cases**.
- **Volkswagen of America 🟡:** A virtual assistant in the myVW app answers owner-manual questions.
- **Toyota 🟡:** AgentAsk, an internal employee assistant, has helped resolve or expedite "hundreds of thousands" of support tickets. Toyota's Woven Capital also led UVeye's **$191M** round.
- **Maruti Suzuki (India) 🟠:** A WhatsApp gen-AI assistant (DaveAI) reports **400k+ users, 2.7M+ queries, 10,000+ test-drive bookings** and 82,000 brochure downloads.
- **Hyundai India 🟠:** The "Hi Hyundai" chatbot and WhatsApp journeys are credited with **1,000+ vehicle sales** from outbound campaigns (Yellow.ai).

### AI inspection in service lanes
- **UVeye at Toyota dealers (US) 🟠:**
  - Claremont Toyota reports **+48% alignment revenue, +27% tyre sales, 50% fewer policy claims, and 500+ minutes a day saved**.
  - Toyota of Princeton reports **+12% total service revenue** and 200+ check-in hours saved a month.
  - About 500 UVeye units are deployed across the US.
- **ProovStation (EU) 🟡:** A drive-through damage scanner that captures 360° images in under 3 seconds. It raised €10.4M in 2023.

### AI sales and service agents (US)
- **Impel study 🟠:** Across 230 dealerships and 360k leads, AI-enabled stores showed **+27% appointment-set rate** and **+26% lead-to-sale conversion** compared with stores without it. In a separate Impel/Xtime claim, service ROs rose **27%**.
- Individual stores (Impel 🟠): Audi Denver, +22% appointment set rate. Elk Grove Buick GMC, +18% lead conversion.

### Industry-level reality check (🟢 surveys)
- **Cox Automotive AI Readiness Study (Oct 2025):** about **60%** of dealers are at least testing AI, but only **~15%** have embedded it into workflows. **74%** worry about AI accuracy.
- **Cox (Aug 2026):** **82%** of dealers use AI, but only **22%** of AI users report revenue growth, against **69%** who expected it. Measurement is the gap.
- **CDK survey:** **51% of Gen Z and 44% of millennials** prefer booking appointments with an AI assistant. **61%** still book service by phone.

### What this means for KenganAuto
1. **Speed-to-lead AI on WhatsApp** is the best-evidenced lever, across Impel, Maruti and Hyundai. KenganAuto already has it. Market it with *measured* before-and-after numbers per dealer, because the Cox data shows dealers distrust unmeasured claims.
2. **AI listing copy** has strong adoption evidence (Auto Trader's 96% acceptance and 85% usage). It is low risk and now built.
3. **Service-lane AI** (CSI triage now; inspection and upsell later) is where the documented revenue gains are, per UVeye. Next step: a check-in photo upload with AI damage notes.
4. Build **outcome reporting** into every AI feature (the Targets module is the start). That is exactly the gap Cox found, and CMS's public pages don't address it either.

## 6. Recommended next steps
1. Route inbound WhatsApp replies that are just a number from 0 to 10 to `recordSurveyResponse()`, so CSI is fully hands-free. The function is already exported.
2. Add a trade-in manager approval workflow and audit log (CMS parity).
3. Add licence-disc and driver's-licence scanning (SA-specific; the PDF417 barcode is decodable client-side).
4. Add a digital deal file with e-signature.
5. Pre-existing gaps found during this work:
   - `vehicles.cost_price` is used by the model and UI but has no database column.
   - `Service.jsx` and other pages send no auth header.
   - `ai_service.js` still uses a mocked model ID.

## Sources
- REA: https://github.com/morluto/rea
- CMS Systems: https://www.cmssystems.co.za/ (and the module pages LeadManagement, SalesCloud, StockManagement, WorkshopManagement, CustomerRelationshipManagement, FleetManagement, ValuationManagement, OEMAnalyticsTargets, Reporting `.html`)
- CarMax / Microsoft: https://news.microsoft.com/source/features/ai/azure-openai-service-helps-customers-accelerate-innovation-with-large-ai-models-microsoft-expands-availability/ · https://learn.microsoft.com/en-us/training/modules/define-microsoft-ai-strategy-retail/5-discover-potential-car-selling
- Auto Trader Co-Driver: https://plc.autotrader.co.uk/news-views/press-releases/autotrader-ai-tools-saves-retailers-over-20-years-in-advert-creation-as-co-driver-hit-85-adoption-in-first-year/ · https://cardealermagazine.co.uk/autotraders-ai-tools-write-2-5-million-car-adverts-in-first-12-months/323823
- Lithia / Pinewood.AI: https://www.wardsauto.com/news/lithia-motors-is-seeing-benefits-from-ai-in-service-pre-sales/872980/ · https://investors.lithiadriveway.com/press-releases/mbktd3hjgn4lemupo2s · https://thepresidiogroup.com/q2-2026-public-dealership-group-trends/ · https://www.streetinsider.com/Globe+Newswire/Pinewood.AI+Debuts+New+AI+Agent+for+Automated+Dealership+Tasks/25933991.html
- Carvana: https://www.fool.com/earnings/call-transcripts/2025/10/29/carvana-cvna-q3-2025-earnings-call-transcript/ · https://www.autofinancenews.net/magazine-content/features/auto-lenders-transform-customer-experience-with-agentic-ai/
- OEMs: https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders · https://botscrew.com/blog/how-automotive-companies-use-generative-ai/ · https://www.sbdautomotive.com/post/how-major-automakers-are-positioning-themselves-to-master-ai-in-2025
- Maruti Suzuki / Hyundai India: https://iamdave.ai/stories/maruti-suzuki-whatsapp-chatbot · https://iamdave.ai/stories/maruti-suzuki-genai-assistant/ · https://view.yellow.ai/?p=105857
- UVeye / ProovStation: https://www.casestudies.com/company/uveye/case-study/claremont-toyota-boosts-alignment-revenue-48-with-uveye · https://www.uveye.com/toyota · https://amp.claimsjournal.com/news/national/2025/01/29/328683.htm · https://www.kcrg.com/2026/04/13/first-in-state-ai-scanner-inspects-vehicles-iowa-dealership/ · https://proovstation.com/
- Impel: https://impel.ai/wp-content/uploads/2025/01/The-Transformative-Power-of-Automotive-AI.pdf · https://www.casestudies.com/company/impel-spincar/case-study/impels-sales-ai-turns-unresponsive-leads-into-found-revenue
- Cox Automotive: https://www.coxautoinc.com/insights/automotive-dealers-are-ready-for-ai-to-deliver-outcomes-and-skip-the-hype-according-to-new-cox-automotive-study/ · https://www.cbtnews.com/cox-automotive-report-finds-dealers-use-ai/
- CDK: https://www.cdkglobal.com/insights/how-dealership-ai-tools-can-help-service-team-productivity
