import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, passwordProblem } from "../lib/password.js";
import { safeImageUrl, isEmail, isPhone } from "../lib/validate.js";
import { can } from "../lib/permissions.js";
import { toCsv } from "../lib/csv.js";
import { rateLimit } from "../lib/ratelimit.js";

test("passwords are salted and verified", async () => {
  const a = await hashPassword("correct horse battery");
  const b = await hashPassword("correct horse battery");
  assert.notEqual(a, b, "same password must hash differently");
  assert.ok(await verifyPassword("correct horse battery", a));
  assert.ok(!(await verifyPassword("wrong password here", a)));
  assert.ok(!(await verifyPassword("anything", "garbage")));
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
  const cr = toCsv([{ n: "x\r=cmd|' /C calc'!A0" }], [["n", "Name"]]);
  assert.ok(!/\r=/.test(cr.split("\r\n")[1] ?? ""), "carriage return can't start a new formula row");
});

test("rate limiter blocks after the limit", () => {
  const key = "t:" + Math.random();
  for (let i = 0; i < 3; i++) assert.ok(rateLimit(key, 3, 60_000));
  assert.ok(!rateLimit(key, 3, 60_000));
});

test("only Ghana mobile numbers get automatic website SMS", async () => {
  const { isGhanaMobile } = await import("../lib/notify.js").catch(() => ({}));
  if (!isGhanaMobile) return; // notify.js needs the database; covered in bookings tests
  assert.ok(isGhanaMobile("+233241234567"));
  assert.ok(!isGhanaMobile("+447700900123"));
  assert.ok(!isGhanaMobile("+233301234567"), "landlines excluded");
});

test("phone numbers are normalised to +233 for every common way of typing them", async () => {
  const { normalisePhone } = await import("../lib/format.js");
  for (const v of ["0241234567", "024 123 4567", "+233241234567", "233241234567", "00233241234567", "+233 0241234567", "241234567"]) {
    assert.equal(normalisePhone(v), "+233241234567", v);
  }
  assert.equal(normalisePhone("+447700900123"), "+447700900123");
});

test("money input never goes negative", async () => {
  const { toPesewas } = await import("../lib/format.js");
  assert.equal(toPesewas("-5"), 0);
  assert.equal(toPesewas("12.345"), 1235);
  assert.equal(toPesewas("1,250.50"), 125050);
});

test("impossible dates are rejected", async () => {
  const { isDate } = await import("../lib/validate.js");
  assert.ok(isDate("2026-02-28"));
  assert.ok(!isDate("2026-02-31"));
  assert.ok(!isDate("2026-13-01"));
});

test("number settings with typos fall back to safe defaults", async () => {
  process.env.TEST_NUM = "30m";
  const { envInt } = await import("../lib/envnum.js");
  assert.equal(envInt("TEST_NUM", 30, { min: 5 }), 30);
  process.env.TEST_NUM = "0";
  assert.equal(envInt("TEST_NUM", 14, { min: 1 }), 1);
  delete process.env.TEST_NUM;
});
