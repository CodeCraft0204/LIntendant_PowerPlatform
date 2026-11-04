-- Private bucket for risk attachments. Files are stored as
-- "<risk id>/<uuid>-<file name>" and read through short-lived signed URLs.

insert into storage.buckets (id, name, public)
values ('risk-attachments', 'risk-attachments', false)
on conflict (id) do nothing;

create policy "Members read risk files" on storage.objects for select to authenticated
  using (bucket_id = 'risk-attachments' and public.is_member());

create policy "Editors upload risk files" on storage.objects for insert to authenticated
  with check (bucket_id = 'risk-attachments' and public.can_edit_risks());

create policy "Direction removes risk files" on storage.objects for delete to authenticated
  using (bucket_id = 'risk-attachments' and public.has_role('admin', 'direction'));
