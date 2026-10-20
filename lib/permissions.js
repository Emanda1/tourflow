// Who can do what. Owners can do everything.
export const ROLES = {
  owner: "Owner",
  manager: "Manager",
  sales: "Sales / front desk",
  operations: "Operations / guide",
};

const P = {
  "dashboard.view": ["owner", "manager", "sales", "operations"],
  "finance.view": ["owner", "manager", "sales"],
  "bookings.view": ["owner", "manager", "sales"],
  "bookings.edit": ["owner", "manager", "sales"],
  "payments.record": ["owner", "manager", "sales"],
  "payments.refund": ["owner", "manager"],
  "tours.edit": ["owner", "manager"],
  "trips.view": ["owner", "manager", "sales", "operations"],
  "trips.edit": ["owner", "manager", "operations"],
  "trips.checkin": ["owner", "manager", "operations"],
  "trips.message": ["owner", "manager", "operations"],
  "customers.view": ["owner", "manager", "sales"],
  "enquiries.manage": ["owner", "manager", "sales"],
  "team.manage": ["owner", "manager", "operations"],
  "messages.view": ["owner", "manager", "sales"],
  "data.export": ["owner", "manager"],
  "settings.manage": ["owner"],
  "staff.manage": ["owner"],
  "backups.manage": ["owner"],
  "audit.view": ["owner"],
};

export function can(user, permission) {
  if (!user || !user.active) return false;
  if (user.role === "owner") return true;
  return (P[permission] || []).includes(user.role);
}
