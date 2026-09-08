# ATM Service Quality Monitoring Dashboard

A prototype implementation of **Proposal 1** for GCB Bank PLC: a digital system that
collects real-time customer feedback on ATM service quality (network reliability,
transaction speed, cash availability, security) via a QR-code-linked web form, a
simulated USSD session, and a simulated SMS shortcode — then aggregates it into a
management dashboard showing service quality trends by branch and machine over time.

This turns the underlying research's one-time customer satisfaction survey into an
ongoing, data-driven monitoring tool.

## How it maps to the proposal

| Proposal requirement | Implementation |
|---|---|
| Feedback via USSD, SMS, or QR-linked web form, right after a transaction | `POST /api/ussd`, `POST /api/sms`, `POST /api/feedback` + `client/src/pages/FeedbackForm.jsx` |
| Feedback data aggregated into a dashboard | `GET /api/dashboard/*` + `client/src/pages/Dashboard.jsx` |
| Trends by branch and machine, over time | `/api/dashboard/trends` (daily/weekly/monthly), `/api/dashboard/branches`, `/api/dashboard/machines` |
| Actionable insight into recurring issues | `/api/dashboard/alerts` — flags ATMs whose recent average satisfaction is at/below a threshold |

## Architecture

```
atm/
  server/   Express API + SQLite (node:sqlite) — feedback intake, auth, aggregation
  client/   React + Vite — public feedback form, USSD/SMS/QR simulator, admin dashboard
```

No paid telecom integration is required to demo this: the USSD and SMS endpoints
implement the same request/response contract a real gateway (e.g. Africa's Talking)
would call, so swapping in a live gateway later is a routing change, not a rewrite.
The QR code embedded per ATM points straight at the web feedback form.

## Running locally

Requires Node.js 22+ (uses the built-in `node:sqlite` module — no native build step,
no external database to install).

```bash
# 1. API
cd server
npm install
npm run seed   # creates server/data/atm.sqlite with demo branches/machines/feedback
npm start       # http://localhost:4000

# 2. Web app (separate terminal)
cd client
npm install
npm run dev     # http://localhost:5173
```

Demo admin login for the dashboard: `admin@gcb.example` / `ChangeMe123!`

## Key flows to try

- **`/feedback?machine=ATM-ACC-01`** — the public form a customer sees after scanning
  the QR code on their receipt.
- **`/simulator`** — a phone-style USSD walkthrough, an SMS composer, and a QR code
  generator per ATM (so you can see exactly what would be printed on a receipt).
- **`/dashboard`** (after logging in) — KPI tiles, a 5-metric trend chart, a
  branch comparison chart, a recent-activity feed, and an "ATMs needing attention"
  alert table, all filterable by branch, ATM, and date range.

## API summary

| Endpoint | Purpose |
|---|---|
| `POST /api/feedback` | Web form submission (public) |
| `POST /api/ussd` | Simulated USSD gateway callback (public) |
| `POST /api/sms` | Simulated inbound SMS (public) |
| `GET /api/machines/:code/qrcode` | Per-ATM QR code linking to the feedback form |
| `POST /api/auth/login` | Admin login, returns a JWT |
| `GET /api/dashboard/summary` \| `/trends` \| `/branches` \| `/machines` \| `/alerts` \| `/recent` | Dashboard data (requires the admin JWT) |

## Branding

The interface uses GCB Bank PLC's navy-and-gold identity from its 2014 "soaring
eagle" rebrand. `client/src/assets/gcb-mark.svg` is an original mark inspired by
that identity (built in this environment, which has no outbound internet access to
fetch GCB's actual logo file) — replace it with GCB's official logo asset if you
have one; it's referenced from `Navbar.jsx` and `public/favicon.svg`. Brand colors
are CSS custom properties (`--brand-navy`, `--brand-gold`, ...) in `client/src/styles.css`
— update those to match GCB's official brand guide if it specifies different hex values.

## Notes on scope

This is a working prototype built to demonstrate the proposal end-to-end, not a
production banking system: auth is a single seeded admin account, SQLite is used in
place of a managed database, and USSD/SMS are simulated rather than wired to a live
telco aggregator. Each of those is a swap-in, not a redesign, when moving toward
production (e.g. Postgres for the database, an Africa's Talking/similar account for
real USSD/SMS, proper admin user management).
