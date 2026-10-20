import { test } from "node:test";
import assert from "node:assert/strict";
import { useTempData } from "./helpers.mjs";

useTempData();
const { db } = await import("../lib/db.js");
const { isLocked, noteFailure, clearAllFailures, isLockedAnywhere, MAX_FAILED_LOGINS } = await import("../lib/lockout.js");
const { createResetToken, findResetUser, markResetUsed } = await import("../lib/passwordReset.js");
const { hashPassword } = await import("../lib/password.js");

const uid = db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Esi','esi@test.com', ?, 'owner')").run(await hashPassword("blue mango at sunrise")).lastInsertRowid;

test("an account locks after too many wrong passwords from one connection only", () => {
  for (let i = 0; i < MAX_FAILED_LOGINS; i++) noteFailure("esi@test.com", "1.1.1.1");
  assert.ok(isLocked("esi@test.com", "1.1.1.1"));
  assert.ok(!isLocked("esi@test.com", "2.2.2.2"), "other connections are not locked");
  assert.ok(isLockedAnywhere("esi@test.com"));
});

test("clearing (password reset / owner unlock) removes the lock immediately", () => {
  clearAllFailures("ESI@test.com");
  assert.ok(!isLocked("esi@test.com", "1.1.1.1"));
});

test("reset links work once, and older links stop working", () => {
  const first = createResetToken(uid, "x");
  const second = createResetToken(uid, "x");
  assert.equal(findResetUser(first), null, "a newer link cancels older ones");
  const u = findResetUser(second);
  assert.equal(u.email, "esi@test.com");
  markResetUsed(u.reset_id);
  assert.equal(findResetUser(second), null, "used links can't be reused");
  assert.equal(findResetUser("not-a-real-token-but-long-enough"), null);
});

test("expired reset links are refused", () => {
  const t = createResetToken(uid, "x");
  db.prepare("UPDATE password_resets SET expires_at = ? WHERE used_at IS NULL").run(Date.now() - 1000);
  assert.equal(findResetUser(t), null);
});

test("deactivated staff can't use reset links", () => {
  const t = createResetToken(uid, "x");
  db.prepare("UPDATE users SET active = 0 WHERE id = ?").run(uid);
  assert.equal(findResetUser(t), null);
  db.prepare("UPDATE users SET active = 1 WHERE id = ?").run(uid);
});
