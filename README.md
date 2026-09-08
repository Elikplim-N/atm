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
  server/   Express API + PostgreSQL — feedback intake, auth, aggregation
  client/   React + Vite — public feedback form, USSD/SMS/QR simulator, admin dashboard
```

No paid telecom integration is required to demo this: the USSD and SMS endpoints
implement the same request/response contract a real gateway (e.g. Africa's Talking)
would call, so swapping in a live gateway later is a routing change, not a rewrite.
The QR code embedded per ATM points straight at the web feedback form.

## Running locally

Requires Node.js 22+ and a PostgreSQL database (any Postgres 12+ works — a managed
instance, a VPS, or a local install).

```bash
# 1. API
cd server
npm install
cp .env.example .env   # then set DATABASE_URL to your Postgres connection string
npm run seed            # creates the schema + demo branches/machines/feedback
npm start                # http://localhost:4000

# 2. Web app (separate terminal)
cd client
npm install
npm run dev     # http://localhost:5173
```

The server won't start without `DATABASE_URL` set — it creates its own tables on
first run (`initSchema()` in `server/src/db.js`), so an empty database is fine as
long as the user in the connection string can create tables in it.

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

The interface uses GCB Bank PLC's official logo (`client/src/assets/gcb-logo.png`,
supplied directly) and its navy-and-gold identity from the bank's 2014 "soaring
eagle" rebrand. The logo sits on a white chip in the navy navbar so its black
wordmark stays legible; `public/favicon.png` is an eagle-only crop of the same
file, padded onto a navy square, for the browser tab icon. Brand colors are CSS
custom properties (`--brand-navy`, `--brand-gold`, ...) in `client/src/styles.css`
— update those if GCB's brand guide specifies different hex values.

## Notes on scope

This is a working prototype built to demonstrate the proposal end-to-end, not a
production banking system: auth is a single seeded admin account, and USSD/SMS are
simulated rather than wired to a live telco aggregator. Each of those is a swap-in,
not a redesign, when moving toward production (e.g. an Africa's Talking/similar
account for real USSD/SMS, proper admin user management, connection pooling tuned
for the deployment target).
