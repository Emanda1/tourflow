import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, passwordProblem } from "../lib/password.js";
import { safeImageUrl, isEmail, isPhone } from "../lib/validate.js";
import { can } from "../lib/permissions.js";
import { toCsv } from "../lib/csv.js";
import { rateLimit } from "../lib/ratelimit.js";

test("passwords are salted and verified", () => {
  const a = hashPassword("correct horse battery");
  const b = hashPassword("correct horse battery");
  assert.notEqual(a, b, "same password must hash differently");
  assert.ok(verifyPassword("correct horse battery", a));
  assert.ok(!verifyPassword("wrong password here", a));
  assert.ok(!verifyPassword("anything", "garbage"));
});

test("weak passwords are rejected", () => {
  assert.ok(passwordProblem("short"));
  assert.ok(passwordProblem("password1234"));
  assert.ok(passwordProblem("aaaaaaaaaaaa"));
  assert.ok(passwordProblem("kofi-is-great-2026", { name: "Kofi Mensah" }));
  assert.equal(passwordProblem("blue mango at sunrise"), null);
});

test("only safe image addresses are allowed", () => {
  assert.equal(safeImageUrl("javascript:alert(1)"), null);
  assert.equal(safeImageUrl("http://insecure.example/x.jpg"), null);
  assert.equal(safeImageUrl("https://x.com/a.jpg);background:red"), null);
  assert.equal(safeImageUrl("/uploads/../../etc/passwd"), null);
  assert.ok(safeImageUrl("https://images.example.com/cape-coast.jpg"));
  assert.ok(safeImageUrl("/uploads/abc123.jpg"));
  assert.ok(safeImageUrl("linear-gradient(135deg,#0f766e,#f59e0b)"));
});

test("email and phone validation", () => {
  assert.ok(isEmail("ama@example.com"));
  assert.ok(!isEmail("ama@example"));
  assert.ok(!isEmail("<script>@x.com"));
  assert.ok(isPhone("024 123 4567"));
  assert.ok(isPhone("+233241234567"));
  assert.ok(!isPhone("123"));
});

test("roles only get the permissions they should", () => {
  const u = (role) => ({ role, active: 1 });
  assert.ok(can(u("owner"), "staff.manage"));
  assert.ok(!can(u("manager"), "staff.manage"));
  assert.ok(can(u("manager"), "payments.refund"));
  assert.ok(!can(u("sales"), "payments.refund"));
  assert.ok(can(u("sales"), "payments.record"));
  assert.ok(!can(u("operations"), "payments.record"));
  assert.ok(!can(u("operations"), "finance.view"));
  assert.ok(can(u("operations"), "trips.checkin"));
  assert.ok(!can({ role: "owner", active: 0 }, "dashboard.view"), "deactivated users can do nothing");
  assert.ok(!can(null, "dashboard.view"));
});

test("CSV export neutralises spreadsheet formulas", () => {
  const csv = toCsv([{ n: "=HYPERLINK(\"http://evil\")" }, { n: "-5" }, { n: "Ama" }], [["n", "Name"]]);
  assert.match(csv, /'=HYPERLINK/);
  assert.match(csv, /\r\n-5\r\n/);
});

test("rate limiter blocks after the limit", () => {
  const key = "t:" + Math.random();
  for (let i = 0; i < 3; i++) assert.ok(rateLimit(key, 3, 60_000));
  assert.ok(!rateLimit(key, 3, 60_000));
});
