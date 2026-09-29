-- Financeiro: desconto e acréscimo de cada lançamento (amount continua sendo o
-- valor final). Suporte: quando o administrador leu a conversa por último.
alter table payments add column if not exists discount numeric(10, 2) not null default 0 check (discount >= 0);
alter table payments add column if not exists surcharge numeric(10, 2) not null default 0 check (surcharge >= 0);
alter table conversations add column if not exists admin_read_at timestamptz(3);

-- Listas gravadas como texto JSON dentro do jsonb ("[\"oclusal\"]") viram
-- listas de verdade.
update tooth_procedures set surfaces = (surfaces #>> '{}')::jsonb where jsonb_typeof(surfaces) = 'string';
update tooth_records set conditions = (conditions #>> '{}')::jsonb where jsonb_typeof(conditions) = 'string';
update clinic_settings set disabled_modules = (disabled_modules #>> '{}')::jsonb where jsonb_typeof(disabled_modules) = 'string';
update clinic_settings set disabled_payment_methods = (disabled_payment_methods #>> '{}')::jsonb where jsonb_typeof(disabled_payment_methods) = 'string';
update clinic_settings set module_order = (module_order #>> '{}')::jsonb where jsonb_typeof(module_order) = 'string';
