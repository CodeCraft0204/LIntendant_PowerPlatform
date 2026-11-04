// Roles and sections; their labels are in src/i18n (role.*, roleDescription.*,
// section.*).
export const ROLES = ["admin", "direction", "gestion", "lecteur"]

const EVERYONE = ROLES

// Sidebar sections and who can open them. Mirrors the RLS policies in
// supabase/migrations, which are what actually protect the data.
export const SECTIONS = [
  { path: "/", icon: "dashboard", roles: EVERYONE },
  { path: "/risques", icon: "alert_triangle", roles: EVERYONE },
  { path: "/projets", icon: "building", roles: EVERYONE },
  { path: "/reference", icon: "book_open", roles: EVERYONE },
  { path: "/administration", icon: "settings", roles: ["admin", "direction"] },
]

export const canOpen = (section, role) => section.roles.includes(role)

export const can = {
  editRisks: (role) => ["admin", "direction", "gestion"].includes(role),
  deleteRisks: (role) => role === "admin",
  editReference: (role) => ["admin", "direction"].includes(role),
  manageDirectory: (role) => ["admin", "direction"].includes(role),
  manageTeam: (role) => role === "admin",
  // The settings are management's decisions (D2, D4, stage B).
  changeSettings: (role) => ["admin", "direction"].includes(role),
  removeAttachments: (role) => ["admin", "direction"].includes(role),
}
