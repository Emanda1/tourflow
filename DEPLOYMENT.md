# Deploying TourFlow for a client

This guide takes a fresh copy of TourFlow to a live, secure website for one tour company.
Do every step in the **company's own accounts** (their email, their card), then have them add
you as a team member where you need access.

---

## 1. Before you start: checklist

- [ ] Company's domain name (e.g. `bookings.theircompany.com`)
- [ ] Hosting account in the company's name (see options below)
- [ ] Paystack business account, verified (needs business registration documents)
- [ ] Optional: Arkesel account with an approved sender ID, for SMS
- [ ] Optional: an email provider for receipts (Zoho Mail, Google Workspace, Brevo, etc.)
- [ ] Their logo, tour list, prices, photos and cancellation policy

## 2. Choose hosting

TourFlow stores its data in a single database file, so it needs a server with a **persistent disk**.

| Option | Good for | Notes |
|---|---|---|
| **Render** (Web Service + Disk) | Easiest | Add a Disk mounted at `/var/data`, set `DATA_DIR=/var/data` |
| **Railway** (+ Volume) | Easy | Mount a volume at `/data`, set `DATA_DIR=/data` |
| **A small VPS** (DigitalOcean, Hetzner, Contabo) | Cheapest long-term | Use the Dockerfile, or Node + PM2 behind Nginx/Caddy |

Do **not** use Vercel or Netlify for this version: they have no persistent disk, so data would be lost.

## 3. Server settings (environment variables)

Set these in the hosting dashboard. Never put real keys in GitHub.

| Variable | Required | Example / notes |
|---|---|---|
| `NODE_ENV` | yes | `production` (most hosts set this automatically) |
| `APP_URL` | **yes** | `https://bookings.theircompany.com`. The app will not start without an https address. |
| `SETUP_CODE` | yes, for first setup | 12+ random characters. Needed to create the owner account. Remove after setup. |
| `DATA_DIR` | yes on hosts | Folder on the persistent disk, e.g. `/var/data` |
| `TRUST_PROXY` | yes on Render/Railway/Nginx | `true`, so rate limits see real visitor IPs |
| `PAYSTACK_SECRET_KEY` | for online payment | `sk_live_…` (start with `sk_test_…` to rehearse) |
| `ARKESEL_API_KEY`, `SMS_SENDER_ID` | optional | For real SMS |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | optional | For email receipts |
| `BOOKING_HOLD_MINUTES` | optional | Default `120`. Unpaid online bookings release seats after this. |

**Never set** `ALLOW_DEMO_PAYMENTS=true` or `SEED_DEMO_DATA=true` on a live site.

## 4. Deploy

### Render (recommended for beginners)
1. Push the code to a GitHub repository the company can access.
2. Render → New → Web Service → connect the repository.
3. Build command: `npm ci && npm run build`. Start command: `npm start`.
4. Add a **Disk**: mount path `/var/data`, 1 GB is plenty to start.
5. Add the environment variables above (`DATA_DIR=/var/data`, `TRUST_PROXY=true`).
6. Deploy. Open `https://YOUR-APP.onrender.com/api/health`; it should say `{"ok":true}`.
7. Settings → Custom Domains → add `bookings.theircompany.com` and follow the DNS instructions. HTTPS is automatic.
8. Update `APP_URL` to the custom domain and redeploy.

### VPS with Docker
```bash
docker build -t tourflow .
docker run -d --name tourflow --restart unless-stopped \
  -p 127.0.0.1:3000:3000 -v /srv/tourflow:/data --env-file /srv/tourflow.env tourflow
```
Put Caddy or Nginx in front for HTTPS (Caddy: `bookings.theircompany.com { reverse_proxy 127.0.0.1:3000 }`), and set `TRUST_PROXY=true`.

## 5. First-time setup

1. Visit `https://YOUR-DOMAIN/admin`. You'll be sent to the setup page.
2. Enter the `SETUP_CODE`, then the **owner's** name, email and a strong password. Let the owner type the password themselves.
3. Remove `SETUP_CODE` from the server settings.
4. In **Settings**: company name, phone, WhatsApp, email, address, logo, brand colour, cancellation policy.
5. In **Staff accounts**: add each staff member with the right role. They must change their temporary password on first sign-in.
6. In **Tours**: add tours, photos and dates. In **Guides, drivers & vehicles**: add the team.

(Alternative to the setup page: on the server run `npm run create-owner -- "Full Name" owner@company.com`.)

## 6. Connect Paystack

1. Paystack dashboard → Settings → API Keys & Webhooks.
2. Copy the **secret key** into `PAYSTACK_SECRET_KEY`.
3. Set the **Webhook URL** to `https://YOUR-DOMAIN/api/paystack/webhook`.
4. Set the **Callback URL** to `https://YOUR-DOMAIN/api/pay/callback`.
5. Rehearse with the test key (`sk_test_…`) and Paystack's test numbers, then switch to the live key.

Money goes straight from Paystack to the company's bank or MoMo settlement account. TourFlow never holds funds.

## 7. Go-live checklist

- [ ] `https://YOUR-DOMAIN/api/health` returns `{"ok":true}`
- [ ] Server logs show no `[config] WARNING` lines you haven't accepted
- [ ] A real booking with a small amount succeeds end-to-end, then refund it in Paystack and record the refund in TourFlow
- [ ] SMS and email arrive (if configured)
- [ ] Staff accounts created; nobody shares a login
- [ ] **Backups → Download** works; save one copy off the server
- [ ] Privacy policy and booking terms reviewed by the company (templates at `/privacy` and `/terms`)
- [ ] Company registered with Ghana's Data Protection Commission if required (ask a lawyer)
- [ ] An uptime monitor (e.g. UptimeRobot, free) checks `/api/health`

## 8. Backups

- A backup is made automatically every day into `DATA_DIR/backups` (last 14 kept).
- The owner should download one **every week** (Admin → Backups) and keep it in Google Drive or similar.
- Many hosts also offer disk snapshots. Turn them on.

### Restoring a backup
1. Stop the app.
2. In `DATA_DIR`, rename `tourflow.db` to `tourflow-broken.db`, and delete `tourflow.db-wal` and `tourflow.db-shm` if present.
3. Copy the backup file to `DATA_DIR/tourflow.db`.
4. Start the app and check the latest bookings.

## 9. Updating to a new version

1. Download a backup first.
2. Push the new code; the host redeploys. Database changes are applied automatically on start.
3. Check `/api/health` and sign in.

## 10. If something goes wrong

| Problem | Fix |
|---|---|
| App won't start, log says `APP_URL must be set` | Set `APP_URL` to the https address |
| Owner locked out | Wait 15 minutes, or run `npm run create-owner` on the server to reset |
| A staff member left | Owner → Staff accounts → Deactivate (signs them out immediately) |
| Customer paid but booking shows unpaid | Check Paystack dashboard; webhook URL must be set. Record the payment manually with the Paystack reference. |
| Suspicious activity | Admin → Activity log shows every sign-in, payment, refund, export and change, with IP address |
