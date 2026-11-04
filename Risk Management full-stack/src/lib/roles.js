export const ROLES = {
  admin: { label: "Administrateur", description: "Tout, y compris l'accès de l'équipe" },
  direction: { label: "Direction", description: "Risques, projets, personnes, grille de référence et paramètres" },
  gestion: { label: "Chargé de projet", description: "Crée et met à jour les risques, ajoute notes et fichiers" },
  lecteur: { label: "Lecteur", description: "Consultation seulement" },
}

const EVERYONE = Object.keys(ROLES)

// Sidebar sections and who can open them. Mirrors the RLS policies in
// supabase/migrations, which are what actually protect the data.
export const SECTIONS = [
  { path: "/", label: "Tableau de bord", icon: "dashboard", roles: EVERYONE },
  { path: "/risques", label: "Risques et enjeux", icon: "alert_triangle", roles: EVERYONE },
  { path: "/projets", label: "Projets", icon: "building", roles: EVERYONE },
  { path: "/reference", label: "Grille de référence", icon: "book_open", roles: EVERYONE },
  { path: "/administration", label: "Administration", icon: "settings", roles: ["admin", "direction"] },
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
