# New client setup checklist

Use this every time you sell TourFlow to a tour company. Tick each box. Allow about one working day
(most of it is waiting for Paystack and the SMS sender name to be approved, so start those first).

Technical details for each step are in **DEPLOYMENT.md**.

---

## Day 0: Before you start (ask the client for these)

- [ ] Company name, logo (PNG or JPG), brand colour, phone, WhatsApp number, email, office address
- [ ] Their cancellation and refund policy, in their own words
- [ ] List of tours: name, destination, days, price per person, deposit %, itinerary, what's included/not included, photos
- [ ] Upcoming dates for each tour and number of seats
- [ ] Names, emails and roles of staff who will use the system (Owner, Manager, Sales, Operations)
- [ ] Guides, drivers and vehicles (name, plate, seats)
- [ ] The web address they want, e.g. `bookings.theircompany.com`

## Step 1: Accounts in the CLIENT'S name (start these first, they take time)

Do these with the owner, using **their** email and card. You are only helping.

- [ ] **Paystack** business account (paystack.com). They upload business registration documents. Approval can take a few days. Until then you can use the **test** key.
- [ ] **Arkesel** account (arkesel.com) → request their **sender ID** (max 11 characters, e.g. `AccraTours`) → buy some SMS credit.
- [ ] **Email for receipts and password resets**: Zoho Mail, Google Workspace or Brevo. Note the SMTP host, port, username and password.
- [ ] **Hosting**: Render account (recommended; see DEPLOYMENT.md). Add a payment card.
- [ ] **Domain**: if they don't have one, buy it, or use a sub-domain of their existing website.
- [ ] Ask the owner to add **your email as a team member** on Render and Paystack, so you can help later without knowing their passwords.

## Step 2: Put the system online

- [ ] Create the Render web service from the TourFlow code (DEPLOYMENT.md, section 4)
- [ ] Add a **Disk** (`/var/data`) and these settings:
  - `APP_URL` = `https://bookings.theircompany.com`
  - `DATA_DIR` = `/var/data`
  - `TRUST_PROXY` = `true`
  - `SETUP_CODE` = a long random code (you'll delete it after step 3)
  - `PAYSTACK_SECRET_KEY` (test key first), `ARKESEL_API_KEY`, `SMS_SENDER_ID`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
- [ ] Connect the domain; wait until `https://…/api/health` shows `{"ok":true}`
- [ ] Check the server log has no `[config] ERROR` lines

## Step 3: First-time setup (with the owner present)

- [ ] Open `https://YOUR-DOMAIN/admin` → enter the setup code → **the owner types their own password**
- [ ] Delete `SETUP_CODE` from the Render settings
- [ ] **Settings**: company name, phone, WhatsApp, email, address, logo, brand colour, cancellation policy
- [ ] **Settings → Send test SMS** to the owner's phone ✔
- [ ] **Staff accounts**: add each staff member with a temporary password; tell them privately
- [ ] **Guides, drivers & vehicles**: add the team
- [ ] **Tours**: add each tour with photo, price and deposit, then **Add a date** for each departure
- [ ] Look at the website on a phone and a computer with the owner. Fix any typos in tour text

## Step 4: Rehearsal with test money

With the Paystack **test** key:

- [ ] Book a trip on the website, pay the deposit with Paystack's test MoMo/card details
- [ ] Check: SMS and email arrive, booking shows **confirmed**, dashboard shows the money
- [ ] Pay the balance from the customer's booking link, then open the **receipt**
- [ ] In admin: record a cash payment on another booking, then a refund, then cancel it
- [ ] Open the trip's **manifest**, check someone in, print it
- [ ] Make a **walk-in** booking from the admin
- [ ] Try **Forgot password** on the sign-in page; the email should arrive
- [ ] Clear the rehearsal money from the figures: on each rehearsal booking **record a refund** for what was paid, then **cancel** it. (Cancelling alone doesn't remove money from the revenue totals.) Simplest of all: rehearse on a separate test copy, then set up the live site fresh.

## Step 5: Go live

- [ ] Swap `PAYSTACK_SECRET_KEY` to the **live** key (`sk_live_…`)
- [ ] In Paystack → Settings → API Keys & Webhooks: webhook URL `https://YOUR-DOMAIN/api/paystack/webhook`
- [ ] Make one real small booking (e.g. GH₵ 1 test tour), confirm money reaches their Paystack balance, refund it in Paystack, record the refund in TourFlow
- [ ] **Backups → Download** one backup; show the owner where to keep it (Google Drive)
- [ ] Set up a free uptime monitor (UptimeRobot) on `/api/health` with the owner's email
- [ ] Open **Activity log**: sign-ins from different phones/networks should show **different IP addresses**. If every entry shows the same address, the proxy setting is wrong (try `TRUST_PROXY_HOPS=2`, or `IP_HEADER` if using Cloudflare)
- [ ] Owner reviews `/privacy` and `/terms` and changes anything that doesn't match how they work

## Step 6: Handover (about 1 hour with staff)

- [ ] Each staff member signs in and sets their own password
- [ ] Show sales staff: new booking, recording MoMo/cash payments, sending reminders, trip requests
- [ ] Show operations staff: calendar, manifest, check-in on the day, messaging a trip
- [ ] Show the owner: dashboard, exports, staff accounts (add/remove/unlock), settings, backups, activity log
- [ ] Give the owner: the link to the admin, this checklist, and your support contact
- [ ] Sign the handover form / licence agreement; collect the final payment

## After go-live

- [ ] Week 1: check in with the owner; look at **Activity log** and **Messages** for failures
- [ ] Monthly (if they pay for support): update the code, `npm audit`, check backups are being made
- [ ] Remove yourself from their Render/Paystack team when support ends, if they ask

---

### Quick answers for clients

| They ask | Answer |
|---|---|
| "A staff member forgot their password" | They click **Forgot your password?** on the sign-in page, or the owner resets it under **Staff accounts**. |
| "The owner forgot their password" | **Forgot your password?** on the sign-in page (needs email set up). Otherwise contact you; you run `npm run create-owner` on the server. |
| "Someone is locked out" | Wait 15 minutes, reset the password, or the owner clicks **Unlock sign-in** under Staff accounts. |
| "A customer lost their booking link" | They use **My booking** on the website with their reference and phone number. |
| "A customer paid but it shows unpaid" | Check the Paystack dashboard; record the payment with the Paystack reference. Make sure the webhook URL is set. |
| "We want to stop someone using the system" | Owner → Staff accounts → Options → **Deactivate**. It takes effect immediately. |
