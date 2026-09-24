-- Private storage bucket for job photos/attachments. No public URLs;
-- everything is served via short-lived signed URLs generated per request.

insert into storage.buckets (id, name, public)
values ('job-attachments', 'job-attachments', false)
on conflict (id) do nothing;

-- Files are stored under `${owner_id}/...` so a user can only touch their own.
create policy "owner can read own attachments"
  on storage.objects for select
  using (bucket_id = 'job-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner can upload own attachments"
  on storage.objects for insert
  with check (bucket_id = 'job-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner can update own attachments"
  on storage.objects for update
  using (bucket_id = 'job-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner can delete own attachments"
  on storage.objects for delete
  using (bucket_id = 'job-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
