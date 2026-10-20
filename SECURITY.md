# Security overview

This describes how TourFlow protects the business and its customers, what was reviewed,
and what the operator is still responsible for.

## Protections in place

**Staff access**
- Every staff member has their own account (no shared password). Passwords are hashed with scrypt and a unique salt; they are never stored or logged in plain text.
- Password rules: at least 10 characters, common or obvious passwords refused, names/emails refused.
- New accounts and resets use a temporary password that must be changed at first sign-in.
- 5 wrong passwords lock that account **from that connection** for 15 minutes (so a stranger can't lock out real staff); sign-in is also rate-limited per IP. Every failed sign-in gets the same message and takes the same time, whether or not the email exists. Password hashing runs asynchronously so sign-in attempts can't stall the site.
- Sessions are random 256-bit tokens stored only as a SHA-256 hash, in an `HttpOnly`, `SameSite=Lax`, `Secure` (`__Host-` prefixed) cookie, expiring after 12 hours. Changing a password, changing a role or deactivating an account signs that person out everywhere.
- Four roles (Owner, Manager, Sales, Operations). Permission is checked on the server for **every** admin page, action and download, not just hidden in the menu. Operations staff can't see bookings, payments, revenue or balances; only trips, manifests and check-in.
- Activity log of sign-ins, failed/locked sign-ins, payments, refunds, cancellations, tour/price changes, exports, backups, settings and staff changes, with IP address. It cannot be edited from the app.
- First owner account requires a `SETUP_CODE` in production; the setup page closes permanently once an account exists.

**Customer data**
- Booking pages and receipts need a secret 144-bit token in the link; the booking reference alone is not enough. "Find my booking" requires reference + phone and is rate-limited. Booking tokens are never sent to staff browsers in bulk lists.
- Each booking keeps its own contact name and email. Website visitors can't change a saved customer's details, and emails for a booking only go to the address typed for that booking.
- Returning from Paystack only shows the booking to the browser that started the payment; anyone else is asked to look it up with reference + phone.
- Booking pages, receipts and admin pages are marked `no-store` and `noindex`.
- CSV exports are permission-checked, logged, and protected against spreadsheet formula injection.

**Payments**
- Payment results are always confirmed server-to-server with Paystack (status, currency and reference); nothing from the browser is trusted.
- The Paystack webhook verifies its HMAC-SHA512 signature with a constant-time comparison.
- Each Paystack reference is counted once, even if the callback and webhook both arrive.
- If money arrives after a booking was auto-cancelled, the booking is restored when seats are free; otherwise staff are alerted on the dashboard and the customer is told they'll be contacted.
- Demo payments (fake money) can't be turned on in production: the app refuses to start.
- Staff can't record payments above the balance or refunds above what was paid; refunds need a reason and are logged.

**Abuse and stability**
- Rate limits on booking, payment start, trip requests, booking lookup, setup and sign-in. Visitor IPs come only from the proxy setting the operator configures (`TRUST_PROXY`/`IP_HEADER`), read from the trusted end of the header, so they can't be faked by sending headers; production won't start without it.
- Hidden spam-trap fields on public forms. Automatic SMS from website forms use fixed wording (no visitor text), go only to Ghana mobile numbers, at most once per number per day, with a daily cap, all tracked in the database. Payment SMS only follow real payments.
- Unpaid online bookings release their seats after 30 minutes (not while a payment is in progress). One phone/email can hold at most 2 unpaid bookings, and unpaid holds can't take more than half of any trip's seats. This makes blocking a trip with fake bookings slow and visible, though not impossible for a determined attacker with many phone numbers (a CAPTCHA is the next step if that happens).
- Seat availability is checked inside a database transaction, so two people can't take the last seat.
- Input length limits and validation on all forms.

**Uploads**
- Only JPG, PNG and WebP images up to 5 MB, detected from the file's actual bytes; random file names; served with `nosniff` and a locked-down CSP.
- Image links typed by staff are restricted to `https://` URLs, so nothing can be injected into page styles.

**Web security headers**
- CSV exports strip control characters and neutralise formulas.
- Content-Security-Policy (no framing, no plugins, forms only to the site and Paystack), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, HSTS in production. `X-Powered-By` removed.
- Next.js Server Actions check the request origin, which blocks cross-site request forgery.

**Operations**
- The app refuses to start in production without an `https://` `APP_URL`, without a proxy/IP setting, or with demo payments on, and warns about test keys or sample data.
- Automatic daily backups (last 14 kept), downloadable by the owner only.
- Dependencies audited with `npm audit` (0 known vulnerabilities at release; PostCSS pinned to a patched version).
- Automated tests cover password hashing, permissions, validation, CSV safety, booking rules, refunds, duplicate payments, seat release, unpaid-hold limits, contact isolation and late payments.
- An independent security review was carried out before release; its 13 findings (2 high, 4 medium, 7 low, none critical) were fixed and retested.

## Known limits (by design for this version)
- Rate limits and sign-in lockouts are kept in memory, so they reset when the app restarts and assume a single server process. For multiple servers, move them to Redis.
- Booking links don't expire. Customers should treat them like a password.
- No CAPTCHA on public forms yet; add one if bots start abusing bookings or trip requests.
- The Content-Security-Policy allows inline scripts, which Next.js needs without extra configuration. Other headers and React's escaping still protect against injected content.
- SQLite suits one company on one server. For very high traffic or several servers, move to PostgreSQL.
- No two-factor sign-in yet. Recommended next step for owner accounts.

## The operator is responsible for
- Keeping server settings (Paystack keys, SMTP password) secret and only in the hosting dashboard.
- Running over HTTPS with the real domain in `APP_URL`.
- Deactivating staff accounts as soon as people leave.
- Downloading and storing backups off the server.
- Applying updates (`npm audit`, Next.js security releases) at least monthly.
- Reviewing the privacy policy and terms, and data-protection registration where required.

## Reporting a problem
If you find a security issue, contact the developer privately rather than posting it publicly.
