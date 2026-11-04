// @vitest-environment jsdom
//
// Renders the whole app in demo mode (no Supabase) and walks through the
// screens a demo uses: sign-in by role, dashboard, register views, a record,
// creating a risk with the matrix, the enjeu and validation rules, projects,
// reference grid and administration.

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { api } from "./api/index.js"
import App from "./App.jsx"
import { setLang } from "./i18n/index.js"

beforeAll(() => {
  // Like recent Chrome: scroll methods return a Promise. An effect that
  // returned it by accident would crash the layout (see Layout.jsx).
  window.scrollTo = () => Promise.resolve()
})

beforeEach(async () => {
  localStorage.clear()
  setLang("fr")
  await api.reset()
})

afterEach(cleanup)

async function open(path, account = "Administrateur démo") {
  window.history.pushState({}, "", "/connexion")
  // StrictMode, as in main.jsx: it runs each effect's cleanup once on mount,
  // which is where a bad cleanup value crashes.
  render(
    <StrictMode>
      <App />
    </StrictMode>
  )
  fireEvent.click(await screen.findByText(account))
  await screen.findByRole("heading", { name: "Tableau de bord" })
  if (path !== "/") {
    window.history.pushState({}, "", path)
    window.dispatchEvent(new PopStateEvent("popstate"))
  }
}

describe("demo mode", () => {
  it("signs in and shows the dashboard figures", async () => {
    await open("/")
    expect(await screen.findByText("Éléments actifs")).toBeTruthy()
    expect(screen.getByText("À recoter")).toBeTruthy()
    expect(screen.getByText("Matrice des éléments actifs")).toBeTruthy()
    expect(await screen.findByText(/Campagne de recotation en cours/)).toBeTruthy()
  })

  it("lists the register with its saved views", async () => {
    await open("/risques?vue=comite")
    await screen.findByRole("heading", { name: "Risques et enjeux" })
    const tabs = screen.getByRole("tablist", { name: "Vues du registre" })
    for (const label of ["Comité d'opération", "Mes risques actifs", "Révision échue", "Signalement direction", "À recoter"]) {
      expect(within(tabs).getByText(label)).toBeTruthy()
    }
    await waitFor(() => expect(document.querySelectorAll("tbody tr").length).toBeGreaterThan(0))
  })

  it("opens a record", async () => {
    await open("/risques/1")
    expect(await screen.findByText("Identification")).toBeTruthy()
    expect(screen.getByText("Évaluation")).toBeTruthy()
    expect(screen.getByText("Journal des interventions")).toBeTruthy()
  })

  it("refuses an incomplete new active record", async () => {
    await open("/risques/nouveau")
    fireEvent.click(await screen.findByRole("button", { name: "Créer l'élément" }))
    expect(await screen.findByText("Vérifiez les champs signalés.")).toBeTruthy()
  })

  it("creates a rated risk with the matrix and shows the live level", async () => {
    await open("/risques/nouveau?projet=00000")
    await screen.findByRole("heading", { name: "Nouveau risque ou enjeu" })

    fireEvent.change(document.getElementById("field-title"), { target: { value: "Retard des permis municipaux" } })
    fireEvent.change(document.getElementById("field-cause"), { target: { value: "externe" } })
    fireEvent.click(screen.getByRole("button", { name: /^Probabilité 3 .* impact 4/ }))
    expect(screen.getAllByText("Élevé").length).toBeGreaterThan(0)
    // Impact 4 with probability 3: flagged, so the management contact appears.
    expect(screen.getByText("Répondant direction")).toBeTruthy()

    const owner = document.getElementById("field-owner_id")
    fireEvent.change(owner, { target: { value: owner.querySelectorAll("option")[1].value } })
    fireEvent.click(screen.getByRole("radio", { name: "Atténuer" }))
    fireEvent.click(screen.getByRole("button", { name: "Créer l'élément" }))

    expect(await screen.findByRole("heading", { name: "Retard des permis municipaux" })).toBeTruthy()
    expect(await screen.findByText("a créé l'élément")).toBeTruthy()
  })

  it("locks the probability of an enjeu to 5", async () => {
    await open("/risques/nouveau")
    fireEvent.click(await screen.findByRole("radio", { name: "Enjeu" }))
    const probability = document.getElementById("field-probability")
    expect(probability.value).toBe("5")
    expect(probability.disabled).toBe(true)
  })

  it("keeps readers read-only", async () => {
    await open("/risques/1", "Lecteur démo")
    expect(await screen.findByText(/Consultation seulement/)).toBeTruthy()
    expect(document.getElementById("field-title").disabled).toBe(true)
    expect(screen.queryByRole("link", { name: /Nouveau/ })).toBeNull()
    expect(screen.queryByText("Administration")).toBeNull()
  })

  it("shows projects, a project page, the reference grid and administration", async () => {
    await open("/projets")
    expect(await screen.findByRole("heading", { name: "Projets" })).toBeTruthy()

    window.history.pushState({}, "", "/projets/00000")
    window.dispatchEvent(new PopStateEvent("popstate"))
    expect(await screen.findByText("Lien pour Teams")).toBeTruthy()

    window.history.pushState({}, "", "/reference")
    window.dispatchEvent(new PopStateEvent("popstate"))
    expect(await screen.findByRole("heading", { name: "Grille de référence" })).toBeTruthy()
    expect(screen.getByText("Niveaux et révisions")).toBeTruthy()

    window.history.pushState({}, "", "/administration")
    window.dispatchEvent(new PopStateEvent("popstate"))
    expect(await screen.findByText("Signalement direction (décision D2)")).toBeTruthy()
  })

  it("switches the whole interface between French and English, keeping unsaved edits", async () => {
    await open("/risques/nouveau?projet=00000")
    await screen.findByRole("heading", { name: "Nouveau risque ou enjeu" })
    fireEvent.change(document.getElementById("field-title"), { target: { value: "Brouillon non enregistré" } })

    const toggle = screen.getByRole("group", { name: "Langue de l'interface" })
    fireEvent.click(within(toggle).getByRole("button", { name: "EN" }))

    expect(await screen.findByRole("heading", { name: "New risk or issue" })).toBeTruthy()
    expect(screen.getByText("Assessment")).toBeTruthy()
    expect(screen.getByRole("button", { name: /^Probability 3 \(Moderate\) × impact 4 \(Major\) = 12, High$/ })).toBeTruthy()
    expect(screen.getByRole("radio", { name: "Mitigate" })).toBeTruthy()
    expect(screen.getByText("Dashboard")).toBeTruthy()
    expect(document.documentElement.lang).toBe("en-CA")
    // The form was re-rendered, not remounted: the draft is still there.
    expect(document.getElementById("field-title").value).toBe("Brouillon non enregistré")

    // A validation message appears in English too.
    fireEvent.click(screen.getByRole("button", { name: "Create item" }))
    expect(await screen.findByText("Check the highlighted fields.")).toBeTruthy()

    fireEvent.click(within(screen.getByRole("group", { name: "Interface language" })).getByRole("button", { name: "FR" }))
    expect(await screen.findByRole("heading", { name: "Nouveau risque ou enjeu" })).toBeTruthy()
    expect(screen.getByText("Vérifiez les champs signalés.")).toBeTruthy()
    expect(document.documentElement.lang).toBe("fr-CA")
  })
})
