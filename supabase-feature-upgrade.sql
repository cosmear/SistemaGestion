-- Ejecutar una sola vez en el SQL editor de Supabase.
-- Amplia seguridad, CRM, tickets conversacionales y cobranzas.

create extension if not exists pgcrypto;

alter table clients
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists notes text,
  add column if not exists onboarding_status text default 'pending',
  add column if not exists renewal_date date;

create table if not exists internal_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  full_name text,
  role text not null default 'admin',
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into internal_users (username, full_name, role, password_hash)
values
  (
    'Cosme',
    'Cosme',
    'admin',
    'scrypt:6fdeb36a5f51fb33c0f665f1425bb9c1:f300f7fb63eb03d97b872f40c591995b5beeab8fee515f5ff1e4b803dcb862cd361d00dc67a3d88ce6850409ef40c2da6c95c074b3e69cb30c11db069008a390'
  ),
  (
    'Nacho',
    'Nacho',
    'admin',
    'scrypt:9eea393b18483edec84f3a27eb6d0f7d:069f52884d17f2b260a45fdc278f310ff898002f4dbbc8126fba7b8ed626e954d6f0209195d04d8f4d63b3b9605a65326a5a8038f8962d3c4560761a138a58e2'
  )
on conflict (username) do nothing;

alter table client_users
  add column if not exists password_hash text,
  add column if not exists is_active boolean not null default true;

alter table client_users
  alter column password drop not null;

alter table tickets
  add column if not exists priority text not null default 'medium',
  add column if not exists assigned_to text,
  add column if not exists due_at timestamptz,
  add column if not exists source text not null default 'portal',
  add column if not exists closed_at timestamptz;

update tickets set status = 'new' where status = 'open';
update tickets set status = 'resolved' where status = 'closed';

create table if not exists ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_name text not null,
  author_role text not null,
  message text not null,
  visibility text not null default 'internal',
  created_at timestamptz not null default now()
);

create index if not exists idx_ticket_comments_ticket_id on ticket_comments(ticket_id, created_at desc);

alter table kanban_tasks
  add column if not exists linked_ticket_id uuid references tickets(id) on delete set null,
  add column if not exists subtasks jsonb not null default '[]'::jsonb;

alter table cashflow
  add column if not exists source_type text,
  add column if not exists source_id uuid;

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  period_key text not null,
  title text not null,
  amount numeric(12,2) not null default 0,
  status text not null default 'draft',
  due_date date,
  paid_at timestamptz,
  notes text,
  created_by text,
  cashflow_transaction_id uuid,
  created_at timestamptz not null default now(),
  unique (client_id, period_key)
);

create index if not exists idx_invoices_status on invoices(status, due_date);
create index if not exists idx_invoices_client on invoices(client_id, created_at desc);
