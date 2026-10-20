// Sample data so the system is usable straight away. Delete data/tourflow.db
// (or run `npm run reset-db`) to start again.

const GHS = (cedis) => Math.round(cedis * 100);

function dateFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const TOURS = [
  {
    slug: "cape-coast-elmina-weekend",
    title: "Cape Coast & Elmina Heritage Weekend",
    destination: "Central Region, Ghana",
    category: "Local",
    duration_days: 2,
    price: GHS(1450),
    deposit_percent: 30,
    summary: "Castles, canopy walkways and beach evenings on Ghana's historic coast.",
    description:
      "A guided weekend through the history of the Gold Coast. Walk through Cape Coast and Elmina castles with expert guides, cross the Kakum canopy walkway high above the rainforest, and unwind with a beachfront dinner.",
    itinerary:
      "Day 1: Depart Accra 6:00am, Kakum National Park canopy walk, lunch at Hans Cottage, check in at beach resort\nDay 2: Cape Coast Castle tour, Elmina Castle tour, lunch in Elmina, return to Accra by 7:00pm",
    inclusions: "Air-conditioned transport\n1 night beach resort accommodation\nBreakfast, lunch and dinner\nAll entrance fees\nProfessional tour guide",
    exclusions: "Personal expenses\nDrinks outside meals\nTips",
    image: "linear-gradient(135deg,#0f766e,#f59e0b)",
  },
  {
    slug: "mole-safari",
    title: "Mole National Park Safari",
    destination: "Savannah Region, Ghana",
    category: "Adventure",
    duration_days: 4,
    price: GHS(3900),
    deposit_percent: 40,
    summary: "Walk with elephants at Ghana's largest wildlife park.",
    description:
      "Head north for walking and jeep safaris in Mole National Park, where elephants, antelope, warthogs and baboons roam freely. Includes a stop at the Larabanga mosque, one of the oldest in West Africa.",
    itinerary:
      "Day 1: Depart Accra, overnight in Kintampo with a visit to Kintampo Falls\nDay 2: Drive to Mole, afternoon walking safari\nDay 3: Morning jeep safari, Larabanga mosque and Mystic Stone\nDay 4: Return to Accra",
    inclusions: "Transport\n3 nights accommodation\nAll meals\nPark fees and armed ranger\nGuide",
    exclusions: "Personal expenses\nTravel insurance",
    image: "linear-gradient(135deg,#854d0e,#65a30d)",
  },
  {
    slug: "volta-wli-afadjato",
    title: "Volta Escape: Wli Falls & Mount Afadjato",
    destination: "Volta Region, Ghana",
    category: "Adventure",
    duration_days: 3,
    price: GHS(1950),
    deposit_percent: 30,
    summary: "Hike Ghana's highest peak and swim under its tallest waterfall.",
    description:
      "Three days in the green hills of the Volta Region. Climb Mount Afadjato, hike to the upper and lower Wli Falls, visit the Tafi Atome monkey sanctuary, and see kente weaving in Kpetoe.",
    itinerary:
      "Day 1: Depart Accra, Tafi Atome monkey sanctuary, check in at Hohoe\nDay 2: Wli Falls hike, Mount Afadjato climb\nDay 3: Kpetoe kente village, return to Accra",
    inclusions: "Transport\n2 nights accommodation\nBreakfast and dinner\nEntrance fees\nGuide",
    exclusions: "Lunch\nPersonal expenses",
    image: "linear-gradient(135deg,#166534,#0ea5e9)",
  },
  {
    slug: "kumasi-ashanti-culture",
    title: "Kumasi Ashanti Culture Day",
    destination: "Ashanti Region, Ghana",
    category: "Culture",
    duration_days: 1,
    price: GHS(850),
    deposit_percent: 50,
    summary: "Manhyia Palace, Kejetia market and Bonwire kente in one day.",
    description:
      "A packed day in the Garden City. Tour the Manhyia Palace Museum, explore Kejetia, one of West Africa's largest markets, and watch master weavers at Bonwire kente village.",
    itinerary: "Day 1: Manhyia Palace Museum, Kejetia market, lunch, Bonwire kente village, Prempeh II Jubilee Museum",
    inclusions: "Transport within Kumasi\nLunch\nEntrance fees\nGuide",
    exclusions: "Travel to Kumasi\nShopping",
    image: "linear-gradient(135deg,#b45309,#facc15)",
  },
  {
    slug: "ada-foah-beach-getaway",
    title: "Ada Foah Beach Getaway",
    destination: "Greater Accra, Ghana",
    category: "Relaxation",
    duration_days: 2,
    price: GHS(1200),
    deposit_percent: 30,
    summary: "Boat rides where the Volta meets the sea.",
    description:
      "Escape the city for a weekend at Ada Foah, where the Volta River meets the Atlantic. Enjoy boat rides to the estuary, island hopping, jet skiing and a bonfire on the beach.",
    itinerary: "Day 1: Depart Accra, boat cruise to the estuary, beach bonfire\nDay 2: Island hopping, free time, return to Accra",
    inclusions: "Transport\n1 night riverside resort\nBreakfast and dinner\nBoat cruise",
    exclusions: "Jet ski hire\nDrinks",
    image: "linear-gradient(135deg,#0369a1,#fb7185)",
  },
  {
    slug: "dubai-5-day-package",
    title: "Dubai 5-Day Holiday Package",
    destination: "Dubai, UAE",
    category: "International",
    duration_days: 5,
    price: GHS(24500),
    deposit_percent: 40,
    summary: "Flights, 4-star hotel, desert safari and Burj Khalifa.",
    description:
      "Everything handled for you: return flights from Accra, visa processing, a 4-star hotel, airport transfers, a desert safari with BBQ dinner, a Dubai Marina dhow cruise and tickets to the Burj Khalifa observation deck.",
    itinerary:
      "Day 1: Fly Accra to Dubai, transfer to hotel\nDay 2: City tour and Burj Khalifa\nDay 3: Desert safari with BBQ dinner\nDay 4: Free day, Marina dhow cruise in the evening\nDay 5: Return flight to Accra",
    inclusions: "Return economy flights\nUAE tourist visa\n4 nights 4-star hotel with breakfast\nAirport transfers\nDesert safari, dhow cruise, Burj Khalifa tickets",
    exclusions: "Lunch and dinner (except safari)\nPersonal expenses\nTravel insurance",
    image: "linear-gradient(135deg,#7c3aed,#f97316)",
  },
];

export function seed(db) {
  const insertTour = db.prepare(`INSERT INTO tours
    (slug,title,destination,category,duration_days,price,deposit_percent,summary,description,itinerary,inclusions,exclusions,image_url)
    VALUES (@slug,@title,@destination,@category,@duration_days,@price,@deposit_percent,@summary,@description,@itinerary,@inclusions,@exclusions,@image)`);
  const insertStaff = db.prepare("INSERT INTO staff (name, role, phone) VALUES (?,?,?)");
  const insertVehicle = db.prepare("INSERT INTO vehicles (name, plate, seats) VALUES (?,?,?)");
  const insertDeparture = db.prepare(`INSERT INTO departures
    (tour_id,start_date,end_date,capacity,guide_id,driver_id,vehicle_id,pickup_point,pickup_time)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  const insertCustomer = db.prepare("INSERT INTO customers (name,email,phone) VALUES (?,?,?)");
  const insertBooking = db.prepare(`INSERT INTO bookings
    (ref,departure_id,customer_id,travellers,unit_price,total,status,payment_plan,source,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const insertTraveller = db.prepare("INSERT INTO travellers (booking_id,name,phone) VALUES (?,?,?)");
  const insertPayment = db.prepare("INSERT INTO payments (booking_id,amount,method,reference,status,created_at) VALUES (?,?,?,?,?,?)");

  db.transaction(() => {
    const tourIds = TOURS.map((t) => insertTour.run(t).lastInsertRowid);

    const kofi = insertStaff.run("Kofi Mensah", "Guide", "+233 24 111 2233").lastInsertRowid;
    const ama = insertStaff.run("Ama Owusu", "Guide", "+233 20 555 6677").lastInsertRowid;
    const yaw = insertStaff.run("Yaw Boateng", "Driver", "+233 27 888 9900").lastInsertRowid;
    const kwame = insertStaff.run("Kwame Asare", "Driver", "+233 55 222 3344").lastInsertRowid;
    const bus1 = insertVehicle.run("Toyota Coaster", "GR 4521-24", 30).lastInsertRowid;
    const bus2 = insertVehicle.run("Toyota Hiace", "GT 8830-23", 14).lastInsertRowid;

    const pickup = "Accra Mall, Tetteh Quarshie";
    const dep = (tourIdx, startOffset, capacity, guide, driver, vehicle) => {
      const t = TOURS[tourIdx];
      return insertDeparture.run(
        tourIds[tourIdx], dateFromToday(startOffset), dateFromToday(startOffset + t.duration_days - 1),
        capacity, guide, driver, vehicle, t.category === "International" ? "Kotoka International Airport, Terminal 3" : pickup,
        t.category === "International" ? "08:00" : "06:00"
      ).lastInsertRowid;
    };

    const d1 = dep(0, 4, 30, kofi, yaw, bus1);
    const d2 = dep(0, 18, 30, ama, kwame, bus1);
    const d3 = dep(1, 11, 14, kofi, kwame, bus2);
    const d4 = dep(2, 25, 14, ama, yaw, bus2);
    const d5 = dep(3, 8, 14, null, null, null);
    dep(4, 15, 14, null, null, null);
    const d7 = dep(5, 40, 20, ama, null, null);
    dep(5, 70, 20, null, null, null);

    const people = [
      ["Abena Darko", "abena@example.com", "+233244100200"],
      ["Kwesi Appiah", "kwesi@example.com", "+233201300400"],
      ["Efua Sarpong", "efua@example.com", "+233541500600"],
      ["Nana Agyeman", "nana@example.com", "+233271700800"],
      ["Selorm Adzo", "selorm@example.com", "+233209900111"],
      ["Joseph Quaye", "joseph@example.com", "+233244222333"],
    ];
    const customerIds = people.map((p) => insertCustomer.run(...p).lastInsertRowid);

    const now = Date.now();
    const ago = (days) => new Date(now - days * 86400000).toISOString().slice(0, 19).replace("T", " ");
    const book = (ref, depId, tourIdx, custIdx, pax, status, plan, paidFraction, daysAgo, source = "website") => {
      const unit = TOURS[tourIdx].price;
      const total = unit * pax;
      const id = insertBooking.run(ref, depId, customerIds[custIdx], pax, unit, total, status, plan, source, ago(daysAgo)).lastInsertRowid;
      insertTraveller.run(id, people[custIdx][0], people[custIdx][2]);
      for (let i = 1; i < pax; i++) insertTraveller.run(id, `${people[custIdx][0].split(" ")[0]}'s guest ${i}`, null);
      if (paidFraction > 0) {
        insertPayment.run(id, Math.round(total * paidFraction), "momo", `${ref}-SEED1`, "success", ago(daysAgo));
      }
    };

    book("TF-A7K2PQ", d1, 0, 0, 2, "confirmed", "full", 1, 9);
    book("TF-B3M8RT", d1, 0, 1, 4, "confirmed", "deposit", 0.3, 6, "phone");
    book("TF-C9N4WX", d3, 1, 2, 2, "confirmed", "deposit", 0.4, 5);
    book("TF-D5P6YZ", d2, 0, 3, 3, "confirmed", "full", 1, 3);
    book("TF-E2Q7HJ", d4, 2, 4, 2, "pending", "full", 0, 1);
    book("TF-F8R3KL", d7, 5, 5, 2, "confirmed", "deposit", 0.4, 2, "walk-in");
    book("TF-G4S9MN", d5, 3, 0, 5, "confirmed", "full", 1, 0);

    // Past, completed trips so reports and charts have history.
    const past = [
      [0, -150, 22, [[0, 4], [2, 3], [3, 6], [5, 2]]],
      [3, -120, 14, [[1, 5], [4, 4]]],
      [4, -95, 14, [[2, 2], [5, 6], [0, 3]]],
      [1, -70, 14, [[3, 4], [1, 2]]],
      [2, -45, 14, [[4, 5], [5, 3], [2, 2]]],
      [0, -22, 30, [[1, 6], [3, 4], [0, 5], [4, 2]]],
    ];
    let n = 0;
    for (const [tourIdx, offset, cap, groups] of past) {
      const t = TOURS[tourIdx];
      const depId = insertDeparture.run(tourIds[tourIdx], dateFromToday(offset), dateFromToday(offset + t.duration_days - 1),
        cap, kofi, yaw, bus2, pickup, "06:00").lastInsertRowid;
      db.prepare("UPDATE departures SET status = 'completed' WHERE id = ?").run(depId);
      for (const [custIdx, pax] of groups) {
        n++;
        book(`TF-P${String(n).padStart(2, "0")}X${tourIdx}${custIdx}`, depId, tourIdx, custIdx, pax, "confirmed", "full", 1, -offset + 10 + (n % 9));
      }
    }
  })();
}
