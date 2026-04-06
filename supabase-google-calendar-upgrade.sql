-- Ejecutar en Supabase SQL Editor despues de las migraciones previas.
-- Agrega soporte para conectar multiples cuentas de Google Calendar por usuario
-- y seleccionar que calendarios externos se muestran en la agenda interna.

create extension if not exists pgcrypto;

create table if not exists google_calendar_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references internal_users(id) on delete cascade,
  google_user_id text not null,
  email text not null,
  display_name text,
  encrypted_refresh_token text not null,
  encrypted_access_token text,
  access_token_expires_at timestamptz,
  scope text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, google_user_id),
  unique (user_id, email)
);

create index if not exists idx_google_calendar_accounts_user
  on google_calendar_accounts(user_id, created_at desc);

create table if not exists google_calendar_sources (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references google_calendar_accounts(id) on delete cascade,
  google_calendar_id text not null,
  summary text not null,
  description text,
  background_color text,
  foreground_color text,
  access_role text,
  primary_calendar boolean not null default false,
  is_hidden boolean not null default false,
  is_selected boolean not null default true,
  time_zone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, google_calendar_id)
);

create index if not exists idx_google_calendar_sources_account
  on google_calendar_sources(account_id, primary_calendar desc, summary);

create index if not exists idx_google_calendar_sources_selected
  on google_calendar_sources(account_id, is_selected);
