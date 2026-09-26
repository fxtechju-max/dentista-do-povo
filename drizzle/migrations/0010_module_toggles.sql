-- Lets an admin turn menu modules on/off from Configurações. Dashboard and
-- Configurações themselves are never toggleable.
alter table public.clinic_settings
  add column disabled_modules text[] not null default '{}';
