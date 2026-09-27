-- Estrutura completa do sistema no PostgreSQL (Supabase).
-- Equivale às migrações MySQL 0001..0012 já consolidadas.
-- Todas as tabelas ficam com RLS ligado e SEM políticas: a API pública do
-- Supabase (chave anon) não consegue ler nada; só o servidor da aplicação,
-- que conecta direto no banco, acessa os dados.

create or replace function ddp_touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create table if not exists users (
  id text primary key,
  email varchar(254) not null unique,
  password_hash varchar(255),
  created_at timestamptz(3) not null default now()
);

create table if not exists sessions (
  token_hash char(64) primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz(3) not null
);
create index if not exists idx_session_expiry on sessions (expires_at);

create table if not exists rate_limits (
  bucket varchar(191) primary key,
  hits int not null default 1,
  expires_at timestamptz(3) not null
);
create index if not exists idx_rate_expiry on rate_limits (expires_at);

create table if not exists user_roles (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('admin', 'user')),
  unique (user_id, role)
);

create table if not exists conversations (
  id text primary key default gen_random_uuid()::text,
  visitor_name text not null,
  created_at timestamptz(3) not null default now(),
  last_message_at timestamptz(3) not null default now(),
  visitor_token_hash char(64)
);
create index if not exists idx_visitor_token on conversations (visitor_token_hash);
create index if not exists idx_last_message on conversations (last_message_at);

create table if not exists messages (
  id text primary key default gen_random_uuid()::text,
  conversation_id text not null references conversations(id) on delete cascade,
  sender varchar(191) not null check (sender in ('visitor', 'admin')),
  content text not null,
  created_at timestamptz(3) not null default now()
);
create index if not exists idx_messages_conversation_date on messages (conversation_id, created_at);

create table if not exists patients (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  phone text,
  email text,
  cpf varchar(20),
  birth_date date,
  address text,
  guardian_name text,
  guardian_phone varchar(30),
  guardian_cpf varchar(20),
  created_at timestamptz(3) not null default now()
);

create table if not exists appointments (
  id text primary key default gen_random_uuid()::text,
  patient_id text not null references patients(id) on delete restrict,
  treatment text not null,
  scheduled_at timestamptz(3) not null,
  status text not null default 'agendado' check (status in ('agendado', 'confirmado', 'concluido', 'cancelado')),
  created_at timestamptz(3) not null default now()
);
create index if not exists idx_appointments_date on appointments (scheduled_at);

create table if not exists payments (
  id text primary key default gen_random_uuid()::text,
  patient_id text references patients(id) on delete restrict,
  appointment_id text references appointments(id) on delete set null,
  amount numeric(10, 2) not null check (amount >= 0),
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  paid_at timestamptz(3),
  created_at timestamptz(3) not null default now()
);
create index if not exists idx_payments_status_date on payments (status, paid_at);

create table if not exists leads (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  phone text,
  source text,
  status text not null default 'novo' check (status in ('novo', 'em_contato', 'convertido', 'perdido')),
  created_at timestamptz(3) not null default now()
);

create table if not exists treatments (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  description text,
  price numeric(10, 2),
  duration_minutes integer,
  active boolean not null default true,
  created_at timestamptz(3) not null default now()
);

create table if not exists budgets (
  id text primary key default gen_random_uuid()::text,
  patient_id text not null references patients(id) on delete restrict,
  treatment text not null,
  value numeric(10, 2) not null check (value >= 0),
  status varchar(191) not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'recusado')),
  notes text,
  created_at timestamptz(3) not null default now()
);

create table if not exists prescriptions (
  id text primary key default gen_random_uuid()::text,
  patient_id text not null references patients(id) on delete restrict,
  medication text not null,
  instructions text,
  issued_at timestamptz(3) not null default now(),
  created_at timestamptz(3) not null default now()
);

create table if not exists documents (
  id text primary key default gen_random_uuid()::text,
  patient_id text references patients(id) on delete restrict,
  prescription_id text references prescriptions(id) on delete cascade,
  title text not null,
  category text,
  url text,
  created_at timestamptz(3) not null default now()
);

create table if not exists whatsapp_contacts (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  phone text not null,
  last_message text,
  last_contact_at timestamptz(3) not null default now(),
  created_at timestamptz(3) not null default now()
);

create table if not exists services (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  description text,
  price numeric(10, 2),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz(3) not null default now()
);

create table if not exists profiles (
  id text primary key references users(id) on delete cascade,
  display_name text,
  created_at timestamptz(3) not null default now()
);

create table if not exists clinic_settings (
  id varchar(191) primary key default 'default',
  clinic_name text,
  phone text,
  address text,
  instagram_url text,
  facebook_url text,
  whatsapp_number text,
  ai_gateway_provider varchar(191),
  ai_gateway_base_url text,
  ai_gateway_model varchar(191),
  ai_gateway_api_key text,
  updated_at timestamptz(3) not null default now(),
  ai_secretary_enabled boolean not null default false,
  disabled_modules jsonb not null default '[]'::jsonb
);

create table if not exists blog_posts (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  slug varchar(191) not null unique,
  excerpt text,
  content text not null,
  cover_image_url text,
  status varchar(191) not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  published_at timestamptz(3),
  created_at timestamptz(3) not null default now(),
  updated_at timestamptz(3) not null default now(),
  category varchar(191) not null default 'Prevenção'
);

create table if not exists patient_anamnesis (
  patient_id text primary key references patients(id) on delete restrict,
  chief_complaint text,
  last_dental_visit_at date,
  brushing_frequency varchar(50),
  flosses_regularly boolean not null default false,
  bleeding_gums boolean not null default false,
  tooth_sensitivity boolean not null default false,
  bruxism boolean not null default false,
  uses_orthodontic_appliance boolean not null default false,
  uses_dental_prosthesis boolean not null default false,
  anesthesia_allergy boolean not null default false,
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
  updated_at timestamptz(3) not null default now()
);

create table if not exists tooth_records (
  id text primary key default gen_random_uuid()::text,
  patient_id text not null references patients(id) on delete restrict,
  tooth_number smallint not null check (tooth_number between 11 and 48 or tooth_number between 51 and 85),
  conditions jsonb not null default '[]'::jsonb,
  notes text,
  updated_at timestamptz(3) not null default now(),
  unique (patient_id, tooth_number)
);

create table if not exists clinical_notes (
  id text primary key default gen_random_uuid()::text,
  patient_id text not null references patients(id) on delete restrict,
  note text not null,
  created_at timestamptz(3) not null default now()
);

create table if not exists finance_entries (
  id text primary key default gen_random_uuid()::text,
  type text not null check (type in ('pagar', 'receber')),
  description text not null,
  category text,
  amount numeric(10, 2) not null check (amount >= 0),
  due_date date,
  paid_at timestamptz(3),
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  patient_id text references patients(id) on delete set null,
  notes text,
  created_at timestamptz(3) not null default now()
);
create index if not exists idx_finance_entries_type_status on finance_entries (type, status);
create index if not exists idx_finance_entries_due_date on finance_entries (due_date);

create table if not exists gallery_photos (
  id text primary key default gen_random_uuid()::text,
  title text,
  mime_type varchar(100) not null,
  width int not null,
  height int not null,
  byte_size int not null,
  sort_order int not null default 0,
  image_data bytea not null,
  created_at timestamptz(3) not null default now()
);
create index if not exists idx_gallery_sort on gallery_photos (sort_order, created_at);

create table if not exists ai_search_history (
  id text primary key default gen_random_uuid()::text,
  question text not null,
  answer text not null,
  created_at timestamptz(3) not null default now()
);
create index if not exists idx_ai_history_date on ai_search_history (created_at);

create table if not exists audit_log (
  id text primary key default gen_random_uuid()::text,
  user_id text references users(id) on delete set null,
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name varchar(191) not null,
  record_id varchar(191),
  record_label text,
  created_at timestamptz(3) not null default now()
);
create index if not exists idx_audit_date on audit_log (created_at);

-- "on update current_timestamp" do MySQL vira gatilho no PostgreSQL.
drop trigger if exists trg_touch_clinic_settings on clinic_settings;
create trigger trg_touch_clinic_settings before update on clinic_settings
  for each row execute function ddp_touch_updated_at();
drop trigger if exists trg_touch_blog_posts on blog_posts;
create trigger trg_touch_blog_posts before update on blog_posts
  for each row execute function ddp_touch_updated_at();
drop trigger if exists trg_touch_patient_anamnesis on patient_anamnesis;
create trigger trg_touch_patient_anamnesis before update on patient_anamnesis
  for each row execute function ddp_touch_updated_at();
drop trigger if exists trg_touch_tooth_records on tooth_records;
create trigger trg_touch_tooth_records before update on tooth_records
  for each row execute function ddp_touch_updated_at();

-- Bloqueia a API pública do Supabase (PostgREST) em todas as tabelas.
do $$
declare t text;
begin
  foreach t in array array[
    'users','sessions','rate_limits','user_roles','conversations','messages','patients',
    'appointments','payments','leads','treatments','budgets','prescriptions','documents',
    'whatsapp_contacts','services','profiles','clinic_settings','blog_posts',
    'patient_anamnesis','tooth_records','clinical_notes','finance_entries',
    'gallery_photos','ai_search_history','audit_log'
  ] loop
    execute format('alter table %I enable row level security', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table %I from anon, authenticated', t);
    end if;
  end loop;
end $$;
