-- Fibra: configuración de Supabase. Pégalo completo en el SQL Editor y dale "Run".
-- Se puede correr más de una vez sin problema.

-- 1. Tabla con tus datos (un registro por cuenta)
create table if not exists public.fibra_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.fibra_state enable row level security;

drop policy if exists "fibra leer lo propio" on public.fibra_state;
drop policy if exists "fibra crear lo propio" on public.fibra_state;
drop policy if exists "fibra actualizar lo propio" on public.fibra_state;
drop policy if exists "fibra borrar lo propio" on public.fibra_state;
create policy "fibra leer lo propio" on public.fibra_state for select to authenticated using (auth.uid() = user_id);
create policy "fibra crear lo propio" on public.fibra_state for insert to authenticated with check (auth.uid() = user_id);
create policy "fibra actualizar lo propio" on public.fibra_state for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fibra borrar lo propio" on public.fibra_state for delete to authenticated using (auth.uid() = user_id);

-- 2. Carpeta privada para fotos y videos (máximo 50 MB por archivo)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 52428800,
        array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "fibra media ver lo propio" on storage.objects;
drop policy if exists "fibra media subir lo propio" on storage.objects;
drop policy if exists "fibra media borrar lo propio" on storage.objects;
create policy "fibra media ver lo propio" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fibra media subir lo propio" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fibra media borrar lo propio" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
