import fs from 'node:fs/promises';
import path from 'node:path';
import {
  Presentation,
  PresentationFile,
  row,
  column,
  grid,
  panel,
  text,
  rule,
  fill,
  hug,
  fixed,
  wrap,
  fr,
  auto,
} from '@oai/artifact-tool';

const WORKSPACE = 'C:\\Users\\NhlanhlaNgcobo\\OneDrive\\Desktop\\KenganAuto OS\\tmp\\presentations\\kenganauto-client-overview';
const SCRATCH = path.join(WORKSPACE, 'scratch');
const OUTPUT = path.join(WORKSPACE, 'output');
const PPTX_PATH = path.join(OUTPUT, 'output.pptx');
const INSPECT_PATH = path.join(SCRATCH, 'presentation-inspect.ndjson');
const INSPECT_META_PATH = path.join(SCRATCH, 'presentation-inspect-metadata.json');
const PREVIEW_DIR = path.join(SCRATCH, 'previews');
const MONTAGE_PATH = path.join(PREVIEW_DIR, 'deck-montage.png');

const COLORS = {
  bg: '#0B1220',
  surface: '#121C2F',
  surfaceSoft: '#16233A',
  gold: '#C9A84C',
  blue: '#5AA6FF',
  green: '#57D39B',
  coral: '#F08D73',
  text: '#F7F8FB',
  muted: '#9FAEC7',
  subtle: '#6D7A92',
};

const deck = Presentation.create({
  slideSize: { width: 1920, height: 1080 },
});

function softPanel(title, body, accent = COLORS.gold) {
  return panel(
    {
      width: fill,
      height: fill,
      padding: { x: 28, y: 24 },
      fill: { type: 'solid', color: COLORS.surfaceSoft },
      line: { fill: `${accent}55`, width: 1 },
      borderRadius: 'rounded-xl',
    },
    column({ width: fill, height: hug, gap: 12 }, [
      text(title, {
        width: fill,
        height: hug,
        style: { fontSize: 26, bold: true, color: COLORS.text },
      }),
      text(body, {
        width: fill,
        height: hug,
        style: { fontSize: 18, color: COLORS.muted, lineSpacing: 1.25 },
      }),
    ]),
  );
}

function statPanel(kicker, headline, body) {
  return panel(
    {
      width: fill,
      height: fill,
      padding: { x: 28, y: 26 },
      fill: { type: 'solid', color: COLORS.surface },
      line: { fill: '#27344D', width: 1 },
      borderRadius: 'rounded-xl',
    },
    column({ width: fill, height: hug, gap: 12 }, [
      text(kicker, {
        width: fill,
        height: hug,
        style: {
          fontSize: 14,
          bold: true,
          color: COLORS.gold,
          allCaps: true,
          tracking: 2.2,
        },
      }),
      text(headline, {
        width: fill,
        height: hug,
        style: { fontSize: 31, bold: true, color: COLORS.text },
      }),
      text(body, {
        width: fill,
        height: hug,
        style: { fontSize: 18, color: COLORS.muted, lineSpacing: 1.25 },
      }),
    ]),
  );
}

function addChrome(slide) {
  slide.background.fill = { type: 'solid', color: COLORS.bg };
}

function addTitleStack(title, subtitle, eyebrow = 'KenganAuto OS') {
  return column(
    { name: 'title-stack', width: fill, height: hug, gap: 14, columnSpan: 2 },
    [
      text(eyebrow, {
        name: 'eyebrow',
        width: fill,
        height: hug,
        style: {
          fontSize: 15,
          bold: true,
          color: COLORS.gold,
          allCaps: true,
          tracking: 2.4,
        },
      }),
      text(title, {
        name: 'slide-title',
        width: wrap(1320),
        height: hug,
        style: { fontSize: 58, bold: true, color: COLORS.text, lineSpacing: 1.05 },
      }),
      rule({
        name: 'headline-rule',
        width: fixed(180),
        stroke: COLORS.gold,
        weight: 4,
      }),
      text(subtitle, {
        name: 'slide-subtitle',
        width: wrap(1280),
        height: hug,
        style: { fontSize: 24, color: COLORS.muted, lineSpacing: 1.22 },
      }),
    ],
  );
}

function addFooter(slide, label) {
  slide.compose(
    text(label, {
      name: 'footer',
      width: wrap(500),
      height: hug,
      style: { fontSize: 12, color: COLORS.subtle },
    }),
    {
      frame: { left: 80, top: 1024, width: 500, height: 20 },
      baseUnit: 8,
    },
  );
}

function buildCover() {
  const slide = deck.slides.add();
  addChrome(slide);
  slide.compose(
    grid(
      {
        name: 'cover-root',
        width: fill,
        height: fill,
        columns: [fr(1.3), fr(0.7)],
        rows: [fr(1), auto],
        columnGap: 48,
        rowGap: 24,
        padding: { x: 88, y: 80 },
      },
      [
        column({ width: fill, height: fill, gap: 18 }, [
          text('KenganAuto OS', {
            name: 'cover-title',
            width: wrap(900),
            height: hug,
            style: { fontSize: 76, bold: true, color: COLORS.text, lineSpacing: 1.02 },
          }),
          rule({ name: 'cover-rule', width: fixed(210), stroke: COLORS.gold, weight: 5 }),
          text(
            'A dealership operating system that brings lead capture, customer engagement, inventory, service, parts, retention, billing, and reporting into one connected workspace.',
            {
              name: 'cover-subtitle',
              width: wrap(980),
              height: hug,
              style: { fontSize: 28, color: COLORS.muted, lineSpacing: 1.24 },
            },
          ),
          text(
            'Client-facing product overview',
            {
              name: 'cover-context',
              width: wrap(560),
              height: hug,
              style: { fontSize: 18, color: COLORS.gold },
            },
          ),
        ]),
        column({ width: fill, height: fill, gap: 18 }, [
          statPanel('Unified workspace', 'One system for the dealership team', 'Sales, operations, and customer communication live in one platform instead of separate disconnected tools.'),
          statPanel('Faster response', 'Capture and route enquiries quickly', 'Leads can arrive from web chat, WhatsApp, Facebook, marketplaces, or generic webhooks and flow into the pipeline.'),
          statPanel('Built for follow-through', 'Keep customers engaged after the first enquiry', 'The platform supports notifications, AI chat, retention sequences, and database reactivation workflows.'),
        ]),
        text('Prepared for dealership teams evaluating the platform.', {
          name: 'cover-footer',
          width: wrap(700),
          height: hug,
          columnSpan: 2,
          style: { fontSize: 12, color: COLORS.subtle },
        }),
      ],
    ),
    { frame: { left: 0, top: 0, width: 1920, height: 1080 }, baseUnit: 8 },
  );
}

function buildWorkflowSlide() {
  const slide = deck.slides.add();
  addChrome(slide);
  slide.compose(
    grid(
      {
        name: 'workflow-root',
        width: fill,
        height: fill,
        columns: [fr(1), fr(1)],
        rows: [auto, fr(1), auto],
        columnGap: 36,
        rowGap: 34,
        padding: { x: 80, y: 68 },
      },
      [
        addTitleStack(
          'How the platform works',
          'KenganAuto OS follows the daily dealership journey from first enquiry to operational delivery, customer follow-up, and performance reporting.',
          'Product flow',
        ),
        row({ width: fill, height: fill, gap: 22, columnSpan: 2 }, [
          softPanel('1. Capture', 'Enquiries can come in through the web widget, WhatsApp, Facebook Lead Ads, inbound email, marketplaces, or a custom webhook.', COLORS.gold),
          softPanel('2. Qualify', 'The sales team works inside the lead pipeline, reviews customer details, adds notes, assigns ownership, and tracks stage movement.', COLORS.blue),
          softPanel('3. Operate', 'Stock, service bookings, parts requests, trade-ins, and support activity can be handled inside dedicated operational modules.', COLORS.green),
          softPanel('4. Retain', 'Notifications, sequences, and enterprise retention campaigns help teams keep customers engaged after the initial sale or service interaction.', COLORS.coral),
        ]),
        text(
          'The result is a single operating layer for the dealership instead of separate tools for CRM, service communication, stock updates, and retention follow-up.',
          {
            name: 'workflow-landing',
            width: wrap(1500),
            height: hug,
            columnSpan: 2,
            style: { fontSize: 22, color: COLORS.text, lineSpacing: 1.2 },
          },
        ),
      ],
    ),
    { frame: { left: 0, top: 0, width: 1920, height: 1080 }, baseUnit: 8 },
  );
  addFooter(slide, 'Overview of the core user journey in KenganAuto OS');
}

function buildSalesSlide() {
  const slide = deck.slides.add();
  addChrome(slide);
  slide.compose(
    grid(
      {
        name: 'sales-root',
        width: fill,
        height: fill,
        columns: [fr(1), fr(1)],
        rows: [auto, fr(1), fr(1)],
        columnGap: 30,
        rowGap: 24,
        padding: { x: 80, y: 68 },
      },
      [
        addTitleStack(
          'Sales workspace',
          'The platform gives the front-office team one place to manage lead response, customer context, finance follow-up, and trade-in activity.',
          'Commercial modules',
        ),
        softPanel('Lead pipeline', 'The lead page keeps the pipeline central, surfaces overdue follow-ups, and supports filtering by stage, source, or salesperson.', COLORS.gold),
        softPanel('Customer database', 'Customer records hold contact details, owned vehicles, tags, loyalty information, and interaction context for future follow-up.', COLORS.blue),
        softPanel('AI conversations hub', 'The chatbot and conversation views centralize incoming chats and support fast response across digital channels.', COLORS.green),
        softPanel('Finance and trade-ins', 'Finance applications and trade-in enquiries have dedicated flows so the sales process can continue beyond the first enquiry.', COLORS.coral),
      ],
    ),
    { frame: { left: 0, top: 0, width: 1920, height: 1080 }, baseUnit: 8 },
  );
  addFooter(slide, 'Sales-related areas visible from the main navigation');
}

function buildOperationsSlide() {
  const slide = deck.slides.add();
  addChrome(slide);
  slide.compose(
    grid(
      {
        name: 'ops-root',
        width: fill,
        height: fill,
        columns: [fr(1), fr(1)],
        rows: [auto, fr(1), fr(1)],
        columnGap: 30,
        rowGap: 24,
        padding: { x: 80, y: 68 },
      },
      [
        addTitleStack(
          'Operations workspace',
          'KenganAuto OS is not only a lead tool. It also gives teams dedicated pages for stock, workshop, parts, and dealership support workflows.',
          'Operational modules',
        ),
        softPanel('Inventory manager', 'Vehicle stock can be listed, updated, and monitored so sales teams and managers stay aligned on what is available, reserved, or sold.', COLORS.gold),
        softPanel('Service department', 'Service bookings can be scheduled, updated, and tracked alongside customer and vehicle information.', COLORS.blue),
        softPanel('Parts department', 'Parts enquiries, catalog entries, and parts-related analytics are supported inside the operations layer.', COLORS.green),
        softPanel('Support and manuals', 'A support area gives teams access to manuals, FAQs, and support queries from a single knowledge workspace.', COLORS.coral),
      ],
    ),
    { frame: { left: 0, top: 0, width: 1920, height: 1080 }, baseUnit: 8 },
  );
  addFooter(slide, 'Operations pages available to dealership teams');
}

function buildEngagementSlide() {
  const slide = deck.slides.add();
  addChrome(slide);
  slide.compose(
    grid(
      {
        name: 'engagement-root',
        width: fill,
        height: fill,
        columns: [fr(0.95), fr(1.05)],
        rows: [auto, fr(1)],
        columnGap: 34,
        rowGap: 26,
        padding: { x: 80, y: 68 },
      },
      [
        addTitleStack(
          'Customer engagement and retention',
          'The app supports both live conversations and longer-term follow-up, helping a dealership stay present before and after a sale or service event.',
          'Engagement layer',
        ),
        column({ width: fill, height: fill, gap: 22 }, [
          statPanel('Live capture', 'Website chat widget', 'A built-in website widget can capture enquiries directly into the platform and act as a first digital contact point.'),
          statPanel('Messaging', 'WhatsApp Business setup', 'Dedicated WhatsApp settings allow the dealership to manage messaging configuration for conversational engagement.'),
          statPanel('Communication triggers', 'Notifications', 'Notification settings define communication triggers and test notifications across supported channels.'),
        ]),
        column({ width: fill, height: fill, gap: 22 }, [
          softPanel('Retention sequences', 'The retention section includes nurture sequences and loyalty/NPS views for longer-term customer engagement.', COLORS.blue),
          softPanel('Database reactivation', 'Enterprise users can review audiences, monitor automatic campaigns, and create manual reactivation outreach when needed.', COLORS.gold),
          softPanel('Recent activity and feedback', 'Campaign runs, audience previews, and feedback snapshots help the team understand whether engagement is working.', COLORS.green),
        ]),
      ],
    ),
    { frame: { left: 0, top: 0, width: 1920, height: 1080 }, baseUnit: 8 },
  );
  addFooter(slide, 'Communication, retention, and follow-up features in the platform');
}

function buildIntegrationsSlide() {
  const slide = deck.slides.add();
  addChrome(slide);
  slide.compose(
    grid(
      {
        name: 'integrations-root',
        width: fill,
        height: fill,
        columns: [fr(1), fr(1)],
        rows: [auto, fr(1), auto],
        columnGap: 32,
        rowGap: 24,
        padding: { x: 80, y: 68 },
      },
      [
        addTitleStack(
          'Integrations and automation',
          'The integrations layer is designed to connect the places enquiries come from and reduce manual re-entry for the dealership team.',
          'Connected lead sources',
        ),
        row({ width: fill, height: fill, gap: 20, columnSpan: 2 }, [
          softPanel('Marketplace capture', 'AutoTrader.co.za and Cars.co.za lead flows are supported through inbound lead forwarding.', COLORS.gold),
          softPanel('Social lead capture', 'Facebook Lead Ads can be connected so instant-form enquiries land directly in the platform.', COLORS.blue),
          softPanel('Custom channels', 'A generic webhook endpoint supports custom website forms and external systems.', COLORS.green),
          softPanel('Inbound routing', 'Inbound email parsing and webhook handlers help normalize lead intake from multiple channels.', COLORS.coral),
        ]),
        text(
          'This means the dealership can keep its preferred lead sources while centralizing response, follow-up, and reporting inside one operating environment.',
          {
            name: 'integration-landing',
            width: wrap(1450),
            height: hug,
            columnSpan: 2,
            style: { fontSize: 22, color: COLORS.text, lineSpacing: 1.2 },
          },
        ),
      ],
    ),
    { frame: { left: 0, top: 0, width: 1920, height: 1080 }, baseUnit: 8 },
  );
  addFooter(slide, 'Examples of lead-source connections shown in the app');
}

function buildControlSlide() {
  const slide = deck.slides.add();
  addChrome(slide);
  slide.compose(
    grid(
      {
        name: 'control-root',
        width: fill,
        height: fill,
        columns: [fr(1), fr(1)],
        rows: [auto, fr(1), fr(1)],
        columnGap: 30,
        rowGap: 24,
        padding: { x: 80, y: 68 },
      },
      [
        addTitleStack(
          'Control, access, and commercial model',
          'The application includes role-aware navigation, onboarding, billing management, and supporting admin controls so the workspace can scale with a dealership team.',
          'Platform governance',
        ),
        softPanel('Protected access', 'The app uses authentication and protected routes so each role sees the modules relevant to its responsibilities.', COLORS.gold),
        softPanel('Onboarding and help', 'There are dedicated onboarding and help pages to support implementation and day-to-day adoption.', COLORS.blue),
        softPanel('Billing page', 'Clients can review their plan, usage, available upgrades, and subscription state in a dedicated billing view.', COLORS.green),
        softPanel('Role-based workspace', 'Navigation sections are grouped across sales, operations, settings, and admin to keep the interface relevant to each user.', COLORS.coral),
      ],
    ),
    { frame: { left: 0, top: 0, width: 1920, height: 1080 }, baseUnit: 8 },
  );
  addFooter(slide, 'Access, onboarding, and subscription management in the product');
}

function buildOutcomeSlide() {
  const slide = deck.slides.add();
  addChrome(slide);
  slide.compose(
    grid(
      {
        name: 'outcomes-root',
        width: fill,
        height: fill,
        columns: [fr(1.05), fr(0.95)],
        rows: [auto, fr(1)],
        columnGap: 34,
        rowGap: 26,
        padding: { x: 80, y: 68 },
      },
      [
        addTitleStack(
          'What a dealership gains from the platform',
          'KenganAuto OS is designed to reduce tool sprawl, improve follow-through, and give dealership teams one shared operating view across the customer journey.',
          'Business value',
        ),
        column({ width: fill, height: fill, gap: 18 }, [
          statPanel('Speed', 'Faster response to inbound enquiries', 'Leads from multiple channels can be captured into one pipeline instead of being handled in disconnected inboxes.'),
          statPanel('Visibility', 'A clearer operational picture', 'Managers can move from sales activity to stock, service, parts, retention, and billing without leaving the system.'),
          statPanel('Continuity', 'More consistent customer follow-up', 'Notification triggers, chatbot workflows, and retention tools help the team stay present after first contact.'),
        ]),
        panel(
          {
            width: fill,
            height: fill,
            padding: { x: 34, y: 34 },
            fill: { type: 'solid', color: COLORS.surface },
            line: { fill: '#2B3953', width: 1 },
            borderRadius: 'rounded-xl',
          },
          column({ width: fill, height: fill, gap: 18 }, [
            text('In practical terms', {
              name: 'practical-title',
              width: fill,
              height: hug,
              style: { fontSize: 34, bold: true, color: COLORS.text },
            }),
            text(
              'The platform is best understood as a connected dealership workspace rather than a single-purpose CRM. It supports enquiry capture, internal coordination, customer communication, and ongoing performance review in one environment.',
              {
                name: 'practical-body',
                width: fill,
                height: hug,
                style: { fontSize: 22, color: COLORS.muted, lineSpacing: 1.24 },
              },
            ),
            rule({ name: 'practical-rule', width: fixed(160), stroke: COLORS.gold, weight: 4 }),
            text(
              'This makes it easier for a dealership to respond faster, operate from one source of truth, and create a more joined-up customer experience.',
              {
                name: 'practical-close',
                width: wrap(700),
                height: hug,
                style: { fontSize: 22, color: COLORS.text, lineSpacing: 1.22 },
              },
            ),
          ]),
        ),
      ],
    ),
    { frame: { left: 0, top: 0, width: 1920, height: 1080 }, baseUnit: 8 },
  );
  addFooter(slide, 'Client-facing summary of platform value');
}

buildCover();
buildWorkflowSlide();
buildSalesSlide();
buildOperationsSlide();
buildEngagementSlide();
buildIntegrationsSlide();
buildControlSlide();
buildOutcomeSlide();

async function saveBlob(blob, filePath) {
  let buffer;
  if (blob && typeof blob.arrayBuffer === 'function') {
    buffer = Buffer.from(await blob.arrayBuffer());
  } else if (Buffer.isBuffer(blob)) {
    buffer = blob;
  } else if (blob instanceof Uint8Array) {
    buffer = Buffer.from(blob);
  } else if (blob?.data instanceof Uint8Array) {
    buffer = Buffer.from(blob.data);
  } else if (blob?.buffer instanceof ArrayBuffer) {
    buffer = Buffer.from(blob.buffer, blob.byteOffset ?? 0, blob.byteLength ?? blob.buffer.byteLength);
  } else {
    throw new TypeError(`Unsupported export payload for ${filePath}`);
  }
  await fs.writeFile(filePath, buffer);
}

async function main() {
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  await fs.mkdir(OUTPUT, { recursive: true });

  const pptxBlob = await PresentationFile.exportPptx(deck);
  await saveBlob(pptxBlob, PPTX_PATH);

  const deckPreviewBlob = await deck.export();
  await saveBlob(deckPreviewBlob, MONTAGE_PATH);

  for (let i = 0; i < deck.slides.length; i += 1) {
    const slide = deck.slides.getItem(i);
    const previewBlob = await slide.export();
    await saveBlob(previewBlob, path.join(PREVIEW_DIR, `slide-${String(i + 1).padStart(2, '0')}.png`));
  }

  const inspection = await deck.inspect();
  await fs.writeFile(INSPECT_PATH, `${inspection.ndjson}\n`, 'utf8');
  await fs.writeFile(INSPECT_META_PATH, `${JSON.stringify(inspection.metadata, null, 2)}\n`, 'utf8');

  const summary = {
    slideCount: deck.slides.length,
    pptx: PPTX_PATH,
    montage: MONTAGE_PATH,
    previews: Array.from({ length: deck.slides.length }, (_, index) =>
      path.join(PREVIEW_DIR, `slide-${String(index + 1).padStart(2, '0')}.png`),
    ),
    inspectNdjson: INSPECT_PATH,
    inspectMeta: INSPECT_META_PATH,
  };

  await fs.writeFile(path.join(SCRATCH, 'build-summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

await main();
