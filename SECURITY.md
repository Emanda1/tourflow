# Security overview

This describes how TourFlow protects the business and its customers, what was reviewed,
and what the operator is still responsible for.

## Protections in place

**Staff access**
- Every staff member has their own account (no shared password). Passwords are hashed with scrypt and a unique salt; they are never stored or logged in plain text.
- Password rules: at least 10 characters, common or obvious passwords refused, names/emails refused.
- New accounts and resets use a temporary password that must be changed at first sign-in.
- 5 wrong passwords lock an account for 15 minutes; sign-in is also rate-limited per IP address. Failed sign-ins don't reveal whether an email exists.
- Sessions are random 256-bit tokens stored only as a SHA-256 hash, in an `HttpOnly`, `SameSite=Lax`, `Secure` (`__Host-` prefixed) cookie, expiring after 12 hours. Changing a password, changing a role or deactivating an account signs that person out everywhere.
- Four roles (Owner, Manager, Sales, Operations). Permission is checked on the server for **every** admin page, action and download, not just hidden in the menu.
- Activity log of sign-ins, failed/locked sign-ins, payments, refunds, cancellations, tour/price changes, exports, backups, settings and staff changes, with IP address. It cannot be edited from the app.
- First owner account requires a `SETUP_CODE` in production; the setup page closes permanently once an account exists.

**Customer data**
- Booking pages and receipts need a secret 144-bit token in the link; the booking reference alone is not enough. "Find my booking" requires reference + phone and is rate-limited.
- Website visitors can't overwrite an existing customer's name by booking with their phone number.
- Booking pages, receipts and admin pages are marked `no-store` and `noindex`.
- CSV exports are permission-checked, logged, and protected against spreadsheet formula injection.

**Payments**
- Payment results are always confirmed server-to-server with Paystack (status, currency and reference); nothing from the browser is trusted.
- The Paystack webhook verifies its HMAC-SHA512 signature with a constant-time comparison.
- Each Paystack reference is counted once, even if the callback and webhook both arrive.
- Demo payments (fake money) are **off in production** unless explicitly enabled, and the app warns loudly if they are.
- Staff can't record payments above the balance or refunds above what was paid; refunds need a reason and are logged.

**Abuse and stability**
- Rate limits on booking, payment start, trip requests, booking lookup, setup and sign-in.
- Hidden spam-trap fields on public forms. The trip-request form sends at most one SMS per phone number per day, so it can't be used to spam people or run up SMS costs.
- Unpaid online bookings release their seats after 2 hours (configurable), so nobody can block a trip by making fake bookings.
- Seat availability is checked inside a database transaction, so two people can't take the last seat.
- Input length limits and validation on all forms.

**Uploads**
- Only JPG, PNG and WebP images up to 5 MB, detected from the file's actual bytes; random file names; served with `nosniff` and a locked-down CSP.
- Image links typed by staff are restricted to `https://` URLs, so nothing can be injected into page styles.

**Web security headers**
- Content-Security-Policy (no framing, no plugins, forms only to the site and Paystack), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, HSTS in production. `X-Powered-By` removed.
- Next.js Server Actions check the request origin, which blocks cross-site request forgery.

**Operations**
- The app refuses to start in production without an `https://` `APP_URL`, and warns about test keys, demo payments or sample data.
- Automatic daily backups (last 14 kept), downloadable by the owner only.
- Dependencies audited with `npm audit` (0 known vulnerabilities at release; PostCSS pinned to a patched version).
- Automated tests cover password hashing, permissions, validation, CSV safety, booking rules, refunds, duplicate payments and seat release.

## Known limits (by design for this version)
- Rate limits are kept in memory, so they reset when the app restarts and assume a single server process. For multiple servers, move them to Redis.
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
