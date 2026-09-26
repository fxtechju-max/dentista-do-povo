-- Remaining internal modules: treatment catalog, budgets, prescriptions,
-- documents, an internal WhatsApp contact log, site content (services) for the
-- CMS module, per-admin profile, and a single clinic settings row.
-- All admin-only (has_role) except profiles, which is per-user.

create table public.treatments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2),
  duration_minutes integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.treatments to authenticated;
grant all on public.treatments to service_role;
alter table public.treatments enable row level security;
create policy "Admins can manage treatments" on public.treatments for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  treatment text not null,
  value numeric(10, 2) not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'recusado')),
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.budgets to authenticated;
grant all on public.budgets to service_role;
alter table public.budgets enable row level security;
create policy "Admins can manage budgets" on public.budgets for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  medication text not null,
  instructions text,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.prescriptions to authenticated;
grant all on public.prescriptions to service_role;
alter table public.prescriptions enable row level security;
create policy "Admins can manage prescriptions" on public.prescriptions for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  title text not null,
  category text,
  url text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;
create policy "Admins can manage documents" on public.documents for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  last_message text,
  last_contact_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.whatsapp_contacts to authenticated;
grant all on public.whatsapp_contacts to service_role;
alter table public.whatsapp_contacts enable row level security;
create policy "Admins can manage whatsapp contacts" on public.whatsapp_contacts for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.services to anon;
grant select, insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "Anyone can read active services" on public.services for select to anon using (active = true);
create policy "Admins can manage services" on public.services for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users manage own profile" on public.profiles for all to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create table public.clinic_settings (
  id text primary key default 'default',
  clinic_name text,
  phone text,
  address text,
  updated_at timestamptz not null default now()
);
grant select on public.clinic_settings to anon;
grant select, insert, update on public.clinic_settings to authenticated;
grant all on public.clinic_settings to service_role;
alter table public.clinic_settings enable row level security;
create policy "Anyone can read clinic settings" on public.clinic_settings for select to anon using (true);
create policy "Admins can manage clinic settings" on public.clinic_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
