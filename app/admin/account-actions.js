"use server";
import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, setSettings } from "@/lib/db";
import { requireUser, createSession, destroySession, destroyAllSessions, currentUser, userCount } from "@/lib/auth";
import { isLocked, noteFailure, clearFailures, clearAllFailures, MAX_FAILED_LOGINS } from "@/lib/lockout";
import { hashPassword, verifyPassword, passwordProblem } from "@/lib/password";
import { ROLES } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { text, int, isEmail, isPhone, formValues } from "@/lib/validate";
import { rateLimit, MINUTE } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { saveImage, UploadError } from "@/lib/uploads";
import { runBackup } from "@/lib/backup";
import { sendSms } from "@/lib/notify";
import { normalisePhone } from "@/lib/format";
import { company, appUrl, isProduction } from "@/lib/config";
import { createResetToken, findResetUser, markResetUsed } from "@/lib/passwordReset";
import { sendPasswordResetEmail, emailConfigured } from "@/lib/mailer";

const fail = (path, msg) => redirect(`${path}?error=${encodeURIComponent(msg)}`);
// Used to make failed logins for unknown emails take as long as real ones.
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

/* ---------- Sign in / out ---------- */

export async function login(prev, formData) {
  const ip = await clientIp();
  const email = text(formData, "email", { max: 160 }).toLowerCase();
  const password = String(formData.get("password") || "").slice(0, 200);
  const generic = { error: "Email or password is incorrect, or the account is locked for 15 minutes after too many tries. Use \"Forgot your password?\" below if you're stuck.", values: formValues(formData) };
  if (!rateLimit(`login-ip:${ip}`, 20, 15 * MINUTE)) return generic;

  // Always run the password check, so the reply time doesn't reveal whether an account exists.
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  const valid = await verifyPassword(password, user?.password_hash || DUMMY_HASH);
  // Lockout is per account AND per connection, so a stranger can't keep a real staff member locked out.
  const locked = isLocked(email, ip);
  if (!user || !user.active || locked || !valid) {
    if (user && !valid) {
      const fails = noteFailure(email, ip);
      db.prepare("UPDATE users SET failed_logins = failed_logins + 1 WHERE id = ?").run(user.id);
      await audit({ id: user.id, name: user.name }, fails >= MAX_FAILED_LOGINS ? "login.locked" : "login.failed", email);
    }
    return generic;
  }
  clearFailures(email, ip);
  db.prepare("UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = datetime('now') WHERE id = ?").run(user.id);
  await createSession(user.id);
  await audit(user, "login.success", email);
  redirect(user.must_change_password ? "/admin/account?first=1" : "/admin");
}

/* ---------- Forgot password ---------- */

export async function requestPasswordReset(prev, formData) {
  const ip = await clientIp();
  const email = text(formData, "email", { max: 160 }).toLowerCase();
  const done = { ok: true, email };
  if (!isEmail(email)) return { error: "Enter the email you sign in with.", values: formValues(formData) };
  if (!emailConfigured() && isProduction) {
    return { error: "This system can't send emails yet, so password links can't be sent. Ask your owner to reset your password under Staff accounts. Owners: see \"Owner locked out\" in DEPLOYMENT.md." };
  }
  // Same reply whether or not the account exists, so this page can't be used to find staff emails.
  if (!rateLimit(`reset-ip:${ip}`, 5, 60 * MINUTE) || !rateLimit(`reset-email:${email}`, 3, 60 * MINUTE)) return done;
  const user = db.prepare("SELECT * FROM users WHERE email = ? AND active = 1").get(email);
  if (!user) return done;
  const link = `${appUrl}/admin/reset?t=${createResetToken(user.id, ip)}`;
  await audit(user, "password.reset_requested", email);
  if (emailConfigured()) {
    const sent = await sendPasswordResetEmail(user, link);
    if (sent !== "sent") await audit(user, "password.reset_email_failed", email); // owner can see this in the activity log
  } else {
    // Development only (no email set up): print the link in the terminal running the app.
    console.log(`\n[password reset] Link for ${email} (valid 30 minutes):\n${link}\n`);
    return { ...done, devNote: true };
  }
  return done;
}

export async function resetPassword(prev, formData) {
  const token = String(formData.get("t") || "");
  const user = findResetUser(token);
  if (!user) return { error: "This reset link has expired or was already used. Ask for a new one." };
  const pw = String(formData.get("password") || "");
  const problem = passwordProblem(pw, { name: user.name, email: user.email });
  if (problem) return { error: problem };
  if (pw !== formData.get("confirm")) return { error: "The two passwords don't match." };
  const hash = await hashPassword(pw);
  if (!markResetUsed(user.reset_id)) return { error: "This reset link was already used. Ask for a new one." };
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, failed_logins = 0, locked_until = NULL WHERE id = ?").run(hash, user.id);
  clearAllFailures(user.email);
  destroyAllSessions(user.id);
  await audit({ id: user.id, name: user.name }, "password.reset", user.email);
  redirect("/admin/login?reset=1");
}

export async function logout() {
  const user = await currentUser();
  await destroySession();
  if (user) await audit(user, "logout");
  redirect("/admin/login");
}

/* ---------- First-time setup ---------- */

export async function setupOwner(prev, formData) {
  if (userCount() > 0) redirect("/admin/login");
  const code = process.env.SETUP_CODE;
  if (process.env.NODE_ENV === "production") {
    if (!code) return { error: "Set SETUP_CODE in the server settings first, then restart.", values: formValues(formData) };
    if (!rateLimit(`setup:${await clientIp()}`, 10, 15 * MINUTE)) return { error: "Too many attempts. Wait 15 minutes.", values: formValues(formData) };
    const given = Buffer.from(String(formData.get("code") || ""));
    const want = Buffer.from(code);
    if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return { error: "Setup code is incorrect.", values: formValues(formData) };
  }
  const name = text(formData, "name", { max: 120 });
  const email = text(formData, "email", { max: 160 }).toLowerCase();
  const password = String(formData.get("password") || "");
  if (!name || !isEmail(email)) return { error: "Enter your name and a valid email.", values: formValues(formData) };
  const problem = passwordProblem(password, { name, email });
  if (problem) return { error: problem, values: formValues(formData) };
  if (password !== formData.get("confirm")) return { error: "The two passwords don't match.", values: formValues(formData) };

  const hash = await hashPassword(password);
  const created = db.transaction(() => {
    if (db.prepare("SELECT COUNT(*) AS n FROM users").get().n > 0) return null;
    return db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?, 'owner')").run(name, email, hash).lastInsertRowid;
  }).immediate();
  if (!created) redirect("/admin/login");
  await createSession(created);
  await audit({ id: created, name }, "setup.owner", email);
  redirect("/admin/settings?welcome=1");
}

/* ---------- My account ---------- */

export async function changePassword(prev, formData) {
  const user = await requireUser();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
  if (!await verifyPassword(String(formData.get("current") || ""), row.password_hash)) return { error: "Your current password is incorrect." };
  const pw = String(formData.get("password") || "");
  const problem = passwordProblem(pw, { name: row.name, email: row.email });
  if (problem) return { error: problem };
  if (pw !== formData.get("confirm")) return { error: "The two new passwords don't match." };
  if (await verifyPassword(pw, row.password_hash)) return { error: "Choose a password different from the current one." };
  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?").run(await hashPassword(pw), user.id);
  destroyAllSessions(user.id); // sign out everywhere else
  await createSession(user.id);
  await audit(user, "password.change");
  if (row.must_change_password) redirect("/admin?welcome=1"); // first sign-in done: straight to the dashboard
  return { ok: "Password changed. Other devices have been signed out." };
}

/* ---------- Staff accounts (owner only) ---------- */

export async function createUser(prev, formData) {
  const owner = await requireUser("staff.manage");
  const name = text(formData, "name", { max: 120 });
  const email = text(formData, "email", { max: 160 }).toLowerCase();
  const role = text(formData, "role", { max: 20 });
  const password = String(formData.get("password") || "");
  if (!name || !isEmail(email)) return { error: "Enter a name and a valid email.", values: formValues(formData) };
  if (!ROLES[role]) return { error: "Choose a role.", values: formValues(formData) };
  const problem = passwordProblem(password, { name, email });
  if (problem) return { error: `Temporary password: ${problem}`, values: formValues(formData) };
  try {
    db.prepare("INSERT INTO users (name, email, password_hash, role, must_change_password) VALUES (?,?,?,?,1)").run(name, email, await hashPassword(password), role);
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) return { error: "Someone already uses that email.", values: formValues(formData) };
    throw e;
  }
  await audit(owner, "staff.create", `${name} <${email}> as ${role}`);
  revalidatePath("/admin/staff");
  return { ok: `${name} can now sign in. They'll be asked to choose their own password.` };
}

export async function updateUser(formData) {
  const owner = await requireUser("staff.manage");
  const id = int(formData, "id", { min: 1 });
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!target) redirect("/admin/staff");
  const action = text(formData, "action", { max: 20 });
  const owners = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'owner' AND active = 1").get().n;
  const isLastOwner = target.role === "owner" && target.active && owners <= 1;
  if (id === owner.id && ["role", "reset", "signout", "deactivate"].includes(action)) {
    fail("/admin/staff", "To change your own password, use My account. You can't change your own role or deactivate yourself.");
  }

  if (action === "role") {
    const role = text(formData, "role", { max: 20 });
    if (!ROLES[role]) fail("/admin/staff", "Unknown role.");
    if (isLastOwner && role !== "owner") fail("/admin/staff", "There must always be at least one owner.");
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
    destroyAllSessions(id);
    await audit(owner, "staff.role", `${target.email} → ${role}`);
  } else if (action === "deactivate") {
    if (isLastOwner || id === owner.id) fail("/admin/staff", "You can't deactivate yourself or the last owner.");
    db.prepare("UPDATE users SET active = 0 WHERE id = ?").run(id);
    destroyAllSessions(id);
    await audit(owner, "staff.deactivate", target.email);
  } else if (action === "activate") {
    db.prepare("UPDATE users SET active = 1, failed_logins = 0, locked_until = NULL WHERE id = ?").run(id);
    clearAllFailures(target.email);
    await audit(owner, "staff.activate", target.email);
  } else if (action === "reset") {
    const pw = String(formData.get("password") || "");
    const problem = passwordProblem(pw, { name: target.name, email: target.email });
    if (problem) fail("/admin/staff", `New password: ${problem}`);
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1, failed_logins = 0, locked_until = NULL WHERE id = ?").run(await hashPassword(pw), id);
    destroyAllSessions(id);
    clearAllFailures(target.email);
    await audit(owner, "staff.reset_password", target.email);
  } else if (action === "unlock") {
    clearAllFailures(target.email);
    await audit(owner, "staff.unlock", target.email);
  } else if (action === "signout") {
    destroyAllSessions(id);
    await audit(owner, "staff.signout", target.email);
  }
  revalidatePath("/admin/staff");
  redirect("/admin/staff?done=1");
}

/* ---------- Company settings (owner only) ---------- */

export async function saveSettings(formData) {
  const owner = await requireUser("settings.manage");
  const phone = text(formData, "company_phone", { max: 30 });
  const whatsapp = text(formData, "company_whatsapp", { max: 30 });
  const email = text(formData, "company_email", { max: 160 });
  const color = text(formData, "brand_color", { max: 7 });
  if (!text(formData, "company_name", { max: 80 })) fail("/admin/settings", "Enter the company name.");
  if (phone && !isPhone(phone)) fail("/admin/settings", "Company phone doesn't look right.");
  if (whatsapp && !isPhone(whatsapp)) fail("/admin/settings", "WhatsApp number doesn't look right.");
  if (email && !isEmail(email)) fail("/admin/settings", "Company email doesn't look right.");

  let logo;
  try {
    logo = await saveImage(formData.get("logo"));
  } catch (e) {
    if (e instanceof UploadError) fail("/admin/settings", e.message);
    throw e;
  }
  const values = {
    company_name: text(formData, "company_name", { max: 80 }),
    company_phone: phone,
    company_whatsapp: whatsapp,
    company_email: email,
    company_address: text(formData, "company_address", { max: 200 }),
    brand_color: /^#[0-9a-f]{6}$/i.test(color) ? color : "",
    cancellation_policy: text(formData, "cancellation_policy", { max: 2000 }),
  };
  if (logo) values.logo_url = logo;
  if (formData.get("remove_logo")) values.logo_url = "";
  setSettings(values);
  await audit(owner, "settings.update", Object.keys(values).join(", "));
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

export async function sendTestSms(formData) {
  const owner = await requireUser("settings.manage");
  const to = normalisePhone(text(formData, "phone", { max: 30 }));
  if (!isPhone(to)) fail("/admin/settings", "Enter a valid phone number for the test.");
  if (!process.env.ARKESEL_API_KEY) fail("/admin/settings", "ARKESEL_API_KEY is not set yet, so no SMS can be sent. See the steps on this page.");
  const { status, error } = await sendSms({ to, message: `Test message from ${company.name}. SMS is working.` });
  await audit(owner, "sms.test", `${to}: ${status}${error ? ` (${error})` : ""}`);
  if (status !== "sent") fail("/admin/settings", `Arkesel rejected the test SMS: ${error || "unknown error"}`);
  redirect("/admin/settings?smsok=1");
}

/* ---------- Backups (owner only) ---------- */

export async function backupNow() {
  const owner = await requireUser("backups.manage");
  const file = await runBackup({ manual: true });
  await audit(owner, "backup.create", file);
  redirect("/admin/backups?done=1");
}
