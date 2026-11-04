// Writes attachments-map.csv: which record each file of the SharePoint
// attachment backup belongs to. The backup downloaded the files into one flat
// folder, so the link to the record was lost; it is rebuilt here from the
// file names and contents (email subjects and dates, PDF headers, screenshot
// timestamps) against each record's title and dates.
//
//   node scripts/attachments-mapping.mjs
//   npm run import:legacy -- --apply --attachments attachments-map.csv
//
// Rows without title_starts_with are not imported: those files could not be
// tied to a record with confidence. Fill them in (or leave them) and re-run;
// files already attached are skipped.

import { readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import Papa from "papaparse"

const root = fileURLToPath(new URL("..", import.meta.url))
const folder = join(root, "..", "Risk Management", "Backup_2026-11-03_attachments")

// [file pattern, project, title starts with, confidence, evidence]
const RULES = [
  [/^181931-AVIS CHANGEMENT-R00-20230313/, "181931", "Frais imputables", "haute", "Liste des avis de changement du 13 mars 2023; élément créé le 15 mars 2023"],
  [/^181931-AVIS CHANGEMENT-R00-20230818/, "181931", "Frais imputables", "moyenne", "Mise à jour d'août 2023 de la même liste d'avis de changement"],
  [/^Contrat Synergy/, "181931", "Meulage de finition", "haute", "Contrat de Synergy, le sous-traitant visé par l'élément"],
  [/^VER-L-239/, "181931", "Échaffaudage non attesté", "haute", "Lettre d'ingénieur du 27 oct. 2022 (cadres d'escaliers); élément créé le même jour"],
  [/^Mémo-STGM-QRT fixation isolant/, "181931", "Mode de fixation isolant", "haute", "Courriel STGM « QRT fixation isolant des fondations » (UTILE, N.D. 181931)"],
  [/^Mémo-STGM-choix membrane fondation/, "181931", "Mode de fixation isolant", "moyenne", "Courriel STGM sur la membrane de fondation, même sujet que l'isolant de fondation"],
  [/^2022-12-01_AVIS génératrice Drumco/, "202116", "Moore_Délai", "haute", "Courriel « Le Natur – demande de prix pour génératrice »"],
  [/^RE 22230 LE NATUR\s+Priorités chantier\.msg$/, "202116", "Maçon_Travaux", "moyenne", "Élévations prêtes selon l'avancement du maçon"],
  [/^RE 22230 LE NATUR\s+Priorités chantier \(1\)\.msg$/, "202116", "Thermo-Bois", "moyenne", "Même courriel (copie identique) : les travaux du revêtement dépendent du maçon"],
  [/^U3R - fenêtre logement 112/, "222305", "Problème cadres fenêtres", "haute", "Courriel « U3R – fenêtre logement 112 » (Utile Trois-Rivières)"],
  [/^RE U3R - eau prise dans les membranes/, "222305", "Problème cadres fenêtres", "haute", "Courriel « U3R – eau prise dans les membranes »"],
  [/^RE U3R - rapport visite 05/, "222305", "Problème cadres fenêtres", "moyenne", "Visite Soprema / MGP, sept. 2023"],
  [/^Re U3R - scellant panneau exoair/, "222305", "Problème cadres fenêtres", "moyenne", "Scellant des panneaux, Tremco, sept. 2023"],
  [/^Fwd Fiche\.msg$/, "222305", "Problème cadres fenêtres", "moyenne", "Fiche transmise par Francis Bureau (MGP) à Baptiste Markó, juil. 2023"],
  [/^Niveau [456]\.pdf$/, "222305", "Implantation toilettes", "moyenne", "Plans d'étage des logements; seul autre élément de 222305 avec pièce jointe"],
  [/^RE_ 222313 WALTER/, "222313", "Dépassement du budget", "haute", "« Présentation du budget versus les soumissions », 20 mars 2023, même jour"],
  [/^222319 - UTER\s+Retenues de 1%/, "222319", "Libération retenue", "haute", "Courriel « Retenues de 1 % du client »"],
  [/^DA-310000 Edguy_Mur soutènement remblai vs Riviera \((DEVIS|PLAN)\)_rev00\.pdf$/, "222319", "RIVIERA_Remblais", "haute", "Devis et plan du mur en remblai vs Riviera, sept. 2023"],
  [/^2024-07-12 Journal de chantier 1/, "222328", "Étanchéité du mur berlinois", "moyenne", "Journal de chantier de l'architecte du 12 juil. 2024; élément créé le 18 juil. 2024"],
  [/^Mémo-20240224-Retard de chantier/, "222328", "Retard Revêtement", "haute", "Courriel du 24 fév. 2025 à Revêtement de la Capitale; élément créé le même jour"],
  [/^20250408_Échéancier Synergy \(22sem\)/, "232408", "Échéancier Coffrages", "haute", "Échéancier Synergy « 22 sem. »"],
  [/^20260903_Avis VQ ajout écran toit/, "232408", "La VQ exige", "haute", "Courriel de la Ville du 3 sept. 2026; élément créé le même jour"],
  [/^Position UTILE_Écrans en toiture/, "232408", "La VQ exige", "haute", "Position du client sur l'exigence d'écrans, 29 sept. 2026"],
  [/^TR USS - Écrans en toiture/, "232408", "Un problème de qualité", "haute", "Galvanisation des écrans de Noël, 13 oct. 2026; élément créé le même jour"],
  [/^Capture d.écran 2026-10-20 092928/, "24087", "En raison de la présence d'un poteau", "haute", "Capture du 20 oct. 2026 à 9 h 29; élément créé le même matin"],
  [/^26-0049_PLAN_P001_V04/, "24101", "Demande d'emprise", "haute", "Plan de fermeture de rue lié au courriel ci-dessous"],
  [/^Re_ Urgent - Re_ PLAN - 26-0049.*Outlook\.pdf$/, "24101", "Demande d'emprise", "haute", "Courriel du 29 oct. 2026 demandant à Thomas Lacroux de documenter le risque; élément créé le même jour"],
  [/^2025-11-20 Note de couverture - La Champenoise III_rev01\.pdf$/, "25010", "Date de début de travaux", "moyenne", "Note de couverture d'assurance, période liée au début des travaux"],
  [/^MSU et WB-40/, "25010", "Livraison et grosseur", "haute", "Véhicules de conception (MSU, WB-40) : grosseur des camions"],
  [/^Info-Travaux_sens unique_Gérard-Morisset/, "25010", "Livraison et grosseur", "haute", "Accès temporaire rue Gérard-Morisset (adresse du chantier) pour les véhicules"],
  [/^2026-10-02 MED/, "25015", "Mise en demeure", "haute", "Mise en demeure du 2 oct. 2026; élément créé le même jour"],
  [/^Partenariat- Grille Bonifications/, "25019", "Bonification de 1", "haute", "Grille de bonification de 1 %"],
  [/^TR _ 68186816_2600 boul Montmorency/, "25072", "Demande de sécurisation HQ", "haute", "« Travaux près des lignes », 20 août 2026; élément créé le même jour"],
  [/^Capture d.écran 2026-08-06 114110/, "26029", "Gestion de l'accès des employés", "haute", "Capture du 6 août 2026 à 11 h 41; élément créé à 11 h 42"],
]

// Identical copies of a file already attached once ("(1)" = second download).
const DUPLICATES = [
  /^2025-11-20 Note de couverture - La Champenoise III_rev01 \(1\)\.pdf$/,
  /^DA-310000 .*\(PLAN\)_rev00 \(1\)\.pdf$/,
  /^Re_ Urgent - Re_ PLAN - 26-0049.*Outlook \(1\)\.pdf$/,
]

// Files with no reliable link to a record; candidates noted for review.
const OPEN = {
  "S200_Rev2.png": "Plan de structure S200 : 24087 « mur de soutènement Détail 241A » ou 25010 « coussin amortisseur, base de béton » ?",
  "2188B989-AAC7-4C1B-8BD9-812D47248CAA.jpeg": "Photo de chantier sans date : à identifier",
  "D86E086C-F789-4F92-A4D2-8601A54FFC90.jpeg": "Photo de chantier sans date : à identifier",
  "IMG_4065.HEIC": "Photo iPhone sans date lisible : à identifier",
  "20240507_135046998_iOS.jpg": "Photo du 7 mai 2024 : 222328 Étanchéité du mur berlinois ou 222305 Implantation toilettes ?",
  "2022-12-15_Natur_Échéancier global_FINITION.pdf": "Échéancier Natur de déc. 2022 : un des trois éléments de 202116 ?",
}

const files = readdirSync(folder).sort((a, b) => a.localeCompare(b, "fr"))
const rows = files.map((file) => {
  const rule = RULES.find(([pattern]) => pattern.test(file))
  if (rule) {
    const [, project_number, title_starts_with, confidence, evidence] = rule
    return { file, project_number, title_starts_with, confidence, evidence }
  }
  if (DUPLICATES.some((pattern) => pattern.test(file))) {
    return { file, project_number: "", title_starts_with: "", confidence: "doublon", evidence: "Copie identique d'un fichier déjà joint" }
  }
  return { file, project_number: "", title_starts_with: "", confidence: "à confirmer", evidence: OPEN[file] ?? "Aucun lien trouvé" }
})

writeFileSync(join(root, "attachments-map.csv"), "﻿" + Papa.unparse(rows))
const by = (value) => rows.filter((row) => row.confidence === value).length
console.log(`attachments-map.csv: ${rows.length} files — ${by("haute")} high, ${by("moyenne")} medium, ${by("doublon")} duplicates, ${by("à confirmer")} to confirm`)
for (const row of rows.filter((item) => item.confidence === "à confirmer")) console.log(`  ? ${row.file}  — ${row.evidence}`)
