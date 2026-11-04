import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { DEFAULT_SETTINGS } from "../domain/rules.js"
import { api } from "./index.js"

export const keys = {
  risks: ["risks"],
  risk: (id) => ["risks", Number(id)],
  events: (id) => ["events", Number(id)],
  recent: ["events", "recent"],
  attachments: (id) => ["attachments", Number(id)],
  projects: ["projects"],
  people: ["people"],
  reference: ["reference"],
  settings: ["settings"],
  members: ["members"],
}

export const useRisks = () => useQuery({ queryKey: keys.risks, queryFn: api.listRisks })
export const useRisk = (id) => useQuery({ queryKey: keys.risk(id), queryFn: () => api.getRisk(id), enabled: Boolean(id) })
export const useEvents = (id) => useQuery({ queryKey: keys.events(id), queryFn: () => api.listEvents(id), enabled: Boolean(id) })
export const useRecentEvents = () => useQuery({ queryKey: keys.recent, queryFn: () => api.listRecentEvents(10) })
export const useAttachments = (id) => useQuery({ queryKey: keys.attachments(id), queryFn: () => api.listAttachments(id), enabled: Boolean(id) })
export const useProjects = () => useQuery({ queryKey: keys.projects, queryFn: api.listProjects, staleTime: 60_000 })
export const usePeople = () => useQuery({ queryKey: keys.people, queryFn: api.listPeople, staleTime: 60_000 })
export const useReference = () => useQuery({ queryKey: keys.reference, queryFn: api.listReference, staleTime: 300_000 })
export const useMembers = () => useQuery({ queryKey: keys.members, queryFn: api.listMembers })

export function useSettings() {
  const query = useQuery({ queryKey: keys.settings, queryFn: api.getSettings, staleTime: 300_000 })
  return { ...query, settings: query.data ?? DEFAULT_SETTINGS }
}

// A save touches the register, the record, its journal and the dashboard.
function useInvalidate() {
  const client = useQueryClient()
  return (...groups) => Promise.all(groups.map((queryKey) => client.invalidateQueries({ queryKey })))
}

export function useSaveRisk() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, values }) => (id ? api.updateRisk(id, values).then(() => ({ id })) : api.createRisk(values)),
    onSuccess: ({ id }) => invalidate(keys.risks, keys.events(id), keys.recent),
  })
}

export function useDeleteRisk() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id) => api.deleteRisk(id), onSuccess: () => invalidate(keys.risks, keys.recent) })
}

export function useAddNote(riskId) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ noteType, body }) => api.addNote(riskId, noteType, body),
    onSuccess: () => invalidate(keys.events(riskId), keys.recent),
  })
}

export function useUploadAttachment(riskId) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (file) => api.uploadAttachment(riskId, file),
    onSuccess: () => invalidate(keys.attachments(riskId), keys.events(riskId), keys.risks, keys.recent),
  })
}

export function useDeleteAttachment(riskId) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (attachment) => api.deleteAttachment(attachment), onSuccess: () => invalidate(keys.attachments(riskId), keys.risks) })
}

export function useSaveProject() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (project) => api.saveProject(project), onSuccess: () => invalidate(keys.projects, keys.risks) })
}

export function useSavePerson() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (person) => api.savePerson(person), onSuccess: () => invalidate(keys.people, keys.risks) })
}

export function useSaveReference() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (row) => api.saveReference(row), onSuccess: () => invalidate(keys.reference) })
}

export function useSaveSettings() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (values) => api.saveSettings(values), onSuccess: () => invalidate(keys.settings, keys.risks) })
}

export function useSetMemberAccess() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: ({ id, role, active }) => api.setMemberAccess(id, role, active), onSuccess: () => invalidate(keys.members) })
}
