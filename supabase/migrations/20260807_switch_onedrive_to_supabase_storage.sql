alter table public.materials
  add column if not exists storage_path text;

insert into storage.buckets (id, name, public)
values ('materials', 'materials', true)
on conflict (id) do update set public = excluded.public;

create policy "Upload de materiais por utilizadores autenticados"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Leitura de materiais por utilizadores autenticados"
  on storage.objects for select to authenticated
  using (bucket_id = 'materials');

create policy "Eliminação de materiais por administradores"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'materials'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
    )
  );
