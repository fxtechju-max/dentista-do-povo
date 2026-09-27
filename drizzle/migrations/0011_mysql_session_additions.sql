-- Everything added while the project was temporarily running on MySQL,
-- translated back to Postgres/Supabase (RLS instead of an app-level
-- authorize() gate; triggers instead of app-level audit logging; Supabase
-- Storage instead of blobs-in-a-column for gallery photos; Supabase
-- Anonymous Auth instead of a hand-rolled visitor cookie token).

-- ── Patient registration fields ────────────────────────────────────────────
alter table public.patients
  add column cpf text,
  add column birth_date date,
  add column address text,
  add column guardian_name text,
  add column guardian_phone text,
  add column guardian_cpf text;

-- ── Documents linked to the prescription that generated them ──────────────
alter table public.documents
  add column prescription_id uuid references public.prescriptions(id) on delete cascade;

-- ── Dental-specific anamnesis fields ────────────────────────────────────────
alter table public.patient_anamnesis
  add column chief_complaint text,
  add column last_dental_visit_at date,
  add column brushing_frequency text,
  add column flosses_regularly boolean not null default false,
  add column bleeding_gums boolean not null default false,
  add column tooth_sensitivity boolean not null default false,
  add column bruxism boolean not null default false,
  add column uses_orthodontic_appliance boolean not null default false,
  add column uses_dental_prosthesis boolean not null default false,
  add column anesthesia_allergy boolean not null default false;

-- ── Odontogram: multiple findings per tooth + deciduous teeth ──────────────
alter table public.tooth_records drop constraint tooth_records_tooth_number_check;
alter table public.tooth_records add constraint tooth_records_tooth_number_check
  check (tooth_number between 11 and 48 or tooth_number between 51 and 85);
alter table public.tooth_records add column conditions text[] not null default '{}';
update public.tooth_records set conditions = array[condition] where condition <> 'saudavel';
update public.tooth_records set conditions = array['higido'] where condition = 'saudavel';
alter table public.tooth_records drop column condition;

-- ── Clinic settings: social links + AI Gateway credentials ─────────────────
-- ai_gateway_api_key is never exposed through the anon-facing view below.
alter table public.clinic_settings
  add column instagram_url text,
  add column facebook_url text,
  add column whatsapp_number text,
  add column ai_gateway_provider text,
  add column ai_gateway_base_url text,
  add column ai_gateway_model text,
  add column ai_gateway_api_key text;

drop policy if exists "Anyone can read clinic settings" on public.clinic_settings;
create view public.clinic_public_info
  with (security_invoker = true) as
  select id, clinic_name, phone, address, instagram_url, facebook_url, whatsapp_number
  from public.clinic_settings;
grant select on public.clinic_public_info to anon, authenticated;

-- ── Contas a pagar / a receber ──────────────────────────────────────────────
create type public.finance_entry_type as enum ('pagar', 'receber');
create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  type public.finance_entry_type not null,
  description text not null,
  category text,
  amount numeric(10, 2) not null check (amount >= 0),
  due_date date,
  paid_at timestamptz,
  status public.payment_status not null default 'pendente',
  patient_id uuid references public.patients(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.finance_entries to authenticated;
grant all on public.finance_entries to service_role;
alter table public.finance_entries enable row level security;
create policy "Admins can manage finance entries" on public.finance_entries for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ── Public photo gallery (Supabase Storage backs the actual image bytes) ──
create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  title text,
  storage_path text not null,
  mime_type text not null,
  width integer not null,
  height integer not null,
  byte_size integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.gallery_photos to anon;
grant select, insert, update, delete on public.gallery_photos to authenticated;
grant all on public.gallery_photos to service_role;
alter table public.gallery_photos enable row level security;
create policy "Anyone can read gallery photos" on public.gallery_photos for select to anon using (true);
create policy "Admins can manage gallery photos" on public.gallery_photos for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

insert into storage.buckets (id, name, public)
  values ('gallery', 'gallery', true)
  on conflict (id) do nothing;
create policy "Anyone can view gallery files" on storage.objects for select to anon, authenticated
  using (bucket_id = 'gallery');
create policy "Admins can manage gallery files" on storage.objects for all to authenticated
  using (bucket_id = 'gallery' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'gallery' and public.has_role(auth.uid(), 'admin'));

-- ── AI assistant search history ─────────────────────────────────────────────
create table public.ai_search_history (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.ai_search_history to authenticated;
grant all on public.ai_search_history to service_role;
alter table public.ai_search_history enable row level security;
create policy "Admins can manage ai search history" on public.ai_search_history for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ── Transparency / audit log, filled automatically by triggers ────────────
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  record_id text,
  record_label text,
  created_at timestamptz not null default now()
);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "Admins can read audit log" on public.audit_log for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.record_audit_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rec record := coalesce(new, old);
  label text;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  begin
    label := coalesce(
      (to_jsonb(rec) ->> 'name'), (to_jsonb(rec) ->> 'title'),
      (to_jsonb(rec) ->> 'treatment'), (to_jsonb(rec) ->> 'medication'),
      (to_jsonb(rec) ->> 'description'), (to_jsonb(rec) ->> 'clinic_name'),
      (to_jsonb(rec) ->> 'visitor_name')
    );
  exception when others then
    label := null;
  end;
  insert into public.audit_log (user_id, action, table_name, record_id, record_label)
  values (auth.uid(), lower(tg_op), tg_table_name, (to_jsonb(rec) ->> 'id'), label);
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'patients', 'treatments', 'services', 'leads', 'whatsapp_contacts', 'blog_posts',
    'appointments', 'budgets', 'payments', 'finance_entries', 'prescriptions', 'documents',
    'patient_anamnesis', 'tooth_records', 'clinical_notes', 'gallery_photos'
  ]
  loop
    execute format(
      'create trigger audit_%1$s after insert or update or delete on public.%1$s
       for each row execute function public.record_audit_log()', t
    );
  end loop;
end $$;

-- ── Anonymous-auth-scoped chat, replacing the earlier "anyone can read
-- everything" policy — each site visitor gets a real (anonymous) auth.uid()
-- via supabase.auth.signInAnonymously(), and only sees their own thread. ──
alter table public.conversations add column visitor_id uuid references auth.users(id) on delete set null;

drop policy if exists "Anyone can create a conversation" on public.conversations;
drop policy if exists "Anyone can read conversations" on public.conversations;
create policy "Visitors can create their own conversation" on public.conversations
  for insert to authenticated with check (visitor_id = auth.uid());
create policy "Visitors can read their own conversation" on public.conversations
  for select to authenticated using (visitor_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Visitors can send messages" on public.messages;
drop policy if exists "Anyone can read messages" on public.messages;
create policy "Visitors can send messages on their own conversation" on public.messages
  for insert to authenticated with check (
    sender = 'visitor'
    and exists (select 1 from public.conversations c where c.id = conversation_id and c.visitor_id = auth.uid())
  );
create policy "Visitors can read their own conversation messages" on public.messages
  for select to authenticated using (
    public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.conversations c where c.id = conversation_id and c.visitor_id = auth.uid())
  );

revoke select, insert on public.conversations from anon;
revoke select, insert on public.messages from anon;
grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
