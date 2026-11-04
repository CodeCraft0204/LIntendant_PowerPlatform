import { describe, expect, it } from "vitest"
import { contentTypeOf, storageSafeName } from "./files.js"

describe("storageSafeName", () => {
  it("turns accented and typographic characters into an ASCII storage key", () => {
    expect(storageSafeName("20250408_Échéancier Synergy (22sem).pdf")).toBe("20250408_Echeancier Synergy (22sem).pdf")
    expect(storageSafeName("Capture d’écran 2026-08-06 114110.png")).toBe("Capture d_ecran 2026-08-06 114110.png")
    expect(storageSafeName("Re_ PLAN – Thomas Lacroux – Outlook.pdf")).toBe("Re_ PLAN _ Thomas Lacroux _ Outlook.pdf")
    expect(storageSafeName("Mémo-STGM-QRT fixation isolant-20230413.pdf")).toMatch(/^[\x20-\x7e]+$/)
  })
})

describe("contentTypeOf", () => {
  it("knows the file types found in the SharePoint backup", () => {
    expect(contentTypeOf("a.pdf")).toBe("application/pdf")
    expect(contentTypeOf("b.MSG")).toBe("application/vnd.ms-outlook")
    expect(contentTypeOf("c.jpeg")).toBe("image/jpeg")
    expect(contentTypeOf("IMG_4065.HEIC")).toBe("image/heic")
    expect(contentTypeOf("unknown.xyz")).toBe("application/octet-stream")
  })
})
