# Risques et enjeux: L'Intendant (Phase 1, full-stack)

A web app that replaces the SharePoint list *Risques et enjeux*. It covers everything in the Phase 1 plan ([Phase1_Complete_Guide.md](../Risk%20Management/Phase1_Complete_Guide.md)), without SharePoint's workarounds. It also includes two Phase 2 items that cost little here: the intervention journal and the live matrix.

- **Front end:** React 19, Vite 8, React Router, TanStack Query and Tailwind 4. The structure follows the We2 back office: tokens per theme, a layout shell, UI components and role-based sections. It is recoloured with the L'Intendant brand, and its layout follows the L'Intendant ERP.
- **Back end:** Supabase (Postgres, Auth, Storage). The rules live in the database (generated columns, triggers, row level security), so they hold whatever writes to it.
- **Demo mode:** without Supabase settings, the app runs entirely in the browser on the SharePoint backup, so it can be shown before the Supabase project exists.

```
npm install
npm run demo:seed     # builds the demo data from ../Risk Management/*.csv
npm run dev           # http://localhost:5180
```

## What changes compared with the SharePoint plan

| SharePoint Phase 1 limit | Here |
| --- | --- |
| Score and level appear only after saving | The 5 × 5 matrix shows the score, level, management flag and next review as you click |
| Validation can't check *Propriétaire* or *Projet* | Project is required, and owner is required on every new active record |
| An *enjeu* is only refused after saving | Choosing *Enjeu* sets the probability to 5 and locks it; the database also refuses a mismatch |
| The closure date must be typed by hand | It is filled with today's date on *Fermé* (still editable), and required |
| The old closed records need a hidden "Exception historique" flag ticked by hand on 254 rows | The import sets it; reopening a record lifts it automatically |
| Stage A, then stage B, as two validation formulas | New records are always complete; the "stage B" rule for imported records is one switch in *Administration* |
| Open decisions D2 and D4 are formula edits | They are settings in *Administration › Paramètres* (direction and admin) |
| No journal in Phase 1 | Every creation, rating change, closure, reopening, note and file goes in the journal automatically |
| One view or link per project | Each project page (`/projets/25009`) is a link to pin as a Teams *Website* tab; **Lien pour Teams** copies it |
| Power Apps row limits (500 / 2,000) | Not applicable: queries run in Postgres |

## Screens

| Route | Screen |
| --- | --- |
| `/` | Dashboard: active items, critical and high, management flag, overdue reviews, reassessment progress, heat matrix (click a cell to filter), levels, most exposed projects, recent activity |
| `/risques` | Register, with the saved views of the plan (*Comité d'opération*, *Mes risques actifs*, *Révision échue*, *Signalement direction*, *À recoter*) plus *Actifs*, *Fermés* and *Tous*; search, filters and CSV export. All filters are in the URL, so any view can be shared |
| `/risques/:id`, `/risques/nouveau` | The record: identification, assessment matrix with reference guidance, consequences, response (the management contact appears only when the item is flagged), follow-up, SharePoint history, attachments and journal |
| `/projets`, `/projets/:number` | Projects and one project's register |
| `/reference` | Reference grid. Management edits the probability, impact and cause descriptions here, and the form shows them |
| `/administration` | Settings (D2, D4, strict validation), team and roles, people, projects, data |

## Languages

The interface is in Canadian French by default. The **FR / EN** switch in the top-right corner of every page, the sign-in screen included, changes it to English in place, without a reload, and open forms keep their unsaved edits. The choice is remembered in the browser.

- **Strings** are in [src/i18n/fr.js](src/i18n/fr.js) and [src/i18n/en.js](src/i18n/en.js). Both files have the same keys, which `npm test` checks. Use `t("key", { params })` in code. A plural is a function in the dictionary.
- **Dates and money** follow the language: `fr-CA` gives "15 déc. 2026, 17 400 000 $" and `en-CA` gives "Dec 15, 2026, $17,400,000".
- **What people type** stays as written in both languages: titles, notes, and the reference-grid descriptions management writes. The one exception is the cause descriptions: while management hasn't changed Simon's original definitions, English shows their built-in translation.
- **The switch's position** is the `.lang-toggle` rule in [src/styles/app.css](src/styles/app.css).

## Roles

| Role | Can |
| --- | --- |
| Administrateur | Everything, including team access and deleting a record |
| Direction | Risks, projects, people, reference grid and settings |
| Chargé de projet | Create and update risks; add notes and files |
| Lecteur | Read only |

The roles are enforced by row level security ([supabase/migrations](supabase/migrations)). The browser checks in [src/lib/roles.js](src/lib/roles.js) only hide what a role can't use. A new account has no role until an admin gives it one.

## Structure

```
src/
  domain/rules.js        assessment rules: score, level, flag, next review, validation (tested)
  domain/views.js        the register's saved views and sorting
  i18n/                  FR / EN dictionaries and the t() translator
  api/                   one interface, two backends: supabaseBackend.js and demoBackend.js
  pages/                 Dashboard, Register, RiskPage, Projects, ProjectPage, Reference, Admin, Login
  components/            Layout (navy sidebar), ui, risk (matrix, table, badges), events (journal)
  styles/theme.css       brand tokens, light and dark
  styles/app.css         components
supabase/migrations/     schema, rules, triggers, RLS, storage bucket, reference grid content
scripts/
  import-legacy.mjs      SharePoint backup → Supabase (dry run by default)
  build-demo-seed.mjs    SharePoint backup → demo data
  test-db.mjs            runs the migrations in PGlite and checks rules and access
```

### Data model

- **`risks`** holds the record. `score` and `level` are generated columns. The historical SharePoint values (`legacy_*`) are read-only for every user.
- **`risk_register`** (a view) adds the project, owner and contact names, the management flag, the next review, and the view flags (`needs_rating`, `in_committee`, `review_overdue`).
- **`risk_events`** is the journal. Triggers write the automatic events and members add notes.
- **`risk_attachments`** lists the files, which are stored in the private bucket `risk-attachments`.
- **`projects`** and **`people`** hold projects and people. Owners don't need an account; a person is linked to an account by email.
- **`reference_guides`** holds the reference grid, and **`settings`** holds the open decisions.
- **`profiles`** holds members and their roles.

## Setting up Supabase

1. **Create the project.** Use the Canada (Central) region if the data must stay in Canada.
2. **Run the migrations** in `supabase/migrations/` in order. Either paste them into the SQL editor, or run `npx supabase link` then `npx supabase db push`.
3. **Set up Authentication:**
   - **URL Configuration:** set *Site URL* to the app's address, and add `http://localhost:5180/**` to *Redirect URLs*.
   - **Providers › Email:** keep it on. Members sign in with a password or a magic link; magic links never create accounts.
   - **Optional, Providers › Azure:** register an app in Entra ID, paste its client ID, secret and tenant URL, then set `VITE_AUTH_MICROSOFT=1`.
4. **Configure the app.** Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
5. **Create the first admin.** Invite yourself (*Authentication › Users › Invite user*), sign in once, then run:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@lintendant.ca';
   ```

   After that, grant roles from *Administration › Équipe*.

## Importing the SharePoint data

From a trusted machine, with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in `.env.local`:

```
npm run import:legacy                        # dry run: counts only
npm run import:legacy -- --apply             # import
```

By default the import reads the largest export in `../Risk Management`, which should contain every record. It then enriches it with `Sauvegarde complète_with ID.csv`, adding the SharePoint ID, the *Comité opération* checkbox, newer values, and records created after the full export. Re-running is safe, because records already imported are skipped.

On the 3 Nov backup it reports 355 records (101 active, 254 closed), 57 projects, 24 owners, 8 active items without an owner and 13 committee items.

- **Nothing unapproved is inferred.** Kind, cause, ratings and strategy stay empty until the project managers re-rate the active items (*À recoter*). Once Simon approves the standard Type → Cause mapping (D5), `--map-causes` pre-fills it.
- **Project names are merged by number.** Two projects appear under two spellings ("TNO"/"Tno", "Utile"/"Utile Québec"); the most frequent name is kept.
- **Attachments are mapped by hand.** Run `npm run import:legacy -- --attachments-template`. Fill in `attachments-map.csv`, giving each file a project number and the first words of its record's title; `records-with-attachments.csv` lists the 27 records. Then run `npm run import:legacy -- --apply --attachments attachments-map.csv`.

## Tests

```
npm test          # rules (all 25 ratings, decisions, validation) and a smoke test of every screen in demo mode
npm run test:db   # migrations in PGlite: the 25 ratings match the browser, triggers, journal, access per role
```

## Deployment

The app builds to a static site with `npm run build` and outputs `dist/`. Any static host works, as long as unknown paths fall back to `index.html`:

- **Vercel:** `vercel.json` is included.
- **Azure Static Web Apps or Netlify:** add the same rewrite in that host's config.

It can also be pinned as a Teams tab.

**Demo builds contain client data.** A build without Supabase settings includes the SharePoint backup (`src/demo/seed.generated.json`, git-ignored). Keep demo builds local or behind access control. A build with Supabase settings never includes that file; the `virtual:demo-seed` plugin in `vite.config.js` makes sure of it.
