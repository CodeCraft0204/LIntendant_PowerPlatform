// Helpers for attachment files, shared by the browser upload and the legacy
// import (scripts/import-legacy.mjs).

// Supabase Storage accepts only ASCII object keys, so "Échéancier – v2.pdf"
// is stored as "Echeancier _ v2.pdf". The original name is kept in
// risk_attachments.file_name and used for the download.
export function storageSafeName(name) {
  const ascii = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._\- ()]/g, "_")
    .replace(/_+/g, "_")
    .trim()
  return ascii.slice(-120) || "fichier"
}

const TYPES = {
  pdf: "application/pdf",
  msg: "application/vnd.ms-outlook",
  eml: "message/rfc822",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  dwg: "image/vnd.dwg",
  zip: "application/zip",
  txt: "text/plain",
  csv: "text/csv",
}

// Without an explicit type, an upload from Node is stored as text/plain and
// a PDF would not open properly.
export const contentTypeOf = (name) => TYPES[name.split(".").pop().toLowerCase()] ?? "application/octet-stream"

// Browser only: saves a blob under its exact original name. Supabase's own
// download header double-encodes accented names ("%C3%89chéancier…"), so
// files are fetched and saved from a same-origin object URL instead.
export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
