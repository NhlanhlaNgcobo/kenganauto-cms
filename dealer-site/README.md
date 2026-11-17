# Acme Cars — demo dealership website

A fictional, premium dealership site that runs on its own origin (like a dealer's real domain) and is wired live into **KenganAuto**. Everything a visitor does is captured in the Acme Cars dashboard.

| Visitor action on the site | What the dealer sees in KenganAuto |
|---|---|
| Opens a car | Live "Viewed …" row in **Dashboard → Website activity**; counts toward **Most viewed this week** |
| Books a test drive | New lead (source *Website*, status *Test drive booked*, preferred slot, browsing signal) + live toast |
| Sends an enquiry | New lead with the customer's question |
| Applies for finance | Qualified lead with affordability % + a **finance application** |
| Values a trade-in | Lead + a **valued trade-in** with the instant estimate shown |
| Books a service | **Service booking** with contact details (customer record created) |
| Chats with the assistant | Conversation in **AI Chat** (KenganAuto widget, branded Acme) |

All capture endpoints require explicit POPIA consent and are rate-limited. Vehicle views are tracked with an anonymous browser id only.

## Run

```bash
npm install
npm run dev        # http://localhost:5174
```

Needs the KenganAuto API on `http://localhost:3000`. Configure with env vars:

| Variable | Default |
|---|---|
| `VITE_API_URL` | `http://localhost:3000` |
| `VITE_TENANT_ID` | `5` (the demo dealership) |
| `VITE_DASHBOARD_URL` | `http://localhost:5173/dashboard` |

## Notes
- No framework: `index.html` + `src/main.js` + `src/styles.css`, built with Vite.
- Stock, prices and photos come live from the dealer's KenganAuto inventory (`/api/public/dealer/:tenantId/stock`).
- Vehicle photos: Wikimedia Commons, credited in `frontend/public/demo-vehicles/CREDITS.md`.
- Motion respects `prefers-reduced-motion`; content stays visible if JavaScript fails.
- Acme Cars is fictional. The footer says so.
