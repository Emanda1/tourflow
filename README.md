# TourFlow – Tour Booking & Operations System

A complete booking and management system for travel and tour companies, built with **Next.js** and **SQLite**.

## What it does

**Customer website**
- Live search, category filters, budget slider and sorting on the home page
- Tour pages with a day-by-day itinerary you can expand, a date picker showing seats left, and a live price calculator
- Step-by-step booking (Travellers → Contact → Payment) with a review before paying
- "Request a custom trip" form for groups, schools and companies
- WhatsApp chat button on every page
- Pay in full or pay a deposit, then pay the balance in instalments (mobile money or card via Paystack)
- "My booking" page to check status, see balance and pay instalments

**Admin dashboard** (`/admin`)
- Dashboard: money collected, outstanding balances, interactive monthly revenue/bookings chart, upcoming trips
- Calendar of all trips by month
- Bookings table with instant search, status tabs and sortable columns
- CSV export of bookings and trip manifests (opens in Excel)
- Trip requests inbox with one-tap WhatsApp/call and status tracking
- Upload tour cover photos
- Staff accounts with roles, activity log, automatic daily backups, company settings (logo, colours, policies)
- Printable receipts and optional email receipts
- Bookings: search, filter, record cash/MoMo/bank payments, refunds, confirm or cancel with a reason, send balance reminders
- Manual bookings for walk-in, phone and WhatsApp customers
- Tours: create and edit tours, prices, deposit %, itinerary, and add departure dates
- Trips & manifests: searchable passenger list, one-tap check-in with live progress, assign guide/driver/vehicle, print manifest, SMS all travellers
- Customers with trip history and total spent
- Guides, drivers and vehicles
- Message log of every SMS sent

## Run it on your computer

You need **Node.js 20 or newer** (https://nodejs.org – choose the LTS version).

1. Open this folder in VS Code (File → Open Folder…).
2. Open the terminal in VS Code (Terminal → New Terminal) and run:
   ```
   npm install
   npm run dev
   ```
3. Open http://localhost:3000 for the customer website.
4. Open http://localhost:3000/admin. The first time, you'll create the **owner account** (your name, email and a password of 10+ characters). After that, add staff under **Staff accounts**.

The database is created automatically at `data/tourflow.db` with sample tours and bookings.
To start fresh, stop the server and run `npm run reset-db`. (If you ran an earlier version, do this once to load the new sample history for the charts.)

## Settings

Company name, logo, contact details, brand colour and cancellation policy are edited in **Admin → Settings**.

Secret keys (Paystack, SMS, email) go in `.env.local` locally, or in your hosting dashboard when live. Copy `.env.example` to `.env.local` to start; every setting is explained inside. On your own computer, payments run in **demo mode** (no real money). On a live server demo mode is off.

## Going live

Read **[DEPLOYMENT.md](DEPLOYMENT.md)**: hosting options, server settings, connecting Paystack, first-time setup, backups and a go-live checklist.

Read **[SECURITY.md](SECURITY.md)**: what the system does to protect the business and its customers, and what the operator must do.

## Staff roles

| Role | Can do |
|---|---|
| Owner | Everything, including staff accounts, settings, backups and the activity log |
| Manager | Everything except staff, settings and backups. Can refund and export. |
| Sales / front desk | Bookings, payments, customers, trip requests. No refunds, no tour editing. |
| Operations / guide | Trips, manifests, check-in, guides and vehicles. Cannot see revenue or take payments. |

## Tests

```
npm test
```
Runs the automated checks for passwords, sign-in lockouts and reset links, permissions, input validation, phone numbers, CSV safety, booking and deposit rules, refunds, late payments, seat release and database upgrades.

## Project structure

```
app/
  (site)/          customer website (home, tour page, booking, payment, my booking)
  admin/           staff area; actions.js (bookings, trips) and account-actions.js (sign-in, staff, settings)
  api/             payment start, Paystack callback and webhook, health check
components/        shared forms and cards
lib/
  db.js            database schema and queries
  seed.js          sample data
  bookings.js      booking + payment rules (deposits, confirmation, SMS)
  checkout.js      Paystack / demo payment flow
  paystack.js      Paystack API
  notify.js        SMS (Arkesel)
  mailer.js        email receipts (SMTP)
  auth.js          sessions; password.js hashing; permissions.js roles
  validate.js      input checks; ratelimit.js; uploads.js image checks
  backup.js, jobs.js  daily backups and releasing unpaid seats
tests/             automated tests (npm test)
data/              database, uploads and backups (created on first run, never committed)
```

All money is stored in **pesewas** (GH₵ 1 = 100) to avoid rounding errors.

## Business rules
- A booking holds its seats as soon as it's made (status **pending**). Unpaid online bookings release their seats after 30 minutes (unless a payment is in progress).
- It becomes **confirmed** automatically once the customer has paid at least the deposit.
- Cancelling a booking frees its seats.
- Customers are matched by phone number, so repeat customers build up a history.

## Ideas for later
- Two-factor sign-in for owners
- Agent / affiliate portal with commissions
- PostgreSQL for multi-server hosting
