"use server";
// Every action here checks the signed-in staff member's permission first.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, getBooking, getDeparture, refreshBookingStatus, NET_AMOUNT } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createBooking, recordPayment, recordRefund, BookingError, bookingLink } from "@/lib/bookings";
import { sendSms } from "@/lib/notify";
import { toPesewas, slugify, date, money } from "@/lib/format";
import { company } from "@/lib/config";
import { audit } from "@/lib/audit";
import { text, int, isDate, isPhone, safeImageUrl, formValues } from "@/lib/validate";
import { saveImage, UploadError } from "@/lib/uploads";

const fail = (path, msg) => redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
const METHODS = ["momo", "cash", "bank", "card"];

/* ---------- Tours ---------- */

export async function saveTour(prev, formData) {
  const user = await requireUser("tours.edit");
  const id = int(formData, "id", { min: 1 });
  const bad = (error) => ({ error, values: formValues(formData) });
  const title = text(formData, "title", { max: 120 });
  const price = toPesewas(formData.get("price"));
  if (!title) return bad("Please give the tour a name.");
  if (!text(formData, "destination", { max: 120 })) return bad("Please enter the destination.");
  if (price <= 0) return bad(`"${String(formData.get("price") || "").trim() || "(empty)"}" isn't a price we can read. Type the price per person in cedis, for example 1500 or 1,500.50.`);
  if (price > 100_000_000) return bad("That price is too high. The maximum is GH₵ 1,000,000 per person.");
  const typedImage = text(formData, "image_url", { max: 500 });
  if (typedImage && !safeImageUrl(typedImage)) return bad("Image links must start with https:// and can't contain spaces, brackets or quotes. Or upload a photo instead.");

  // Keep the current cover unless a new photo/link is given or "remove" is ticked.
  const existing = id ? db.prepare("SELECT image_url FROM tours WHERE id = ?").get(id)?.image_url ?? null : null;
  let image = typedImage ? safeImageUrl(typedImage) : formData.get("remove_image") ? null : existing;
  try {
    image = (await saveImage(formData.get("cover"))) || image;
  } catch (e) {
    if (e instanceof UploadError) return bad(e.message);
    throw e;
  }
  const data = {
    title,
    slug: slugify(text(formData, "slug", { max: 80 }) || title).slice(0, 80) || `tour-${Date.now()}`,
    destination: text(formData, "destination", { max: 120 }),
    category: text(formData, "category", { max: 40 }) || "Local",
    duration_days: int(formData, "duration_days", { min: 1, max: 60, fallback: 1 }),
    price,
    deposit_percent: int(formData, "deposit_percent", { min: 0, max: 100, fallback: 30 }),
    summary: text(formData, "summary", { max: 200 }),
    description: text(formData, "description", { max: 5000 }),
    itinerary: text(formData, "itinerary", { max: 5000 }),
    inclusions: text(formData, "inclusions", { max: 2000 }),
    exclusions: text(formData, "exclusions", { max: 2000 }),
    image_url: image,
    active: formData.get("active") ? 1 : 0,
  };
  // If no web address was typed, pick a free one automatically (cape-coast, cape-coast-2, …).
  if (!text(formData, "slug", { max: 80 })) {
    const base = data.slug;
    for (let n = 2; db.prepare("SELECT 1 FROM tours WHERE slug = ? AND id != ?").get(data.slug, id || 0); n++) data.slug = `${base}-${n}`;
  }
  let tourId = id;
  try {
    if (id) {
      db.prepare(`UPDATE tours SET title=@title, slug=@slug, destination=@destination, category=@category, duration_days=@duration_days,
        price=@price, deposit_percent=@deposit_percent, summary=@summary, description=@description, itinerary=@itinerary,
        inclusions=@inclusions, exclusions=@exclusions, image_url=@image_url, active=@active WHERE id=@id`).run({ ...data, id });
    } else {
      tourId = db.prepare(`INSERT INTO tours (title,slug,destination,category,duration_days,price,deposit_percent,summary,description,itinerary,inclusions,exclusions,image_url,active)
        VALUES (@title,@slug,@destination,@category,@duration_days,@price,@deposit_percent,@summary,@description,@itinerary,@inclusions,@exclusions,@image_url,@active)`).run(data).lastInsertRowid;
    }
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) return bad("Another tour already uses that web address. Change the slug.");
    throw e;
  }
  await audit(user, id ? "tour.update" : "tour.create", `${title} (#${tourId}) price ${money(price)}`);
  revalidatePath("/", "layout");
  redirect(`/admin/tours/${tourId}?saved=1`);
}

/* ---------- Departures ---------- */

export async function saveDeparture(prev, formData) {
  const user = await requireUser("trips.edit");
  const id = int(formData, "id", { min: 1 });
  const tourId = int(formData, "tour_id", { min: 1 });
  const tour = db.prepare("SELECT id, title, duration_days FROM tours WHERE id = ?").get(tourId);
  const bad = (error) => ({ error, values: formValues(formData) });
  if (!tour) return bad("Tour not found.");
  const start = text(formData, "start_date", { max: 10 });
  let end = text(formData, "end_date", { max: 10 });
  if (!isDate(start)) return bad("Please choose a valid start date.");
  const old = id ? getDeparture(id) : null;
  if (id && !old) return bad("This trip no longer exists.");
  // Moving the start date moves the end date with it, unless the end date was changed too.
  if (old && start !== old.start_date && end === old.end_date) end = "";
  if (!end) {
    const d = new Date(start + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + tour.duration_days - 1);
    end = d.toISOString().slice(0, 10);
  }
  if (!isDate(end) || end < start) return bad("The end date must be on or after the start date.");
  const status = text(formData, "status", { max: 20 });
  const capacity = int(formData, "capacity", { min: 1, max: 1000, fallback: 20 });
  if (old && capacity < old.booked) return bad(`There are already ${old.booked} travellers booked. Seats can't be fewer than that.`);
  const staffId = (k) => { const v = int(formData, k, { min: 1 }); return v && db.prepare("SELECT 1 FROM staff WHERE id = ?").get(v) ? v : null; };
  const vehicleId = int(formData, "vehicle_id", { min: 1 });
  const rawOverride = String(formData.get("price_override") || "").trim();
  const priceOverride = rawOverride ? toPesewas(rawOverride) : null;
  if (rawOverride && (priceOverride <= 0 || priceOverride > 100_000_000)) return bad(`"${rawOverride}" isn't a special price we can read. Type it in cedis (for example 1200 or 1,200.50), or leave it empty to use the tour's normal price.`);
  const data = {
    tour_id: tour.id,
    start_date: start,
    end_date: end,
    capacity,
    price_override: priceOverride,
    status: ["open", "closed", "completed", "cancelled"].includes(status) ? status : "open",
    guide_id: staffId("guide_id"),
    driver_id: staffId("driver_id"),
    vehicle_id: vehicleId && db.prepare("SELECT 1 FROM vehicles WHERE id = ?").get(vehicleId) ? vehicleId : null,
    pickup_point: text(formData, "pickup_point", { max: 160 }),
    pickup_time: /^\d{2}:\d{2}$/.test(text(formData, "pickup_time", { max: 5 })) ? text(formData, "pickup_time", { max: 5 }) : "",
    notes: text(formData, "notes", { max: 3000 }),
  };
  let depId = id;
  let cancelledBookings = [];
  if (old && data.status === "cancelled" && old.status !== "cancelled") {
    cancelledBookings = db.prepare(`SELECT b.id, b.ref, c.phone FROM bookings b JOIN customers c ON c.id = b.customer_id
      WHERE b.departure_id = ? AND b.status != 'cancelled'`).all(id);
    db.prepare("UPDATE bookings SET status = 'cancelled', cancel_reason = 'Trip cancelled' WHERE departure_id = ? AND status != 'cancelled'").run(id);
  }
  if (id) {
    db.prepare(`UPDATE departures SET start_date=@start_date, end_date=@end_date, capacity=@capacity, price_override=@price_override,
      status=@status, guide_id=@guide_id, driver_id=@driver_id, vehicle_id=@vehicle_id, pickup_point=@pickup_point,
      pickup_time=@pickup_time, notes=@notes WHERE id=@id`).run({ ...data, id });
  } else {
    depId = db.prepare(`INSERT INTO departures (tour_id,start_date,end_date,capacity,price_override,status,guide_id,driver_id,vehicle_id,pickup_point,pickup_time,notes)
      VALUES (@tour_id,@start_date,@end_date,@capacity,@price_override,@status,@guide_id,@driver_id,@vehicle_id,@pickup_point,@pickup_time,@notes)`).run(data).lastInsertRowid;
  }
  await audit(user, id ? "trip.update" : "trip.create", `${tour.title} ${start} (#${depId}) status ${data.status}${cancelledBookings.length ? `, ${cancelledBookings.length} booking(s) cancelled` : ""}`);
  for (const b of cancelledBookings) {
    await sendSms({ to: b.phone, bookingId: b.id, message: `We're sorry: ${tour.title} on ${date(start)} has been cancelled. Booking ${b.ref}. We will call you about a new date or a refund. - ${company.name}` });
  }
  revalidatePath("/", "layout");
  redirect(`/admin/departures/${depId}?saved=1`);
}

export async function setCheckIn(travellerId, checked) {
  await requireUser("trips.checkin");
  db.prepare("UPDATE travellers SET checked_in = ? WHERE id = ?").run(checked ? 1 : 0, Number(travellerId));
  return { id: travellerId, checked };
}

export async function messageDeparture(formData) {
  const user = await requireUser("trips.message");
  const dep = getDeparture(int(formData, "departure_id", { min: 1 }));
  const message = text(formData, "message", { max: 480 });
  if (!dep) redirect("/admin/departures");
  if (!message) fail(`/admin/departures/${dep.id}`, "Write a message first.");
  // Everyone still booked (confirmed or awaiting payment), one SMS per phone number.
  const rows = db.prepare(`SELECT MIN(b.id) AS id, c.phone FROM bookings b JOIN customers c ON c.id = b.customer_id
    WHERE b.departure_id = ? AND b.status != 'cancelled' GROUP BY c.phone`).all(dep.id);
  if (!rows.length) fail(`/admin/departures/${dep.id}`, "There's nobody booked on this trip to message.");
  for (const r of rows) await sendSms({ to: r.phone, message, bookingId: r.id });
  await audit(user, "trip.message", `${dep.tour_title} ${dep.start_date}: ${rows.length} SMS`);
  redirect(`/admin/departures/${dep.id}?sent=${rows.length}`);
}

/* ---------- Bookings ---------- */

export async function createManualBooking(prev, formData) {
  const user = await requireUser("bookings.edit");
  const names = text(formData, "travellers", { max: 4000 }).split("\n").map((s) => s.trim()).filter(Boolean);
  const name = text(formData, "name", { max: 120 });
  const source = text(formData, "source", { max: 20 });
  const method = text(formData, "method", { max: 10 });
  const paidNow = toPesewas(formData.get("paid_now"));
  const depForCheck = getDeparture(int(formData, "departure_id", { min: 1 }));
  const expectedTotal = depForCheck ? depForCheck.price * Math.max(1, names.length || 1) : 0;
  if (depForCheck && paidNow > expectedTotal) return { error: `Amount paid can't be more than the total of ${money(expectedTotal)}.`, values: formValues(formData) };
  let booking;
  try {
    booking = createBooking({
      departureId: int(formData, "departure_id", { min: 1 }),
      name,
      email: text(formData, "email", { max: 160 }),
      phone: text(formData, "phone", { max: 30 }),
      travellers: (names.length ? names : [name]).map((n) => ({ name: n })),
      plan: formData.get("plan") === "deposit" ? "deposit" : "full",
      source: ["walk-in", "phone", "agent"].includes(source) ? source : "walk-in",
      notes: text(formData, "notes", { max: 1000 }),
    });
    if (paidNow > 0) {
      await recordPayment({ bookingId: booking.id, amount: Math.min(paidNow, booking.total), method: METHODS.includes(method) ? method : "cash", note: "Recorded at booking", recordedBy: user.name });
    }
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message, values: formValues(formData) };
    throw e;
  }
  await audit(user, "booking.create", `${booking.ref} ${booking.customer_name} ${money(booking.total)}`);
  redirect(`/admin/bookings/${booking.id}?created=1`);
}

export async function addPayment(formData) {
  const user = await requireUser("payments.record");
  const bookingId = int(formData, "booking_id", { min: 1 });
  const back = `/admin/bookings/${bookingId}`;
  const b = getBooking(bookingId);
  const amount = toPesewas(formData.get("amount"));
  const method = text(formData, "method", { max: 10 });
  if (!b) redirect("/admin/bookings");
  if (b.status === "cancelled") fail(back, "This booking is cancelled. Restore it before taking payment.");
  if (amount <= 0) fail(back, "Enter an amount greater than zero.");
  if (amount > b.balance) fail(back, `That's more than the balance of ${money(b.balance)}.`);
  await recordPayment({ bookingId, amount, method: METHODS.includes(method) ? method : "cash", note: text(formData, "note", { max: 200 }) || null, recordedBy: user.name });
  await audit(user, "payment.record", `${b.ref} ${money(amount)} by ${method}`);
  redirect(`${back}?paid=1`);
}

export async function addRefund(formData) {
  const user = await requireUser("payments.refund");
  const bookingId = int(formData, "booking_id", { min: 1 });
  const back = `/admin/bookings/${bookingId}`;
  const amount = toPesewas(formData.get("amount"));
  const method = text(formData, "method", { max: 10 });
  try {
    const b = await recordRefund({ bookingId, amount, method: METHODS.includes(method) ? method : "momo", note: text(formData, "note", { max: 200 }), recordedBy: user.name });
    await audit(user, "payment.refund", `${b.ref} ${money(amount)}: ${text(formData, "note", { max: 200 })}`);
  } catch (e) {
    if (e instanceof BookingError) fail(back, e.message);
    throw e;
  }
  redirect(`${back}?refunded=1`);
}

export async function setBookingStatus(formData) {
  const user = await requireUser("bookings.edit");
  const id = int(formData, "booking_id", { min: 1 });
  const status = text(formData, "status", { max: 20 });
  const b = getBooking(id);
  if (!b || !["pending", "confirmed", "cancelled"].includes(status)) redirect("/admin/bookings");
  const back = `/admin/bookings/${id}`;
  if (status !== "cancelled" && b.status === "cancelled") {
    // Restoring takes seats again, so check the trip is still running and has room.
    const dep = getDeparture(b.departure_id);
    if (dep.status !== "open") fail(back, `This trip is ${dep.status}. Reopen the trip first, or book the customer on another date.`);
    if (dep.booked + b.travellers > dep.capacity) fail(back, `Not enough free seats on this trip to restore the booking (${dep.capacity - dep.booked} left).`);
  }
  const reason = status === "cancelled" ? text(formData, "reason", { max: 200 }) || "Cancelled by staff" : null;
  // A restored booking becomes a staff booking, so the unpaid-booking timer never cancels it again.
  const restoring = status !== "cancelled" && b.status === "cancelled";
  db.prepare(`UPDATE bookings SET status = ?, cancel_reason = ?${restoring ? ", source = CASE WHEN source = 'website' THEN 'phone' ELSE source END" : ""} WHERE id = ?`).run(status, reason, id);
  if (restoring) refreshBookingStatus(id); // already paid the deposit → back to confirmed
  await audit(user, `booking.${status}`, `${b.ref}${reason ? `: ${reason}` : ""}`);
  if (status === "cancelled") {
    await sendSms({ to: b.customer_phone, bookingId: id, message: `Your booking ${b.ref} for ${b.tour_title} on ${date(b.start_date)} has been cancelled. Call ${company.phone} for help. - ${company.name}` });
  }
  revalidatePath("/admin", "layout");
  redirect(back);
}

export async function sendReminder(formData) {
  const user = await requireUser("bookings.edit");
  const b = getBooking(int(formData, "booking_id", { min: 1 }));
  if (!b) redirect("/admin/bookings");
  await sendSms({
    to: b.customer_phone,
    bookingId: b.id,
    message: `Hi ${b.customer_name.split(" ")[0]}, a reminder that your balance of ${money(b.balance)} for ${b.tour_title} (${date(b.start_date)}) is due. Pay here: ${bookingLink(b)} - ${company.name}`,
  });
  await audit(user, "booking.reminder", b.ref);
  redirect(`/admin/bookings/${b.id}?reminded=1`);
}

/* ---------- Team & vehicles ---------- */

export async function addStaff(formData) {
  const user = await requireUser("team.manage");
  const name = text(formData, "name", { max: 120 });
  const phone = text(formData, "phone", { max: 30 });
  if (!name) fail("/admin/team", "Enter a name.");
  if (phone && !isPhone(phone)) fail("/admin/team", "That phone number doesn't look right.");
  const role = text(formData, "role", { max: 20 });
  db.prepare("INSERT INTO staff (name, role, phone) VALUES (?,?,?)").run(name, role === "Driver" ? "Driver" : "Guide", phone);
  await audit(user, "team.add", `${name} (${role})`);
  revalidatePath("/admin/team");
  redirect("/admin/team?saved=1");
}

export async function addVehicle(formData) {
  const user = await requireUser("team.manage");
  const name = text(formData, "name", { max: 80 });
  if (!name) fail("/admin/team", "Enter the vehicle name.");
  db.prepare("INSERT INTO vehicles (name, plate, seats) VALUES (?,?,?)").run(name, text(formData, "plate", { max: 20 }), int(formData, "seats", { min: 1, max: 100, fallback: 14 }));
  await audit(user, "vehicle.add", name);
  revalidatePath("/admin/team");
  redirect("/admin/team?saved=1");
}

export async function updateTeamMember(formData) {
  const user = await requireUser("team.manage");
  const id = int(formData, "id", { min: 1 });
  const row = db.prepare("SELECT * FROM staff WHERE id = ?").get(id);
  if (!row) redirect("/admin/team");
  if (formData.get("toggle")) {
    db.prepare("UPDATE staff SET active = 1 - active WHERE id = ?").run(id);
    await audit(user, row.active ? "team.deactivate" : "team.activate", row.name);
  } else {
    const name = text(formData, "name", { max: 120 });
    const phone = text(formData, "phone", { max: 30 });
    if (!name) fail("/admin/team", "Enter a name.");
    if (phone && !isPhone(phone)) fail("/admin/team", "That phone number doesn't look right.");
    const role = text(formData, "role", { max: 20 }) === "Driver" ? "Driver" : "Guide";
    db.prepare("UPDATE staff SET name = ?, phone = ?, role = ? WHERE id = ?").run(name, phone, role, id);
    await audit(user, "team.update", `${row.name} → ${name}`);
  }
  revalidatePath("/admin/team");
  redirect("/admin/team?saved=1");
}

export async function updateVehicle(formData) {
  const user = await requireUser("team.manage");
  const id = int(formData, "id", { min: 1 });
  const row = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id);
  if (!row) redirect("/admin/team");
  if (formData.get("toggle")) {
    db.prepare("UPDATE vehicles SET active = 1 - active WHERE id = ?").run(id);
    await audit(user, row.active ? "vehicle.deactivate" : "vehicle.activate", row.name);
  } else {
    const name = text(formData, "name", { max: 80 });
    if (!name) fail("/admin/team", "Enter the vehicle name.");
    db.prepare("UPDATE vehicles SET name = ?, plate = ?, seats = ? WHERE id = ?").run(name, text(formData, "plate", { max: 20 }), int(formData, "seats", { min: 1, max: 100, fallback: row.seats }), id);
    await audit(user, "vehicle.update", name);
  }
  revalidatePath("/admin/team");
  redirect("/admin/team?saved=1");
}

/* ---------- Trip requests ---------- */

export async function setEnquiryStatus(formData) {
  const user = await requireUser("enquiries.manage");
  const status = text(formData, "status", { max: 20 });
  if (!["new", "contacted", "won", "lost"].includes(status)) return;
  const id = int(formData, "id", { min: 1 });
  db.prepare("UPDATE enquiries SET status = ? WHERE id = ?").run(status, id);
  await audit(user, "enquiry.status", `#${id} → ${status}`);
  revalidatePath("/admin", "layout");
}
