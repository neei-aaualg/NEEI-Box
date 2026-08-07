alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.materials enable row level security;

drop policy if exists "Leitura de perfis por autenticados" on public.profiles;
create policy "Leitura de perfis por autenticados"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "Leitura de UCs por autenticados" on public.courses;
create policy "Leitura de UCs por autenticados"
  on public.courses for select to authenticated
  using (true);

drop policy if exists "Escrita de UCs por administradores" on public.courses;
create policy "Escrita de UCs por administradores"
  on public.courses for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'ADMIN'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'ADMIN'
    )
  );

drop policy if exists "Submissão de materiais por autenticados" on public.materials;
create policy "Submissão de materiais por autenticados"
  on public.materials for insert to authenticated
  with check (uploaded_by = auth.uid());

drop policy if exists "Leitura de materiais por autenticados" on public.materials;
create policy "Leitura de materiais por autenticados"
  on public.materials for select to authenticated
  using (true);

drop policy if exists "Revisão de materiais por administradores" on public.materials;
create policy "Revisão de materiais por administradores"
  on public.materials for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'ADMIN'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'ADMIN'
    )
  );

drop policy if exists "Eliminação de materiais por administradores" on public.materials;
create policy "Eliminação de materiais por administradores"
  on public.materials for delete to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'ADMIN'
    )
  );
