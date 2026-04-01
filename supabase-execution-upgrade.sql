-- Ejecutar en Supabase SQL Editor despues de las migraciones previas.
-- Agrega reuniones diarias, reuniones mensuales de comunicacion,
-- objetivos anuales, objetivos mensuales y sus relaciones con tareas.

create extension if not exists pgcrypto;

create table if not exists daily_meetings (
  id uuid primary key default gen_random_uuid(),
  meeting_date date not null,
  focus_of_day text not null,
  priorities_of_day text[] not null default '{}',
  blockers text[] not null default '{}',
  decisions text,
  observations text,
  status text not null default 'open',
  created_by_user_id uuid references internal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_date)
);

create index if not exists idx_daily_meetings_meeting_date on daily_meetings(meeting_date desc);
create index if not exists idx_daily_meetings_status on daily_meetings(status);

create table if not exists daily_meeting_participants (
  id uuid primary key default gen_random_uuid(),
  daily_meeting_id uuid not null references daily_meetings(id) on delete cascade,
  user_id uuid not null references internal_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (daily_meeting_id, user_id)
);

create index if not exists idx_daily_meeting_participants_meeting on daily_meeting_participants(daily_meeting_id);
create index if not exists idx_daily_meeting_participants_user on daily_meeting_participants(user_id);

create table if not exists communication_meetings (
  id uuid primary key default gen_random_uuid(),
  month integer not null,
  year integer not null,
  title text not null,
  objective_general text,
  key_messages text[] not null default '{}',
  campaigns_or_topics text[] not null default '{}',
  channels text[] not null default '{}',
  required_assets text[] not null default '{}',
  observations text,
  status text not null default 'planned',
  created_by_user_id uuid references internal_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, year)
);

create index if not exists idx_communication_meetings_year_month on communication_meetings(year desc, month desc);
create index if not exists idx_communication_meetings_status on communication_meetings(status);

create table if not exists communication_meeting_responsibles (
  id uuid primary key default gen_random_uuid(),
  communication_meeting_id uuid not null references communication_meetings(id) on delete cascade,
  user_id uuid not null references internal_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (communication_meeting_id, user_id)
);

create index if not exists idx_communication_meeting_responsibles_meeting on communication_meeting_responsibles(communication_meeting_id);
create index if not exists idx_communication_meeting_responsibles_user on communication_meeting_responsibles(user_id);

create table if not exists annual_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  metric text,
  target_value numeric,
  current_value numeric,
  unit text,
  responsible_user_id uuid references internal_users(id) on delete set null,
  year integer not null,
  status text not null default 'active',
  progress_mode text not null default 'auto',
  progress_percentage numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_annual_goals_year_status on annual_goals(year desc, status);
create index if not exists idx_annual_goals_responsible on annual_goals(responsible_user_id);

create table if not exists monthly_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  month integer not null,
  year integer not null,
  annual_goal_id uuid references annual_goals(id) on delete set null,
  metric text,
  target_value numeric,
  current_value numeric,
  unit text,
  responsible_user_id uuid references internal_users(id) on delete set null,
  status text not null default 'pending',
  progress_mode text not null default 'auto',
  progress_percentage numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_monthly_goals_year_month on monthly_goals(year desc, month desc);
create index if not exists idx_monthly_goals_annual_goal on monthly_goals(annual_goal_id);
create index if not exists idx_monthly_goals_responsible on monthly_goals(responsible_user_id);
create index if not exists idx_monthly_goals_status on monthly_goals(status);

create table if not exists daily_meeting_tasks (
  id uuid primary key default gen_random_uuid(),
  daily_meeting_id uuid not null references daily_meetings(id) on delete cascade,
  task_id uuid not null references kanban_tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (daily_meeting_id, task_id)
);

create index if not exists idx_daily_meeting_tasks_meeting on daily_meeting_tasks(daily_meeting_id);
create index if not exists idx_daily_meeting_tasks_task on daily_meeting_tasks(task_id);

create table if not exists communication_meeting_tasks (
  id uuid primary key default gen_random_uuid(),
  communication_meeting_id uuid not null references communication_meetings(id) on delete cascade,
  task_id uuid not null references kanban_tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (communication_meeting_id, task_id)
);

create index if not exists idx_communication_meeting_tasks_meeting on communication_meeting_tasks(communication_meeting_id);
create index if not exists idx_communication_meeting_tasks_task on communication_meeting_tasks(task_id);

create table if not exists monthly_goal_tasks (
  id uuid primary key default gen_random_uuid(),
  monthly_goal_id uuid not null references monthly_goals(id) on delete cascade,
  task_id uuid not null references kanban_tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (monthly_goal_id, task_id)
);

create index if not exists idx_monthly_goal_tasks_goal on monthly_goal_tasks(monthly_goal_id);
create index if not exists idx_monthly_goal_tasks_task on monthly_goal_tasks(task_id);

create table if not exists daily_meeting_monthly_goals (
  id uuid primary key default gen_random_uuid(),
  daily_meeting_id uuid not null references daily_meetings(id) on delete cascade,
  monthly_goal_id uuid not null references monthly_goals(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (daily_meeting_id, monthly_goal_id)
);

create index if not exists idx_daily_meeting_monthly_goals_meeting on daily_meeting_monthly_goals(daily_meeting_id);
create index if not exists idx_daily_meeting_monthly_goals_goal on daily_meeting_monthly_goals(monthly_goal_id);

create table if not exists communication_meeting_monthly_goals (
  id uuid primary key default gen_random_uuid(),
  communication_meeting_id uuid not null references communication_meetings(id) on delete cascade,
  monthly_goal_id uuid not null references monthly_goals(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (communication_meeting_id, monthly_goal_id)
);

create index if not exists idx_communication_meeting_monthly_goals_meeting on communication_meeting_monthly_goals(communication_meeting_id);
create index if not exists idx_communication_meeting_monthly_goals_goal on communication_meeting_monthly_goals(monthly_goal_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_meetings_status_check'
  ) then
    alter table daily_meetings
      add constraint daily_meetings_status_check
      check (status in ('open', 'closed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'communication_meetings_status_check'
  ) then
    alter table communication_meetings
      add constraint communication_meetings_status_check
      check (status in ('planned', 'in_progress', 'closed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'communication_meetings_month_check'
  ) then
    alter table communication_meetings
      add constraint communication_meetings_month_check
      check (month between 1 and 12);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'annual_goals_status_check'
  ) then
    alter table annual_goals
      add constraint annual_goals_status_check
      check (status in ('active', 'paused', 'completed', 'cancelled'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'annual_goals_progress_mode_check'
  ) then
    alter table annual_goals
      add constraint annual_goals_progress_mode_check
      check (progress_mode in ('auto', 'manual'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'annual_goals_progress_percentage_check'
  ) then
    alter table annual_goals
      add constraint annual_goals_progress_percentage_check
      check (progress_percentage between 0 and 100);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'monthly_goals_status_check'
  ) then
    alter table monthly_goals
      add constraint monthly_goals_status_check
      check (status in ('pending', 'in_progress', 'completed', 'blocked', 'cancelled'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'monthly_goals_progress_mode_check'
  ) then
    alter table monthly_goals
      add constraint monthly_goals_progress_mode_check
      check (progress_mode in ('auto', 'manual'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'monthly_goals_progress_percentage_check'
  ) then
    alter table monthly_goals
      add constraint monthly_goals_progress_percentage_check
      check (progress_percentage between 0 and 100);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'monthly_goals_month_check'
  ) then
    alter table monthly_goals
      add constraint monthly_goals_month_check
      check (month between 1 and 12);
  end if;
end $$;
