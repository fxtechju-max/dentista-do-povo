-- Private application schema, accessed only by Vercel server functions.
create schema if not exists ddp;
set local search_path to ddp, public;

create table if not exists users (
  id uuid primary key,
  email varchar(254) not null unique,
  password_hash varchar(255) null,
  created_at timestamptz not null default current_timestamp(3)
);
create table if not exists sessions (
  token_hash char(64) primary key,
  user_id uuid not null,
  expires_at timestamptz not null,
  foreign key (user_id) references users(id) on delete cascade
);
create table if not exists rate_limits (
  bucket varchar(191) primary key,
  hits int not null default 1,
  expires_at timestamptz not null
);

create table if not exists "user_roles" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid  not null,
  "role" text check ("role" in ('admin','user')) not null,
  unique (user_id, role),
  foreign key ("user_id") references "users"("id") on delete cascade
);

create table if not exists "conversations" (
  "id" uuid primary key default gen_random_uuid(),
  "visitor_name" text not null,
  "created_at" timestamptz not null default current_timestamp(3),
  "last_message_at" timestamptz not null default current_timestamp(3),
  "visitor_token_hash" char(64) null
);

create table if not exists "messages" (
  "id" uuid primary key default gen_random_uuid(),
  "conversation_id" uuid  not null,
  "sender" varchar(191) not null check (sender in ('visitor', 'admin')),
  "content" text not null,
  "created_at" timestamptz not null default current_timestamp(3),
  foreign key ("conversation_id") references "conversations"("id") on delete cascade
);

create table if not exists "patients" (
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "phone" text,
  "email" text,
  "created_at" timestamptz not null default current_timestamp(3)
);

create table if not exists "appointments" (
  "id" uuid primary key default gen_random_uuid(),
  "patient_id" uuid  not null,
  "treatment" text not null,
  "scheduled_at" timestamptz not null,
  "status" text check ("status" in ('agendado','confirmado','concluido','cancelado')) not null default 'agendado',
  "created_at" timestamptz not null default current_timestamp(3),
  foreign key ("patient_id") references "patients"("id") on delete restrict
);

create table if not exists "payments" (
  "id" uuid primary key default gen_random_uuid(),
  "patient_id" uuid ,
  "appointment_id" uuid ,
  "amount" numeric(10, 2) not null,
  "status" text check ("status" in ('pendente','pago','cancelado')) not null default 'pendente',
  "paid_at" timestamptz,
  "created_at" timestamptz not null default current_timestamp(3),
  check (amount >= 0),
  foreign key ("patient_id") references "patients"("id") on delete restrict,
  foreign key ("appointment_id") references "appointments"("id") on delete set null
);

create table if not exists "leads" (
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "phone" text,
  "source" text,
  "status" text check ("status" in ('novo','em_contato','convertido','perdido')) not null default 'novo',
  "created_at" timestamptz not null default current_timestamp(3)
);

create table if not exists "treatments" (
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "description" text,
  "price" numeric(10, 2),
  "duration_minutes" integer,
  "active" boolean not null default true,
  "created_at" timestamptz not null default current_timestamp(3)
);

create table if not exists "budgets" (
  "id" uuid primary key default gen_random_uuid(),
  "patient_id" uuid  not null,
  "treatment" text not null,
  "value" numeric(10, 2) not null,
  "status" varchar(191) not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'recusado')),
  "notes" text,
  "created_at" timestamptz not null default current_timestamp(3),
  check (value >= 0),
  foreign key ("patient_id") references "patients"("id") on delete restrict
);

create table if not exists "prescriptions" (
  "id" uuid primary key default gen_random_uuid(),
  "patient_id" uuid  not null,
  "medication" text not null,
  "instructions" text,
  "issued_at" timestamptz not null default current_timestamp(3),
  "created_at" timestamptz not null default current_timestamp(3),
  foreign key ("patient_id") references "patients"("id") on delete restrict
);

create table if not exists "documents" (
  "id" uuid primary key default gen_random_uuid(),
  "patient_id" uuid ,
  "title" text not null,
  "category" text,
  "url" text,
  "created_at" timestamptz not null default current_timestamp(3),
  foreign key ("patient_id") references "patients"("id") on delete restrict
);

create table if not exists "whatsapp_contacts" (
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "phone" text not null,
  "last_message" text,
  "last_contact_at" timestamptz not null default current_timestamp(3),
  "created_at" timestamptz not null default current_timestamp(3)
);

create table if not exists "services" (
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "description" text,
  "price" numeric(10, 2),
  "active" boolean not null default true,
  "sort_order" integer not null default 0,
  "created_at" timestamptz not null default current_timestamp(3)
);

create table if not exists "profiles" (
  "id" uuid primary key ,
  "display_name" text,
  "created_at" timestamptz not null default current_timestamp(3),
  foreign key ("id") references "users"("id") on delete cascade
);

create table if not exists "clinic_settings" (
  "id" varchar(191) primary key default 'default',
  "clinic_name" text,
  "phone" text,
  "address" text,
  "updated_at" timestamptz not null default current_timestamp(3),
  "ai_secretary_enabled" boolean not null default false,
  "disabled_modules" jsonb not null default '[]'::jsonb
);

create table if not exists "blog_posts" (
  "id" uuid primary key default gen_random_uuid(),
  "title" text not null,
  "slug" varchar(191) not null unique,
  "excerpt" text,
  "content" text not null,
  "cover_image_url" text,
  "status" varchar(191) not null default 'rascunho' check (status in ('rascunho', 'publicado')),
  "published_at" timestamptz,
  "created_at" timestamptz not null default current_timestamp(3),
  "updated_at" timestamptz not null default current_timestamp(3),
  "category" varchar(191) not null default 'Prevenção'
);

create table if not exists "patient_anamnesis" (
  "patient_id" uuid primary key ,
  "allergies" text,
  "current_medications" text,
  "systemic_conditions" text,
  "previous_surgeries" text,
  "is_smoker" boolean not null default false,
  "is_pregnant" boolean not null default false,
  "has_diabetes" boolean not null default false,
  "has_hypertension" boolean not null default false,
  "has_heart_condition" boolean not null default false,
  "additional_notes" text,
  "updated_at" timestamptz not null default current_timestamp(3),
  foreign key ("patient_id") references "patients"("id") on delete restrict
);

create table if not exists "tooth_records" (
  "id" uuid primary key default gen_random_uuid(),
  "patient_id" uuid  not null,
  "tooth_number" smallint not null check (tooth_number between 11 and 48 or tooth_number between 51 and 85),
  "conditions" jsonb not null default '["higido"]'::jsonb,
  "notes" text,
  "updated_at" timestamptz not null default current_timestamp(3),
  unique (patient_id, tooth_number),
  foreign key ("patient_id") references "patients"("id") on delete restrict
);

create table if not exists "clinical_notes" (
  "id" uuid primary key default gen_random_uuid(),
  "patient_id" uuid  not null,
  "note" text not null,
  "created_at" timestamptz not null default current_timestamp(3),
  foreign key ("patient_id") references "patients"("id") on delete restrict
);

create table if not exists "finance_entries" (
  "id" uuid primary key default gen_random_uuid(),
  "type" text check ("type" in ('pagar','receber')) not null,
  "description" text not null,
  "category" text,
  "amount" numeric(10, 2) not null,
  "due_date" date,
  "paid_at" timestamptz,
  "status" text check ("status" in ('pendente','pago','cancelado')) not null default 'pendente',
  "patient_id" uuid,
  "notes" text,
  "created_at" timestamptz not null default current_timestamp(3),
  check (amount >= 0),
  foreign key ("patient_id") references "patients"("id") on delete set null
);

alter table "clinic_settings"
  add column "instagram_url" text,
  add column "facebook_url" text,
  add column "whatsapp_number" text;





alter table "clinic_settings"
  add column "ai_gateway_provider" varchar(191),
  add column "ai_gateway_base_url" text,
  add column "ai_gateway_model" varchar(191),
  add column "ai_gateway_api_key" text;

alter table "patients"
  add column "cpf" varchar(20),
  add column "birth_date" date,
  add column "address" text,
  add column "guardian_name" text,
  add column "guardian_phone" varchar(30),
  add column "guardian_cpf" varchar(20);





create table if not exists "gallery_photos" (
  "id" uuid primary key default gen_random_uuid(),
  "title" text,
  "mime_type" varchar(100) not null,
  "width" int not null,
  "height" int not null,
  "byte_size" int not null,
  "sort_order" int not null default 0,
  "image_data" bytea not null,
  "created_at" timestamptz not null default current_timestamp(3)
);

create table if not exists "ai_search_history" (
  "id" uuid primary key default gen_random_uuid(),
  "question" text not null,
  "answer" text not null,
  "created_at" timestamptz not null default current_timestamp(3)
);

create table if not exists "audit_log" (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid,
  "action" text check ("action" in ('insert','update','delete')) not null,
  "table_name" varchar(191) not null,
  "record_id" varchar(191),
  "record_label" text,
  "created_at" timestamptz not null default current_timestamp(3),
  foreign key ("user_id") references "users"("id") on delete set null
);

alter table "documents"
  add column "prescription_id" uuid,
  add foreign key ("prescription_id") references "prescriptions"("id") on delete cascade;

alter table "patient_anamnesis"
  add column "chief_complaint" text,
  add column "last_dental_visit_at" date,
  add column "brushing_frequency" varchar(50),
  add column "flosses_regularly" boolean not null default false,
  add column "bleeding_gums" boolean not null default false,
  add column "tooth_sensitivity" boolean not null default false,
  add column "bruxism" boolean not null default false,
  add column "uses_orthodontic_appliance" boolean not null default false,
  add column "uses_dental_prosthesis" boolean not null default false,
  add column "anesthesia_allergy" boolean not null default false;

create index if not exists idx_session_expiry on sessions (expires_at);
create index if not exists idx_rate_expiry on rate_limits (expires_at);
create index if not exists idx_visitor_token on "conversations" (visitor_token_hash);
create index if not exists idx_last_message on "conversations" (last_message_at);
create index if not exists idx_messages_conversation_date on "messages" (conversation_id, created_at);
create index if not exists idx_appointments_date on "appointments" (scheduled_at);
create index if not exists idx_payments_status_date on "payments" (status, paid_at);
create index if not exists idx_finance_entries_type_status on "finance_entries" (type, status);
create index if not exists idx_finance_entries_due_date on "finance_entries" (due_date);
create index if not exists idx_gallery_sort on "gallery_photos" (sort_order, created_at);
create index if not exists idx_ai_history_date on "ai_search_history" (created_at);
create index if not exists idx_audit_date on "audit_log" (created_at);
create table ddp.preferences (
  owner text not null,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default current_timestamp,
  primary key (owner,key)
);
create table ddp.backup_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references ddp.users(id) on delete set null,
  created_at timestamptz not null default current_timestamp,
  payload jsonb not null
);
create or replace function ddp.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = current_timestamp; return new; end;
$$;
do $$ declare t text; begin
  foreach t in array array['clinic_settings','blog_posts','patient_anamnesis','tooth_records'] loop
    execute format('create trigger touch_updated_at before update on ddp.%I for each row execute function ddp.touch_updated_at()',t);
  end loop;
end $$;
-- No browser/Data API access: authorization is enforced by server functions.
revoke all on schema ddp from public;
do $$ declare t record; r text; begin
  for t in select tablename from pg_tables where schemaname='ddp' loop
    execute format('alter table ddp.%I enable row level security',t.tablename);
    execute format('revoke all on ddp.%I from public',t.tablename);
  end loop;
  foreach r in array array['anon','authenticated'] loop
    if exists(select 1 from pg_roles where rolname=r) then
      execute format('revoke all on schema ddp from %I',r);
      execute format('revoke all on all tables in schema ddp from %I',r);
    end if;
  end loop;
end $$;
insert into ddp.clinic_settings (id) values ('default') on conflict (id) do nothing;
