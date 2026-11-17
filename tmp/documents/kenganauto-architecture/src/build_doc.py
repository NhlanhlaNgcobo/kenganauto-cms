from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


OUTPUT_PATH = r"C:\Users\NhlanhlaNgcobo\OneDrive\Desktop\KenganAuto OS\tmp\documents\kenganauto-architecture\output\kenganauto-internal-architecture.docx"

ACCENT = RGBColor(201, 168, 76)
TEXT = RGBColor(34, 34, 34)
MUTED = RGBColor(92, 92, 92)
LIGHT_FILL = "F6F2E8"
DARK_FILL = "1E2433"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_page_margins(section, top=0.65, bottom=0.65, left=0.7, right=0.7):
    section.top_margin = Inches(top)
    section.bottom_margin = Inches(bottom)
    section.left_margin = Inches(left)
    section.right_margin = Inches(right)


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run()
    fld_char_begin = OxmlElement("w:fldChar")
    fld_char_begin.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = "PAGE"
    fld_char_end = OxmlElement("w:fldChar")
    fld_char_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char_begin)
    run._r.append(instr_text)
    run._r.append(fld_char_end)


def base_styles(document):
    normal = document.styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = TEXT

    for style_name, size in [("Title", 24), ("Heading 1", 17), ("Heading 2", 13), ("Heading 3", 11)]:
        style = document.styles[style_name]
        style.font.name = "Aptos Display"
        style.font.color.rgb = TEXT
        style.font.size = Pt(size)
        style.font.bold = True


def add_header_footer(section):
    header = section.header.paragraphs[0]
    header.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = header.add_run("KenganAuto OS Internal Architecture")
    run.font.name = "Aptos"
    run.font.size = Pt(9)
    run.font.color.rgb = MUTED

    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    footer_run = footer.add_run("Internal engineering note  |  ")
    footer_run.font.name = "Aptos"
    footer_run.font.size = Pt(9)
    footer_run.font.color.rgb = MUTED
    add_page_number(footer)


def add_title_page(document):
    section = document.sections[0]
    set_page_margins(section, top=0.85, bottom=0.75, left=0.9, right=0.9)
    add_header_footer(section)

    title = document.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = title.add_run("KenganAuto OS\nFrontend + Backend Architecture")
    run.bold = True
    run.font.name = "Aptos Display"
    run.font.size = Pt(24)
    run.font.color.rgb = TEXT

    sub = document.add_paragraph()
    sub.paragraph_format.space_before = Pt(8)
    run = sub.add_run(
        "Internal technical explanation of how the current SaaS works, how the major flows move through the system, "
        "and where the architecture is still in transition."
    )
    run.font.size = Pt(12)
    run.font.color.rgb = MUTED

    info = document.add_table(rows=4, cols=2)
    info.alignment = WD_TABLE_ALIGNMENT.LEFT
    info.style = "Table Grid"
    rows = [
        ("Prepared for", "Internal use"),
        ("Application type", "Multi-tenant dealership SaaS"),
        ("Frontend stack", "React + React Router + Vite"),
        ("Backend reality", "NestJS + Prisma in active migration from legacy Express stack"),
    ]
    for idx, (label, value) in enumerate(rows):
        info.cell(idx, 0).text = label
        info.cell(idx, 1).text = value
        set_cell_shading(info.cell(idx, 0), LIGHT_FILL)
        info.cell(idx, 0).vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        info.cell(idx, 1).vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER

    note = document.add_paragraph()
    note.paragraph_format.space_before = Pt(18)
    note_run = note.add_run(
        "Important context: this repository contains both the new application architecture and material pieces of the old one. "
        "That duality is one of the most important things to understand before changing the system."
    )
    note_run.italic = True
    note_run.font.color.rgb = RGBColor(110, 76, 13)

    document.add_page_break()


def add_heading(document, text, level=1):
    document.add_heading(text, level=level)


def add_paragraph(document, text, bold_prefix=None):
    p = document.add_paragraph()
    if bold_prefix:
        run = p.add_run(f"{bold_prefix}: ")
        run.bold = True
    p.add_run(text)
    return p


def add_bullets(document, items):
    for item in items:
        p = document.add_paragraph(style="List Bullet")
        p.add_run(item)


def add_numbered(document, items):
    for item in items:
        p = document.add_paragraph(style="List Number")
        p.add_run(item)


def add_table(document, headers, rows, col_widths=None):
    table = document.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = table.rows[0].cells
    for idx, header in enumerate(headers):
        hdr_cells[idx].text = header
        set_cell_shading(hdr_cells[idx], DARK_FILL)
        for paragraph in hdr_cells[idx].paragraphs:
            for run in paragraph.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(255, 255, 255)
        hdr_cells[idx].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER

    for row in rows:
        cells = table.add_row().cells
        for idx, value in enumerate(row):
            cells[idx].text = value
            if idx == 0:
                set_cell_shading(cells[idx], LIGHT_FILL)
            cells[idx].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP

    if col_widths:
        for row in table.rows:
            for idx, width in enumerate(col_widths):
                row.cells[idx].width = Inches(width)

    return table


def add_callout(document, title, body):
    table = document.add_table(rows=1, cols=1)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    set_cell_shading(cell, LIGHT_FILL)
    p1 = cell.paragraphs[0]
    r1 = p1.add_run(title)
    r1.bold = True
    r1.font.color.rgb = RGBColor(110, 76, 13)
    p2 = cell.add_paragraph(body)
    p2.paragraph_format.space_before = Pt(4)
    return table


def build():
    document = Document()
    base_styles(document)
    add_title_page(document)

    add_heading(document, "1. Executive Technical Summary", level=1)
    add_paragraph(
        document,
        "KenganAuto OS is a multi-tenant dealership operating system. The frontend is a single-page React application that exposes modules for sales, customer engagement, vehicle operations, service, parts, retention, integrations, billing, onboarding, and admin tooling.",
    )
    add_paragraph(
        document,
        "The backend is currently in a migration phase. The intended runtime is the NestJS + Prisma code under backend/server and backend/prisma. The repository still contains a legacy Express-based stack under backend/src and backend/index.js, and some frontend expectations still reflect that older behavior.",
    )
    add_bullets(
        document,
        [
            "Frontend access is route-driven and role-gated through React Router, AuthContext, ProtectedRoute, and ROLE_NAV configuration.",
            "Tenant isolation is backend-driven through TenantMiddleware plus JWT tenant claims, with a special global app tenant used as a platform fallback.",
            "Most business entities are normalized into Prisma models: leads, conversations, vehicles, customers, service bookings, parts enquiries, trade-ins, automation sequences, notification settings, integration connections, widget settings, and billing state.",
            "Operationally, the system is trying to behave as one dealership platform even though parts of the implementation are newer, parts are legacy, and a few screens are ahead of the API surface currently implemented in Nest.",
        ],
    )
    add_callout(
        document,
        "Architecture reality",
        "Treat this codebase as a live migration rather than a clean-sheet monolith. The most important engineering habit in this repo is checking whether a behavior belongs to the newer Nest/Prisma path, the older Express path, or a frontend screen that assumes APIs from one of those worlds.",
    )

    add_heading(document, "2. Repository Structure", level=1)
    add_table(
        document,
        ["Area", "Purpose", "What matters most"],
        [
            ("frontend/src", "React SPA", "All user-facing modules, route composition, role-based navigation, page logic, shared shell components."),
            ("backend/server", "New backend", "NestJS app, controllers, services, auth, queue processors, tenant middleware."),
            ("backend/prisma", "Data model", "PostgreSQL schema and generated client contract used by the new backend."),
            ("backend/src", "Legacy backend", "Older Express-era routes and fallback logic, still useful for understanding historical behavior."),
            ("backend/index.js", "Legacy entry", "Shows the previous startup model, production checks, and migration-on-start expectations."),
        ],
        [1.4, 1.3, 4.6],
    )

    add_heading(document, "3. Frontend Architecture", level=1)
    add_heading(document, "3.1 Application Shell", level=2)
    add_paragraph(
        document,
        "The SPA boots from frontend/src/main.jsx and mounts App. App wraps the tree with ErrorBoundary, AuthProvider, and BrowserRouter, then declares public and protected routes. The protected application shell uses AppLayout, which is responsible for the persistent sidebar, demo banner, command palette, and global chat widget.",
    )
    add_paragraph(
        document,
        "The result is a single authenticated workspace rather than separate mini apps. Users move between modules without full page reloads, and global context such as auth state and shell tooling stays alive throughout navigation.",
    )

    add_heading(document, "3.2 Route Model", level=2)
    add_bullets(
        document,
        [
            "Public routes cover authentication and legal flows: login, register, forgot/reset password, and legal pages.",
            "Protected business routes cover dashboard, analytics, leads, customers, AI chat, finance, trade-ins, stock, service, parts, retention, support, settings, billing, onboarding, and help.",
            "Admin-only routes include SuperAdmin and API settings. The tenant with ID 1 is treated as the global internal tenant with elevated admin access behavior.",
        ],
    )
    add_table(
        document,
        ["Frontend module", "Primary purpose", "Typical backend dependency"],
        [
            ("Dashboard / Analytics", "Operational visibility", "Analytics endpoints, lead stats, service and parts metrics."),
            ("Leads / Customers", "CRM workflow", "Lead CRUD, notes, assignment, customer lookup, tagging."),
            ("AI Chat / Widget", "Conversation capture and preview", "Chat endpoints, widget settings, conversation storage."),
            ("Finance / Trade-Ins", "Deal support", "Finance application and trade-in related data models and reporting."),
            ("Stock / Service / Parts", "Dealership operations", "Vehicle, service booking, parts enquiry, and catalog endpoints."),
            ("Retention", "Campaigns and automations", "Automation sequences plus broader retention APIs, some of which are ahead of current Nest implementation."),
            ("Integrations / WhatsApp / Notifications", "External system connectivity", "Integration connection rows, webhook endpoints, notification settings, WhatsApp settings."),
            ("Billing", "Subscription management", "Billing status, Stripe checkout, customer portal."),
        ],
        [1.7, 2.0, 3.2],
    )

    add_heading(document, "3.3 Authentication and Session Logic", level=2)
    add_paragraph(
        document,
        "AuthContext is the frontend authority for logged-in state. It stores the JWT and user profile in localStorage, refreshes the access token approximately every 30 minutes of activity, and auto-logs the user out after an eight-hour idle timeout.",
    )
    add_numbered(
        document,
        [
            "A user logs in or registers through the public auth pages.",
            "The frontend stores the returned access token, refresh token, and user payload in local storage.",
            "ProtectedRoute checks whether a user exists before allowing route render.",
            "If a route is module-guarded, ProtectedRoute consults ROLE_NAV to verify that the current role has access to that module.",
            "If a route is adminOnly, the frontend also checks whether the current tenant is the platform tenant with ID 1.",
        ],
    )

    add_heading(document, "3.4 Role and Navigation Model", level=2)
    add_paragraph(
        document,
        "The role model is intentionally lightweight on the frontend. ROLE_NAV defines which modules are visible and accessible for each role, and Sidebar filters the full navigation list to only those modules. This means route protection and visible navigation are both driven by the same configuration source.",
    )
    add_table(
        document,
        ["Role", "Frontend access shape"],
        [
            ("admin", "Broad access across sales, operations, settings, chat, retention, support, and admin-only platform screens."),
            ("salesperson", "Narrower CRM view focused on dashboard, leads, stock, and customers."),
            ("finance_manager", "Primarily finance-centered access."),
            ("service_advisor", "Service, customers, stock, and dashboard."),
            ("parts_manager", "Parts-centric access with limited module exposure."),
        ],
        [1.7, 5.2],
    )

    add_heading(document, "3.5 Frontend Business Flows", level=2)
    add_paragraph(document, "The frontend is organized around practical dealership work rather than abstract entities.")
    add_bullets(
        document,
        [
            "Leads flow: useLeads fetches lead lists, stats, and team members in parallel, polls every 30 seconds, supports optimistic stage changes, and exposes note creation, assignment, bulk actions, and AI summary requests.",
            "Sidebar alert flow: Sidebar independently polls lead stats every 30 seconds to surface overdue follow-ups in navigation.",
            "Chat flow: Chatbot and ChatWidget both call the chat endpoints to create or continue a conversation, then render message history, intent, sentiment, and any special result payloads.",
            "Integration flow: the Integrations page presents channel health and deployment data such as inbound email aliases and generic webhook URLs.",
            "Billing flow: the Billing page consumes subscription state and then redirects to Stripe-hosted checkout or customer portal sessions.",
        ],
    )

    add_heading(document, "3.6 Chat Widget Logic", level=2)
    add_paragraph(
        document,
        "ChatWidget is both a website-style customer widget and an embedded internal preview component. It maintains local conversation state, sends messages to /chat/message, stores the returned conversation ID for subsequent turns, and renders assistant replies, intent state, sentiment state, and optional extras panels such as finance breakdowns or trade-in estimates if they are provided by the backend.",
    )
    add_paragraph(
        document,
        "Today, the new Nest chat endpoint returns a basic assistant reply generated from simple intent heuristics and persisted conversation history. The widget UI is richer than the current backend intelligence layer, which means the UI is prepared for more advanced AI behavior than the backend currently implements.",
    )

    add_heading(document, "3.7 Frontend Risks and Mismatches", level=2)
    add_bullets(
        document,
        [
            "Some pages already expect API shapes or endpoints that are broader than what the new Nest backend currently exposes.",
            "Retention is the clearest example: the screen references reactivation-specific endpoints that are not present in the Nest controller set inspected here.",
            "The chat UI exposes concepts like notifications, handoff state, and API-key-driven AI behavior that are only partially wired on the backend right now.",
            "The frontend builds successfully, but technical alignment between screens and the newer backend still depends on continued migration work.",
        ],
    )

    add_heading(document, "4. Backend Architecture", level=1)
    add_heading(document, "4.1 New Backend Runtime", level=2)
    add_paragraph(
        document,
        "The new backend is a NestJS application rooted at backend/server/main.ts. It boots with a global validation pipe, CORS configured from FRONTEND_URL, and a port default of 3000. AppModule wires together environment validation, BullMQ queues, Prisma access, auth, controllers, services, and a global TenantMiddleware.",
    )
    add_bullets(
        document,
        [
            "Controllers provide HTTP route surfaces for auth, leads, chat, platform operations, health, and admin functions.",
            "PlatformService is the main domain service and currently contains a very large portion of the business logic.",
            "PrismaService is the persistence boundary for the new backend.",
            "BullMQ queues split longer-running or integration-like work into notifications, automation, and scoring processors.",
        ],
    )

    add_heading(document, "4.2 Multi-Tenant Request Resolution", level=2)
    add_numbered(
        document,
        [
            "TenantMiddleware runs for every request.",
            "It tries to resolve the tenant from x-tenant-id first, then from x-tenant-subdomain or the request host.",
            "If the resolved subdomain is localhost-like or platform-like, it falls back to the special app tenant context with ID 1.",
            "If a specific tenant is resolved, it is attached to the request as req.tenant.",
            "JwtAuthGuard later verifies the bearer token and rejects tenant mismatches unless the request is using the global platform tenant.",
        ],
    )
    add_paragraph(
        document,
        "This design is important because tenant resolution and tenant authorization are separate steps. Middleware determines context; JWT enforcement verifies that the authenticated user is allowed to operate inside that context.",
    )

    add_heading(document, "4.3 Auth Flow", level=2)
    add_paragraph(
        document,
        "AuthModule uses Nest JWT with a 15-minute access token lifetime. AuthService is responsible for login, tenant registration, refresh sessions, forgot-password tokens, and password reset completion.",
    )
    add_numbered(
        document,
        [
            "Login resolves the tenant by subdomain, then resolves the user via the composite tenantId + email lookup.",
            "Passwords are compared with bcrypt, lastLogin is updated, and a refresh session row is created.",
            "Registration creates a tenant and first admin user in a single transaction, then bootstraps tenant defaults such as widget settings, notification settings, automation sequences, and base integration rows.",
            "Refresh rotates the refresh token by replacing the stored token hash in the existing refresh session row.",
            "Forgot-password creates a short-lived passwordResetToken row. In development, the raw token can be returned for debugging.",
        ],
    )

    add_heading(document, "4.4 Domain Controller Layout", level=2)
    add_table(
        document,
        ["Controller", "Responsibility", "Examples"],
        [
            ("AuthController", "Public authentication surface", "login, register, refresh, forgot-password, reset-password"),
            ("LeadsController", "CRM lead lifecycle", "list, stats, team, create, stage update, assignment, notes, AI summary, score, bulk"),
            ("ChatController", "Conversation intake and CRM chat views", "chat message intake, conversations list, conversation detail"),
            ("PlatformController", "Most dealership operational modules", "customers, stock, service, parts, trade-ins, analytics, notifications, widget, webhooks, integrations, billing helpers"),
            ("AdminController", "Platform-only admin features", "tenant listing, impersonation, API setting storage and test"),
        ],
        [1.6, 2.0, 3.3],
    )

    add_heading(document, "4.5 PlatformService Logic", level=2)
    add_paragraph(
        document,
        "PlatformService is the main business brain of the new backend. It centralizes logic that many teams would normally split across smaller domain services. That makes it productive for migration speed, but it also means the service has become the key file to understand before changing platform behavior.",
    )
    add_bullets(
        document,
        [
            "Lead logic: listing, filtering, statistics, team lookup, creation, stage change, assignment, notes, AI summary generation, score recalculation, and bulk operations.",
            "Conversation logic: intent inference, assistant reply generation, conversation persistence, message persistence, and conversation list/detail responses.",
            "Operational logic: vehicles, service bookings, parts enquiries, part catalog, trade-ins, customers, support manuals, FAQs, support queries, and analytics rollups.",
            "Settings logic: notification settings, widget settings, WhatsApp settings, integration connection rows, API settings, and tenant bootstrap defaults.",
            "Billing support logic: tenant lookup and status data needed by BillingService routes.",
        ],
    )

    add_heading(document, "4.6 Lead Lifecycle in the New Backend", level=2)
    add_numbered(
        document,
        [
            "A lead is created either directly through the authenticated CRM, through a public webhook, or through a conversation-related intake path.",
            "createLead persists the lead row with tenant ownership, customer identity, interest details, status, assignee, AI score, and metadata.",
            "An analytics event is written for lead.created.",
            "A speed-to-lead job is queued onto the automation queue.",
            "Subsequent CRM actions can move stage, assign ownership, append notes, request summaries, or request scoring refresh.",
        ],
    )
    add_paragraph(
        document,
        "The current AI layer is intentionally simple: lead summaries are generated from existing conversation text and lead metadata rather than from a live external LLM call inside the inspected code path.",
    )

    add_heading(document, "4.7 Conversation and Chat Logic", level=2)
    add_numbered(
        document,
        [
            "ChatController accepts a message payload and resolves tenant context either from middleware or directly from the request body fallback.",
            "PlatformService infers intent from simple keyword heuristics such as finance, trade-in, service booking, or test drive phrases.",
            "If no conversation exists yet, a new conversation row is created.",
            "Both the user message and assistant reply are inserted into conversationMessage records.",
            "The assistant reply is currently generated from deterministic helper logic, not a full AI orchestration engine.",
            "An analytics event is written for conversation.created.",
        ],
    )
    add_paragraph(
        document,
        "This means the current chat architecture already persists the right kinds of data for a future AI layer, even though the response generation is presently lightweight and largely rule-based.",
    )

    add_heading(document, "4.8 Notifications, Messaging, and Queues", level=2)
    add_table(
        document,
        ["Queue", "Processor", "Current behavior"],
        [
            ("automation", "AutomationProcessor", "Creates an automationExecution row, marks it processing, then completed. It is currently more of a traceable placeholder than a rich orchestrator."),
            ("notifications", "NotificationProcessor", "Delegates actual send work to MessagingService."),
            ("scoring", "ScoringProcessor", "Calls PlatformService.refreshLeadSummary to recompute AI score and summary."),
        ],
        [1.2, 1.6, 4.1],
    )
    add_paragraph(
        document,
        "MessagingService supports three delivery channels. Email uses Resend, WhatsApp uses 360dialog with encrypted tenant credentials, and SMS uses Twilio if configured. Every dispatch attempt is recorded in notificationDelivery, including failed sends.",
    )

    add_heading(document, "4.9 Billing Logic", level=2)
    add_paragraph(
        document,
        "BillingService translates a tenant plan into usage limits, exposes current billing status, and creates Stripe checkout or portal sessions. Usage is currently estimated in part from analytics events such as conversation.created rather than from a dedicated metering subsystem.",
    )
    add_bullets(
        document,
        [
            "Starter, growth, and enterprise plans each define limits for conversations, users, and vehicles.",
            "If a tenant does not yet have a Stripe customer record, BillingService creates one before creating checkout.",
            "The billing page therefore depends heavily on accurate tenant subscription fields and Stripe configuration environment variables.",
        ],
    )

    add_heading(document, "5. Data Model Logic", level=1)
    add_paragraph(
        document,
        "The Prisma schema is the clearest statement of intended platform breadth. It models the application as a complete dealership platform rather than a simple lead tracker.",
    )
    add_table(
        document,
        ["Entity family", "Representative models", "Why they matter"],
        [
            ("Tenant and identity", "Tenant, User, RefreshSession, PasswordResetToken", "Defines multi-tenancy, staff accounts, login sessions, and recovery flows."),
            ("Sales and conversations", "Lead, LeadNote, Conversation, ConversationMessage", "Captures inbound demand, follow-up notes, chat sessions, and persisted messaging transcripts."),
            ("Vehicles and deals", "Vehicle, TradeIn, FinanceApplication", "Represents stock, appraisal opportunities, and finance workflows."),
            ("Operations", "ServiceBooking, PartsEnquiry, PartCatalogItem", "Turns the platform into an operational aftersales system."),
            ("Customer lifecycle", "Customer, AutomationSequence, AutomationExecution", "Supports retention and lifecycle automation."),
            ("System configuration", "WidgetSetting, IntegrationConnection, WhatsappSetting, ApiSetting", "Stores tenant-specific system and integration settings."),
            ("Comms and observability", "TenantNotificationSetting, NotificationDelivery, AnalyticsEvent", "Supports delivery preferences, send audit trails, and activity metrics."),
            ("Support content", "SupportManual, SupportFaq, SupportQuery", "Captures knowledge base and support intake behavior."),
        ],
        [1.6, 2.3, 3.0],
    )

    add_heading(document, "6. Legacy Backend and Migration Context", level=1)
    add_paragraph(
        document,
        "The legacy backend still matters because it explains why some frontend screens and data contracts look the way they do. backend/index.js and backend/src show an earlier Express-based application that expected startup-time database migrations, stronger fail-fast env checks, and in some places graceful fallback to mock or in-memory data.",
    )
    add_paragraph(
        document,
        "The old leads module is especially revealing. It handled public widget intake, CRM listing, scoring, bulk actions, notifications, and mock-friendly behavior. That historical breadth helps explain why the newer frontend sometimes assumes very mature endpoints even when the Nest migration is still catching up.",
    )
    add_bullets(
        document,
        [
            "The new backend should be treated as the production direction of travel.",
            "The old backend remains valuable documentation of older business assumptions and fallback behaviors.",
            "Any production hardening effort should keep checking whether remaining gaps are missing implementations, stale frontend assumptions, or old backend behavior that still needs to be ported.",
        ],
    )

    add_heading(document, "7. End-to-End Logical Flows", level=1)
    add_heading(document, "7.1 New Tenant Onboarding", level=2)
    add_numbered(
        document,
        [
            "A dealership registers through the public registration flow.",
            "AuthService creates the tenant and first admin user in a transaction.",
            "PlatformService.bootstrapTenantDefaults seeds widget settings, notification settings, default automation sequences, and integration connection placeholders.",
            "The frontend receives tokens plus the user payload and immediately enters the authenticated workspace.",
        ],
    )
    add_heading(document, "7.2 Inbound Lead from External Source", level=2)
    add_numbered(
        document,
        [
            "A marketplace, website form, WhatsApp webhook, Facebook webhook, or inbound email webhook hits a public endpoint.",
            "PlatformController normalizes the incoming payload into the platform’s expected lead shape.",
            "createInboundLead calls createLead and may also queue or send follow-up messaging.",
            "The lead becomes visible in the CRM, where team members can assign, progress, and annotate it.",
        ],
    )
    add_heading(document, "7.3 Internal CRM Follow-Up", level=2)
    add_numbered(
        document,
        [
            "The leads page fetches stats, list data, and assignable team members.",
            "A user updates stage, reassigns, adds notes, or requests AI scoring and summarization.",
            "Those actions mutate lead records directly through LeadsController and PlatformService.",
            "Sidebar polling and dashboard metrics pick up those changes as the app refreshes.",
        ],
    )
    add_heading(document, "7.4 Billing Upgrade", level=2)
    add_numbered(
        document,
        [
            "The billing page loads usage and plan status.",
            "If the user upgrades, the frontend posts plan choice plus success and cancel URLs.",
            "BillingService creates or reuses the Stripe customer, creates a checkout session, and returns the hosted session URL.",
            "The browser navigates out to Stripe to complete billing actions.",
        ],
    )

    add_heading(document, "8. Current Gaps, Risks, and What to Watch", level=1)
    add_bullets(
        document,
        [
            "PlatformService is very large, which makes it fast to iterate in one place but increases coupling and makes domain ownership less obvious.",
            "Some frontend modules are richer than the currently implemented backend logic, so perceived product completeness can exceed actual API coverage.",
            "Automation processing is currently shallow. The queue pipeline exists and is observable, but automation behavior is not yet deeply orchestrated.",
            "The global app tenant pattern is useful operationally, but it needs careful handling because it creates a privileged path that behaves differently from standard tenant isolation.",
            "Billing, messaging, and webhook flows are highly environment-dependent. Correct production behavior relies on complete provider configuration.",
            "The repository still contains enough legacy code that developers can easily read the wrong path unless they are explicit about which runtime they are touching.",
        ],
    )

    add_heading(document, "9. Practical Mental Model for Working in This Codebase", level=1)
    add_bullets(
        document,
        [
            "Think of the frontend as the dealership operating console.",
            "Think of Prisma as the canonical business vocabulary.",
            "Think of Nest controllers as HTTP entry points and PlatformService as the current domain hub.",
            "Think of BullMQ as the system’s asynchronous spine, even though some processors are still lightweight.",
            "Think of backend/src as migration history and behavior reference, not the primary future architecture.",
        ],
    )
    add_paragraph(
        document,
        "If you keep those five frames in mind, the repo becomes much easier to reason about. Most confusion comes from mixing the intended architecture, the current runtime architecture, and the historical architecture into one mental model. They overlap, but they are not the same thing.",
    )

    document.save(OUTPUT_PATH)


if __name__ == "__main__":
    build()
