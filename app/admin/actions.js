"use server";
import fs from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, getBooking, getDeparture } from "@/lib/db";
import { requireAdmin, checkPassword, signIn, signOut } from "@/lib/auth";
import { createBooking, recordPayment, BookingError } from "@/lib/bookings";
import { sendSms } from "@/lib/notify";
import { toPesewas, slugify, date, money } from "@/lib/format";
import { company } from "@/lib/config";

const str = (fd, k) => String(fd.get(k) ?? "").trim();
const intOrNull = (fd, k) => (fd.get(k) ? Number(fd.get(k)) : null);

/* ---------- Auth ---------- */

export async function login(prev, formData) {
  if (!checkPassword(formData.get("password"))) return { error: "Wrong password." };
  await signIn();
  redirect("/admin");
}

export async function logout() {
  await signOut();
  redirect("/admin/login");
}

/* ---------- Tours ---------- */

async function saveUpload(file, prefix) {
  if (!file || typeof file === "string" || !file.size) return null;
  const ext = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" }[file.type];
  if (!ext || file.size > 5 * 1024 * 1024) return null;
  const dir = path.join(process.cwd(), "data", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  const name = `${prefix || "tour"}-${Date.now()}${ext}`;
  fs.writeFileSync(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${name}`;
}

export async function saveTour(formData) {
  await requireAdmin();
  const id = intOrNull(formData, "id");
  const title = str(formData, "title");
  const data = {
    title,
    slug: str(formData, "slug") || slugify(title),
    destination: str(formData, "destination"),
    category: str(formData, "category") || "Local",
    duration_days: Number(formData.get("duration_days")) || 1,
    price: toPesewas(formData.get("price")),
    deposit_percent: Math.min(100, Math.max(0, Number(formData.get("deposit_percent")) || 30)),
    summary: str(formData, "summary"),
    description: str(formData, "description"),
    itinerary: str(formData, "itinerary"),
    inclusions: str(formData, "inclusions"),
    exclusions: str(formData, "exclusions"),
    image_url: (await saveUpload(formData.get("cover"), slugify(title))) || str(formData, "image_url") || null,
    active: formData.get("active") ? 1 : 0,
  };
  let tourId = id;
  if (id) {
    db.prepare(`UPDATE tours SET title=@title, slug=@slug, destination=@destination, category=@category, duration_days=@duration_days,
      price=@price, deposit_percent=@deposit_percent, summary=@summary, description=@description, itinerary=@itinerary,
      inclusions=@inclusions, exclusions=@exclusions, image_url=@image_url, active=@active WHERE id=@id`).run({ ...data, id });
  } else {
    tourId = db.prepare(`INSERT INTO tours (title,slug,destination,category,duration_days,price,deposit_percent,summary,description,itinerary,inclusions,exclusions,image_url,active)
      VALUES (@title,@slug,@destination,@category,@duration_days,@price,@deposit_percent,@summary,@description,@itinerary,@inclusions,@exclusions,@image_url,@active)`).run(data).lastInsertRowid;
  }
  revalidatePath("/", "layout");
  redirect(`/admin/tours/${tourId}?saved=1`);
}

/* ---------- Departures ---------- */

export async function saveDeparture(formData) {
  await requireAdmin();
  const id = intOrNull(formData, "id");
  const tourId = Number(formData.get("tour_id"));
  const tour = db.prepare("SELECT duration_days FROM tours WHERE id = ?").get(tourId);
  const start = str(formData, "start_date");
  let end = str(formData, "end_date");
  if (!end && tour) {
    const d = new Date(start + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + tour.duration_days - 1);
    end = d.toISOString().slice(0, 10);
  }
  const data = {
    tour_id: tourId,
    start_date: start,
    end_date: end,
    capacity: Number(formData.get("capacity")) || 20,
    price_override: formData.get("price_override") ? toPesewas(formData.get("price_override")) : null,
    status: str(formData, "status") || "open",
    guide_id: intOrNull(formData, "guide_id"),
    driver_id: intOrNull(formData, "driver_id"),
    vehicle_id: intOrNull(formData, "vehicle_id"),
    pickup_point: str(formData, "pickup_point"),
    pickup_time: str(formData, "pickup_time"),
    notes: str(formData, "notes"),
  };
  let depId = id;
  if (id) {
    db.prepare(`UPDATE departures SET start_date=@start_date, end_date=@end_date, capacity=@capacity, price_override=@price_override,
      status=@status, guide_id=@guide_id, driver_id=@driver_id, vehicle_id=@vehicle_id, pickup_point=@pickup_point,
      pickup_time=@pickup_time, notes=@notes WHERE id=@id`).run({ ...data, id });
  } else {
    depId = db.prepare(`INSERT INTO departures (tour_id,start_date,end_date,capacity,price_override,status,guide_id,driver_id,vehicle_id,pickup_point,pickup_time,notes)
      VALUES (@tour_id,@start_date,@end_date,@capacity,@price_override,@status,@guide_id,@driver_id,@vehicle_id,@pickup_point,@pickup_time,@notes)`).run(data).lastInsertRowid;
  }
  revalidatePath("/", "layout");
  redirect(`/admin/departures/${depId}?saved=1`);
}

export async function setCheckIn(travellerId, checked) {
  await requireAdmin();
  db.prepare("UPDATE travellers SET checked_in = ? WHERE id = ?").run(checked ? 1 : 0, Number(travellerId));
  return { id: travellerId, checked };
}

export async function messageDeparture(formData) {
  await requireAdmin();
  const dep = getDeparture(Number(formData.get("departure_id")));
  const message = str(formData, "message");
  if (!dep || !message) return;
  const rows = db.prepare(`SELECT b.id, c.phone FROM bookings b JOIN customers c ON c.id = b.customer_id
    WHERE b.departure_id = ? AND b.status = 'confirmed'`).all(dep.id);
  for (const r of rows) await sendSms({ to: r.phone, message, bookingId: r.id });
  redirect(`/admin/departures/${dep.id}?sent=${rows.length}`);
}

/* ---------- Bookings ---------- */

export async function createManualBooking(prev, formData) {
  await requireAdmin();
  const names = str(formData, "travellers").split("\n").map((s) => s.trim()).filter(Boolean);
  const name = str(formData, "name");
  let booking;
  try {
    booking = createBooking({
      departureId: Number(formData.get("departure_id")),
      name,
      email: str(formData, "email"),
      phone: str(formData, "phone"),
      travellers: (names.length ? names : [name]).map((n) => ({ name: n })),
      plan: formData.get("plan") === "deposit" ? "deposit" : "full",
      source: str(formData, "source") || "walk-in",
      notes: str(formData, "notes"),
    });
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    throw e;
  }
  const paid = toPesewas(formData.get("paid_now"));
  if (paid > 0) {
    await recordPayment({ bookingId: booking.id, amount: Math.min(paid, booking.total), method: str(formData, "method") || "cash", note: "Recorded at booking" });
  }
  redirect(`/admin/bookings/${booking.id}?created=1`);
}

export async function addPayment(formData) {
  await requireAdmin();
  const bookingId = Number(formData.get("booking_id"));
  const b = getBooking(bookingId);
  const amount = toPesewas(formData.get("amount"));
  if (!b || amount <= 0) redirect(`/admin/bookings/${bookingId}`);
  await recordPayment({ bookingId, amount, method: str(formData, "method") || "cash", note: str(formData, "note") || null });
  redirect(`/admin/bookings/${bookingId}?paid=1`);
}

export async function setBookingStatus(formData) {
  await requireAdmin();
  const id = Number(formData.get("booking_id"));
  const status = str(formData, "status");
  if (!["pending", "confirmed", "cancelled"].includes(status)) return;
  db.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(status, id);
  if (status === "cancelled") {
    const b = getBooking(id);
    await sendSms({ to: b.customer_phone, bookingId: id, message: `Your booking ${b.ref} for ${b.tour_title} on ${date(b.start_date)} has been cancelled. Call ${company.phone} for help. - ${company.name}` });
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/bookings/${id}`);
}

export async function sendReminder(formData) {
  await requireAdmin();
  const b = getBooking(Number(formData.get("booking_id")));
  if (!b) return;
  await sendSms({
    to: b.customer_phone,
    bookingId: b.id,
    message: `Hi ${b.customer_name.split(" ")[0]}, a reminder that your balance of ${money(b.balance)} for ${b.tour_title} (${date(b.start_date)}) is due. Pay online with ref ${b.ref}. - ${company.name}`,
  });
  redirect(`/admin/bookings/${b.id}?reminded=1`);
}

/* ---------- Team & vehicles ---------- */

export async function addStaff(formData) {
  await requireAdmin();
  db.prepare("INSERT INTO staff (name, role, phone) VALUES (?,?,?)").run(str(formData, "name"), str(formData, "role") || "Guide", str(formData, "phone"));
  revalidatePath("/admin/team");
}

export async function addVehicle(formData) {
  await requireAdmin();
  db.prepare("INSERT INTO vehicles (name, plate, seats) VALUES (?,?,?)").run(str(formData, "name"), str(formData, "plate"), Number(formData.get("seats")) || 14);
  revalidatePath("/admin/team");
}

/* ---------- Trip requests ---------- */

export async function setEnquiryStatus(formData) {
  await requireAdmin();
  const status = str(formData, "status");
  if (!["new", "contacted", "won", "lost"].includes(status)) return;
  db.prepare("UPDATE enquiries SET status = ? WHERE id = ?").run(status, Number(formData.get("id")));
  revalidatePath("/admin", "layout");
}
