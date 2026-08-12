-- CT GYM — esquema de base de datos
-- Correr en el SQL Editor de Supabase (Project > SQL Editor > New query).

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

-- La app inicia sesión con una única cuenta de staff del gimnasio vía
-- Supabase Auth; cualquier usuario autenticado tiene CRUD completo.
create policy "Staff can manage clients"
  on public.clients
  for all
  to authenticated
  using (true)
  with check (true);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_groups text[] not null default '{}',
  default_sets int,
  default_reps text,
  video_url text,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "Staff can manage exercises"
  on public.exercises
  for all
  to authenticated
  using (true)
  with check (true);

-- Por si la tabla exercises ya existía antes de agregar la foto (create
-- table if not exists no agrega columnas nuevas a una tabla existente).
alter table public.exercises add column if not exists image_url text;

-- Bucket público de Storage para las fotos de los ejercicios (se muestran en
-- el catálogo y se embeben en el PDF de la rutina).
insert into storage.buckets (id, name, public)
values ('exercise-images', 'exercise-images', true)
on conflict (id) do nothing;

create policy "Public read exercise images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'exercise-images');

create policy "Staff can upload exercise images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'exercise-images');

create policy "Staff can update exercise images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'exercise-images');

create policy "Staff can delete exercise images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'exercise-images');

-- Un ejercicio puede trabajar más de un grupo muscular: se pasa de
-- "muscle_group" (un solo texto) a "muscle_groups" (array de texto).
alter table public.exercises add column if not exists muscle_groups text[] not null default '{}';

-- Si la tabla ya tenía datos con la columna vieja, los migra al array nuevo.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'exercises' and column_name = 'muscle_group'
  ) then
    update public.exercises
    set muscle_groups = array[muscle_group]
    where muscle_groups = '{}' and muscle_group is not null;

    alter table public.exercises drop column muscle_group;
  end if;
end $$;

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  name text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.routines enable row level security;

create policy "Staff can manage routines"
  on public.routines
  for all
  to authenticated
  using (true)
  with check (true);

create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete set null,
  order_index int not null default 0,
  sets int,
  reps text,
  notes text
);

alter table public.routine_exercises enable row level security;

create policy "Staff can manage routine_exercises"
  on public.routine_exercises
  for all
  to authenticated
  using (true)
  with check (true);

create table if not exists public.routine_sends (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid references public.routines(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  sent_at timestamptz not null default now(),
  channel text not null default 'whatsapp',
  status text not null,
  error_message text
);

alter table public.routine_sends enable row level security;

create policy "Staff can manage routine_sends"
  on public.routine_sends
  for all
  to authenticated
  using (true)
  with check (true);
