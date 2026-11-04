-- L'Intendant: registre des risques et enjeux (Phase 1).
--
-- Access model (mirrors src/lib/roles.js; these policies are what actually
-- protect the data)
--   admin      everything, including team access
--   direction  risks, projects, people, the reference grid and the settings
--              (the assessment decisions are management's)
--   gestion    project managers: create and update risks, add notes and files
--   lecteur    read only
--   A profile with no role is waiting for an admin. Inactive members lose all
--   access. Scripts that use the service-role key (the legacy import) bypass
--   row level security.
--
-- Assessment rules (mirrors src/domain/rules.js)
--   score = probability × impact, stored
--   level from the confirmed bands, stored
--   management flag and next review depend on two open decisions (D2, D4),
--   so they read public.settings instead of being hard-coded.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Team
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text check (role in ('admin', 'direction', 'gestion', 'lecteur')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email on public.profiles (lower(email));
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- People who can own a risk or be the management contact. Most owners in the
-- SharePoint list have no account yet, so they are not tied to auth.users; a
-- person is linked to a profile when someone signs in with the same email.
create table public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(btrim(full_name)) > 0),
  email text,
  profile_id uuid unique references public.profiles (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index people_name on public.people (lower(full_name));
create unique index people_email on public.people (lower(email)) where email is not null;
create trigger people_touch before update on public.people
  for each row execute function public.touch_updated_at();

-- Every new auth user gets a profile without a role, and is linked to the
-- matching person (same email, or same name when the person has no email).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  name text := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), '');
begin
  insert into public.profiles (id, email, full_name) values (new.id, new.email, name);

  update public.people set profile_id = new.id
  where profile_id is null
    and (lower(email) = lower(new.email) or (email is null and name <> '' and lower(full_name) = lower(name)));

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.member_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create function public.has_role(variadic roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.member_role() = any (roles), false)
$$;

create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.member_role() is not null
$$;

create function public.can_edit_risks() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('admin', 'direction', 'gestion')
$$;

-- Admins change roles and pause members through this function; nobody can
-- update those columns directly (see the grants at the end).
create function public.set_member_access(member uuid, new_role text, is_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role('admin') then
    raise exception 'Seuls les administrateurs peuvent modifier les accès.' using errcode = '42501';
  end if;
  if member = auth.uid() and (new_role is distinct from 'admin' or not is_active) then
    raise exception 'Un administrateur ne peut pas retirer son propre accès.' using errcode = '42501';
  end if;
  update public.profiles set role = new_role, active = is_active where id = member;
end;
$$;

-- ---------------------------------------------------------------------------
-- Settings (one row): the decisions still open with Simon
-- ---------------------------------------------------------------------------
create table public.settings (
  id boolean primary key default true check (id),
  weekly_review_min_score smallint not null default 8 check (weekly_review_min_score between 1 and 25),
  flag_impact4_always boolean not null default false,
  require_complete_active boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

insert into public.settings default values;

create function public.settings_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

create trigger settings_touch before update on public.settings
  for each row execute function public.settings_touch();

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  number text not null unique check (length(btrim(number)) > 0),
  name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Risks and issues
-- ---------------------------------------------------------------------------
create table public.risks (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects (id),

  -- Identification
  title text not null check (length(btrim(title)) > 0),
  kind text default 'risque' check (kind in ('risque', 'enjeu')),
  cause text check (cause in (
    'technique', 'gestion_projet', 'contractuel', 'financier', 'approvisionnement',
    'construction', 'externe', 'parties_prenantes', 'sst'
  )),
  details text not null default '',
  status text not null default 'actif' check (status in ('actif', 'ferme')),

  -- Assessment
  probability smallint check (probability between 1 and 5),
  impact smallint check (impact between 1 and 5),
  score integer generated always as (probability::integer * impact::integer) stored,
  level text generated always as (
    case
      when probability is null or impact is null then null
      when probability * impact >= 20 then 'critique'
      when probability * impact >= 12 then 'eleve'
      when probability * impact >= 8 then 'moyen'
      when probability * impact >= 4 then 'faible'
      else 'tres_faible'
    end
  ) stored,

  -- Consequences. A blank cost means "not estimated"; 0 is an estimate.
  cost numeric(14, 2) check (cost >= 0),
  delay_days integer check (delay_days >= 0),
  quality_impact text not null default '',
  hs_impact text not null default '',
  reputation_impact text not null default '',

  -- Response
  owner_id uuid references public.people (id),
  response_strategy text check (response_strategy in ('eviter', 'attenuer', 'transferer', 'accepter')),
  strategy_details text not null default '',
  exec_contact_id uuid references public.people (id),

  -- Follow-up
  last_review date default current_date,
  closed_date date,
  committee_override boolean not null default false,

  -- Historical values from the SharePoint list, kept read-only.
  legacy_closed_record boolean not null default false,
  legacy_sp_id integer unique,
  legacy_type text,
  legacy_risk_index text,
  legacy_other_impacts text,
  legacy_created_by text,
  legacy_created_at timestamptz,
  legacy_modified_by text,
  legacy_modified_at timestamptz,

  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),

  -- An "enjeu" has already happened: probability 5.
  constraint enjeu_probability check (kind is distinct from 'enjeu' or probability is null or probability = 5),
  -- A closed record has a closure date, unless it was closed before the upgrade.
  constraint closed_needs_date check (status <> 'ferme' or closed_date is not null or legacy_closed_record)
);

create index risks_project on public.risks (project_id, status);
create index risks_owner on public.risks (owner_id) where status = 'actif';
create index risks_status_score on public.risks (status, score desc);

-- Management flag (D2): impact 5 always; impact 3–4 from probability 3; impact
-- 4 always when the setting is on.
create function public.risk_exec_flag(probability smallint, impact smallint) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when impact is null then false
    when impact = 5 then true
    when impact = 4 and (select flag_impact4_always from public.settings) then true
    when probability is null then false
    else impact >= 3 and probability >= 3
  end
$$;

-- Next review (D4): weekly from the threshold score, otherwise monthly.
create function public.risk_next_review(last_review date, score integer) returns date
language sql stable security definer set search_path = '' as $$
  select case
    when last_review is null or score is null then null
    else last_review + case when score >= (select weekly_review_min_score from public.settings) then 7 else 30 end
  end
$$;

-- Before every write: housekeeping, then the "complete active record" rule.
create function public.risks_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  strict_mode boolean;
begin
  if tg_op = 'UPDATE' then
    -- Reopening an old closed record lifts its historical exemption, so
    -- closing it again needs a real closure date.
    if old.status = 'ferme' and new.status = 'actif' then
      new.legacy_closed_record := false;
    end if;

    -- A rating change is a review.
    if (new.probability is distinct from old.probability or new.impact is distinct from old.impact)
       and new.last_review is not distinct from old.last_review then
      new.last_review := current_date;
    end if;

    new.updated_at := now();
    new.updated_by := coalesce(auth.uid(), old.updated_by);
  else
    new.updated_by := auth.uid();
  end if;

  if new.status = 'actif' then
    new.closed_date := null;
  end if;

  -- New active records are complete from day one. Imported records
  -- (legacy_created_at is set, and only the service role can set it) are held
  -- to the rule once the reassessment campaign is over and an admin turns on
  -- require_complete_active.
  if new.status = 'actif' then
    select require_complete_active into strict_mode from public.settings;
    if (tg_op = 'INSERT' and new.legacy_created_at is null) or (tg_op = 'UPDATE' and coalesce(strict_mode, false)) then
      if new.kind is null or new.cause is null or new.owner_id is null or new.probability is null
         or new.impact is null or new.response_strategy is null then
        raise exception 'Enregistrement refusé : un élément actif doit avoir risque/enjeu, cause, propriétaire, probabilité, impact et stratégie de réponse.'
          using errcode = 'P0001', hint = 'incomplete_active';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger risks_before_write before insert or update on public.risks
  for each row execute function public.risks_before_write();

-- ---------------------------------------------------------------------------
-- Journal: automatic events (creation, changes, rating, closure) and notes
-- ---------------------------------------------------------------------------
create table public.risk_events (
  id bigint generated always as identity primary key,
  risk_id bigint not null references public.risks (id) on delete cascade,
  kind text not null check (kind in ('creation', 'modification', 'cotation', 'fermeture', 'reouverture', 'note', 'piece_jointe')),
  note_type text check (note_type in ('mise_a_jour', 'action', 'decision_comite')),
  body text not null default '',
  changes jsonb not null default '{}'::jsonb,
  score_snapshot integer,
  level_snapshot text,
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  author_name text not null default '',
  created_at timestamptz not null default now(),
  constraint note_has_text check (kind <> 'note' or length(btrim(body)) > 0)
);

create index risk_events_by_risk on public.risk_events (risk_id, created_at desc);
create index risk_events_recent on public.risk_events (created_at desc);

create function public.risk_events_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.author_id := auth.uid();
    if new.author_name = '' then
      select coalesce(nullif(full_name, ''), email) into new.author_name from public.profiles where id = auth.uid();
      new.author_name := coalesce(new.author_name, '');
    end if;
  end if;
  if new.kind = 'note' then
    select score, level into new.score_snapshot, new.level_snapshot from public.risks where id = new.risk_id;
  end if;
  return new;
end;
$$;

create trigger risk_events_before_insert before insert on public.risk_events
  for each row execute function public.risk_events_before_insert();

-- After every write on a risk: one event per kind of change. A rating change
-- and a closure in the same save give two events (rating first).
create function public.risks_log_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  tracked constant text[] := array[
    'project_id', 'title', 'kind', 'cause', 'details', 'status', 'probability', 'impact', 'cost', 'delay_days',
    'quality_impact', 'hs_impact', 'reputation_impact', 'owner_id', 'response_strategy', 'strategy_details',
    'exec_contact_id', 'last_review', 'closed_date', 'committee_override'
  ];
  rating constant text[] := array['probability', 'impact'];
  old_row jsonb;
  new_row jsonb;
  diff jsonb := '{}'::jsonb;
  rating_diff jsonb := '{}'::jsonb;
  col text;
  status_kind text;
begin
  if tg_op = 'INSERT' then
    -- Rows imported from SharePoint carry their own history.
    if new.legacy_created_at is null then
      insert into public.risk_events (risk_id, kind, score_snapshot, level_snapshot)
      values (new.id, 'creation', new.score, new.level);
    end if;
    return null;
  end if;

  old_row := to_jsonb(old);
  new_row := to_jsonb(new);
  foreach col in array tracked loop
    if (old_row -> col) is distinct from (new_row -> col) then
      if col = any (rating) then
        rating_diff := rating_diff || jsonb_build_object(col, jsonb_build_object('old', old_row -> col, 'new', new_row -> col));
      else
        diff := diff || jsonb_build_object(col, jsonb_build_object('old', old_row -> col, 'new', new_row -> col));
      end if;
    end if;
  end loop;

  -- The review date that moves with a rating change belongs to that rating
  -- event, not to a separate "modification".
  if rating_diff <> '{}'::jsonb and diff ? 'last_review' then
    rating_diff := rating_diff || jsonb_build_object('last_review', diff -> 'last_review');
    diff := diff - 'last_review';
  end if;

  status_kind := case
    when old.status = 'actif' and new.status = 'ferme' then 'fermeture'
    when old.status = 'ferme' and new.status = 'actif' then 'reouverture'
  end;

  if rating_diff <> '{}'::jsonb then
    insert into public.risk_events (risk_id, kind, changes, score_snapshot, level_snapshot)
    values (new.id, 'cotation', rating_diff, new.score, new.level);
  end if;

  if status_kind is not null or diff <> '{}'::jsonb then
    insert into public.risk_events (risk_id, kind, changes, score_snapshot, level_snapshot)
    values (new.id, coalesce(status_kind, 'modification'), diff, new.score, new.level);
  end if;

  return null;
end;
$$;

create trigger risks_log_change after insert or update on public.risks
  for each row execute function public.risks_log_change();

-- ---------------------------------------------------------------------------
-- Attachments (files live in the private storage bucket "risk-attachments")
-- ---------------------------------------------------------------------------
create table public.risk_attachments (
  id uuid primary key default gen_random_uuid(),
  risk_id bigint not null references public.risks (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  size_bytes bigint,
  content_type text,
  uploaded_by uuid default auth.uid() references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index risk_attachments_by_risk on public.risk_attachments (risk_id);

create function public.risk_attachments_log() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    insert into public.risk_events (risk_id, kind, body) values (new.risk_id, 'piece_jointe', new.file_name);
  end if;
  return null;
end;
$$;

create trigger risk_attachments_log after insert on public.risk_attachments
  for each row execute function public.risk_attachments_log();

-- ---------------------------------------------------------------------------
-- Reference grid (probability, impact and cause guidance)
-- ---------------------------------------------------------------------------
create table public.reference_guides (
  id uuid primary key default gen_random_uuid(),
  scale text not null check (scale in ('probabilite', 'impact', 'cause')),
  rating smallint check (rating between 1 and 5),
  code text,
  label text not null,
  description text not null default '',
  cost_guide text not null default '',
  delay_guide text not null default '',
  quality_guide text not null default '',
  hs_guide text not null default '',
  reputation_guide text not null default '',
  sort_order smallint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  unique (scale, rating),
  unique (scale, code)
);

create trigger reference_guides_touch before update on public.reference_guides
  for each row execute function public.settings_touch();

-- ---------------------------------------------------------------------------
-- Register view: what every list, view and the dashboard read
-- ---------------------------------------------------------------------------
create view public.risk_register with (security_invoker = true) as
select
  r.*,
  p.number as project_number,
  p.name as project_name,
  o.full_name as owner_name,
  o.profile_id as owner_profile_id,
  x.full_name as exec_contact_name,
  public.risk_exec_flag(r.probability, r.impact) as exec_flag,
  public.risk_next_review(r.last_review, r.score) as next_review,
  (r.status = 'actif' and r.score is null) as needs_rating,
  (r.status = 'actif' and (coalesce(r.score, 0) >= 12 or r.committee_override)) as in_committee,
  (r.status = 'actif' and public.risk_next_review(r.last_review, r.score) <= current_date) as review_overdue,
  (select count(*) from public.risk_attachments a where a.risk_id = r.id)::integer as attachment_count
from public.risks r
join public.projects p on p.id = r.project_id
left join public.people o on o.id = r.owner_id
left join public.people x on x.id = r.exec_contact_id;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.people enable row level security;
alter table public.settings enable row level security;
alter table public.projects enable row level security;
alter table public.risks enable row level security;
alter table public.risk_events enable row level security;
alter table public.risk_attachments enable row level security;
alter table public.reference_guides enable row level security;

create policy "Members read profiles" on public.profiles for select to authenticated
  using (public.is_member() or id = auth.uid());
create policy "Members rename themselves" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "Members read people" on public.people for select to authenticated using (public.is_member());
create policy "Direction adds people" on public.people for insert to authenticated with check (public.has_role('admin', 'direction'));
create policy "Direction updates people" on public.people for update to authenticated
  using (public.has_role('admin', 'direction')) with check (public.has_role('admin', 'direction'));

create policy "Members read settings" on public.settings for select to authenticated using (public.is_member());
create policy "Direction changes settings" on public.settings for update to authenticated
  using (public.has_role('admin', 'direction')) with check (public.has_role('admin', 'direction'));

create policy "Members read projects" on public.projects for select to authenticated using (public.is_member());
create policy "Direction adds projects" on public.projects for insert to authenticated with check (public.has_role('admin', 'direction'));
create policy "Direction updates projects" on public.projects for update to authenticated
  using (public.has_role('admin', 'direction')) with check (public.has_role('admin', 'direction'));

create policy "Members read risks" on public.risks for select to authenticated using (public.is_member());
create policy "Editors add risks" on public.risks for insert to authenticated with check (public.can_edit_risks());
create policy "Editors update risks" on public.risks for update to authenticated
  using (public.can_edit_risks()) with check (public.can_edit_risks());
create policy "Admins delete risks" on public.risks for delete to authenticated using (public.has_role('admin'));

create policy "Members read the journal" on public.risk_events for select to authenticated using (public.is_member());
create policy "Editors add notes" on public.risk_events for insert to authenticated
  with check (public.can_edit_risks() and kind = 'note');

create policy "Members read attachments" on public.risk_attachments for select to authenticated using (public.is_member());
create policy "Editors add attachments" on public.risk_attachments for insert to authenticated with check (public.can_edit_risks());
create policy "Direction removes attachments" on public.risk_attachments for delete to authenticated
  using (public.has_role('admin', 'direction'));

create policy "Members read the reference grid" on public.reference_guides for select to authenticated using (public.is_member());
create policy "Direction edits the reference grid" on public.reference_guides for all to authenticated
  using (public.has_role('admin', 'direction')) with check (public.has_role('admin', 'direction'));

-- ---------------------------------------------------------------------------
-- Grants: the browser uses the authenticated role only, and can write only the
-- columns a person edits. Historical columns, authorship and the role/active
-- flags are set by triggers, functions or the service role.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;

revoke insert, update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

revoke insert, update on public.risks from authenticated;
grant insert (
  project_id, title, kind, cause, details, status, probability, impact, cost, delay_days, quality_impact, hs_impact,
  reputation_impact, owner_id, response_strategy, strategy_details, exec_contact_id, last_review, closed_date,
  committee_override
) on public.risks to authenticated;
grant update (
  project_id, title, kind, cause, details, status, probability, impact, cost, delay_days, quality_impact, hs_impact,
  reputation_impact, owner_id, response_strategy, strategy_details, exec_contact_id, last_review, closed_date,
  committee_override
) on public.risks to authenticated;

revoke insert, update, delete on public.risk_events from authenticated;
grant insert (risk_id, kind, note_type, body) on public.risk_events to authenticated;

revoke update on public.risk_attachments from authenticated;

revoke insert, delete on public.settings from authenticated;
revoke update on public.settings from authenticated;
grant update (weekly_review_min_score, flag_impact4_always, require_complete_active) on public.settings to authenticated;
