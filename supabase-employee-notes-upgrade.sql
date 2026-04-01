-- Ejecutar en Supabase SQL Editor despues de las migraciones previas.
-- Agrega asignaciones de clientes para usuarios internos, notas, eventos compartidos
-- y responsables en tareas.

create extension if not exists pgcrypto;

create table if not exists internal_user_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references internal_users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);

create index if not exists idx_internal_user_clients_user on internal_user_clients(user_id);
create index if not exists idx_internal_user_clients_client on internal_user_clients(client_id);

alter table kanban_tasks
  add column if not exists assigned_user_id uuid references internal_users(id) on delete set null;

create index if not exists idx_kanban_tasks_assigned_user_id on kanban_tasks(assigned_user_id);

alter table calendar_events
  add column if not exists visibility text not null default 'global',
  add column if not exists created_by_user_id uuid references internal_users(id) on delete set null;

update calendar_events
set visibility = 'global'
where visibility is null;

create table if not exists calendar_event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references calendar_events(id) on delete cascade,
  user_id uuid not null references internal_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists idx_calendar_event_attendees_event on calendar_event_attendees(event_id);
create index if not exists idx_calendar_event_attendees_user on calendar_event_attendees(user_id);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  title text,
  content text not null,
  scope text not null default 'personal',
  client_id uuid references clients(id) on delete cascade,
  created_by_user_id uuid references internal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notes_scope_updated_at on notes(scope, updated_at desc);
create index if not exists idx_notes_client_id on notes(client_id, updated_at desc);
create index if not exists idx_notes_created_by_user_id on notes(created_by_user_id, updated_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'calendar_events_visibility_check'
  ) then
    alter table calendar_events
      add constraint calendar_events_visibility_check
      check (visibility in ('global', 'personal'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notes_scope_check'
  ) then
    alter table notes
      add constraint notes_scope_check
      check (scope in ('personal', 'client'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notes_scope_client_check'
  ) then
    alter table notes
      add constraint notes_scope_client_check
      check (
        (scope = 'personal' and client_id is null)
        or
        (scope = 'client' and client_id is not null)
      );
  end if;
end $$;
