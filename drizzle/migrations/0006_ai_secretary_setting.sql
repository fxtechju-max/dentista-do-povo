-- Toggle for the AI virtual secretary that can auto-reply to visitors on the
-- public chat widget when no admin is around yet.
alter table public.clinic_settings
  add column ai_secretary_enabled boolean not null default false;
