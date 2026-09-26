-- Full clinical record for dentists: anamnesis (health history), odontogram
-- (per-tooth chart) and clinical evolution notes. All admin-only.

create table public.patient_anamnesis (
  patient_id uuid primary key references public.patients(id) on delete cascade,
  allergies text,
  current_medications text,
  systemic_conditions text,
  previous_surgeries text,
  is_smoker boolean not null default false,
  is_pregnant boolean not null default false,
  has_diabetes boolean not null default false,
  has_hypertension boolean not null default false,
  has_heart_condition boolean not null default false,
  additional_notes text,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.patient_anamnesis to authenticated;
grant all on public.patient_anamnesis to service_role;
alter table public.patient_anamnesis enable row level security;
create policy "Admins can manage anamnesis" on public.patient_anamnesis for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.tooth_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  tooth_number smallint not null check (tooth_number between 11 and 48),
  condition text not null default 'saudavel' check (
    condition in ('saudavel', 'carie', 'restaurado', 'ausente', 'canal', 'coroa', 'implante', 'fraturado')
  ),
  notes text,
  updated_at timestamptz not null default now(),
  unique (patient_id, tooth_number)
);
grant select, insert, update, delete on public.tooth_records to authenticated;
grant all on public.tooth_records to service_role;
alter table public.tooth_records enable row level security;
create policy "Admins can manage tooth records" on public.tooth_records for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  note text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.clinical_notes to authenticated;
grant all on public.clinical_notes to service_role;
alter table public.clinical_notes enable row level security;
create policy "Admins can manage clinical notes" on public.clinical_notes for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
