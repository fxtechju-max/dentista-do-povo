-- Internal practice-management tables for the admin dashboard (patients, agenda,
-- billing, CRM leads). Unlike conversations/messages, none of this is public:
-- only authenticated admins can read or write it.

create type public.appointment_status as enum ('agendado', 'confirmado', 'concluido', 'cancelado');
create type public.payment_status as enum ('pendente', 'pago', 'cancelado');
create type public.lead_status as enum ('novo', 'em_contato', 'convertido', 'perdido');

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.patients to authenticated;
grant all on public.patients to service_role;
alter table public.patients enable row level security;
create policy "Admins can manage patients" on public.patients for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  treatment text not null,
  scheduled_at timestamptz not null,
  status public.appointment_status not null default 'agendado',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.appointments to authenticated;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;
create policy "Admins can manage appointments" on public.appointments for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  amount numeric(10, 2) not null,
  status public.payment_status not null default 'pendente',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "Admins can manage payments" on public.payments for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  source text,
  status public.lead_status not null default 'novo',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.leads to authenticated;
grant all on public.leads to service_role;
alter table public.leads enable row level security;
create policy "Admins can manage leads" on public.leads for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
