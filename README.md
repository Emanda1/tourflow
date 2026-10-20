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
- Bookings: search, filter, record cash/MoMo/bank payments, confirm or cancel, send balance reminders
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
4. Open http://localhost:3000/admin for the staff area. Default password: **admin123**

The database is created automatically at `data/tourflow.db` with sample tours and bookings.
To start fresh, stop the server and run `npm run reset-db`. (If you ran an earlier version, do this once to load the new sample history for the charts.)

## Settings (`.env.local`)

The app runs fine without this file (it uses demo settings). To customise it, make a copy of `.env.example`, name it `.env.local`, and edit the values.

| Setting | What it does |
|---|---|
| `COMPANY_NAME`, `COMPANY_PHONE`, `COMPANY_EMAIL` | Shown on the website and in SMS |
| `ADMIN_PASSWORD` | Staff login password. **Change it before going live.** |
| `SESSION_SECRET` | Any long random text |
| `PAYSTACK_SECRET_KEY` | Turns on real MoMo & card payments. Empty = demo payments |
| `APP_URL` | Your live website address (used for Paystack callbacks) |
| `ARKESEL_API_KEY`, `SMS_SENDER_ID` | Turns on real SMS. Empty = messages only logged |

Restart `npm run dev` after changing `.env.local`.

### Taking real payments with Paystack
1. Create an account at https://paystack.com and get your **test** secret key (starts with `sk_test_`).
2. Put it in `PAYSTACK_SECRET_KEY` and restart. Bookings now go to Paystack's checkout.
3. In the Paystack dashboard, set the webhook URL to `https://YOUR-DOMAIN/api/paystack/webhook`.
4. When ready, switch to your live key (`sk_live_…`).

## Project structure

```
app/
  (site)/          customer website (home, tour page, booking, payment, my booking)
  admin/           staff dashboard and all admin actions (actions.js)
  api/             payment start, Paystack callback and webhook
components/        shared forms and cards
lib/
  db.js            database schema and queries
  seed.js          sample data
  bookings.js      booking + payment rules (deposits, confirmation, SMS)
  checkout.js      Paystack / demo payment flow
  paystack.js      Paystack API
  notify.js        SMS (Arkesel)
data/              SQLite database file (created on first run)
```

All money is stored in **pesewas** (GH₵ 1 = 100) to avoid rounding errors.

## Business rules
- A booking holds its seats as soon as it's made (status **pending**).
- It becomes **confirmed** automatically once the customer has paid at least the deposit.
- Cancelling a booking frees its seats.
- Customers are matched by phone number, so repeat customers build up a history.

## Going live (next steps)
- Host on a VPS or a Node host (Railway, Render, DigitalOcean). SQLite needs a persistent disk;
  for serverless hosts like Vercel/Netlify, move the database to Postgres (e.g. Supabase).
- Add staff accounts with roles, email notifications, and an agent/affiliate portal.
